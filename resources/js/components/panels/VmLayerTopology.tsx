import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, Database, Zap, Server, Network } from 'lucide-react';
import type { ServerMetrics, VmLayer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Panel, TimeSeriesChart, useHistory, formatRate } from '../ui/Charts';

const LAYER_CONFIG: Record<VmLayer, { label: string; sub: string; Icon: typeof Cpu }> = {
    infra:    { label: 'Operating System', sub: 'node_exporter', Icon: Cpu },
    app:      { label: 'Application', sub: 'HTTP metrics', Icon: Activity },
    database: { label: 'Database', sub: 'PostgreSQL', Icon: Database },
    redis:    { label: 'Cache', sub: 'Redis', Icon: Zap },
};

function layerStatus(metrics: ServerMetrics, layer: VmLayer): 'up' | 'down' | 'na' {
    const vmDown = metrics.server.status === 'down';
    switch (layer) {
        case 'infra':
            if (vmDown) return 'down';
            return 'up';
        case 'app':
            if (!metrics.layers.includes('app')) return 'na';
            if (vmDown || !metrics.app) return 'down';
            if (metrics.app.error_rate_5xx > 5) return 'down';
            return 'up';
        case 'database':
            if (!metrics.layers.includes('database')) return 'na';
            if (vmDown || !metrics.database?.up) return 'down';
            return 'up';
        case 'redis':
            if (!metrics.layers.includes('redis')) return 'na';
            if (vmDown || !metrics.redis?.up) return 'down';
            return 'up';
        default:
            return 'na';
    }
}

const STATUS_STYLE = {
    up:   { dot: '#10b981', border: '#10b98166', bg: 'rgba(16,185,129,0.08)', glow: 'rgba(16,185,129,0.35)', text: 'OPERATIONAL' },
    down: { dot: '#f43f5e', border: '#f43f5e66', bg: 'rgba(244,63,94,0.08)', glow: 'rgba(244,63,94,0.35)', text: 'OFFLINE' },
    na:   { dot: '#64748b', border: '#64748b44', bg: 'rgba(100,116,139,0.06)', glow: 'rgba(100,116,139,0.2)', text: 'NOT DETECTED' },
};

interface ConnectorPath { d: string; key: string }

