<?php

namespace App\Http\Controllers;

use App\Services\PrometheusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    public function __construct(private PrometheusService $prometheus) {}

    /**
     * GET /api/servers
     * Returns all servers discovered from Prometheus targets
     */
    public function index(Request $request): JsonResponse
    {
        $servers = $this->prometheus->buildVmList();

        // Filter
        if ($request->has('status')) {
            $servers = array_filter($servers, fn($s) => $s['status'] === $request->status);
        }
        if ($request->has('type')) {
            $servers = array_filter($servers, fn($s) => $s['type'] === $request->type);
        }
        if ($request->has('search')) {
            $q = strtolower($request->search);
            $servers = array_filter($servers, fn($s) =>
                str_contains(strtolower($s['name']), $q) ||
                str_contains(strtolower($s['instance']), $q)
            );
        }

        return response()->json([
            'success' => true,
            'data'    => array_values($servers),
            'total'   => count($servers),
        ]);
    }

    /**
     * GET /api/server/{id}/metrics
     * Returns detailed metrics for a specific server
     */
    public function metrics(string $id): JsonResponse
    {
        $servers = $this->prometheus->buildVmList();
        $server  = collect($servers)->firstWhere('id', $id);

        if (!$server) {
            return response()->json(['success' => false, 'message' => 'Server not found'], 404);
        }

        $instance = $server['instance'];
        $layers   = $server['layers'] ?? $this->prometheus->detectVmLayers($instance);

        $metrics = [
            'server'  => $server,
            'layers'  => $layers,
            'infra'   => $this->prometheus->getNodeMetrics($instance),
            'app'     => null,
            'database'=> null,
            'redis'   => null,
            'docker'  => null,
            'kubernetes' => null,
        ];

        if (in_array('app', $layers, true)) {
            $metrics['app'] = $this->prometheus->getAppMetrics($instance);
        }
        if (in_array('database', $layers, true)) {
            $metrics['database'] = $this->prometheus->getDatabaseMetrics($instance);
        }
        if (in_array('redis', $layers, true)) {
            $metrics['redis'] = $this->prometheus->getRedisMetrics($instance);
        }

        return response()->json([
            'success' => true,
            'data'    => $metrics,
        ]);
    }
}
