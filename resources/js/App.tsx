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

import { useServers, useAlerts, useTopologies } from './hooks/useInfraData';
import { useTheme } from './context/ThemeContext';
import { api } from './lib/api';

import type { NodeStatus, VmLayer } from './types';

export default function App() {
    const [page, setPage] = useState<Page>('topology');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeTopologyId, setActiveTopologyId] = useState<number | null>(null);

    const { theme, toggleTheme, isDark } = useTheme();
    const { servers } = useServers();
    const { alerts } = useAlerts();
    const { topologies, createTopology, deleteTopology, refresh: refreshTopologies } = useTopologies();

    useEffect(() => {
        if (topologies.length && !activeTopologyId) {
            const def = topologies.find((t) => t.is_default) ?? topologies[0];
            setActiveTopologyId(def.id);
        }
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

    const handleCreateTopology = async (name: string) => {
        const created = await createTopology(name);
        setActiveTopologyId(created.id);
    };

    const handleLinkTopologies = async (targetId: number) => {
        if (!activeTopologyId) return;
        await api.linkTopologies(activeTopologyId, targetId, 'Linked dashboard');
        await refreshTopologies();
    };

    const shellBg = isDark ? '#141414' : '#ebebeb';
    const barBg = isDark ? '#1a1a1a' : '#ffffff';
    const barBorder = isDark ? '#333333' : '#d4d4d4';
    const textH = isDark ? 'text-neutral-100' : 'text-neutral-900';
    const textM = isDark ? 'text-neutral-400' : 'text-neutral-600';

    return (
        <div className={`flex h-screen w-screen overflow-hidden ${textH}`} style={{ background: shellBg }}>
            <Sidebar page={page} setPage={setPage} alertCount={alerts.length} isDark={isDark} />

            <div className="flex-1 flex flex-col min-w-0">
                <header
                    className="flex items-center gap-4 px-6 py-3.5 flex-shrink-0 border-b"
                    style={{ background: barBg, borderColor: barBorder }}
                >
                    <span className={`text-sm font-bold uppercase tracking-widest ${textM}`}>
                        {page === 'topology' ? 'Network Topology' : page === 'servers' ? 'VM Inventory' : 'Alerts'}
                    </span>
                    <div className="flex-1" />

                    {downCount > 0 && (
                        <span className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            {downCount} offline
                        </span>
                    )}
                    {criticalCount > 0 && (
                        <span className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-sm font-bold">
                            {criticalCount} critical
                        </span>
                    )}
                    <span className={`text-sm font-medium ${textM}`}>{servers.length} VMs</span>

                    <button
                        onClick={toggleTheme}
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </header>

                {page === 'topology' && topologies.length > 0 && (
                    <TopologyDashboardBar
                        topologies={topologies}
                        activeId={activeTopologyId}
                        onSelect={setActiveTopologyId}
                        onCreate={handleCreateTopology}
                        onDelete={deleteTopology}
                        onLink={handleLinkTopologies}
                    />
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${page}-${activeTopologyId}`}
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
                            />
                        )}
                        {page === 'servers' && <ServerListPage onServerClick={setSelectedNodeId} />}
                        {page === 'alerts' && <AlertsPage />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <NodeDetailPanel serverId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
            <AlertToast alerts={alerts} />
        </div>
    );
}
