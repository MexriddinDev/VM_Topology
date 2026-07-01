export type NodeType = 'vm';

export type NodeStatus = 'up' |  'down' ;

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type VmLayer = 'infra' | 'app' | 'database' | 'redis';

export interface InfraMetrics {
    cpu_percent: number;
    memory_percent: number;
    memory_used_bytes: number;
    memory_total_bytes: number;
    disk_percent: number;
    disk_avail_bytes: number;
    disk_total_bytes: number;
    net_rx_bytes_sec: number;
    net_tx_bytes_sec: number;
    load1: number;
    uptime_seconds: number;
}

export interface AppMetrics {
    requests_per_sec: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    latency_p99_ms: number;
    error_rate_5xx: number;
    errors_4xx_sec: number;
}

export interface DatabaseMetrics {
    connections: number;
    up: boolean;
    max_query_duration: number;
    slow_queries: number;
}

export interface RedisMetrics {
    up: boolean;
    memory_bytes: number;
    hit_ratio: number;
    commands_sec: number;
    evictions_sec: number;
}

export interface Server {
    id: string;
    name: string;
    display_name?: string | null;
    instance: string;
    job: string;
    type: NodeType;
    status: NodeStatus;
    cpu_percent: number;
    ram_percent: number;
    ip: string;
    port: number;
    labels: Record<string, string>;
    layers?: VmLayer[];
    jobs?: string[];
}

export interface ServerMetrics {
    server: Server;
    layers: VmLayer[];
    infra: InfraMetrics;
    app: AppMetrics | null;
    database: DatabaseMetrics | null;
    redis: RedisMetrics | null;
    docker: null;
    kubernetes: null;
}

export interface Alert {
    id: string;
    severity: AlertSeverity;
    type: string;
    instance: string;
    message: string;
    value: number;
    at: string;
}

export interface AlertHistoryEvent {
    id: number;
    fingerprint: string;
    severity: AlertSeverity;
    type: string;
    instance: string;
    message: string;
    value: number;
    status: 'active' | 'resolved';
    first_seen_at: string;
    last_seen_at: string;
    resolved_at?: string | null;
    occurrence_count: number;
}

export interface TopologyNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Server;
}

export interface TopologyEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    animated?: boolean;
    label?: string;
}

export interface TopologyLink {
    id: number;
    target_topology_id: number;
    target_name?: string;
    source_server_id?: string;
    label?: string;
}

export interface TopologyDashboard {
    id: number;
    name: string;
    description?: string;
    is_default: boolean;
    sort_order: number;
    node_count: number;
    edge_count: number;
    updated_at?: string;
}

export interface TopologyLayout {
    topology?: TopologyDashboard;
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    links?: TopologyLink[];
    viewport: { x: number; y: number; zoom: number };
}

export type ThemeMode = 'dark' | 'light';
