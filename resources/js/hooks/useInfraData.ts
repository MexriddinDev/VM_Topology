import { useState, useEffect, useCallback, useRef } from 'react';
import {
    api,
    mockServers,
    mockAlerts,
    mockMetrics,
    mockTopologies,
    buildMockTopology,
    mockApi,
} from '../lib/api';

import type {
    Server,
    Alert,
    AlertHistoryEvent,
    ServerMetrics,
    TopologyLayout,
    TopologyDashboard
} from '../types';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const POLL_INTERVAL = 12000;

// ─────────────────────────────────────────────
// 🔥 NORMALIZER (ENG MUHIM QISM)
// ─────────────────────────────────────────────
function normalizeServer(s: any): Server {
    return {
        id: s.id,
        name: s.name,
        display_name: s.display_name ?? null,
        instance: s.instance ?? `${s.ip}:9100`,
        job: s.job ?? 'node',
        type: s.type ?? 'vm',
        status: s.status ?? 'down',
        cpu_percent: Number(s.cpu_percent ?? 0),
        ram_percent: Number(s.ram_percent ?? 0),
        ip: s.ip,
        port: s.port ?? 9100,
        labels: s.labels ?? {},
        layers: s.layers ?? ['infra'],
        jobs: s.jobs ?? [],
        services: s.services ?? s.jobs ?? [],
    };
}

// ─────────────────────────────────────────────
// SERVERS HOOK
// ─────────────────────────────────────────────
export function useServers(filters?: { status?: string; search?: string }) {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const loadedOnceRef = useRef(false);

    const fetchServers = useCallback(async () => {
        try {
            let data: any[] = [];

            if (USE_MOCK) {
                data = [...mockServers];
            } else {
                const res = await api.getServers(filters);
                data = Array.isArray(res) ? res : [];
            }

            // FILTER
            if (filters?.status) {
                data = data.filter((s) => s.status === filters.status);
            }

            if (filters?.search) {
                const q = filters.search.toLowerCase();
                data = data.filter(
                    (s) =>
                        (s.name ?? '').toLowerCase().includes(q) ||
                        (s.ip ?? '').includes(q) ||
                        (s.instance ?? '').includes(q)
                );
            }

            // 🔥 FIX: TYPE SAFE SET
            setServers(data.map(normalizeServer));
        } finally {
            if (!loadedOnceRef.current) {
                loadedOnceRef.current = true;
                setLoading(false);
            }
        }
    }, [filters?.status, filters?.search]);

    useEffect(() => {
        fetchServers();

        if (!USE_MOCK) {
            const interval = setInterval(fetchServers, POLL_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [fetchServers]);

    return { servers, loading, refresh: fetchServers };
}

// ─────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────
export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const loadedOnceRef = useRef(false);

    useEffect(() => {
        if (USE_MOCK) {
            setAlerts(mockAlerts);
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await api.getAlerts();
                setAlerts(Array.isArray(data) ? data : []);
            } finally {
                if (!loadedOnceRef.current) {
                    loadedOnceRef.current = true;
                    setLoading(false);
                }
            }
        };

        load();
        const interval = setInterval(load, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return { alerts, loading };
}

export function useAlertHistory(filters: {
    severity?: string;
    type?: string;
    status?: string;
    q?: string;
    range?: string;
}) {
    const [alerts, setAlerts] = useState<AlertHistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const loadedOnceRef = useRef(false);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await api.getAlertHistory({ ...filters, limit: 1000 });
            setAlerts(Array.isArray(data) ? data : []);
        } finally {
            if (!loadedOnceRef.current) {
                loadedOnceRef.current = true;
                setLoading(false);
            }
        }
    }, [filters.severity, filters.type, filters.status, filters.q, filters.range]);

    useEffect(() => {
        fetchHistory();
        if (!USE_MOCK) {
            const interval = setInterval(fetchHistory, POLL_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [fetchHistory]);

    return { alerts, loading, refresh: fetchHistory };
}

// ─────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────
export function useServerMetrics(serverId: string | null) {
    const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const loadedOnceRef = useRef(false);

    useEffect(() => {
        if (!serverId) return;

        if (!loadedOnceRef.current) {
            setLoading(true);
        }

        if (USE_MOCK) {
            const server = mockServers.find((s) => s.id === serverId);
            if (server) setMetrics(mockMetrics(server));
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await api.getServerMetrics(serverId);
                setMetrics(data as ServerMetrics);
            } finally {
                if (!loadedOnceRef.current) {
                    loadedOnceRef.current = true;
                    setLoading(false);
                }
            }
        };

        load();
        const interval = setInterval(load, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [serverId]);

    return { metrics, loading };
}

// ─────────────────────────────────────────────
// TOPOLOGIES
// ─────────────────────────────────────────────
export function useTopologies() {
    const [topologies, setTopologies] = useState<TopologyDashboard[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            if (USE_MOCK) {
                setTopologies(mockTopologies);
            } else {
                const data = await api.listTopologies();
                setTopologies(Array.isArray(data) ? data : []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const createTopology = useCallback(
        async (name: string) => {
            if (USE_MOCK) {
                const next: TopologyDashboard = {
                    id: Math.max(0, ...mockTopologies.map((t) => t.id)) + 1,
                    name,
                    description: undefined,
                    is_default: topologies.length === 0,
                    sort_order: topologies.length,
                    node_count: 0,
                    edge_count: 0,
                    updated_at: new Date().toISOString(),
                };
                setTopologies((prev) => [...prev, next]);
                return next;
            }

            const created = await api.createTopology({ name });
            setTopologies((prev) => [...prev, created]);
            return created;
        },
        [topologies.length]
    );

    const deleteTopology = useCallback(
        async (id: number) => {
            if (USE_MOCK) {
                setTopologies((prev) => prev.filter((t) => t.id !== id));
                return;
            }

            await api.deleteTopology(id);
            setTopologies((prev) => prev.filter((t) => t.id !== id));
        },
        []
    );

    return { topologies, loading, refresh, createTopology, deleteTopology };
}

// ─────────────────────────────────────────────
// SINGLE TOPOLOGY
// ─────────────────────────────────────────────
export function useTopology(topologyId: number | null) {
    const [topology, setTopology] = useState<TopologyLayout | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const load = useCallback(async () => {
        if (!topologyId) return;

        setLoading(true);

        try {
            if (USE_MOCK) {
                setTopology(mockApi.getStoredTopology(topologyId));
            } else {
                const data = await api.getTopology(topologyId);
                setTopology(data as TopologyLayout);
            }
        } catch {
            setTopology(buildMockTopology(topologyId));
        } finally {
            setLoading(false);
        }
    }, [topologyId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveTopology = useCallback(
        async (layout: Omit<TopologyLayout, 'topology' | 'links'>, action = 'auto_save') => {
            if (!topologyId) return false;

            setSaveError(null);

            try {
                if (USE_MOCK) {
                    await mockApi.saveTopology(topologyId, layout);
                } else {
                    await api.saveTopology(topologyId, { ...layout, action });
                }

                setLastSavedAt(new Date());
                return true;
            } catch (e) {
                setSaveError(e instanceof Error ? e.message : 'Save failed');
                return false;
            }
        },
        [topologyId]
    );

    return {
        topology,
        loading,
        saveTopology,
        saveError,
        lastSavedAt,
        reload: load,
    };
}
