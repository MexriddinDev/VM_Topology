<?php

namespace App\Http\Controllers;

use App\Services\PrometheusService;
use Illuminate\Http\JsonResponse;

class AlertController extends Controller
{
    public function __construct(private PrometheusService $prometheus) {}

    /**
     * GET /api/alerts
     */
    public function index(): JsonResponse
    {
        $alerts = $this->prometheus->getAlerts();

        return response()->json([
            'success'  => true,
            'data'     => $alerts,
            'critical' => count(array_filter($alerts, fn($a) => $a['severity'] === 'critical')),
            'warnings' => count(array_filter($alerts, fn($a) => $a['severity'] === 'warning')),
        ]);
    }
}
