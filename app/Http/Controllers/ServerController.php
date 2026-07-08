<?php

namespace App\Http\Controllers;

use App\Services\PrometheusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    public function __construct(
        private PrometheusService $prometheus
    ) {}

    /**
     * GET /api/v1/servers
     *
     * Real, dynamic VM list straight from Prometheus (via PrometheusService),
     * including live status (up/down only — 'unknown' targets are filtered
     * out here and surfaced exclusively through /api/v1/alerts), CPU/RAM,
     * and detected layers (app/database/redis). No more hardcoded 0s.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $servers = $this->prometheus->buildVmList();

            if ($status = $request->query('status')) {
                $servers = array_values(array_filter(
                    $servers,
                    fn ($s) => $s['status'] === $status
                ));
            }

            if ($search = $request->query('search')) {
                $q = mb_strtolower($search);
                $servers = array_values(array_filter($servers, function ($s) use ($q) {
                    return str_contains(mb_strtolower($s['name']), $q)
                        || str_contains($s['ip'], $q)
                        || str_contains(mb_strtolower($s['instance']), $q);
                }));
            }

            return response()->json([
                'success' => true,
                'data'    => $servers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/server/{id}/metrics
     */
    public function metrics(string $id): JsonResponse
    {
        $servers = $this->prometheus->buildVmList();
        $server  = collect($servers)->firstWhere('id', $id);

        if (!$server) {
            return response()->json([
                'success' => false,
                'message' => 'Server not found',
            ], 404);
        }

        $instance = $server['instance'];
        $layers   = array_values(array_unique(array_merge(
            $server['layers'] ?? ['infra'],
            $this->prometheus->layersFromJobs($server['jobs'] ?? [])
        )));

        $metrics = [
            'server'     => $server,
            'layers'     => $layers,
            'services'   => $server['services'] ?? [],
            'infra'      => $this->prometheus->getNodeMetrics($instance),
            'app'        => in_array('app', $layers, true)
                ? $this->prometheus->getAppMetrics($instance)
                : null,
            'database'   => in_array('database', $layers, true)
                ? $this->prometheus->getDatabaseMetrics($instance)
                : null,
            'redis'      => in_array('redis', $layers, true)
                ? $this->prometheus->getRedisMetrics($instance)
                : null,
            'docker'     => null,
            'kubernetes' => null,
        ];

        return response()->json([
            'success' => true,
            'data'    => $metrics,
        ]);
    }
}
