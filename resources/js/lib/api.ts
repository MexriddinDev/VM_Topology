import type {
    Server,
    ServerMetrics,
    TopologyLayout,
    TopologyDashboard,
    Alert,
    VmLayer,
} from '../types';

// ─── HTTP Client ──────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        ...options,
    });

    if (!res.ok) {
        throw new Error(`API ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();

    // universal normalize
    return (json.data ?? json.result ?? json) as T;
}

/**
 * Normalizes a raw server status coming from the backend into the strict
 * NodeStatus union ('up' | 'down').
 *
 * ✅ FIX: PrometheusService::buildVmList() now returns the status directly
 * as 'up' or 'down' (it already excludes 'unknown' instances before they
 * ever reach this endpoint). The old code here compared against the
 * legacy value 'healthy', which the backend no longer sends — so every
 * single server, even ones genuinely 'up', was being forced to 'down' in
 * the UI. This was the root cause of servers looking permanently offline.
 */
function normalizeStatus(raw: unknown): 'up' | 'down' {
    return raw === 'up' ? 'up' : 'down';
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const api = {
    // Servers
    getServers: async (params?: { status?: string; search?: string }) => {
        const qs = new URLSearchParams();

        if (params?.status) qs.append('status', params.status);
        if (params?.search) qs.append('search', params.search);

        const data = await fetchJSON<any[]>(
            `/servers${qs.toString() ? `?${qs.toString()}` : ''}`
        );

        return data.map((s: any) => ({
            id: s.id,
            name: s.name,
            instance: s.instance ?? `${s.ip}:9100`,
            job: s.job ?? 'node',
            type: s.type ?? 'vm',
            status: normalizeStatus(s.status),

            cpu_percent: Number(s.cpu_percent ?? 0),
            ram_percent: Number(s.ram_percent ?? 0),

            ip: s.ip,
            port: s.port ?? 9100,
            labels: s.labels ?? {},
            layers: s.layers ?? ['infra'],
            jobs: s.jobs ?? [],
        }));
    },
    getServerMetrics: (id: string) =>
        fetchJSON<ServerMetrics>(`/server/${id}/metrics`),

    // Topologies
    listTopologies: () =>
        fetchJSON<TopologyDashboard[]>('/topologies'),

    createTopology: (data: { name: string; description?: string }) =>
        fetchJSON<TopologyDashboard>('/topologies', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getTopology: (id?: number) =>
        fetchJSON<TopologyLayout>(`/topology${id != null ? `/${id}` : ''}`),

    updateTopology: (
        id: number,
        data: Partial<{ name: string; description: string; is_default: boolean }>
    ) =>
        fetchJSON<TopologyDashboard>(`/topology/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteTopology: (id: number) =>
        fetch(`${BASE_URL}/topology/${id}`, { method: 'DELETE' }).then((r) =>
            r.json()
        ),

    saveTopology: (
        id: number,
        layout: Omit<TopologyLayout, 'topology' | 'links'> & { action?: string }
    ) =>
        fetchJSON<{ success: boolean }>(`/topology/${id}/save`, {
            method: 'POST',
            body: JSON.stringify(layout),
        }),

    // Topology nodes
    addNodeToTopology: (
        topologyId: number,
        serverId: string,
        position: { x: number; y: number }
    ) =>
        fetchJSON(`/topology/${topologyId}/nodes`, {
            method: 'POST',
            body: JSON.stringify({ server_id: serverId, position }),
        }),

    removeNodeFromTopology: (topologyId: number, serverId: string) =>
        fetch(`${BASE_URL}/topology/${topologyId}/nodes/${serverId}`, {
            method: 'DELETE',
        }),

    // Topology links
    linkTopologies: (
        sourceId: number,
        targetId: number,
        label?: string,
        sourceServerId?: string
    ) =>
        fetchJSON(`/topology/${sourceId}/links`, {
            method: 'POST',
            body: JSON.stringify({
                target_topology_id: targetId,
                label,
                source_server_id: sourceServerId,
            }),
        }),

    // Alerts
    getAlerts: () => fetchJSON<Alert[]>('/alerts'),
};

// ─── Mock VM Specs (only used when VITE_USE_MOCK=true) ───────────────────────

type VmStatus = 'healthy' | 'warning' | 'down';

interface VmSpec {
    id:     string;
    name:   string;
    ip:     string;
    status: VmStatus;
    layers: VmLayer[];
    cpu:    number;
    ram:    number;
}

const DEMO_VM_SPECS: VmSpec[] = [
    { id: 'vm-01', name: 'nginx-lb-01',      ip: '10.20.1.10', status: 'healthy', layers: ['infra', 'app'],              cpu: 22, ram: 41 },
    { id: 'vm-02', name: 'api-gateway-01',   ip: '10.20.1.11', status: 'healthy', layers: ['infra', 'app'],              cpu: 38, ram: 55 },
    { id: 'vm-03', name: 'api-gateway-02',   ip: '10.20.1.12', status: 'warning', layers: ['infra', 'app'],              cpu: 81, ram: 72 },
    { id: 'vm-04', name: 'auth-svc-01',      ip: '10.20.1.13', status: 'healthy', layers: ['infra', 'app', 'redis'],     cpu: 29, ram: 48 },
    { id: 'vm-05', name: 'postgres-primary', ip: '10.20.2.10', status: 'healthy', layers: ['infra', 'database'],         cpu: 18, ram: 62 },
    { id: 'vm-06', name: 'postgres-replica', ip: '10.20.2.11', status: 'healthy', layers: ['infra', 'database'],         cpu: 14, ram: 58 },
    { id: 'vm-07', name: 'redis-cache-01',   ip: '10.20.2.12', status: 'healthy', layers: ['infra', 'redis'],            cpu:  8, ram: 35 },
    { id: 'vm-08', name: 'redis-cache-02',   ip: '10.20.2.13', status: 'warning', layers: ['infra', 'redis'],            cpu: 76, ram: 88 },
    { id: 'vm-09', name: 'worker-batch-01',  ip: '10.20.3.10', status: 'healthy', layers: ['infra', 'app'],              cpu: 45, ram: 51 },
    { id: 'vm-10', name: 'worker-batch-02',  ip: '10.20.3.11', status: 'down',    layers: ['infra', 'app'],              cpu:  0, ram:  0 },
    { id: 'vm-11', name: 'worker-batch-03',  ip: '10.20.3.12', status: 'healthy', layers: ['infra', 'app'],              cpu: 33, ram: 44 },
    { id: 'vm-12', name: 'billing-svc-01',   ip: '10.20.3.13', status: 'healthy', layers: ['infra', 'app', 'database'],  cpu: 27, ram: 53 },
    { id: 'vm-13', name: 'monitor-01',       ip: '10.20.4.10', status: 'healthy', layers: ['infra'],                     cpu: 11, ram: 28 },
    { id: 'vm-14', name: 'vault-01',         ip: '10.20.4.11', status: 'healthy', layers: ['infra', 'app'],              cpu: 19, ram: 36 },
    { id: 'vm-15', name: 'kafka-broker-01',  ip: '10.20.4.12', status: 'warning', layers: ['infra', 'app'],              cpu: 68, ram: 79 },
    { id: 'vm-16', name: 'kafka-broker-02',  ip: '10.20.4.13', status: 'down',    layers: ['infra', 'app'],              cpu:  0, ram:  0 },
    { id: 'vm-17', name: 'elastic-01',       ip: '10.20.5.10', status: 'healthy', layers: ['infra', 'app', 'database'],  cpu: 42, ram: 67 },
    { id: 'vm-18', name: 'elastic-02',       ip: '10.20.5.11', status: 'healthy', layers: ['infra', 'app', 'database'],  cpu: 39, ram: 64 },
    { id: 'vm-19', name: 'backup-01',        ip: '10.20.5.12', status: 'down',    layers: ['infra'],                     cpu:  0, ram:  0 },
    { id: 'vm-20', name: 'jump-host-01',     ip: '10.20.5.13', status: 'healthy', layers: ['infra'],                     cpu:  5, ram: 18 },
];

function specToServer(spec: VmSpec): Server {
    const zone = spec.ip.split('.')[2];

    return {
        id: spec.id,
        name: spec.name,
        instance: `${spec.ip}:9100`,
        job: 'node',
        type: 'vm',
        status: spec.status === 'healthy' || spec.status === 'warning' ? 'up' : 'down',
        cpu_percent: spec.cpu,
        ram_percent: spec.ram,
        ip: spec.ip,
        port: 9100,
        labels: { zone },
        layers: spec.layers,
        jobs: [
            'node',
            ...spec.layers
                .filter((l) => l !== 'infra')
                .map((l) => (l === 'database' ? 'postgres' : l)),
        ],
    };
}

export const mockServers: Server[] = DEMO_VM_SPECS.map(specToServer);

const NOW = new Date().toISOString();

export const mockAlerts: Alert[] = [
    { id: 'a1', severity: 'critical', type: 'service_down', instance: '10.20.3.11:9100', message: 'OFFLINE: worker-batch-02', value: 0, at: NOW },
    { id: 'a2', severity: 'critical', type: 'service_down', instance: '10.20.4.13:9100', message: 'OFFLINE: kafka-broker-02', value: 0, at: NOW },
    { id: 'a3', severity: 'critical', type: 'service_down', instance: '10.20.5.12:9100', message: 'OFFLINE: backup-01', value: 0, at: NOW },
    { id: 'a4', severity: 'warning', type: 'cpu_high', instance: '10.20.1.12:9100', message: 'High CPU: api-gateway-02 (81%)', value: 81, at: NOW },
    { id: 'a5', severity: 'warning', type: 'ram_high', instance: '10.20.2.13:9100', message: 'High RAM: redis-cache-02 (88%)', value: 88, at: NOW },
    { id: 'a6', severity: 'warning', type: 'cpu_high', instance: '10.20.4.12:9100', message: 'High CPU: kafka-broker-01 (68%)', value: 68, at: NOW },
];

export const mockTopologies: TopologyDashboard[] = [
    { id: 1, name: 'Production Network', description: '20 VM production topology', is_default: true, sort_order: 0, node_count: 20, edge_count: 24, updated_at: NOW },
    { id: 2, name: 'Staging Cluster', description: 'Staging environment', is_default: false, sort_order: 1, node_count: 0, edge_count: 0, updated_at: NOW },
];

const DEMO_EDGES: TopologyLayout['edges'] = [
    { id: 'e01', source: 'vm-01', target: 'vm-02', animated: true, label: 'HTTP' },
    { id: 'e02', source: 'vm-02', target: 'vm-03', animated: true },
    { id: 'e03', source: 'vm-02', target: 'vm-04', animated: true, label: 'Auth' },
    { id: 'e04', source: 'vm-04', target: 'vm-07', animated: true, label: 'Cache' },
    { id: 'e05', source: 'vm-03', target: 'vm-05', animated: true, label: 'SQL' },
    { id: 'e06', source: 'vm-05', target: 'vm-06', animated: true, label: 'Repl' },
    { id: 'e07', source: 'vm-07', target: 'vm-08', animated: true },
    { id: 'e08', source: 'vm-09', target: 'vm-10', animated: true },
    { id: 'e09', source: 'vm-09', target: 'vm-11', animated: true },
    { id: 'e10', source: 'vm-11', target: 'vm-12', animated: true, label: 'API' },
    { id: 'e11', source: 'vm-12', target: 'vm-05', animated: true, label: 'DB' },
    { id: 'e12', source: 'vm-01', target: 'vm-09', animated: true, label: 'Proxy' },
    { id: 'e13', source: 'vm-13', target: 'vm-17', animated: true },
    { id: 'e14', source: 'vm-17', target: 'vm-18', animated: true, label: 'Cluster' },
    { id: 'e15', source: 'vm-15', target: 'vm-16', animated: true },
    { id: 'e16', source: 'vm-15', target: 'vm-11', animated: true, label: 'Events' },
    { id: 'e17', source: 'vm-14', target: 'vm-04', animated: true },
    { id: 'e18', source: 'vm-19', target: 'vm-05', animated: true, label: 'Backup' },
    { id: 'e19', source: 'vm-20', target: 'vm-01', animated: true, label: 'SSH' },
    { id: 'e20', source: 'vm-03', target: 'vm-15', animated: true },
    { id: 'e21', source: 'vm-06', target: 'vm-12', animated: true },
    { id: 'e22', source: 'vm-08', target: 'vm-04', animated: true },
    { id: 'e23', source: 'vm-10', target: 'vm-16', animated: false },
    { id: 'e24', source: 'vm-18', target: 'vm-13', animated: true, label: 'Logs' },
];

/**
 * Lays out servers in a 5-column grid.
 * topologyId=1 → full 20-node production topology (mock mode only)
 * topologyId=2 → empty staging topology
 */
export function buildMockTopology(topologyId = 1): TopologyLayout {
    const pool = topologyId === 1 ? mockServers : [];

    const nodes = pool.map((server, i) => ({
        id:   server.id,
        type: 'infraNode',
        position: {
            x: 60 + (i % 5) * 260,
            y: 60 + Math.floor(i / 5) * 210,
        },
        data: server,
    }));

    return {
        topology: mockTopologies.find((t) => t.id === topologyId) ?? mockTopologies[0],
        nodes,
        edges:    topologyId === 1 ? DEMO_EDGES : [],
        links:    [],
        viewport: { x: 0, y: 0, zoom: 0.72 },
    };
}

export function mockMetrics(server: Server): ServerMetrics {
    const layers  = server.layers ?? ['infra'];
    const alive   = server.status !== 'down';

    const GB = 1024 ** 3;
    const MB = 1024 ** 2;

    return {
        server,
        layers,
        infra: {
            cpu_percent:      server.cpu_percent,
            memory_percent:   server.ram_percent,
            memory_used_bytes:  (server.ram_percent / 100) * 32 * GB,
            memory_total_bytes: 32 * GB,
            disk_percent:     alive ? 35 + (server.cpu_percent % 40) : 0,
            disk_avail_bytes: 120 * GB,
            disk_total_bytes: 200 * GB,
            net_rx_bytes_sec: alive ? 2.4 * MB : 0,
            net_tx_bytes_sec: alive ? 1.1 * MB : 0,
            load1:            alive ? server.cpu_percent / 30 : 0,
            uptime_seconds:   alive ? 864_321 : 0,
        },
        app: layers.includes('app')
            ? {
                requests_per_sec: alive ? 142.3 : 0,
                latency_p50_ms:   alive ? 12.4  : 0,
                latency_p95_ms:   alive ? 87.2  : 0,
                latency_p99_ms:   alive ? 234.5 : 0,
                error_rate_5xx:   alive ? 0.3 : 100,
                errors_4xx_sec:   alive ? 3.2 : 0,
            }
            : null,
        database: layers.includes('database')
            ? {
                connections:       alive ? 47 : 0,
                up:                alive,
                max_query_duration: alive ? 0.043 : 0,
                slow_queries:      alive ? 1 : 0,
            }
            : null,
        redis: layers.includes('redis')
            ? {
                up:            alive,
                memory_bytes:  512 * MB,
                hit_ratio:     alive ? 96.4 : 0,
                commands_sec:  alive ? 8_420 : 0,
                evictions_sec: alive ? 0 : 0,
            }
            : null,
        docker:     null,
        kubernetes: null,
    };
}

const topologyStore = new Map<number, TopologyLayout>([
    [1, buildMockTopology(1)],
    [2, buildMockTopology(2)],
]);

export const mockApi = {
    saveTopology(
        id: number,
        layout: Omit<TopologyLayout, 'topology' | 'links'>
    ): Promise<{ success: boolean }> {
        const existing = topologyStore.get(id) ?? buildMockTopology(id);
        topologyStore.set(id, {
            ...existing,
            nodes:    layout.nodes,
            edges:    layout.edges,
            viewport: layout.viewport,
        });
        return Promise.resolve({ success: true });
    },

    getStoredTopology(id: number): TopologyLayout {
        return topologyStore.get(id) ?? buildMockTopology(id);
    },

    resetTopology(id: number): void {
        topologyStore.set(id, buildMockTopology(id));
    },
};
