import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, Filter, History, Search, XCircle, Info, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAlertHistory } from '../hooks/useInfraData';
import type { AlertSeverity, AlertHistoryEvent } from '../types';

const RANGE_OPTIONS = [
    { value: '1h', label: 'Last 1h' },
    { value: '24h', label: 'Last 24h' },
    { value: '3d', label: 'Last 3 days' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
];

const SEVERITY_OPTIONS: Array<{ value: AlertSeverity | 'all'; label: string; color: string; bg: string }> = [
    { value: 'all', label: 'All', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
    { value: 'critical', label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    { value: 'warning', label: 'Warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { value: 'info', label: 'Info', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
];

function badgeForStatus(status: string) {
    return status === 'active'
        ? { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle2 size={12} /> }
        : { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <History size={12} /> };
}

function formatTime(value?: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString();
}

export default function AlertsPage() {
    const { isDark } = useTheme();
    const [q, setQ] = useState('');
    const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
    const [type, setType] = useState('all');
    const [status, setStatus] = useState<'all' | 'active' | 'resolved'>('all');
    const [range, setRange] = useState('3d');

    const { alerts, loading } = useAlertHistory({
        severity: severity === 'all' ? undefined : severity,
        type: type === 'all' ? undefined : type,
        status: status === 'all' ? undefined : status,
        q: q || undefined,
        range,
    });

    const types = useMemo(
        () => Array.from(new Set(alerts.map((a) => a.type))).sort(),
        [alerts]
    );

    const filtered = useMemo(() => alerts, [alerts]);

    const summary = useMemo(() => ({
        total: filtered.length,
        critical: filtered.filter((a) => a.severity === 'critical').length,
        warning: filtered.filter((a) => a.severity === 'warning').length,
        active: filtered.filter((a) => a.status === 'active').length,
    }), [filtered]);

    const shellBg = isDark ? '#0b1220' : '#f8fafc';
    const panel = isDark ? '#0f172a' : '#ffffff';
    const border = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.28)';
    const textH = isDark ? 'text-slate-100' : 'text-slate-900';
    const textM = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden p-6" style={{ background: shellBg }}>
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    { label: 'Total', value: summary.total, color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
                    { label: 'Active', value: summary.active, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
                    { label: 'Critical', value: summary.critical, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
                    { label: 'Warnings', value: summary.warning, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
                ].map((item) => (
                    <div key={item.label} className="rounded-3xl border p-5" style={{ background: panel, borderColor: border }}>
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] opacity-60" style={{ color: item.color }}>
                            {item.label}
                        </div>
                        <div className="mt-2 text-4xl font-black" style={{ color: item.color }}>
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-4 rounded-3xl border p-4" style={{ background: panel, borderColor: border }}>
                <div className="mb-3 flex items-center gap-2">
                    <Filter size={16} className={textM} />
                    <div className={`text-sm font-bold ${textH}`}>Filters</div>
                    <div className={`ml-auto text-xs ${textM}`}>{alerts.length} records</div>
                </div>

                <div className="grid gap-3 lg:grid-cols-5">
                    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${textM}`} style={{ borderColor: border, background: isDark ? '#111827' : '#fff' }}>
                        <Search size={16} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search message / IP / type"
                            className={`w-full bg-transparent text-base outline-none ${textH}`}
                        />
                    </div>

                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as AlertSeverity | 'all')}
                        className="rounded-2xl border px-4 py-3 text-base outline-none"
                        style={{ borderColor: border, background: isDark ? '#111827' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }}
                    >
                        {SEVERITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'resolved')}
                        className="rounded-2xl border px-4 py-3 text-base outline-none"
                        style={{ borderColor: border, background: isDark ? '#111827' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }}
                    >
                        <option value="all">All states</option>
                        <option value="active">Active</option>
                        <option value="resolved">Resolved</option>
                    </select>

                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="rounded-2xl border px-4 py-3 text-base outline-none"
                        style={{ borderColor: border, background: isDark ? '#111827' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }}
                    >
                        {RANGE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="rounded-2xl border px-4 py-3 text-base outline-none"
                        style={{ borderColor: border, background: isDark ? '#111827' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }}
                    >
                        <option value="all">All types</option>
                        {types.map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    <div className={`rounded-2xl border px-4 py-3 text-sm ${textM}`} style={{ borderColor: border, background: isDark ? '#111827' : '#fff' }}>
                        <div className="font-black uppercase tracking-[0.22em]">Types</div>
                        <div className="mt-1 truncate">{types.length ? types.join(', ') : 'None'}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-3xl border" style={{ background: panel, borderColor: border }}>
                {loading && (
                    <div className={`flex h-full items-center justify-center py-20 text-lg ${textM}`}>
                        Loading alert history...
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center py-20">
                        <div className="text-4xl">🔎</div>
                        <div className={`mt-3 text-lg font-semibold ${textH}`}>No matching alerts</div>
                        <div className={`mt-1 text-sm ${textM}`}>Try a different time range, severity, or keyword.</div>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {filtered.map((alert, i) => {
                        const sev = SEVERITY_OPTIONS.find((o) => o.value === alert.severity) ?? SEVERITY_OPTIONS[0];
                        const statusBadge = badgeForStatus(alert.status);
                        return (
                            <motion.div
                                key={alert.fingerprint}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="rounded-3xl border p-4"
                                style={{
                                    background: isDark ? 'rgba(15,23,42,0.92)' : '#fff',
                                    borderColor: sev.color === '#64748b' ? border : `${sev.color}55`,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-2xl p-2" style={{ color: sev.color, background: sev.bg }}>
                                        {alert.severity === 'critical' ? <XCircle size={18} /> : alert.severity === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: sev.color, background: sev.bg }}>
                                                {alert.severity}
                                            </span>
                                            <span className={`text-xs font-bold uppercase tracking-[0.22em] ${textM}`}>
                                                {alert.type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: statusBadge.color, background: statusBadge.bg }}>
                                                {statusBadge.icon} {alert.status}
                                            </span>
                                        </div>

                                        <div className={`mt-2 text-lg font-semibold ${textH}`}>{alert.message}</div>
                                        <div className={`mt-1 font-mono text-sm ${textM}`}>{alert.instance}</div>

                                        <div className="mt-4 grid gap-2 md:grid-cols-3">
                                            <Meta label="First seen" value={formatTime(alert.first_seen_at)} dark={isDark} />
                                            <Meta label="Last seen" value={formatTime(alert.last_seen_at)} dark={isDark} />
                                            <Meta label="Resolved" value={formatTime(alert.resolved_at)} dark={isDark} />
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-3xl font-black" style={{ color: sev.color }}>
                                            {alert.value.toFixed(1)}
                                        </div>
                                        <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${textM}`}>value</div>
                                        <div className={`mt-3 text-sm font-semibold ${textM}`}>
                                            {alert.occurrence_count}x
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Meta({ label, value, dark }: { label: string; value: string; dark: boolean }) {
    return (
        <div className="rounded-2xl border px-3 py-2" style={{ borderColor: dark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.25)', background: dark ? 'rgba(15,23,42,0.9)' : '#f8fafc' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</div>
            <div className="mt-1 font-mono text-sm" style={{ color: dark ? '#e2e8f0' : '#334155' }}>{value}</div>
        </div>
    );
}
