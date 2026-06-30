import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, Info, Clock } from 'lucide-react';
import { useAlerts } from '../hooks/useInfraData';

const SEV_CONFIG = {
    critical: { icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    warning:  { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    info:     { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
};

export default function AlertsPage() {
    const { alerts, loading } = useAlerts();

    const critical = alerts.filter(a => a.severity === 'critical');
    const warnings  = alerts.filter(a => a.severity === 'warning');

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141414] p-6">
            {/* Summary row */}
            <div className="mb-5 grid flex-shrink-0 grid-cols-3 gap-4">
                {[
                    { label: 'Critical', count: critical.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    { label: 'Warnings', count: warnings.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                    { label: 'Total',    count: alerts.length,   color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                ].map(({ label, count, color, bg }) => (
                    <div
                        key={label}
                        className="rounded-2xl border p-4"
                        style={{ background: bg, borderColor: `${color}33` }}
                    >
                        <div className="text-3xl font-bold mb-0.5" style={{ color }}>{count}</div>
                        <div className="text-xs uppercase tracking-wider text-white/40">{label}</div>
                    </div>
                ))}
            </div>

            {/* Alert list */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1419]">
                {loading && (
                    <div className="flex items-center justify-center py-20 text-sm text-white/30">
                        Loading alerts...
                    </div>
                )}

                {!loading && alerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <div className="text-4xl">✅</div>
                        <div className="text-sm text-white/30">No active alerts — all systems nominal</div>
                    </div>
                )}

                <div className="p-4 space-y-2">
                    {alerts.map((alert, i) => {
                        const cfg = SEV_CONFIG[alert.severity] ?? SEV_CONFIG.info;
                        const Icon = cfg.icon;

                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-start gap-3 rounded-xl border p-4"
                                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                            >
                                <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                    <span
                        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ color: cfg.color, background: `${cfg.color}22` }}
                    >
                      {alert.severity}
                    </span>
                                        <span className="text-[10px] uppercase tracking-wider text-white/30">
                                            {alert.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-sm text-white/80">{alert.message}</div>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] font-mono text-white/30">{alert.instance}</span>
                                        <span className="flex items-center gap-1 text-[10px] text-white/20">
                                            <Clock size={9} />
                                            {new Date(alert.at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                {alert.value > 0 && (
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-lg font-bold font-mono" style={{ color: cfg.color }}>
                                            {alert.value.toFixed(1)}
                                        </div>
                                        <div className="text-[9px] text-white/30">value</div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
