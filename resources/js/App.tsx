import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

import Sidebar, { Page } from './components/ui/Sidebar';
import TopologyCanvas from './components/topology/TopologyCanvas';
import TopologyDashboardBar from './components/topology/TopologyDashboardBar';
import NodeDetailPanel from './components/panels/NodeDetailPanel';
import ServerListPage from './pages/ServerListPage';
import AlertsPage from './pages/AlertsPage';
import AlertToast from './components/alerts/AlertToast';

import { useServers, useAlerts, useAlertHistory, useTopologies } from './hooks/useInfraData';
import { useTheme } from './context/ThemeContext';
import { api } from './lib/api';

import type { NodeStatus, VmLayer, Server } from './types';

export default function App() {
    const [page, setPage] = useState<Page>('topology');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeTopologyId, setActiveTopologyId] = useState<number | null>(null);
    const [canvasServerIds, setCanvasServerIds] = useState<string[]>([]);
    const [pendingAddServer, setPendingAddServer] = useState<{ token: number; server: Server } | null>(null);

    const { theme, toggleTheme, isDark } = useTheme();
    const { servers } = useServers();
    const { alerts } = useAlerts();
    const { alerts: alertHistory } = useAlertHistory({ status: 'active', range: 'all' });
    const { topologies, createTopology, deleteTopology, refresh: refreshTopologies } = useTopologies();

    useEffect(() => {
        if (!topologies.length || activeTopologyId != null) return;
        const fallback = topologies.find((t) => t.is_default) ?? topologies[0];
        setActiveTopologyId(fallback.id);
    }, [topologies, activeTopologyId]);

    const liveServers = React.useMemo(() => {
        const map: Record<string, { status: NodeStatus; cpu_percent: number; ram_percent: number; layers?: VmLayer[] }> = {};
        servers.forEach((s) => {
            map[s.id] = { status: s.status, cpu_percent: s.cpu_percent, ram_percent: s.ram_percent, layers: s.layers };
        });
        return map;
    }, [servers]);

    const downCount = servers.filter((s) => s.status === 'down').length;
    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    const pageSubtitle =
        page === 'topology' ? 'Visual map' : page === 'servers' ? 'VM inventory' : 'Incident feed';

    const handleCreateTopology = async (name: string) => {
        const created = await createTopology(name);
        setActiveTopologyId(created.id);
    };

    const handleLinkTopologies = async (targetId: number) => {
        if (!activeTopologyId) return;
        await api.linkTopologies(activeTopologyId, targetId, 'Linked dashboard');
        await refreshTopologies();
    };

    const queueAddServer = (server: Server) => {
        if (page !== 'topology') setPage('topology');
        if (!activeTopologyId && topologies.length > 0) {
            const fallback = topologies.find((t) => t.is_default) ?? topologies[0];
            setActiveTopologyId(fallback.id);
        }
        setPendingAddServer({ token: Date.now(), server });
    };

    const shellBg = isDark ? '#141414' : '#ebebeb';
    const barBg = isDark ? '#1a1a1a' : '#ffffff';
    const barBorder = isDark ? '#333333' : '#d4d4d4';
    const textH = isDark ? 'text-neutral-100' : 'text-neutral-900';
    const textM = isDark ? 'text-neutral-400' : 'text-neutral-600';

    return (
        <div className={`flex h-screen w-screen overflow-hidden ${textH}`} style={{ background: shellBg }}>
            <Sidebar page={page} setPage={setPage} alertCount={alerts.length} />

            <div className="flex-1 flex flex-col min-w-0">
                <header
                    className="flex items-center gap-4 flex-shrink-0 border-b px-6 py-4"
                    style={{ background: isDark ? '#0b1220' : barBg, borderColor: isDark ? '#243047' : barBorder }}
                >
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">Panel</div>
                            <div className="mt-1 text-sm font-black text-white">
                                {page === 'topology' ? 'Topology' : page === 'servers' ? 'Servers' : 'Alerts'}
                            </div>
                        </div>
                        <div className="hidden text-sm text-slate-400 md:block">{pageSubtitle}</div>
                    </div>

                    <div className="flex-1" />

                    {downCount > 0 && (
                        <span className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-[#2a1515] px-4 py-2 text-sm font-bold text-red-400">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            {downCount} offline
                        </span>
                    )}
                    {criticalCount > 0 && (
                        <span className="rounded-2xl border border-red-500/40 bg-[#2a1515] px-4 py-2 text-sm font-bold text-red-400">
                            {criticalCount} critical
                        </span>
                    )}
                    <span className="rounded-2xl border border-emerald-500/30 bg-[#10251a] px-4 py-2 text-sm font-bold text-emerald-400">
                        {servers.length} VMs
                    </span>

                    <button
                        onClick={toggleTheme}
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                            isDark ? 'border-slate-600 bg-[#111827] text-slate-200' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </header>

                {page === 'topology' && topologies.length > 0 && (
                    <TopologyDashboardBar
                        topologies={topologies}
                        activeId={activeTopologyId}
                        onSelect={(id) => setActiveTopologyId(id)}
                        onCreate={handleCreateTopology}
                        onDelete={deleteTopology}
                        onLink={handleLinkTopologies}
                        allServers={servers}
                        canvasServerIds={new Set(canvasServerIds)}
                        onAddServer={queueAddServer}
                    />
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={page}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex min-h-0"
                    >
                        {page === 'topology' && activeTopologyId && (
                            <TopologyCanvas
                                topologyId={activeTopologyId}
                                onNodeClick={setSelectedNodeId}
                                liveServers={liveServers}
                                allServers={servers}
                                onCanvasServersChange={setCanvasServerIds}
                                pendingAddServer={pendingAddServer}
                                onPendingAddServerHandled={() => setPendingAddServer(null)}
                            />
                        )}
                        {page === 'servers' && <ServerListPage onServerClick={setSelectedNodeId} />}
                        {page === 'alerts' && <AlertsPage />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <NodeDetailPanel serverId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
            <AlertToast alerts={alertHistory} />
        </div>
    );
}
