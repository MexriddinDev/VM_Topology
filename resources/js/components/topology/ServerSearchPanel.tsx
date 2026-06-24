import React, { useMemo, useState } from 'react';
import { Search, Plus, Minus, X } from 'lucide-react';
import type { Server } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    allServers: Server[];
    canvasServerIds: Set<string>;
    onAdd: (server: Server) => void;
    onRemove: (serverId: string) => void;
}

export default function ServerSearchPanel({ allServers, canvasServerIds, onAdd, onRemove }: Props) {
    const { isDark } = useTheme();
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(true);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return allServers.slice(0, 20);
        return allServers.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.ip.includes(q) ||
                s.instance.includes(q)
        ).slice(0, 30);
    }, [allServers, query]);

    const panelCls = isDark
        ? 'bg-[rgba(10,12,22,0.95)] border-white/10 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900 shadow-xl';

    const statusDot = (status: string) => {
        const colors: Record<string, string> = {
            healthy: 'bg-green-500',
            warning: 'bg-amber-500',
            down: 'bg-red-500 animate-pulse',
            unknown: 'bg-gray-400',
        };
        return colors[status] ?? colors.unknown;
    };

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className={`absolute top-16 left-3 z-20 p-2.5 rounded-xl border ${panelCls}`}
            >
                <Search size={16} />
            </button>
        );
    }

    return (
        <div className={`absolute top-16 left-3 z-20 w-72 rounded-xl border overflow-hidden ${panelCls}`}>
            <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                <Search size={14} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search VM by name or IP..."
                    className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'placeholder:text-white/30' : 'placeholder:text-gray-400'}`}
                />
                <button onClick={() => setExpanded(false)} className={isDark ? 'text-white/40 hover:text-white' : 'text-gray-400'}>
                    <X size={14} />
                </button>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {filtered.length === 0 && (
                    <div className={`px-3 py-4 text-xs text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        No VMs found
                    </div>
                )}
                {filtered.map((server) => {
                    const onCanvas = canvasServerIds.has(server.id);
                    return (
                        <div
                            key={server.id}
                            className={`flex items-center gap-2 px-3 py-2 border-b last:border-0 ${
                                isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(server.status)}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{server.name}</div>
                                <div className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{server.ip}</div>
                            </div>
                            {onCanvas ? (
                                <button
                                    onClick={() => onRemove(server.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                                    title="Remove from topology"
                                >
                                    <Minus size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => onAdd(server)}
                                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10"
                                    title="Add to topology"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`px-3 py-2 text-[10px] ${isDark ? 'text-white/30 bg-black/20' : 'text-gray-400 bg-gray-50'}`}>
                {canvasServerIds.size} VMs on canvas · {allServers.length} total from Prometheus
            </div>
        </div>
    );
}
