import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Plus, Server as ServerIcon } from 'lucide-react';
import type { Server } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    nodes: Server[];
    onFilterStatus: (status: string | null) => void;
    activeFilter: string | null;
    allServers: Server[];
    canvasServerIds: Set<string>;
    onAddServer: (server: Server) => void;
}

export default function StatusOverviewBar({ nodes, onFilterStatus, activeFilter, allServers, canvasServerIds, onAddServer }: Props) {
    const { isDark } = useTheme();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const counts = {
        healthy: nodes.filter((n) => n.status === 'healthy').length,
        warning: nodes.filter((n) => n.status === 'warning').length,
        down: nodes.filter((n) => n.status === 'down').length,
    };

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        return allServers
            .filter(
                (s) =>
                    !canvasServerIds.has(s.id) &&
                    (s.name.toLowerCase().includes(q) ||
                        s.ip.includes(q) ||
                        s.instance.toLowerCase().includes(q))
            )
            .slice(0, 12);
    }, [allServers, canvasServerIds, query]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const items = [
        { key: 'healthy', label: 'Online', count: counts.healthy, color: '#16a34a', bg: isDark ? '#0a1f12' : '#f0fdf4' },
        { key: 'warning', label: 'Degraded', count: counts.warning, color: '#ca8a04', bg: isDark ? '#1f1a0a' : '#fefce8' },
        { key: 'down', label: 'Offline', count: counts.down, color: '#dc2626', bg: isDark ? '#1f0a0a' : '#fef2f2' },
    ];

    const barBg = isDark ? '#1a1a1a' : '#ffffff';
    const border = isDark ? '#333' : '#d4d4d4';
    const inputCls = isDark
        ? 'bg-[#1a2332] border-[#2d3a4f] text-slate-100 placeholder:text-slate-500'
        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';
    const dropdownCls = isDark
        ? 'bg-[#1a2332] border-[#2d3a4f] shadow-2xl'
        : 'bg-white border-slate-200 shadow-xl';

    return (
        <div className="flex items-center gap-3 px-6 py-3 flex-wrap border-b" style={{ background: barBg, borderColor: border }}>
            <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Status
            </span>
            {items.map(({ key, label, count, color, bg }) => (
                <button
                    key={key}
                    onClick={() => onFilterStatus(activeFilter === key ? null : key)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md border-2 text-sm font-black transition-all"
                    style={{
                        borderColor: activeFilter === key ? color : border,
                        background: activeFilter === key ? bg : 'transparent',
                        color: isDark ? '#fafafa' : '#171717',
                    }}
                >
                    <span className={`w-3.5 h-3.5 rounded-full ${key === 'down' && count > 0 ? 'animate-pulse' : ''}`} style={{ background: color }} />
                    <span style={{ color }}>{count}</span>
                    <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>{label}</span>
                </button>
            ))}
            {activeFilter && (
                <button onClick={() => onFilterStatus(null)} className={`text-sm font-semibold underline ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    Hammasi
                </button>
            )}

            {/* Search Bar in the middle */}
            <div ref={ref} className="flex-1 flex items-center justify-center relative px-4">
                <div className="w-full max-w-md relative">
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 ${inputCls}`}>
                        <Search size={16} className="flex-shrink-0 opacity-50" />
                        <input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="Search VM to add..."
                            className="flex-1 bg-transparent text-sm font-medium outline-none"
                        />
                    </div>

                    {open && query.trim().length >= 2 && (
                        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border overflow-hidden z-50 ${dropdownCls}`}>
                            {searchResults.length === 0 ? (
                                <div className={`px-4 py-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    No matching VMs found
                                </div>
                            ) : (
                                searchResults.map((server) => (
                                    <button
                                        key={server.id}
                                        type="button"
                                        onClick={() => {
                                            onAddServer(server);
                                            setQuery('');
                                            setOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                            isDark ? 'hover:bg-slate-800/80 border-b border-slate-800' : 'hover:bg-slate-50 border-b border-slate-100'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                            <ServerIcon size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {server.name}
                                            </div>
                                            <div className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {server.ip}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    background:
                                                        server.status === 'healthy' ? '#059669' :
                                                        server.status === 'warning' ? '#d97706' : '#dc2626',
                                                }}
                                            />
                                            <Plus size={16} className="text-emerald-600" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            <span className={`ml-auto text-sm font-semibold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {nodes.length} VM
            </span>
        </div>
    );
}
