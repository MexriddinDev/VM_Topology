<?php

namespace App\Http\Controllers;

use App\Models\AlertEvent;
use App\Services\PrometheusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function __construct(private PrometheusService $prometheus) {}

    /**
     * GET /api/alerts
     */
    public function index(): JsonResponse
    {
        $alerts = $this->prometheus->getAlerts();
        $this->prometheus->syncAlertHistory($alerts);

        return response()->json([
            'success'  => true,
            'data'     => $alerts,
            'critical' => count(array_filter($alerts, fn($a) => $a['severity'] === 'critical')),
            'warnings' => count(array_filter($alerts, fn($a) => $a['severity'] === 'warning')),
        ]);
    }

    /**
     * GET /api/v1/alerts/history
     */
    public function history(Request $request): JsonResponse
    {
        $this->prometheus->syncAlertHistory($this->prometheus->getAlerts());

        $query = AlertEvent::query();

        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('q', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', "%{$search}%")
                    ->orWhere('instance', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%");
            });
        }

        $range = $request->query('range', '24h');
        $from = match ($range) {
            '1h' => now()->subHour(),
            '24h' => now()->subDay(),
            '3d' => now()->subDays(3),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDay(),
        };

        if ($from) {
            $query->where('last_seen_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('last_seen_at', '<=', $to);
        }

        $alerts = $query
            ->orderByDesc('last_seen_at')
            ->limit((int) $request->query('limit', 500))
            ->get()
            ->map(fn (AlertEvent $event) => [
                'id' => $event->id,
                'fingerprint' => $event->fingerprint,
                'severity' => $event->severity,
                'type' => $event->type,
                'instance' => $event->instance,
                'message' => $event->message,
                'value' => $event->value,
                'status' => $event->status,
                'first_seen_at' => $event->first_seen_at?->toIso8601String(),
                'last_seen_at' => $event->last_seen_at?->toIso8601String(),
                'resolved_at' => $event->resolved_at?->toIso8601String(),
                'occurrence_count' => $event->payload['occurrence_count'] ?? 1,
                'payload' => $event->payload ?? [],
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $alerts,
        ]);
    }
}
