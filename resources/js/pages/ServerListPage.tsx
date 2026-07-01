import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { Server, NodeStatus, VmLayer } from '../types';
import { useServers } from '../hooks/useInfraData';
import { useTheme } from '../context/ThemeContext';

const LAYER_LABELS: Record<VmLayer, string> = {
    infra: 'OS', app: 'App', database: 'DB', redis: 'Redis',
};

const STATUS_COLOR: Record<NodeStatus, string> = {
    up: '#22c55e', down: '#ef4444',
};

function MiniBar({ value, color }: { value: number; color: string }) {
    const c = value >= 85 ? '#ef4444' : value >= 70 ? '#f59e0b' : color;
    return (
        <div className="flex items-center gap-2 min-w-[80px]">
            <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: c }} />
            </div>
            <span className="text-[11px] font-mono w-8" style={{ color: c }}>{value.toFixed(0)}%</span>
        </div>
    );
}

interface Props {
    onServerClick: (id: string) => void;
    canvasServerIds: string[];
    canvasServerNames: Record<string, string>;
    onAddServer: (server: Server) => void;
    onRenameServer: (server: Server) => void;
    onClearServer: (server: Server) => void;
}

export default function ServerListPage({ onServerClick, canvasServerIds, canvasServerNames, onAddServer, onRenameServer, onClearServer }: Props) {
    const { isDark } = useTheme();
    const [search, setSearch] = useState('');
    // ✅ FIX: values now match the real NodeStatus union ('up' | 'down').
    // Previously this used 'healthy', which never matched server.status
    // ('up'/'down' coming from the backend), so the filter silently did
    // nothing — selecting "UP" always returned 0 rows.
    const [statusFilter, setStatusFilter] = useState<NodeStatus | ''>('');

    const { servers, loading } = useServers({
        search: search || undefined,
        status: statusFilter || undefined,
    });

    const shellBg = isDark ? '#0b1220' : '#f8fafc';
    const panelBg = isDark ? '#0f1419' : '#ffffff';
    const panelBorder = isDark ? 'border-white/10' : 'border-slate-200';
    const titleColor = isDark ? 'text-slate-100' : 'text-slate-900';
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';
    const headBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
    const canvasSet = new Set(canvasServerIds);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden p-6" style={{ background: shellBg }}>
            {/* Filters */}
            <div className="mb-5 flex flex-shrink-0 items-center gap-3">
                <div
                    className={`flex flex-1 max-w-xs items-center gap-2 rounded-xl border px-3 py-3 ${panelBorder}`}
                    style={{ background: isDark ? '#1a2332' : '#ffffff' }}
                >
                    <Search size={16} className={isDark ? 'text-white/35' : 'text-slate-400'} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search servers..."
                        className={`w-full bg-transparent text-base outline-none ${isDark ? 'text-white placeholder-white/30' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as NodeStatus | '')}
                    className={`rounded-xl border px-4 py-3 text-base outline-none ${panelBorder} ${isDark ? 'bg-[#1a2332] text-white/70' : 'bg-white text-slate-700'}`}
                >
                    <option value="">All Status</option>
                    <option value="up">UP</option>
                    <option value="down">Down</option>
                </select>

                <div className={`ml-auto text-base ${muted}`}>
                    {servers.length} server{servers.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Table */}
            <div className={`flex-1 overflow-hidden rounded-2xl border ${panelBorder}`} style={{ background: panelBg }}>
                {/* Header */}
                <div
                    className={`grid px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] ${muted}`}
                    style={{
                        gridTemplateColumns: '1.1fr 1fr 80px 100px 130px 130px 130px',
                        background: headBg,
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,23,42,0.06)',
                    }}
                >
                    <span>Server</span>
                    <span className="text-center">Name</span>
                    <span>Layers</span>
                    <span>Status</span>
                    <span>CPU</span>
                    <span>Memory</span>
                    <span>IP</span>
                </div>

                <div className="overflow-y-auto h-full pb-12">
                    {loading && (
                        <div className={`flex items-center justify-center py-20 text-base ${muted}`}>
                            Loading servers...
                        </div>
                    )}

                    {!loading && servers.length === 0 && (
                        <div className={`flex items-center justify-center py-20 text-base ${muted}`}>
                            No servers found
                        </div>
                    )}

                    {!loading && servers.map((server, i) => (
                        <motion.div
                            key={server.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => onServerClick(server.id)}
                            className="group grid cursor-pointer items-center px-4 py-3 transition-all"
                            style={{
                                gridTemplateColumns: '1.1fr 1fr 80px 100px 130px 130px 130px',
                                borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(15,23,42,0.05)',
                            }}
                            whileHover={{ background: isDark ? 'rgba(34,197,94,0.04)' : 'rgba(59,130,246,0.05)' }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg">🖥</span>
                                <div className="min-w-0">
                                    <div className={`truncate text-base font-semibold transition-colors ${titleColor} group-hover:text-cyan-400`}>
                                        {server.name}
                                    </div>
                                    <div className={`text-xs font-mono ${muted}`}>{server.job}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center min-w-0">
                                {canvasSet.has(server.id) ? (
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-emerald-400">
                                            {canvasServerNames[server.id] ?? 'Unnamed'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRenameServer(server);
                                            }}
                                            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                isDark ? 'border-slate-600 text-cyan-300 hover:bg-slate-800' : 'border-slate-300 text-cyan-700 hover:bg-cyan-50'
                                            }`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClearServer(server);
                                            }}
                                            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                isDark ? 'border-slate-600 text-red-300 hover:bg-slate-800' : 'border-slate-300 text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddServer(server);
                                        }}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                                            isDark ? 'border-slate-600 text-cyan-300 hover:bg-slate-800' : 'border-slate-300 text-cyan-700 hover:bg-cyan-50'
                                        }`}
                                    >
                                        Add + name
                                    </button>
                                )}
                            </div>

                            <span className={`text-[11px] uppercase ${muted}`}>
                                {(server.layers ?? ['infra']).map((l) => LAYER_LABELS[l] ?? l).join(', ')}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: STATUS_COLOR[server.status] }}
                                />
                                <span className="text-sm capitalize font-semibold" style={{ color: STATUS_COLOR[server.status] }}>
                  {server.status}
                </span>
                            </div>
                            <MiniBar value={server.cpu_percent} color="#3b82f6" />
                            <MiniBar value={server.ram_percent} color="#8b5cf6" />
                            <span className={`text-[11px] font-mono ${muted}`}>{server.ip}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
