import React, { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';

/* ============================================================== */
/* Palette + tone resolution                                       */
/* ============================================================== */
export const TONE = {
    green:  { c: '#10b981', glow: 'rgba(16,185,129,0.45)', dim: 'rgba(16,185,129,0.15)' },
    amber:  { c: '#f59e0b', glow: 'rgba(245,158,11,0.45)', dim: 'rgba(245,158,11,0.15)' },
    red:    { c: '#f43f5e', glow: 'rgba(244,63,94,0.45)', dim: 'rgba(244,63,94,0.15)' },
    cyan:   { c: '#22d3ee', glow: 'rgba(34,211,238,0.45)', dim: 'rgba(34,211,238,0.15)' },
    violet: { c: '#a78bfa', glow: 'rgba(167,139,250,0.45)', dim: 'rgba(167,139,250,0.15)' },
    slate:  { c: '#64748b', glow: 'rgba(100,116,139,0.3)', dim: 'rgba(100,116,139,0.15)' },
};
export type ToneKey = keyof typeof TONE;

/** Higher value = worse (cpu, memory, disk, error rate, latency...) */
export function toneForPercent(v: number, warn = 80, crit = 92): ToneKey {
    if (v >= crit) return 'red';
    if (v >= warn) return 'amber';
    return 'green';
}
/** Higher value = better (hit ratio, uptime score, success rate...) */
export function toneForGoodPercent(v: number, warn = 70, crit = 50): ToneKey {
    if (v < crit) return 'red';
    if (v < warn) return 'amber';
    return 'green';
}

/* ============================================================== */
/* Formatting                                                      */
/* ============================================================== */
export function formatBytes(bytes: number): string {
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
export function formatRate(bytesPerSec: number): string {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 ** 2) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / 1024 ** 2).toFixed(2)} MB/s`;
}
export function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h`;
}

