import React from 'react';
import { Cpu, Activity, Database, Zap, Server } from 'lucide-react';
import type { ServerMetrics, VmLayer } from '../../types';
import { useTheme } from '../../context/ThemeContext';

const LAYER_CONFIG: Record<VmLayer, { label: string; sub: string; Icon: typeof Cpu }> = {
    infra:    { label: 'Operating System', sub: 'node_exporter', Icon: Cpu },
    app:      { label: 'Application', sub: 'HTTP metrics', Icon: Activity },
    database: { label: 'Database', sub: 'PostgreSQL', Icon: Database },
    redis:    { label: 'Cache', sub: 'Redis', Icon: Zap },
};

function layerStatus(metrics: ServerMetrics, layer: VmLayer): 'up' | 'down' | 'warn' | 'na' {
    const vmDown = metrics.server.status === 'down';

    switch (layer) {
        case 'infra':
            if (vmDown) return 'down';
            if (metrics.server.status === 'warning') return 'warn';
            return 'up';
        case 'app':
            if (!metrics.layers.includes('app')) return 'na';
            if (vmDown || !metrics.app) return 'down';
            if (metrics.app.error_rate_5xx > 5) return 'warn';
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
    up:   { dot: '#059669', border: '#059669', bg: 'rgba(5,150,105,0.08)', text: 'OPERATIONAL' },
    down: { dot: '#dc2626', border: '#dc2626', bg: 'rgba(220,38,38,0.08)', text: 'OFFLINE' },
    warn: { dot: '#d97706', border: '#d97706', bg: 'rgba(217,119,6,0.08)', text: 'DEGRADED' },
    na:   { dot: '#94a3b8', border: '#cbd5e1', bg: 'rgba(148,163,184,0.06)', text: 'NOT DETECTED' },
};

export default function VmLayerTopology({ metrics }: { metrics: ServerMetrics }) {
    const { isDark } = useTheme();
    const layers: VmLayer[] = ['infra', 'app', 'database', 'redis'];
    const activeLayers = layers.filter((l) => metrics.layers.includes(l) || l === 'infra');

    const cardBg = isDark ? '#111827' : '#ffffff';
    const lineColor = isDark ? '#374151' : '#cbd5e1';

    return (
        <div
            className="rounded-2xl p-6 border"
            style={{
                background: cardBg,
                borderColor: isDark ? '#1f2937' : '#e5e7eb',
            }}
        >
            <div className="flex items-center gap-3 mb-6">
                <Server size={22} className={isDark ? 'text-slate-300' : 'text-slate-700'} />
                <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        VM Internal Topology
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Layer health detected via Prometheus exporters
                    </p>
                </div>
            </div>

            <div className="relative flex flex-col items-center gap-0 py-4">
                {/* VM root */}
                <div
                    className="relative z-10 px-8 py-4 rounded-xl border-2 text-center min-w-[200px]"
                    style={{
                        borderColor: STATUS_STYLE[layerStatus(metrics, 'infra')].border,
                        background: STATUS_STYLE[layerStatus(metrics, 'infra')].bg,
                    }}
                >
                    <div className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {metrics.server.name}
                    </div>
                    <div className={`text-sm font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {metrics.server.ip}
                    </div>
                    <LayerBadge status={layerStatus(metrics, 'infra')} />
                </div>

                {/* Vertical spine */}
                {activeLayers.length > 1 && (
                    <div className="w-0.5 h-8" style={{ background: lineColor }} />
                )}

                {/* Layer nodes row */}
                <div className="flex flex-wrap justify-center gap-4 w-full">
                    {activeLayers.filter((l) => l !== 'infra').map((layer, i, arr) => {
                        const cfg = LAYER_CONFIG[layer];
                        const st = layerStatus(metrics, layer);
                        const style = STATUS_STYLE[st];
                        const Icon = cfg.Icon;

                        return (
                            <React.Fragment key={layer}>
                                <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-6" style={{ background: lineColor }} />
                                    <div
                                        className="px-5 py-4 rounded-xl border-2 min-w-[160px] text-center"
                                        style={{
                                            borderColor: style.border,
                                            background: style.bg,
                                        }}
                                    >
                                        <Icon size={28} className="mx-auto mb-2" style={{ color: style.dot }} />
                                        <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {cfg.label}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {cfg.sub}
                                        </div>
                                        <LayerBadge status={st} />
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function LayerBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
    const s = STATUS_STYLE[status];
    return (
        <div
            className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide"
            style={{ color: s.dot, background: `${s.dot}18` }}
        >
            <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
            {s.text}
        </div>
    );
}
