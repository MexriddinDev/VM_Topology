import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Plus, Server as ServerIcon } from 'lucide-react';
import type { Server } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    allServers: Server[];
    canvasServerIds: Set<string>;
    onAdd: (server: Server) => void;
}

export default function TopologySearchHeader({ allServers, canvasServerIds, onAdd }: Props) {
    const { isDark } = useTheme();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const results = useMemo(() => {
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

    const inputCls = isDark
        ? 'bg-[#1a2332] border-[#2d3a4f] text-slate-100 placeholder:text-slate-500'
        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

    const dropdownCls = isDark
        ? 'bg-[#1a2332] border-[#2d3a4f] shadow-2xl'
        : 'bg-white border-slate-200 shadow-xl';

    return (
        <div ref={ref} className="flex-1 relative px-6 py-3 flex items-center gap-3 flex-shrink-0 border-b" style={{
            background: isDark ? '#0f1419' : '#f8f9fa',
            borderColor: isDark ? '#1e2330' : '#e5e7eb'
        }}>
            <span className={`text-xs font-bold uppercase tracking-widest flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                Status
            </span>

            <div className="flex-1 max-w-md relative">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 ${inputCls}`}>
                    <Search size={18} className="flex-shrink-0 opacity-50" />
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder="Search VM by name or IP to add..."
                        className="flex-1 bg-transparent text-sm font-medium outline-none"
                    />
                </div>

                {open && query.trim().length >= 2 && (
                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border overflow-hidden z-50 ${dropdownCls}`}>
                        {results.length === 0 ? (
                            <div className={`px-4 py-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                No matching VMs found
                            </div>
                        ) : (
                            results.map((server) => (
                                <button
                                    key={server.id}
                                    type="button"
                                    onClick={() => {
                                        onAdd(server);
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
    );
}