/* ============================================================== */
/* Rolling client-side history buffer (for time-series panels)     */
/* ============================================================== */
export const HISTORY_LEN = 40;
export function useHistory(value: number, len = HISTORY_LEN) {
    const [hist, setHist] = useState<number[]>([]);
    useEffect(() => {
        setHist((prev) => [...prev, value].slice(-len));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return hist;
}

/* ============================================================== */
/* Panel chrome with subtle dotted "dashboard" backdrop            */
/* ============================================================== */
export function Panel({
                          title, icon: Icon, tone = 'cyan', children, isDark, right, subtitle,
                      }: { title: string; icon: any; tone?: ToneKey; children: React.ReactNode; isDark: boolean; right?: React.ReactNode; subtitle?: string }) {
    const t = TONE[tone];
    return (
        <div
            className="group relative overflow-hidden rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-shadow duration-300 hover:shadow-[0_24px_70px_rgba(0,0,0,0.4)]"
            style={{
                background: isDark
                    ? 'linear-gradient(180deg, rgba(17,29,53,0.98) 0%, rgba(10,18,35,0.98) 100%)'
                    : '#ffffff',
                borderColor: isDark ? '#24324a' : '#e5e7eb',
            }}
        >
            {/* top accent line */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-70"
                style={{ background: `linear-gradient(90deg, transparent, ${t.c}, transparent)` }}
            />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '16px 16px', color: isDark ? '#fff' : '#000' }}
            />
            <div className="relative mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                        style={{ background: `${t.c}1f`, border: `1px solid ${t.c}55`, boxShadow: `0 0 16px -6px ${t.glow}` }}
                    >
                        <Icon size={18} style={{ color: t.c }} />
                    </div>
                    <div className="min-w-0">
                        <h2 className={`truncate text-lg font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
                        {subtitle && <p className={`truncate text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
                    </div>
                </div>
                {right}
            </div>
            <div className="relative">{children}</div>
        </div>
    );
}

/* ============================================================== */
/* Ring gauge — modern circular progress diagram (replaces the     */
/* old speedometer/needle dial). Apple-Watch-ring style: a colour- */
/* coded arc that fills proportionally to the value, with a soft   */
/* gradient stroke, animated fill-in, and a big centred readout.   */
/* ============================================================== */

/** sweep angle of the ring track, in degrees. 270 leaves a gap at the bottom (classic dashboard look) */
const RING_SWEEP = 270;
const RING_START = 135; // degrees, start angle (0 = 3 o'clock, clockwise)

function ringPoint(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ringArcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
    const endDeg = startDeg + sweepDeg;
    const a = ringPoint(cx, cy, r, startDeg);
    const b = ringPoint(cx, cy, r, endDeg);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * Renders fully responsively: the SVG always scales to 100% of its wrapper
 * width via viewBox, so it can never overflow into a neighbouring grid cell
 * (this is what caused the old gauges to visually collide / overlap).
 */
export function RingGauge({
                              label, value, unit = '%', sub, size = 150, warn = 80, crit = 92, max = 100, invert = false, isDark, icon: Icon,
                          }: {
    label: string; value: number; unit?: string; sub?: string; size?: number;
    warn?: number; crit?: number; max?: number; invert?: boolean; isDark: boolean; icon?: any;
}) {
    const valuePct = Math.min(100, Math.max(0, (value / max) * 100));
    const warnPct = Math.min(100, (warn / max) * 100);
    const critPct = Math.min(100, (crit / max) * 100);
    const toneKey = invert ? toneForGoodPercent(valuePct, warnPct, critPct) : toneForPercent(valuePct, warnPct, critPct);
    const t = TONE[toneKey];

    const W = size, H = size;
    const r = size * 0.38;
    const cx = W / 2, cy = H / 2;
    const sw = size * 0.105;
    const pad = sw * 1.3;

    const sweep = (valuePct / 100) * RING_SWEEP;
    const trackPath = ringArcPath(cx, cy, r, RING_START, RING_SWEEP);
    const fillPath = sweep > 0 ? ringArcPath(cx, cy, r, RING_START, sweep) : '';

    const gradId = `ring-${label.replace(/\s+/g, '')}-${toneKey}`;

    return (
        <div className="flex w-full flex-col items-center">
            <div className="relative w-full" style={{ maxWidth: size }}>
                <svg
                    width="100%"
                    viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ display: 'block' }}
                >
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={t.c} stopOpacity={0.55} />
                            <stop offset="100%" stopColor={t.c} stopOpacity={1} />
                        </linearGradient>
                    </defs>

                    {/* background track */}
                    <path d={trackPath} fill="none" stroke={isDark ? '#22324d' : '#e2e8f0'} strokeWidth={sw} strokeLinecap="round" />

                    {/* warn/crit threshold tick marks on the track */}
                    {!invert && warnPct < 100 && (
                        <circle {...ringPoint(cx, cy, r, RING_START + (warnPct / 100) * RING_SWEEP)} r={2.2} fill={isDark ? '#09111f' : '#fff'} />
                    )}
                    {!invert && critPct < 100 && (
                        <circle {...ringPoint(cx, cy, r, RING_START + (critPct / 100) * RING_SWEEP)} r={2.2} fill={isDark ? '#09111f' : '#fff'} />
                    )}

                    {/* animated value fill */}
                    {sweep > 0 && (
                        <motion.path
                            d={fillPath}
                            fill="none"
                            stroke={`url(#${gradId})`}
                            strokeWidth={sw}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 8px ${t.glow})` }}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                    )}

                    {/* leading dot at current value */}
                    {sweep > 0 && (
                        <circle
                            {...ringPoint(cx, cy, r, RING_START + sweep)}
                            r={sw * 0.42}
                            fill={isDark ? '#09111f' : '#fff'}
                            stroke={t.c}
                            strokeWidth={2.5}
                            style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }}
                        />
                    )}

                    {Icon ? (
                        <foreignObject x={cx - size * 0.09} y={cy - size * 0.27} width={size * 0.18} height={size * 0.18}>
                            <div className="flex h-full w-full items-center justify-center">
                                <Icon size={size * 0.15} style={{ color: t.c, opacity: 0.85 }} />
                            </div>
                        </foreignObject>
                    ) : null}

                    <text x={cx} y={cy + size * 0.045} textAnchor="middle" fontWeight={900} fontFamily="ui-monospace, monospace"
                          fontSize={size * 0.2} fill={t.c} style={{ filter: `drop-shadow(0 0 10px ${t.glow})` }}>
                        {value.toFixed(value < 10 && value !== 0 ? 1 : 0)}
                    </text>
                    <text x={cx} y={cy + size * 0.155} textAnchor="middle" fontFamily="ui-monospace, monospace"
                          fontSize={size * 0.082} fill={isDark ? '#94a3b8' : '#64748b'} opacity={0.8}>
                        {unit}
                    </text>
                </svg>
            </div>
            <div className={`-mt-1 text-center text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
            {sub && <div className={`mt-0.5 text-center text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</div>}
        </div>
    );
}

/** @deprecated kept only as a thin alias so older imports don't break — renders the new RingGauge */
export const GaugeArc = RingGauge;

/* ============================================================== */
/* Compact metric tile — small inline stat w/ trend dot            */
/* ============================================================== */
export function MetricTile({
                               label, value, unit = '', tone = 'cyan', isDark, icon: Icon,
                           }: { label: string; value: string; unit?: string; tone?: ToneKey; isDark: boolean; icon?: any }) {
    const t = TONE[tone];
    return (
        <div
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: isDark ? '#22324d' : '#e2e8f0', background: isDark ? '#101b33' : '#f8fafc' }}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${t.c}1f` }}>
                        <Icon size={15} style={{ color: t.c }} />
                    </div>
                )}
                <span className={`truncate text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
            </div>
            <span className="shrink-0 font-mono text-lg font-black" style={{ color: t.c }}>
                {value}<span className="ml-0.5 text-xs opacity-60">{unit}</span>
            </span>
        </div>
    );
}

/* ============================================================== */
/* Donut usage chart (used vs total)                               */
/* ============================================================== */
export function DonutUsage({
                               used, total, label, isDark, warn = 80, crit = 92,
                           }: { used: number; total: number; label: string; isDark: boolean; warn?: number; crit?: number }) {
    const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
    const color = TONE[toneForPercent(pct, warn, crit)].c;
    const size = 132, r = 50, cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const progress = (pct / 100) * circumference;
    return (
        <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#22324d' : '#e2e8f0'} strokeWidth={12} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
                        strokeDasharray={`${progress} ${circumference}`} transform={`rotate(-90 ${cx} ${cy})`}
                        style={{ filter: `drop-shadow(0 0 7px ${color}99)`, transition: 'stroke-dasharray 0.6s ease' }} />
                <text x={cx} y={cy + 6} textAnchor="middle" fontWeight={900} fontFamily="monospace" fontSize={22}
                      fill={isDark ? '#f1f5f9' : '#0f172a'}>{pct.toFixed(0)}%</text>
            </svg>
            <div className="min-w-0">
                <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
                <div className={`mt-1 font-mono text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBytes(used)}</div>
                <div className={`font-mono text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>of {formatBytes(total)}</div>
            </div>
        </div>
    );
}

/* ============================================================== */
/* Segmented "LED" bar — Grafana bar-gauge style                   */
/* ============================================================== */
export function SegmentedBar({
                                 label, value, max, unit = '', tone = 'cyan', isDark, segments = 28,
                             }: { label: string; value: number; max: number; unit?: string; tone?: ToneKey; isDark: boolean; segments?: number }) {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const filled = Math.round(pct * segments);
    const color = TONE[tone].c;
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className={`font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                <span className="font-mono font-black" style={{ color }}>{value.toFixed(value < 10 ? 2 : 1)}{unit}</span>
            </div>
            <div className="flex gap-[3px]">
                {Array.from({ length: segments }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.008 }}
                        className="h-3.5 flex-1 rounded-[2px]"
                        style={
                            i < filled
                                ? { background: color, boxShadow: `0 0 6px ${TONE[tone].glow}` }
                                : { background: isDark ? '#22324d' : '#e2e8f0' }
                        }
                    />
                ))}
            </div>
        </div>
    );
}

