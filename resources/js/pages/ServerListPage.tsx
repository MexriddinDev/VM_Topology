import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { Server, NodeStatus, VmLayer } from '../types';
import { useServers } from '../hooks/useInfraData';

const LAYER_LABELS: Record<VmLayer, string> = {
    infra: 'OS', app: 'App', database: 'DB', redis: 'Redis',
};

const STATUS_COLOR: Record<NodeStatus, string> = {
    healthy: '#22c55e', warning: '#f59e0b', down: '#ef4444', unknown: '#6b7280',
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

export default function ServerListPage({ onServerClick }: { onServerClick: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<NodeStatus | ''>('');

    const { servers, loading } = useServers({
        search: search || undefined,
        status: statusFilter || undefined,
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141414] p-6">
            {/* Filters */}
            <div className="mb-5 flex flex-shrink-0 items-center gap-3">
                <div
                    className="flex flex-1 max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-[#1a2332] px-3 py-2"
                >
                    <Search size={14} className="text-white/30" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search servers..."
                        className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as NodeStatus | '')}
                    className="rounded-xl border border-white/10 bg-[#1a2332] px-3 py-2 text-sm text-white/70 outline-none"
                >
                    <option value="">All Status</option>
                    <option value="healthy">Healthy</option>
                    <option value="warning">Warning</option>
                    <option value="down">Down</option>
                </select>

                <div className="ml-auto text-sm text-white/30">
                    {servers.length} server{servers.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1419]">
                {/* Header */}
                <div
                    className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/30"
                    style={{
                        gridTemplateColumns: '1fr 80px 100px 130px 130px 100px',
                        background: 'rgba(255,255,255,0.03)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <span>Server</span>
                    <span>Layers</span>
                    <span>Status</span>
                    <span>CPU</span>
                    <span>Memory</span>
                    <span>IP</span>
                </div>

                <div className="overflow-y-auto h-full pb-12">
                    {loading && (
                        <div className="flex items-center justify-center py-20 text-sm text-white/30">
                            Loading servers...
                        </div>
                    )}

                    {!loading && servers.length === 0 && (
                        <div className="flex items-center justify-center py-20 text-sm text-white/20">
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
                                gridTemplateColumns: '1fr 80px 100px 130px 130px 100px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}
                            whileHover={{ background: 'rgba(34,197,94,0.04)' }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-base">🖥</span>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-white transition-colors group-hover:text-cyan-300">
                                        {server.name}
                                    </div>
                                    <div className="text-[10px] text-white/30 font-mono">{server.job}</div>
                                </div>
                            </div>

                            <span className="text-[10px] uppercase text-white/40">
                                {(server.layers ?? ['infra']).map((l) => LAYER_LABELS[l] ?? l).join(', ')}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: STATUS_COLOR[server.status] }}
                                />
                                <span className="text-xs capitalize" style={{ color: STATUS_COLOR[server.status] }}>
                  {server.status}
                </span>
                            </div>

                            <MiniBar value={server.cpu_percent} color="#3b82f6" />
                            <MiniBar value={server.ram_percent} color="#8b5cf6" />

                            <span className="text-[11px] font-mono text-white/40">{server.ip}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
