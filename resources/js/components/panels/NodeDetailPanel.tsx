import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Activity, Database, Zap, Layers, AlertOctagon, ArrowLeft } from 'lucide-react';
import type { ServerMetrics, VmLayer } from '../../types';
import { useServerMetrics } from '../../hooks/useInfraData';
import { useTheme } from '../../context/ThemeContext';
import MetricGauge from '../ui/MetricGauge';
import VmLayerTopology from './VmLayerTopology';

function formatBytes(bytes: number): string {
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h`;
}

function MetricRow({ label, value, unit, isDark }: {
    label: string; value: number | string; unit?: string; isDark: boolean;
}) {
    return (
        <div className={`flex justify-between py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
            <span className={`text-base font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value}{unit && ` ${unit}`}
            </span>
        </div>
    );
}

interface Props {
    serverId: string | null;
    onClose: () => void;
}

export default function NodeDetailPanel({ serverId, onClose }: Props) {
    const { metrics, loading } = useServerMetrics(serverId);
    const { isDark } = useTheme();

    const status = metrics?.server.status ?? 'unknown';
    const isDown = status === 'down';

    const bg = isDark ? '#0f1419' : '#f4f6f9';
    const card = isDark ? '#1a2332' : '#ffffff';
    const border = isDark ? '#2d3a4f' : '#e2e8f0';
    const textH = isDark ? 'text-slate-100' : 'text-slate-900';
    const textM = isDark ? 'text-slate-400' : 'text-slate-600';

    return (
        <AnimatePresence>
            {serverId && (
                <motion.div
                    key="detail-fullscreen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col"
                    style={{ background: bg }}
                >
                    {/* Header */}
                    <header
                        className="flex items-center gap-4 px-8 py-5 border-b flex-shrink-0"
                        style={{
                            background: isDown ? (isDark ? '#2a1515' : '#fef2f2') : card,
                            borderColor: isDown ? '#dc2626' : border,
                        }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-base font-semibold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <ArrowLeft size={20} /> Back to topology
                        </button>

                        {metrics && (
                            <div className="flex-1 min-w-0">
                                <h1 className={`text-2xl font-black truncate ${textH}`}>{metrics.server.name}</h1>
                                <p className={`text-lg font-mono mt-0.5 ${textM}`}>{metrics.server.ip}:{metrics.server.port}</p>
                            </div>
                        )}

                        {metrics && (
                            <div
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-black uppercase tracking-wide ${
                                    status === 'healthy' ? 'bg-emerald-500/15 text-emerald-600' :
                                    status === 'warning' ? 'bg-amber-500/15 text-amber-600' :
                                    status === 'down' ? 'bg-red-500/15 text-red-600 animate-pulse' :
                                    'bg-slate-500/15 text-slate-500'
                                }`}
                            >
                                {isDown && <AlertOctagon size={22} />}
                                {status}
                            </div>
                        )}

                        <button onClick={onClose} className={`p-3 rounded-xl ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <X size={24} />
                        </button>
                    </header>

                    {loading && (
                        <div className={`flex-1 flex items-center justify-center text-lg ${textM}`}>
                            Loading metrics from Prometheus...
                        </div>
                    )}

                    {!loading && metrics && (
                        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Left: internal topology + layers */}
                                <div className="space-y-6">
                                    <VmLayerTopology metrics={metrics} />

                                    <div className="rounded-2xl p-6 border" style={{ background: card, borderColor: border }}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Layers size={22} className="text-slate-500" />
                                            <h2 className={`text-xl font-bold ${textH}`}>Active Exporters</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(metrics.layers as VmLayer[]).map((layer) => (
                                                <div
                                                    key={layer}
                                                    className={`px-4 py-3 rounded-xl border text-base font-semibold capitalize ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-800'}`}
                                                >
                                                    {layer}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: metrics */}
                                <div className="space-y-6">
                                    <div className="rounded-2xl p-6 border" style={{ background: card, borderColor: border }}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <Cpu size={22} className="text-slate-500" />
                                            <h2 className={`text-xl font-bold ${textH}`}>Infrastructure Metrics</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <MetricGauge label="CPU" value={metrics.infra.cpu_percent} warn={80} crit={90} size="lg" />
                                            <MetricGauge label="Memory" value={metrics.infra.memory_percent} warn={85} crit={95} size="lg" />
                                        </div>
                                        <MetricRow label="Memory Used" value={formatBytes(metrics.infra.memory_used_bytes)} isDark={isDark} />
                                        <MetricRow label="Memory Total" value={formatBytes(metrics.infra.memory_total_bytes)} isDark={isDark} />
                                        <MetricRow label="Disk Used" value={metrics.infra.disk_percent} unit="%" isDark={isDark} />
                                        <MetricRow label="Disk Available" value={formatBytes(metrics.infra.disk_avail_bytes)} isDark={isDark} />
                                        <MetricRow label="Network RX" value={`${formatBytes(metrics.infra.net_rx_bytes_sec)}/s`} isDark={isDark} />
                                        <MetricRow label="Network TX" value={`${formatBytes(metrics.infra.net_tx_bytes_sec)}/s`} isDark={isDark} />
                                        <MetricRow label="Load (1m)" value={metrics.infra.load1} isDark={isDark} />
                                        <MetricRow label="Uptime" value={formatUptime(metrics.infra.uptime_seconds)} isDark={isDark} />
                                    </div>

                                    {metrics.app && (
                                        <div className="rounded-2xl p-6 border" style={{ background: card, borderColor: border }}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <Activity size={22} className="text-emerald-600" />
                                                <h2 className={`text-xl font-bold ${textH}`}>Application Layer</h2>
                                            </div>
                                            <MetricRow label="Requests/sec" value={metrics.app.requests_per_sec} isDark={isDark} />
                                            <MetricRow label="Latency P50" value={metrics.app.latency_p50_ms} unit="ms" isDark={isDark} />
                                            <MetricRow label="Latency P95" value={metrics.app.latency_p95_ms} unit="ms" isDark={isDark} />
                                            <MetricRow label="Error Rate 5xx" value={metrics.app.error_rate_5xx} unit="%" isDark={isDark} />
                                        </div>
                                    )}

                                    {metrics.database && (
                                        <div className="rounded-2xl p-6 border" style={{ background: card, borderColor: border }}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <Database size={22} className="text-amber-600" />
                                                <h2 className={`text-xl font-bold ${textH}`}>Database Layer</h2>
                                            </div>
                                            <MetricRow label="Status" value={metrics.database.up ? 'UP' : 'DOWN'} isDark={isDark} />
                                            <MetricRow label="Connections" value={metrics.database.connections} isDark={isDark} />
                                            <MetricRow label="Slow Queries" value={metrics.database.slow_queries} isDark={isDark} />
                                        </div>
                                    )}

                                    {metrics.redis && (
                                        <div className="rounded-2xl p-6 border" style={{ background: card, borderColor: border }}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <Zap size={22} className="text-pink-600" />
                                                <h2 className={`text-xl font-bold ${textH}`}>Redis Cache</h2>
                                            </div>
                                            <MetricRow label="Status" value={metrics.redis.up ? 'UP' : 'DOWN'} isDark={isDark} />
                                            <MetricRow label="Hit Ratio" value={metrics.redis.hit_ratio} unit="%" isDark={isDark} />
                                            <MetricRow label="Commands/sec" value={metrics.redis.commands_sec} isDark={isDark} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
