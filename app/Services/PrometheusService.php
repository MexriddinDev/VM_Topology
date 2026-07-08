<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use App\Models\AlertEvent;
use Illuminate\Support\Facades\DB;

class PrometheusService
{
    private string $baseUrl;
    private int $cacheTtl = 5; // seconds

    public function __construct()
    {
        $this->baseUrl = config('prometheus.url', env('PROMETHEUS_URL', 'http://172.28.6.50:9000'));
    }

    public function query(string $promql): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/v1/query", [
                'query' => $promql,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data']['result'] ?? [];
            }
        } catch (\Exception $e) {
            \Log::error("Prometheus query failed: {$promql}", ['error' => $e->getMessage()]);
        }

        return [];
    }

    public function queryRange(string $promql, int $start, int $end, string $step = '60s'): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/v1/query_range", [
                'query' => $promql,
                'start' => $start,
                'end'   => $end,
                'step'  => $step,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data']['result'] ?? [];
            }
        } catch (\Exception $e) {
            \Log::error("Prometheus range query failed: {$promql}", ['error' => $e->getMessage()]);
        }

        return [];
    }

    /**
     * Get all active targets (discovered servers/services).
     * Cached for a short TTL so we don't hammer Prometheus on every request.
     */
    public function getTargets(): array
    {
        return Cache::remember('prom:targets', $this->cacheTtl, function () {
            try {
                $response = Http::timeout(5)->get("{$this->baseUrl}/api/v1/targets");
                if ($response->successful()) {
                    return $response->json()['data']['activeTargets'] ?? [];
                }
            } catch (\Exception $e) {
                \Log::error("Prometheus targets fetch failed", ['error' => $e->getMessage()]);
            }
            return [];
        });
    }

    public function scalarValue(array $result, float $default = 0): float
    {
        return isset($result[0]['value'][1]) ? (float) $result[0]['value'][1] : $default;
    }

    public function valueByLabel(array $result, string $label, string $value): ?float
    {
        foreach ($result as $item) {
            if (isset($item['metric'][$label]) && $item['metric'][$label] === $value) {
                return isset($item['value'][1]) ? (float) $item['value'][1] : null;
            }
        }
        return null;
    }

    /**
     * Index a PromQL result set (grouped `by (instance)`) into a map of
     * instance => float value. This is the core trick that lets us fetch
     * data for ALL instances with a single HTTP round trip instead of one
     * round trip per instance.
     */
    private function indexByInstance(array $result): array
    {
        $map = [];
        foreach ($result as $item) {
            $instance = $item['metric']['instance'] ?? null;
            if ($instance === null) continue;
            $map[$instance] = isset($item['value'][1]) ? (float) $item['value'][1] : 0.0;
        }
        return $map;
    }

    /**
     * Derive VM layers from the Prometheus jobs discovered for the instance.
     * This keeps the UI driven by the actual exporters/services present on a VM
     * instead of forcing the same layer set everywhere.
     *
     * @param array<int, string> $jobs
     * @return array<int, string>
     */
    public function layersFromJobs(array $jobs): array
    {
        $layers = ['infra'];

        foreach (array_values(array_unique(array_filter(array_map('strval', $jobs)))) as $job) {
            $jobLower = strtolower($job);

            if ($jobLower === 'node' || str_contains($jobLower, 'node_exporter')) {
                continue;
            }

            if (str_contains($jobLower, 'postgres') || str_contains($jobLower, 'mysql') || str_contains($jobLower, 'mariadb')) {
                $layers[] = 'database';
                continue;
            }

            if (str_contains($jobLower, 'redis')) {
                $layers[] = 'redis';
                continue;
            }

            $layers[] = 'app';
        }

        return array_values(array_unique($layers));
    }

    /**
     * Build a readable list of discovered services from Prometheus target labels.
     * Alias is preferred because it usually contains the human-friendly name
     * (for example `haproxy` instead of `haproxy_xb`).
     *
     * @param array<int, array<string, mixed>> $targets
     * @return array<int, string>
     */
    public function servicesFromTargets(array $targets): array
    {
        $services = [];

        foreach ($targets as $target) {
            $labels = $target['labels'] ?? [];
            $job = trim((string) ($labels['job'] ?? ''));
            $alias = trim((string) ($labels['alias'] ?? ''));
            $name = $alias !== '' ? $alias : $job;

            if ($name === '' || $name === 'node') {
                continue;
            }

            $services[] = $name;
        }

        return array_values(array_unique($services));
    }

    /**
     * Fetch up/cpu/mem/disk/net/load/uptime for ALL instances in one shot
     * (one HTTP call per metric, not per instance). Used by buildVmList().
     *
     * @return array<string, array> instance => infra metrics array
     */
    private function getBulkNodeMetrics(): array
    {
        $up        = $this->indexByInstance($this->query('up'));
        $cpu       = $this->indexByInstance($this->query(
            '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
        ));
        $memTotal  = $this->indexByInstance($this->query('node_memory_MemTotal_bytes'));
        $memAvail  = $this->indexByInstance($this->query('node_memory_MemAvailable_bytes'));
        $diskAvail = $this->indexByInstance($this->query('node_filesystem_avail_bytes{mountpoint="/"}'));
        $diskTotal = $this->indexByInstance($this->query('node_filesystem_size_bytes{mountpoint="/"}'));
        $netRx     = $this->indexByInstance($this->query('irate(node_network_receive_bytes_total{device!="lo"}[5m])'));
        $netTx     = $this->indexByInstance($this->query('irate(node_network_transmit_bytes_total{device!="lo"}[5m])'));
        $load1     = $this->indexByInstance($this->query('node_load1'));
        $uptime    = $this->indexByInstance($this->query('node_time_seconds - node_boot_time_seconds'));
        $appRps    = $this->indexByInstance($this->query('sum by (instance) (irate(http_requests_total[5m]))'));
        $pgUp      = $this->indexByInstance($this->query('postgres_up'));
        $redisUp   = $this->indexByInstance($this->query('redis_up'));

        $instances = array_keys($up);
        $out = [];

        foreach ($instances as $instance) {
            $isUp = $up[$instance] ?? -1;
            $status = $isUp < 0 ? 'unknown' : ($isUp == 0 ? 'down' : 'up');

            $total = $memTotal[$instance] ?? 0;
            $avail = $memAvail[$instance] ?? 0;
            $dTotal = $diskTotal[$instance] ?? 0;
            $dAvail = $diskAvail[$instance] ?? 0;

            $layers = ['infra'];
            if ($status === 'up') {
                if (($appRps[$instance] ?? 0) > 0) $layers[] = 'app';
                if (($pgUp[$instance] ?? 0) > 0) $layers[] = 'database';
                if (($redisUp[$instance] ?? 0) > 0) $layers[] = 'redis';
            }

            $out[$instance] = [
                'status' => $status,
                'layers' => $layers,
                'infra'  => [
                    'cpu_percent'        => round($status === 'up' ? ($cpu[$instance] ?? 0) : 0, 2),
                    'memory_percent'     => $total > 0 ? round((1 - $avail / $total) * 100, 2) : 0,
                    'memory_used_bytes'  => max(0, $total - $avail),
                    'memory_total_bytes' => $total,
                    'disk_percent'       => $dTotal > 0 ? round((1 - $dAvail / $dTotal) * 100, 2) : 0,
                    'disk_avail_bytes'   => $dAvail,
                    'disk_total_bytes'   => $dTotal,
                    'net_rx_bytes_sec'   => round($netRx[$instance] ?? 0, 2),
                    'net_tx_bytes_sec'   => round($netTx[$instance] ?? 0, 2),
                    'load1'              => round($load1[$instance] ?? 0, 2),
                    'uptime_seconds'     => (int) ($uptime[$instance] ?? 0),
                ],
            ];
        }

        return $out;
    }

    public function getNodeMetrics(string $instance): array
    {
        $cpuResult = $this->query(
            "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\",instance=\"{$instance}\"}[5m])) * 100)"
        );

        $memTotalResult  = $this->query("node_memory_MemTotal_bytes{instance=\"{$instance}\"}");
        $memAvailResult  = $this->query("node_memory_MemAvailable_bytes{instance=\"{$instance}\"}");
        $diskAvailResult = $this->query("node_filesystem_avail_bytes{instance=\"{$instance}\",mountpoint=\"/\"}");
        $diskTotalResult = $this->query("node_filesystem_size_bytes{instance=\"{$instance}\",mountpoint=\"/\"}");
        $netRxResult     = $this->query("irate(node_network_receive_bytes_total{instance=\"{$instance}\",device!=\"lo\"}[5m])");
        $netTxResult     = $this->query("irate(node_network_transmit_bytes_total{instance=\"{$instance}\",device!=\"lo\"}[5m])");
        $loadResult      = $this->query("node_load1{instance=\"{$instance}\"}");
        $uptimeResult    = $this->query("node_time_seconds{instance=\"{$instance}\"} - node_boot_time_seconds{instance=\"{$instance}\"}");

        $memTotal = $this->scalarValue($memTotalResult);
        $memAvail = $this->scalarValue($memAvailResult);
        $diskAvail = $this->scalarValue($diskAvailResult);
        $diskTotal = $this->scalarValue($diskTotalResult);

        return [
            'cpu_percent'        => round($this->scalarValue($cpuResult), 2),
            'memory_percent'     => $memTotal > 0 ? round((1 - $memAvail / $memTotal) * 100, 2) : 0,
            'memory_used_bytes'  => $memTotal - $memAvail,
            'memory_total_bytes' => $memTotal,
            'disk_percent'       => $diskTotal > 0 ? round((1 - $diskAvail / $diskTotal) * 100, 2) : 0,
            'disk_avail_bytes'   => $diskAvail,
            'disk_total_bytes'   => $diskTotal,
            'net_rx_bytes_sec'   => round($this->scalarValue($netRxResult), 2),
            'net_tx_bytes_sec'   => round($this->scalarValue($netTxResult), 2),
            'load1'              => round($this->scalarValue($loadResult), 2),
            'uptime_seconds'     => (int) $this->scalarValue($uptimeResult),
        ];
    }

    public function getAppMetrics(string $instance): array
    {
        $rpsResult       = $this->query("sum(irate(http_requests_total{instance=~\"{$instance}\"}[5m]))");
        $latP50Result    = $this->query("histogram_quantile(0.50, sum(irate(http_request_duration_seconds_bucket{instance=~\"{$instance}\"}[5m])) by (le))");
        $latP95Result    = $this->query("histogram_quantile(0.95, sum(irate(http_request_duration_seconds_bucket{instance=~\"{$instance}\"}[5m])) by (le))");
        $latP99Result    = $this->query("histogram_quantile(0.99, sum(irate(http_request_duration_seconds_bucket{instance=~\"{$instance}\"}[5m])) by (le))");
        $errRateResult   = $this->query("sum(irate(http_requests_total{instance=~\"{$instance}\",status=~\"5..\"}[5m])) / sum(irate(http_requests_total{instance=~\"{$instance}\"}[5m])) * 100");
        $err4xxResult    = $this->query("sum(irate(http_requests_total{instance=~\"{$instance}\",status=~\"4..\"}[5m]))");

        return [
            'requests_per_sec' => round($this->scalarValue($rpsResult), 2),
            'latency_p50_ms'   => round($this->scalarValue($latP50Result) * 1000, 2),
            'latency_p95_ms'   => round($this->scalarValue($latP95Result) * 1000, 2),
            'latency_p99_ms'   => round($this->scalarValue($latP99Result) * 1000, 2),
            'error_rate_5xx'   => round($this->scalarValue($errRateResult), 2),
            'errors_4xx_sec'   => round($this->scalarValue($err4xxResult), 2),
        ];
    }

    public function getDatabaseMetrics(string $instance): array
    {
        $connResult    = $this->query("pg_stat_activity_count{instance=~\"{$instance}\"}");
        $upResult      = $this->query("postgres_up{instance=~\"{$instance}\"}");
        $queryDurResult = $this->query("pg_stat_activity_max_tx_duration{instance=~\"{$instance}\"}");
        $slowResult    = $this->query("pg_stat_user_tables_n_dead_tup{instance=~\"{$instance}\"}");

        return [
            'connections'        => (int) $this->scalarValue($connResult),
            'up'                 => (bool) $this->scalarValue($upResult),
            'max_query_duration' => round($this->scalarValue($queryDurResult), 3),
            'slow_queries'       => (int) $this->scalarValue($slowResult),
        ];
    }

    public function getRedisMetrics(string $instance): array
    {
        $upResult       = $this->query("redis_up{instance=~\"{$instance}\"}");
        $memResult      = $this->query("redis_memory_used_bytes{instance=~\"{$instance}\"}");
        $hitsResult     = $this->query("irate(redis_keyspace_hits_total{instance=~\"{$instance}\"}[5m])");
        $missesResult   = $this->query("irate(redis_keyspace_misses_total{instance=~\"{$instance}\"}[5m])");
        $cmdsResult     = $this->query("irate(redis_commands_processed_total{instance=~\"{$instance}\"}[5m])");
        $evictResult    = $this->query("irate(redis_evicted_keys_total{instance=~\"{$instance}\"}[5m])");

        $hits   = $this->scalarValue($hitsResult);
        $misses = $this->scalarValue($missesResult);
        $total  = $hits + $misses;

        return [
            'up'              => (bool) $this->scalarValue($upResult),
            'memory_bytes'    => (int) $this->scalarValue($memResult),
            'hit_ratio'       => $total > 0 ? round(($hits / $total) * 100, 2) : 0,
            'commands_sec'    => round($this->scalarValue($cmdsResult), 2),
            'evictions_sec'   => round($this->scalarValue($evictResult), 2),
        ];
    }

    public function getContainerMetrics(string $containerName): array
    {
        $cpuResult     = $this->query("irate(container_cpu_usage_seconds_total{name=\"{$containerName}\"}[5m]) * 100");
        $memResult     = $this->query("container_memory_usage_bytes{name=\"{$containerName}\"}");
        $restartResult = $this->query("container_restart_count{name=\"{$containerName}\"}");

        return [
            'cpu_percent'     => round($this->scalarValue($cpuResult), 2),
            'memory_bytes'    => (int) $this->scalarValue($memResult),
            'restart_count'   => (int) $this->scalarValue($restartResult),
        ];
    }

    public function getKubernetesMetrics(string $namespace = ''): array
    {
        $nsFilter = $namespace ? ",namespace=\"{$namespace}\"" : '';
        $nsBrace  = $nsFilter ? '{' . ltrim($nsFilter, ',') . '}' : '';

        $podsRunning  = $this->query("count(kube_pod_status_phase{phase=\"Running\"{$nsFilter}})");
        $podsPending  = $this->query("count(kube_pod_status_phase{phase=\"Pending\"{$nsFilter}})");
        $podsFailed   = $this->query("count(kube_pod_status_phase{phase=\"Failed\"{$nsFilter}})");
        $restarts     = $this->query("sum(kube_pod_container_status_restarts_total{$nsBrace})");
        $nodeReady    = $this->query("kube_node_status_condition{condition=\"Ready\",status=\"true\"}");

        $allPodsResult  = $this->query("kube_pod_info{$nsBrace}");
        $pods = [];
        foreach ($allPodsResult as $item) {
            $podName = $item['metric']['pod'] ?? 'unknown';
            $pods[] = [
                'name'      => $podName,
                'namespace' => $item['metric']['namespace'] ?? 'default',
                'node'      => $item['metric']['node'] ?? 'unknown',
            ];
        }

        return [
            'pods_running' => (int) $this->scalarValue($podsRunning),
            'pods_pending' => (int) $this->scalarValue($podsPending),
            'pods_failed'  => (int) $this->scalarValue($podsFailed),
            'total_restarts' => (int) $this->scalarValue($restarts),
            'nodes_ready'  => count($nodeReady),
            'pods'         => $pods,
        ];
    }

    /**
     * Determine overall status of a single instance: 'up' | 'down' | 'unknown'.
     * Kept for the single-instance detail endpoint; buildVmList() uses the
     * bulk path instead and does not call this in a loop.
     */
    public function getInstanceStatus(string $instance): string
    {
        $upResult = $this->query("up{instance=\"{$instance}\"}");

        if (empty($upResult)) {
            return 'unknown';
        }

        $isUp = $this->scalarValue($upResult, -1);

        if ($isUp < 0) {
            return 'unknown';
        }

        return $isUp == 0 ? 'down' : 'up';
    }

    /**
     * Build VM list from Prometheus (topology shows VMs only).
     *
     * PERFORMANCE: this used to issue ~14 sequential HTTP queries PER VM
     * (status + layers + full node metrics), which on 15-20+ targets made
     * the page spin for minutes. It now issues a fixed ~13 bulk queries
     * TOTAL (one per metric, covering every instance at once via
     * `by (instance)` grouping), regardless of how many VMs exist.
     *
     * Instances whose status is 'unknown' (no up{} series reported yet)
     * are excluded here — they never reach the topology/search UI, and are
     * surfaced only through getAlerts().
     */
    public function buildVmList(): array
    {
        return Cache::remember('prom:vm_list', $this->cacheTtl, function () {
            $targets = $this->getTargets();
            $bulk    = $this->getBulkNodeMetrics();
            $byInstance = [];

            foreach ($targets as $target) {
                $labels   = $target['labels'] ?? [];
                $instance = $labels['instance'] ?? '';
                $job      = $labels['job'] ?? 'unknown';

                if (empty($instance)) {
                    continue;
                }

                $jobLower = strtolower($job);
                if (str_contains($jobLower, 'kube') || str_contains($jobLower, 'kubernetes')) {
                    continue;
                }

                $ip = explode(':', $instance)[0];

                if (!isset($byInstance[$ip])) {
                    $byInstance[$ip] = [
                        'instance' => $instance,
                        'job'      => $job,
                        'labels'   => $labels,
                        'jobs'     => [$job],
                        'services' => [$labels['alias'] ?? $job],
                        'health'   => $target['health'] ?? 'unknown',
                    ];
                } else {
                    $byInstance[$ip]['jobs'][] = $job;
                    $byInstance[$ip]['services'][] = $labels['alias'] ?? $job;
                    if (str_contains($jobLower, 'node') || str_contains($jobLower, 'server')) {
                        $byInstance[$ip]['instance'] = $instance;
                        $byInstance[$ip]['job']      = $job;
                        $byInstance[$ip]['labels']   = $labels;
                        $byInstance[$ip]['health']   = $target['health'] ?? $byInstance[$ip]['health'];
                    }
                }
            }

            $servers = [];

            foreach ($byInstance as $ip => $meta) {
                $instance = $meta['instance'];
                $job      = $meta['job'];
                $labels   = $meta['labels'];

                $data = $bulk[$instance] ?? null;

                $status = $data['status'] ?? 'unknown';

                if ($status === 'unknown' && in_array($meta['health'], ['up', 'down'], true)) {
                    $status = $meta['health'];
                }

                if ($status === 'unknown') {
                    continue;
                }

                $infra  = $data['infra'] ?? $this->emptyNodeMetrics();
                $layers = array_values(array_unique(array_merge(
                    $data['layers'] ?? ['infra'],
                    $this->layersFromJobs($meta['jobs'])
                )));
                $services = array_values(array_unique(array_filter(array_map(
                    fn ($service) => trim((string) $service),
                    $meta['services'] ?? []
                ))));

                $servers[] = [
                    'id'          => md5($ip),
                    'name'        => $labels['alias'] ?? $labels['hostname'] ?? $ip,
                    'instance'    => $instance,
                    'job'         => $job,
                    'type'        => 'vm',
                    'status'      => $status,
                    'cpu_percent' => $infra['cpu_percent'],
                    'ram_percent' => $infra['memory_percent'],
                    'ip'          => $ip,
                    'port'        => (int) (explode(':', $instance)[1] ?? 9100),
                    'labels'      => $labels,
                    'layers'      => $layers,
                    'jobs'        => array_values(array_unique($meta['jobs'])),
                    'services'    => $services,
                ];
            }

            usort($servers, fn ($a, $b) => strcmp($a['name'], $b['name']));

            return $servers;
        });
    }

    private function emptyNodeMetrics(): array
    {
        return [
            'cpu_percent'        => 0,
            'memory_percent'     => 0,
            'memory_used_bytes'  => 0,
            'memory_total_bytes' => 0,
            'disk_percent'       => 0,
            'disk_avail_bytes'   => 0,
            'disk_total_bytes'   => 0,
            'net_rx_bytes_sec'   => 0,
            'net_tx_bytes_sec'   => 0,
            'load1'              => 0,
            'uptime_seconds'     => 0,
        ];
    }

    public function buildServerList(): array
    {
        return $this->buildVmList();
    }

    public function detectVmLayers(string $instance): array
    {
        $layers = ['infra'];

        $upResult = $this->query("up{instance=\"{$instance}\"}");
        if ($this->scalarValue($upResult, 0) <= 0) {
            return $layers;
        }

        $appRps = $this->query("sum(irate(http_requests_total{instance=~\"{$instance}\"}[5m]))");
        if ($this->scalarValue($appRps) > 0) {
            $layers[] = 'app';
        }

        $pgUp = $this->query("postgres_up{instance=~\"{$instance}\"}");
        if ($this->scalarValue($pgUp) > 0) {
            $layers[] = 'database';
        }

        $redisUp = $this->query("redis_up{instance=~\"{$instance}\"}");
        if ($this->scalarValue($redisUp) > 0) {
            $layers[] = 'redis';
        }

        return array_values(array_unique($layers));
    }

    /**
     * Get active alerts based on thresholds + unknown/unreachable instances.
     * Rewritten to use bulk queries instead of per-instance loops.
     */
    public function getAlerts(): array
    {
        $alerts = [];

        $cpuHigh = $this->query(
            '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80'
        );
        foreach ($cpuHigh as $item) {
            $instance = $item['metric']['instance'] ?? 'unknown';
            $alerts[] = [
                'id'       => md5('cpu_' . $instance . time()),
                'severity' => 'warning',
                'type'     => 'cpu_high',
                'instance' => $instance,
                'message'  => "High CPU usage on {$instance}: " . round((float)$item['value'][1], 1) . "%",
                'value'    => (float) $item['value'][1],
                'at'       => now()->toIso8601String(),
            ];
        }

        $ramHighResult = $this->query(
            '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85'
        );
        foreach ($ramHighResult as $item) {
            $instance = $item['metric']['instance'] ?? 'unknown';
            $alerts[] = [
                'id'       => md5('ram_' . $instance . time()),
                'severity' => 'warning',
                'type'     => 'ram_high',
                'instance' => $instance,
                'message'  => "High RAM usage on {$instance}: " . round((float)$item['value'][1], 1) . "%",
                'value'    => (float) $item['value'][1],
                'at'       => now()->toIso8601String(),
            ];
        }

        $downResult = $this->query('up == 0');
        foreach ($downResult as $item) {
            $instance = $item['metric']['instance'] ?? 'unknown';
            $job      = $item['metric']['job'] ?? 'unknown';
            $alerts[] = [
                'id'       => md5('down_' . $instance . time()),
                'severity' => 'critical',
                'type'     => 'service_down',
                'instance' => $instance,
                'message'  => "Service DOWN: {$job} @ {$instance}",
                'value'    => 0,
                'at'       => now()->toIso8601String(),
            ];
        }

        // UNKNOWN — discovered targets with no up{} series at all.
        $upMap = $this->indexByInstance($this->query('up'));
        foreach ($this->getTargets() as $target) {
            $labels   = $target['labels'] ?? [];
            $instance = $labels['instance'] ?? '';
            $job      = $labels['job'] ?? 'unknown';

            if (empty($instance)) continue;

            $jobLower = strtolower($job);
            if (str_contains($jobLower, 'kube') || str_contains($jobLower, 'kubernetes')) continue;

            $health = $target['health'] ?? 'unknown';
            $hasUpSeries = array_key_exists($instance, $upMap);

            if (!$hasUpSeries && !in_array($health, ['up', 'down'], true)) {
                $alerts[] = [
                    'id'       => md5('unknown_' . $instance),
                    'severity' => 'warning',
                    'type'     => 'unknown_status',
                    'instance' => $instance,
                    'message'  => "Status unknown / not yet scraped: {$job} @ {$instance}",
                    'value'    => 0,
                    'at'       => now()->toIso8601String(),
                ];
            }
        }

        $crashResult = $this->query('kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1');
        foreach ($crashResult as $item) {
            $pod = $item['metric']['pod'] ?? 'unknown';
            $ns  = $item['metric']['namespace'] ?? 'default';
            $alerts[] = [
                'id'       => md5('crash_' . $pod . time()),
                'severity' => 'critical',
                'type'     => 'pod_crash',
                'instance' => "{$ns}/{$pod}",
                'message'  => "CrashLoopBackOff: pod {$pod} in namespace {$ns}",
                'value'    => 1,
                'at'       => now()->toIso8601String(),
            ];
        }

        usort($alerts, fn($a, $b) => $b['severity'] === 'critical' ? 1 : -1);

        return $alerts;
    }

    public function syncAlertHistory(array $alerts): void
    {
        $now = now();
        $seen = [];

        DB::transaction(function () use ($alerts, $now, &$seen) {
            foreach ($alerts as $alert) {
                $fingerprint = $this->alertFingerprint($alert);
                $seen[] = $fingerprint;

                $event = AlertEvent::query()->firstOrNew([
                    'fingerprint' => $fingerprint,
                ]);

                if (!$event->exists) {
                    $event->first_seen_at = $now;
                }

                $event->fill([
                    'severity' => $alert['severity'] ?? 'info',
                    'type' => $alert['type'] ?? 'unknown',
                    'instance' => $alert['instance'] ?? 'unknown',
                    'message' => $alert['message'] ?? '',
                    'value' => (float) ($alert['value'] ?? 0),
                    'status' => 'active',
                    'last_seen_at' => $now,
                    'resolved_at' => null,
                    'payload' => [
                        ...($event->payload ?? []),
                        ...$alert,
                        'occurrence_count' => (($event->payload['occurrence_count'] ?? 0) + 1),
                    ],
                ]);

                $event->save();
            }

            if (!empty($seen)) {
                AlertEvent::query()
                    ->where('status', 'active')
                    ->whereNotIn('fingerprint', $seen)
                    ->update([
                        'status' => 'resolved',
                        'resolved_at' => $now,
                        'updated_at' => $now,
                    ]);
            }
        });
    }

    private function alertFingerprint(array $alert): string
    {
        return md5(implode('|', [
            $alert['severity'] ?? 'info',
            $alert['type'] ?? 'unknown',
            $alert['instance'] ?? 'unknown',
        ]));
    }

    private function detectNodeType(string $job, array $labels): string
    {
        $job = strtolower($job);
        if (str_contains($job, 'kube') || str_contains($job, 'kubernetes')) return 'kubernetes';
        if (str_contains($job, 'docker') || str_contains($job, 'container')) return 'docker';
        if (str_contains($job, 'postgres') || str_contains($job, 'mysql') || str_contains($job, 'db')) return 'database';
        if (str_contains($job, 'redis') || str_contains($job, 'cache')) return 'cache';
        if (str_contains($job, 'node') || str_contains($job, 'server')) return 'vm';
        return 'app';
    }
}