function useConnectors(
    containerRef: React.RefObject<HTMLDivElement>,
    rootRef: React.RefObject<HTMLDivElement>,
    childRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    deps: React.DependencyList,
) {
    const [paths, setPaths] = useState<ConnectorPath[]>([]);
    useLayoutEffect(() => {
        function recompute() {
            const container = containerRef.current;
            const root = rootRef.current;
            if (!container || !root) return;
            const cRect = container.getBoundingClientRect();
            const rRect = root.getBoundingClientRect();
            const rootX = rRect.left + rRect.width / 2 - cRect.left;
            const rootY = rRect.bottom - cRect.top;
            const next: ConnectorPath[] = [];
            childRefs.current.forEach((el, i) => {
                if (!el) return;
                const chRect = el.getBoundingClientRect();
                const chX = chRect.left + chRect.width / 2 - cRect.left;
                const chY = chRect.top - cRect.top;
                const midY = rootY + (chY - rootY) * 0.55;
                next.push({ key: `c-${i}`, d: `M ${rootX} ${rootY} C ${rootX} ${midY}, ${chX} ${midY}, ${chX} ${chY}` });
            });
            setPaths(next);
        }
        recompute();
        const ro = new ResizeObserver(recompute);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', recompute);
        return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return paths;
}

export default function VmLayerTopology({ metrics }: { metrics: ServerMetrics }) {
    const { isDark } = useTheme();
    const layers: VmLayer[] = ['infra', 'app', 'database', 'redis'];
    const activeLayers = layers.filter((l) => metrics.layers.includes(l) || l === 'infra');
    const children = activeLayers.filter((l) => l !== 'infra');

    const containerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const childRefs = useRef<(HTMLDivElement | null)[]>([]);

    const rootStatus = layerStatus(metrics, 'infra');
    const rootStyle = STATUS_STYLE[rootStatus];

    const connectors = useConnectors(containerRef, rootRef, childRefs, [children.length, metrics.server.status, isDark]);

    const rxHist = useHistory(metrics.infra.net_rx_bytes_sec);
    const txHist = useHistory(metrics.infra.net_tx_bytes_sec);

    const lineStroke = isDark ? '#334155' : '#cbd5e1';

    return (
        <div className="space-y-6">
            <div
                className="rounded-3xl p-6 border shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                style={{ background: isDark ? '#0b1220' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e5e7eb' }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border" style={{ background: rootStyle.bg, borderColor: rootStyle.border }}>
                        <Server size={20} style={{ color: rootStyle.dot }} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>VM Internal Topology</h3>
                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Layer health detected via Prometheus exporters</p>
                    </div>
                </div>

                <div ref={containerRef} className="relative flex flex-col items-center gap-10 py-6">
                    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                        {connectors.map((p) => (
                            <g key={p.key}>
                                <path d={p.d} fill="none" stroke={lineStroke} strokeWidth={1.5} />
                                <path d={p.d} fill="none" stroke={rootStyle.dot} strokeWidth={2} strokeDasharray="3 7" strokeLinecap="round" opacity={0.85} className="topology-flow" />
                            </g>
                        ))}
                    </svg>

                    <motion.div
                        ref={rootRef}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 min-w-[220px] rounded-2xl border-2 px-8 py-4 text-center"
                        style={{ borderColor: rootStyle.border, background: rootStyle.bg }}
                    >
                        <div className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.server.name}</div>
                        <div className={`mt-1 font-mono text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{metrics.server.ip}</div>
                        <LayerBadge status={rootStatus} />
                    </motion.div>

                    {children.length > 0 && (
                        <div className="relative z-10 flex w-full flex-wrap justify-center gap-6">
                            {children.map((layer, i) => {
                                const cfg = LAYER_CONFIG[layer];
                                const st = layerStatus(metrics, layer);
                                const style = STATUS_STYLE[st];
                                const Icon = cfg.Icon;
                                return (
                                    <motion.div
                                        key={layer}
                                        ref={(el) => (childRefs.current[i] = el)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.08 * (i + 1) }}
                                        whileHover={{ y: -3 }}
                                        className="min-w-[170px] rounded-2xl border-2 px-5 py-4 text-center transition-shadow"
                                        style={{ borderColor: style.border, background: style.bg, boxShadow: st === 'up' ? `0 0 24px -8px ${style.glow}` : 'none' }}
                                    >
                                        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${style.dot}22`, border: `1px solid ${style.dot}55` }}>
                                            <Icon size={20} style={{ color: style.dot }} />
                                        </div>
                                        <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{cfg.label}</div>
                                        <div className={`mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{cfg.sub}</div>
                                        <LayerBadge status={st} />
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <style>{`
                    .topology-flow { animation: topology-dash 1.4s linear infinite; }
                    @keyframes topology-dash { to { stroke-dashoffset: -20; } }
                `}</style>
            </div>

            <Panel title="Network Interface (live)" icon={Network} tone="green" isDark={isDark}>
                <TimeSeriesChart
                    isDark={isDark}
                    unit="/s"
                    formatValue={(v) => formatRate(v).replace('/s', '')}
                    series={[
                        { label: 'Inbound (RX)', color: 'green', data: rxHist },
                        { label: 'Outbound (TX)', color: 'cyan', data: txHist },
                    ]}
                />
            </Panel>
        </div>
    );
}

function LayerBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
    const s = STATUS_STYLE[status];
    return (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide" style={{ color: s.dot, background: `${s.dot}18` }}>
            <span className="relative flex h-2 w-2">
                {status === 'up' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: s.dot }} />}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: s.dot }} />
            </span>
            {s.text}
        </div>
    );
}
