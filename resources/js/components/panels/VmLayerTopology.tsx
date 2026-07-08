import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, Database, Zap, Server, Network } from 'lucide-react';
import type { ServerMetrics, VmLayer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Panel, TimeSeriesChart, useHistory, formatRate } from '../ui/Charts';
import { useI18n } from '../../i18n/I18nContext';

type ServiceKind = 'infra' | 'app' | 'database' | 'redis';

const STATUS_STYLE = {
    up:   { dot: '#10b981', border: '#10b98166', bg: 'rgba(16,185,129,0.08)', glow: 'rgba(16,185,129,0.35)', text: 'topology.operational' },
    down: { dot: '#f43f5e', border: '#f43f5e66', bg: 'rgba(244,63,94,0.08)', glow: 'rgba(244,63,94,0.35)', text: 'topology.offline' },
    na:   { dot: '#64748b', border: '#64748b44', bg: 'rgba(100,116,139,0.06)', glow: 'rgba(100,116,139,0.2)', text: 'topology.notDetected' },
};

interface ConnectorPath { d: string; key: string }

type HealthState = 'up' | 'down' | 'na';

type HealthItem = {
    key: string;
    label: string;
    sub: string;
    Icon: typeof Cpu;
    state: HealthState;
};

function unique<T extends string>(values: T[]): T[] {
    return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))) as T[];
}

function jobToKind(job: string): ServiceKind {
    const lower = job.toLowerCase();
    if (lower === 'node' || lower.includes('node_exporter')) return 'infra';
    if (lower.includes('postgres') || lower.includes('mysql') || lower.includes('mariadb')) return 'database';
    if (lower.includes('redis')) return 'redis';
    return 'app';
}

function kindToLayer(kind: ServiceKind): VmLayer {
    return kind === 'infra' ? 'infra' : kind;
}

function jobLabel(job: string): string {
    if (job.toLowerCase() === 'node' || job.toLowerCase().includes('node_exporter')) return 'node_exporter';
    return job.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function serviceLabel(name: string): string {
    return jobLabel(name);
}

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
    const { t } = useI18n();
    const detectedServices = useMemo(() => unique(metrics.server.services ?? metrics.server.jobs ?? ['node']), [metrics.server.services, metrics.server.jobs]);

    const containerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const childRefs = useRef<(HTMLDivElement | null)[]>([]);

    const rootStatus: HealthState = metrics.server.status === 'down' ? 'down' : 'up';
    const rootStyle = STATUS_STYLE[rootStatus];
    const healthItems = useMemo<HealthItem[]>(() => [
        {
            key: 'infra',
            label: t('topology.operatingSystem'),
            sub: 'node_exporter',
            Icon: Server,
            state: metrics.server.status === 'down' ? 'down' : 'up',
        },
        ...detectedServices
            .filter((service) => {
                const lower = service.toLowerCase();
                return lower !== 'node' && !lower.includes('node_exporter');
            })
            .map((service) => {
                const kind = jobToKind(service);
                const state: HealthState = kind === 'database'
                    ? (metrics.database ? (metrics.database.up ? 'up' : 'down') : 'na')
                    : kind === 'redis'
                        ? (metrics.redis ? (metrics.redis.up ? 'up' : 'down') : 'na')
                        : metrics.server.status === 'down'
                            ? 'down'
                            : 'up';

                const sub = kind === 'database'
                    ? `${t('topology.database')} · ${t('topology.postgres')}`
                    : kind === 'redis'
                        ? `${t('topology.cache')} · ${t('topology.redisCacheShort')}`
                        : `${t('topology.application')} · ${service}`;

                const Icon = kind === 'database'
                    ? Database
                    : kind === 'redis'
                        ? Zap
                        : Activity;

                return {
                    key: service,
                    label: serviceLabel(service),
                    sub,
                    Icon,
                    state,
                };
            }),
    ], [detectedServices, metrics.database, metrics.redis, metrics.server.status, t]);

    const connectors = useConnectors(containerRef, rootRef, childRefs, [healthItems.length, metrics.server.status, isDark]);

    const rxHist = useHistory(metrics.infra.net_rx_bytes_sec);
    const txHist = useHistory(metrics.infra.net_tx_bytes_sec);

    const lineStroke = isDark ? '#334155' : '#cbd5e1';

    return (
        <div className="space-y-6">
            <div
                className="rounded-3xl p-6 border shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                style={{ background: isDark ? 'linear-gradient(180deg, rgba(17,29,53,0.98) 0%, rgba(10,18,35,0.98) 100%)' : '#ffffff', borderColor: isDark ? '#24324a' : '#e5e7eb' }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border" style={{ background: rootStyle.bg, borderColor: rootStyle.border }}>
                        <Server size={20} style={{ color: rootStyle.dot }} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('topology.vmInternalTopology')}</h3>
                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('topology.layerHealthDetected')}</p>
                    </div>
                </div>

                <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {healthItems.map((item) => {
                        const style = STATUS_STYLE[item.state];
                        const Icon = item.Icon;
                        return (
                            <div
                                key={item.key}
                                className="rounded-2xl border px-3 py-2.5"
                                style={{ borderColor: style.border, background: style.bg }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${style.dot}18` }}>
                                        <Icon size={17} style={{ color: style.dot }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`truncate text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.label}</div>
                                        <div className={`truncate text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.sub}</div>
                                    </div>
                                    <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: style.dot, background: `${style.dot}18` }}>
                                        {t(style.text)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
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

                    {healthItems.length > 1 && (
                        <div className="relative z-10 flex w-full flex-wrap justify-center gap-6">
                            {healthItems.map((item, i) => {
                                const style = STATUS_STYLE[item.state];
                                const Icon = item.Icon;
                                return (
                                    <motion.div
                                        key={item.key}
                                        ref={(el) => (childRefs.current[i] = el)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.08 * (i + 1) }}
                                        whileHover={{ y: -3 }}
                                        className="min-w-[170px] rounded-2xl border-2 px-5 py-4 text-center transition-shadow"
                                        style={{ borderColor: style.border, background: style.bg, boxShadow: item.state === 'up' ? `0 0 24px -8px ${style.glow}` : 'none' }}
                                    >
                                        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${style.dot}22`, border: `1px solid ${style.dot}55` }}>
                                            <Icon size={20} style={{ color: style.dot }} />
                                        </div>
                                        <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.label}</div>
                                        <div className={`mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.sub}</div>
                                        <LayerBadge status={item.state} />
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

            <Panel title={t('topology.prometheusTargets')} icon={Network} tone="green" isDark={isDark} subtitle={t('topology.prometheusHealth')}>
                <div
                    className="rounded-2xl border border-emerald-400/10 p-4 backdrop-blur-sm"
                    style={{
                        background: isDark
                            ? 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)'
                            : 'linear-gradient(180deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
                    }}
                >
                    <TimeSeriesChart
                        isDark={isDark}
                        unit="/s"
                        formatValue={(v) => formatRate(v).replace('/s', '')}
                        series={[
                            { label: t('topology.inboundRx'), color: 'green', data: rxHist },
                            { label: t('topology.outboundTx'), color: 'cyan', data: txHist },
                        ]}
                    />
                </div>
            </Panel>
        </div>
    );
}

function LayerBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
    const { t } = useI18n();
    const s = STATUS_STYLE[status];
    return (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide" style={{ color: s.dot, background: `${s.dot}18` }}>
            <span className="relative flex h-2 w-2">
                {status === 'up' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: s.dot }} />}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: s.dot }} />
            </span>
            {t(s.text)}
        </div>
    );
}
