import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, Info, Clock } from 'lucide-react';
import type { Alert } from '../types';
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
        <div className="flex-1 flex flex-col h-full p-6 overflow-hidden">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4 mb-5 flex-shrink-0">
                {[
                    { label: 'Critical', count: critical.length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Warnings', count: warnings.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Total',    count: alerts.length,   color: '#6b7280', bg: 'rgba(255,255,255,0.05)' },
                ].map(({ label, count, color, bg }) => (
                    <div
                        key={label}
                        className="rounded-2xl p-4"
                        style={{ background: bg, border: `1px solid ${color}33` }}
                    >
                        <div className="text-3xl font-bold mb-0.5" style={{ color }}>{count}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider">{label}</div>
                    </div>
                ))}
            </div>

            {/* Alert list */}
            <div
                className="flex-1 overflow-y-auto rounded-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
                {loading && (
                    <div className="flex items-center justify-center py-20 text-white/30 text-sm">
                        Loading alerts...
                    </div>
                )}

                {!loading && alerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="text-4xl">✅</div>
                        <div className="text-white/30 text-sm">No active alerts — all systems nominal</div>
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
                                className="flex items-start gap-3 p-4 rounded-xl"
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
                                        <span className="text-[10px] text-white/30 uppercase tracking-wider">
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
