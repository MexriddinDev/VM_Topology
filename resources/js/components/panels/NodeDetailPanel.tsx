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
    const statusTone =
        status === 'healthy' ? { bg: '#0f2a1c', border: '#16a34a55', text: '#4ade80' } :
        status === 'warning' ? { bg: '#1f2a0f', border: '#84cc1655', text: '#a3e635' } :
        status === 'down' ? { bg: '#2a1515', border: '#ef444455', text: '#f87171' } :
        { bg: '#111827', border: '#334155', text: '#cbd5e1' };

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
                    <header
                        className="flex flex-shrink-0 items-center gap-4 border-b px-6 py-4 lg:px-8"
                        style={{
                            background: isDark ? '#0b1220' : card,
                            borderColor: isDark ? '#243047' : border,
                        }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.2em] ${isDark ? 'border-slate-700 bg-[#111827] text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <ArrowLeft size={18} /> Back
                        </button>

                        <div className="min-w-0 flex-1">
                            {metrics && (
                                <>
                                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">Server detail</div>
                                    <h1 className={`truncate text-2xl font-black lg:text-3xl ${textH}`}>{metrics.server.name}</h1>
                                    <p className={`mt-0.5 font-mono text-sm lg:text-base ${textM}`}>{metrics.server.ip}:{metrics.server.port}</p>
                                </>
                            )}
                        </div>

                        {metrics && (
                            <div
                                className="hidden items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-wide xl:flex"
                                style={{ background: statusTone.bg, borderColor: statusTone.border, color: statusTone.text }}
                            >
                                {isDown && <AlertOctagon size={18} />}
                                {status}
                            </div>
                        )}

                        {metrics && (
                            <div className="hidden items-center gap-2 lg:flex">
                                <div className="rounded-2xl border border-slate-700 bg-[#111827] px-4 py-2 text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">CPU</div>
                                    <div className="font-mono text-lg font-black text-white">{metrics.infra.cpu_percent.toFixed(1)}%</div>
                                </div>
                                <div className="rounded-2xl border border-slate-700 bg-[#111827] px-4 py-2 text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">RAM</div>
                                    <div className="font-mono text-lg font-black text-white">{metrics.infra.memory_percent.toFixed(1)}%</div>
                                </div>
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
                        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                            <div className="mx-auto max-w-[1600px] space-y-6">
                                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                                    {[
                                        { label: 'CPU load', value: `${metrics.infra.cpu_percent.toFixed(1)}%`, hint: 'System compute', tone: 'green' },
                                        { label: 'Memory', value: `${metrics.infra.memory_percent.toFixed(1)}%`, hint: 'Active usage', tone: 'green' },
                                        { label: 'Disk', value: `${metrics.infra.disk_percent.toFixed(1)}%`, hint: 'Volume pressure', tone: 'green' },
                                        { label: 'Uptime', value: formatUptime(metrics.infra.uptime_seconds), hint: 'Live host time', tone: 'cyan' },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-3xl border border-slate-700 bg-[#0f172a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{item.label}</div>
                                            <div className={`mt-3 text-3xl font-black ${item.tone === 'cyan' ? 'text-cyan-300' : 'text-white'}`}>{item.value}</div>
                                            <div className="mt-2 text-sm text-slate-400">{item.hint}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                                    <div className="space-y-6 xl:col-span-7">
                                        <VmLayerTopology metrics={metrics} />

                                        <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                            <div className="mb-4 flex items-center gap-3">
                                                <Layers size={22} className="text-cyan-400" />
                                                <h2 className={`text-xl font-black ${textH}`}>Active Exporters</h2>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {(metrics.layers as VmLayer[]).map((layer) => (
                                                    <div
                                                        key={layer}
                                                        className="rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-sm font-semibold capitalize text-slate-200"
                                                    >
                                                        {layer}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                            <div className="mb-4 flex items-center gap-3">
                                                <Activity size={22} className="text-emerald-400" />
                                                <h2 className={`text-xl font-black ${textH}`}>Signal Summary</h2>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                <MetricGauge label="CPU" value={metrics.infra.cpu_percent} warn={80} crit={90} size="lg" />
                                                <MetricGauge label="Memory" value={metrics.infra.memory_percent} warn={85} crit={95} size="lg" />
                                                <MetricGauge label="Disk" value={metrics.infra.disk_percent} warn={80} crit={90} size="lg" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 xl:col-span-5">
                                        <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                            <div className="mb-6 flex items-center gap-3">
                                                <Cpu size={22} className="text-cyan-400" />
                                                <h2 className={`text-xl font-black ${textH}`}>Infrastructure Metrics</h2>
                                            </div>
                                            <div className="space-y-3">
                                                <MetricRow label="Memory Used" value={formatBytes(metrics.infra.memory_used_bytes)} isDark={true} />
                                                <MetricRow label="Memory Total" value={formatBytes(metrics.infra.memory_total_bytes)} isDark={true} />
                                                <MetricRow label="Disk Available" value={formatBytes(metrics.infra.disk_avail_bytes)} isDark={true} />
                                                <MetricRow label="Network RX" value={`${formatBytes(metrics.infra.net_rx_bytes_sec)}/s`} isDark={true} />
                                                <MetricRow label="Network TX" value={`${formatBytes(metrics.infra.net_tx_bytes_sec)}/s`} isDark={true} />
                                                <MetricRow label="Load (1m)" value={metrics.infra.load1} isDark={true} />
                                            </div>
                                        </div>

                                        {metrics.app && (
                                            <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                                <div className="mb-4 flex items-center gap-3">
                                                    <Activity size={22} className="text-cyan-400" />
                                                    <h2 className={`text-xl font-black ${textH}`}>Application Layer</h2>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Requests/sec</div>
                                                        <div className="mt-2 text-2xl font-black text-white">{metrics.app.requests_per_sec.toFixed(2)}</div>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">5xx Error</div>
                                                        <div className="mt-2 text-2xl font-black text-red-400">{metrics.app.error_rate_5xx.toFixed(2)}%</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    <MetricRow label="Latency P50" value={metrics.app.latency_p50_ms} unit="ms" isDark={true} />
                                                    <MetricRow label="Latency P95" value={metrics.app.latency_p95_ms} unit="ms" isDark={true} />
                                                    <MetricRow label="Latency P99" value={metrics.app.latency_p99_ms} unit="ms" isDark={true} />
                                                </div>
                                            </div>
                                        )}

                                        {metrics.database && (
                                            <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                                <div className="mb-4 flex items-center gap-3">
                                                    <Database size={22} className="text-cyan-400" />
                                                    <h2 className={`text-xl font-black ${textH}`}>Database Layer</h2>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</div>
                                                        <div className={`mt-2 text-2xl font-black ${metrics.database.up ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.database.up ? 'UP' : 'DOWN'}</div>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Connections</div>
                                                        <div className="mt-2 text-2xl font-black text-white">{metrics.database.connections}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <MetricRow label="Slow Queries" value={metrics.database.slow_queries} isDark={true} />
                                                </div>
                                            </div>
                                        )}

                                        {metrics.redis && (
                                            <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                                <div className="mb-4 flex items-center gap-3">
                                                    <Zap size={22} className="text-cyan-400" />
                                                    <h2 className={`text-xl font-black ${textH}`}>Redis Cache</h2>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</div>
                                                        <div className={`mt-2 text-2xl font-black ${metrics.redis.up ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.redis.up ? 'UP' : 'DOWN'}</div>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Hit Ratio</div>
                                                        <div className="mt-2 text-2xl font-black text-white">{metrics.redis.hit_ratio.toFixed(2)}%</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    <MetricRow label="Commands/sec" value={metrics.redis.commands_sec} isDark={true} />
                                                    <MetricRow label="Evictions/sec" value={metrics.redis.evictions_sec} isDark={true} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
