import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Cpu, Activity, Database, Zap, Layers, AlertOctagon, ArrowLeft,
    Clock, HardDrive,
} from 'lucide-react';
import type { ServerMetrics, VmLayer } from '../../types';
import { useServerMetrics } from '../../hooks/useInfraData';
import { useTheme } from '../../context/ThemeContext';
import VmLayerTopology from './VmLayerTopology';
import {
    Panel, RingGauge, DonutUsage, SegmentedBar, TimeSeriesChart, MetricTile,
    TONE, toneForPercent, useHistory,
    formatBytes, formatUptime,
} from '../ui/Charts';

interface Props { serverId: string | null; onClose: () => void; }

function Kpi({ label, value, tone, isDark }: { label: string; value: string; tone: keyof typeof TONE; isDark: boolean }) {
    const t = TONE[tone];
    return (
        <div className="rounded-2xl border px-4 py-2.5 text-right" style={{ borderColor: `${t.c}70`, background: `${t.c}18`, boxShadow: `0 0 18px ${t.c}15` }}>
            <div className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
            <div className="font-mono text-xl font-black" style={{ color: t.c, textShadow: `0 0 10px ${t.c}55` }}>{value}</div>
        </div>
    );
}

export default function NodeDetailPanel({ serverId, onClose }: Props) {
    const { metrics, loading } = useServerMetrics(serverId);
    const { isDark } = useTheme();

    const status = metrics?.server.status ?? 'unknown';
    const isDown = status === 'down';

    const cpuHist = useHistory(metrics?.infra.cpu_percent ?? 0);
    const memHist = useHistory(metrics?.infra.memory_percent ?? 0);
    const latP50Hist = useHistory(metrics?.app?.latency_p50_ms ?? 0);
    const latP99Hist = useHistory(metrics?.app?.latency_p99_ms ?? 0);

    const bg = isDark
        ? 'radial-gradient(1200px 600px at 0% 0%, rgba(34,211,238,0.05), transparent), radial-gradient(1200px 600px at 100% 100%, rgba(167,139,250,0.05), transparent), #0a0f1a'
        : '#f4f6f9';
    const card = isDark ? '#1a2332' : '#ffffff';
    const border = isDark ? '#2d3a4f' : '#e2e8f0';
    const textH = isDark ? 'text-slate-100' : 'text-slate-900';
    const textM = isDark ? 'text-slate-400' : 'text-slate-600';
    const statusTone =
        status === 'up' ? { bg: '#0f2a1c', border: '#16a34a55', text: '#4ade80' } :
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
                        className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
                        style={{ background: isDark ? 'rgba(11,18,32,0.85)' : card, borderColor: isDark ? '#243047' : border }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.2em] transition-colors ${isDark ? 'border-slate-700 bg-[#111827] text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <ArrowLeft size={18} /> Back
                        </button>

                        <div className="min-w-0 flex-1">
                            {metrics && (
                                <>
                                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">Server detail</div>
                                    <h1 className={`truncate text-xl font-black sm:text-2xl lg:text-3xl ${textH}`}>{metrics.server.name}</h1>
                                    <p className={`mt-0.5 truncate font-mono text-xs sm:text-sm lg:text-base ${textM}`}>{metrics.server.ip}:{metrics.server.port}</p>
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
                                <Kpi label="CPU" value={`${metrics.infra.cpu_percent.toFixed(1)}%`} tone={toneForPercent(metrics.infra.cpu_percent)} isDark={isDark} />
                                <Kpi label="RAM" value={`${metrics.infra.memory_percent.toFixed(1)}%`} tone={toneForPercent(metrics.infra.memory_percent)} isDark={isDark} />
                            </div>
                        )}

                        <button onClick={onClose} className={`rounded-xl p-3 transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <X size={24} />
                        </button>
                    </header>

                    {loading && (
                        <div className={`flex flex-1 flex-col items-center justify-center gap-3 text-lg ${textM}`}>
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                            Loading metrics from Prometheus...
                        </div>
                    )}

                    {!loading && metrics && (
                        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                            <div className="mx-auto max-w-[1600px] space-y-6">

                                <Panel title="System Vitals" icon={Cpu} tone="cyan" isDark={isDark} subtitle="Core node_exporter signals">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                                        <RingGauge label="CPU Load" value={metrics.infra.cpu_percent} sub="System compute" icon={Cpu} isDark={isDark} />
                                        <RingGauge label="Memory" value={metrics.infra.memory_percent} sub={formatBytes(metrics.infra.memory_used_bytes)} icon={Layers} isDark={isDark} />
                                        <RingGauge label="Disk" value={metrics.infra.disk_percent} sub={`${formatBytes(metrics.infra.disk_avail_bytes)} free`} icon={HardDrive} isDark={isDark} />
                                        <div className="flex flex-col items-center justify-center rounded-2xl border px-4 py-3" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0', background: isDark ? '#0b1220' : '#f8fafc' }}>
                                            <Clock size={22} className="text-cyan-400" />
                                            <span className={`mt-2 font-mono text-2xl font-black ${textH}`}>{formatUptime(metrics.infra.uptime_seconds)}</span>
                                            <div className={`mt-1 text-xs font-black uppercase tracking-[0.2em] ${textM}`}>Uptime</div>
                                            <div className={`mt-1 font-mono text-xs ${textM}`}>load1: {metrics.infra.load1.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </Panel>

                                <div className="columns-1 gap-6 space-y-6 xl:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
                                    <VmLayerTopology metrics={metrics} />

                                    <Panel title="Signal Summary" icon={Activity} tone="green" isDark={isDark} subtitle="At-a-glance health">
                                        <div className="grid grid-cols-3 gap-x-2 gap-y-6">
                                            <RingGauge label="CPU" value={metrics.infra.cpu_percent} size={130} isDark={isDark} />
                                            <RingGauge label="Memory" value={metrics.infra.memory_percent} size={130} warn={85} crit={95} isDark={isDark} />
                                            <RingGauge label="Disk" value={metrics.infra.disk_percent} size={130} isDark={isDark} />
                                        </div>
                                    </Panel>

                                    <Panel title="CPU & Memory over time" icon={Activity} tone="green" isDark={isDark} subtitle="Last 2 minutes">
                                        <TimeSeriesChart
                                            isDark={isDark}
                                            unit="%"
                                            formatValue={(v) => v.toFixed(0)}
                                            series={[
                                                { label: 'CPU', color: 'cyan', data: cpuHist },
                                                { label: 'Memory', color: 'violet', data: memHist },
                                            ]}
                                        />
                                    </Panel>

                                    {metrics.app && (
                                        <Panel title="Application Layer" icon={Activity} tone="cyan" isDark={isDark} subtitle="HTTP request metrics">
                                            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <MetricTile label="Requests/sec" value={metrics.app.requests_per_sec.toFixed(2)} tone="cyan" icon={Activity} isDark={isDark} />
                                                <div className="flex justify-center">
                                                    <RingGauge label="5xx Errors" value={metrics.app.error_rate_5xx} size={130} warn={2} crit={5} max={10} isDark={isDark} />
                                                </div>
                                            </div>
                                            <div className="mb-5">
                                                <TimeSeriesChart
                                                    isDark={isDark}
                                                    unit="ms"
                                                    height={130}
                                                    series={[
                                                        { label: 'P50', color: 'green', data: latP50Hist },
                                                        { label: 'P99', color: 'red', data: latP99Hist },
                                                    ]}
                                                />
                                            </div>
                                            <SegmentedBar label="Latency P95" value={metrics.app.latency_p95_ms} max={Math.max(metrics.app.latency_p99_ms, 1)} unit=" ms" tone="amber" isDark={isDark} />
                                        </Panel>
                                    )}

                                    <Panel title="Capacity" icon={HardDrive} tone="cyan" isDark={isDark} subtitle="Storage & memory usage">
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <DonutUsage label="Memory" used={metrics.infra.memory_used_bytes} total={metrics.infra.memory_total_bytes} isDark={isDark} />
                                            <DonutUsage label="Disk" used={metrics.infra.disk_total_bytes - metrics.infra.disk_avail_bytes} total={metrics.infra.disk_total_bytes} isDark={isDark} />
                                        </div>
                                    </Panel>

                                    {metrics.database && (
                                        <Panel title="Database Layer" icon={Database} tone={metrics.database.up ? 'green' : 'red'} isDark={isDark} subtitle="PostgreSQL">
                                            <div className="mb-4 flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${textM}`}>Status</span>
                                                <span className="flex items-center gap-2 font-mono text-lg font-black" style={{ color: metrics.database.up ? TONE.green.c : TONE.red.c }}>
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: metrics.database.up ? TONE.green.c : TONE.red.c }} />
                                                    {metrics.database.up ? 'UP' : 'DOWN'}
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                <SegmentedBar label="Connections" value={metrics.database.connections} max={Math.max(metrics.database.connections * 1.5, 20)} tone="cyan" isDark={isDark} />
                                                <SegmentedBar label="Slow Queries" value={metrics.database.slow_queries} max={Math.max(metrics.database.slow_queries * 1.5, 10)} tone="amber" isDark={isDark} />
                                                <SegmentedBar label="Max Query Duration" value={metrics.database.max_query_duration} max={Math.max(metrics.database.max_query_duration * 1.5, 5)} unit=" s" tone="violet" isDark={isDark} />
                                            </div>
                                        </Panel>
                                    )}

                                    {metrics.redis && (
                                        <Panel title="Redis Cache" icon={Zap} tone={metrics.redis.up ? 'green' : 'red'} isDark={isDark} subtitle="In-memory cache">
                                            <div className="mb-5 flex flex-wrap items-center gap-5">
                                                <RingGauge label="Hit Ratio" value={metrics.redis.hit_ratio} size={130} warn={70} crit={50} invert isDark={isDark} />
                                                <div className="min-w-[140px] flex-1">
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className={`text-xs font-black uppercase tracking-[0.2em] ${textM}`}>Status</span>
                                                        <span className="font-mono text-sm font-black" style={{ color: metrics.redis.up ? TONE.green.c : TONE.red.c }}>
                                                            {metrics.redis.up ? 'UP' : 'DOWN'}
                                                        </span>
                                                    </div>
                                                    <div className={`font-mono text-xs ${textM}`}>Memory: {formatBytes(metrics.redis.memory_bytes)}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <SegmentedBar label="Commands/sec" value={metrics.redis.commands_sec} max={Math.max(metrics.redis.commands_sec * 1.3, 100)} tone="cyan" isDark={isDark} />
                                                <SegmentedBar label="Evictions/sec" value={metrics.redis.evictions_sec} max={Math.max(metrics.redis.evictions_sec * 1.3, 10)} tone="red" isDark={isDark} />
                                            </div>
                                        </Panel>
                                    )}

                                    <Panel title="Active Exporters" icon={Layers} tone="violet" isDark={isDark} subtitle="Detected Prometheus targets">
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {(metrics.layers as VmLayer[]).map((layer) => (
                                                <div key={layer} className="rounded-2xl border px-4 py-3 text-center text-sm font-bold capitalize transition-colors"
                                                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0', background: isDark ? '#0b1220' : '#f8fafc', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                                    {layer}
                                                </div>
                                            ))}
                                        </div>
                                    </Panel>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