/* ============================================================== */
/* Smooth path helper (catmull-rom -> bezier)                      */
/* ============================================================== */
function smoothPath(points: [number, number][]): string {
    if (points.length < 3) return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
}

/* ============================================================== */
/* Time-series chart — Grafana-style line/area panel w/ grid+axis  */
/* ============================================================== */
export interface Series { label: string; color: ToneKey; data: number[] }

export function TimeSeriesChart({
                                    series, height = 150, unit = '', formatValue, intervalSec = 3, isDark,
                                }: {
    series: Series[]; height?: number; unit?: string;
    formatValue?: (v: number) => string; intervalSec?: number; isDark: boolean;
}) {
    const gradientBaseId = useId();
    const W = 600, H = height, PADL = 44, PADR = 26, PADT = 14, PADB = 22;
    const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
    const fmt = formatValue ?? ((v: number) => v.toFixed(0));

    const maxLen = Math.max(...series.map((s) => s.data.length), 0);
    if (maxLen < 2) {
        return (
            <div style={{ height: H }} className="flex items-center justify-center">
                <span className={`font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>collecting samples…</span>
            </div>
        );
    }

    const allValues = series.flatMap((s) => s.data);
    const rawMax = Math.max(...allValues, 1);
    const niceMax = rawMax * 1.15;
    const gridLines = 4;

    function toPoints(data: number[]): [number, number][] {
        const stepX = innerW / (maxLen - 1);
        const offset = maxLen - data.length;
        return data.map((v, i) => {
            const x = PADL + (offset + i) * stepX;
            const y = PADT + innerH - (v / niceMax) * innerH;
            return [x, y];
        });
    }

    const totalWindow = (maxLen - 1) * intervalSec;

    return (
        <div className="relative">
            <div className="mb-2 flex flex-wrap items-center gap-4">
                {series.map((s) => {
                    const last = s.data[s.data.length - 1] ?? 0;
                    return (
                        <div key={s.label} className="flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ background: TONE[s.color].c, boxShadow: `0 0 6px ${TONE[s.color].glow}` }} />
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{s.label}</span>
                            <span className="font-mono font-black" style={{ color: TONE[s.color].c }}>{fmt(last)}{unit}</span>
                        </div>
                    );
                })}
            </div>

            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <defs>
                    {series.map((s) => (
                        <linearGradient
                            key={s.label}
                            id={`${gradientBaseId}-${s.label.replace(/[^a-zA-Z0-9_-]/g, '')}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor={TONE[s.color].c} stopOpacity={0.28} />
                            <stop offset="55%" stopColor={TONE[s.color].c} stopOpacity={0.1} />
                            <stop offset="100%" stopColor={TONE[s.color].c} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>

                {Array.from({ length: gridLines + 1 }).map((_, i) => {
                    const y = PADT + (innerH / gridLines) * i;
                    const val = niceMax - (niceMax / gridLines) * i;
                    return (
                        <g key={i}>
                            <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke={isDark ? '#22324d' : '#e2e8f0'} strokeWidth={1} strokeDasharray="3 4" />
                            <text x={PADL - 6} y={y + 3} textAnchor="end" fontSize={9} fontFamily="monospace" fill={isDark ? '#475569' : '#94a3b8'}>
                                {fmt(val)}
                            </text>
                        </g>
                    );
                })}
                <line x1={PADL} y1={PADT} x2={PADL} y2={PADT + innerH} stroke={isDark ? '#22324d' : '#e2e8f0'} strokeWidth={1} />

                {series.map((s) => {
                    const pts = toPoints(s.data);
                    const line = smoothPath(pts);
                    const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${PADT + innerH} L ${pts[0][0].toFixed(1)} ${PADT + innerH} Z`;
                    const last = pts[pts.length - 1];
                    const gradientId = `${gradientBaseId}-${s.label.replace(/[^a-zA-Z0-9_-]/g, '')}`;
                    return (
                        <g key={s.label}>
                            <path d={area} fill={`url(#${gradientId})`} opacity={0.72} />
                            <path d={line} fill="none" stroke={TONE[s.color].c} strokeOpacity={0.16} strokeWidth={6} strokeLinecap="round" />
                            <path
                                d={line}
                                fill="none"
                                stroke={TONE[s.color].c}
                                strokeWidth={2.4}
                                strokeLinecap="round"
                                style={{ filter: `drop-shadow(0 0 8px ${TONE[s.color].glow})` }}
                            />
                            <circle cx={last[0]} cy={last[1]} r={3.5} fill={TONE[s.color].c} style={{ filter: `drop-shadow(0 0 6px ${TONE[s.color].glow})` }} />
                            <circle cx={last[0]} cy={last[1]} r={7} fill="none" stroke={TONE[s.color].c} strokeWidth={1} opacity={0.5}>
                                <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                            </circle>
                        </g>
                    );
                })}

                <text x={PADL} y={H - 4} fontSize={9} fontFamily="monospace" fill={isDark ? '#475569' : '#94a3b8'}>-{totalWindow}s</text>
                <text x={(PADL + W - PADR) / 2} y={H - 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={isDark ? '#475569' : '#94a3b8'}>-{Math.round(totalWindow / 2)}s</text>
                <text x={W - PADR} y={H - 4} textAnchor="end" fontSize={9} fontFamily="monospace" fill={isDark ? '#475569' : '#94a3b8'}>now</text>
            </svg>
        </div>
    );
}
