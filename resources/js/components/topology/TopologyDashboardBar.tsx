import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Trash2, Link2, ChevronDown, Search, Server as ServerIcon } from 'lucide-react';
import type { TopologyDashboard } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import type { Server } from '../../types';

interface Props {
    topologies: TopologyDashboard[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onCreate: (name: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onLink?: (targetId: number) => void;
    allServers: Server[];
    canvasServerIds: Set<string>;
    onAddServer: (server: Server) => void;
}

export default function TopologyDashboardBar({
    topologies,
    activeId,
    onSelect,
    onCreate,
    onDelete,
    onLink,
    allServers,
    canvasServerIds,
    onAddServer,
}: Props) {
    const { isDark } = useTheme();
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [linkMode, setLinkMode] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLDivElement>(null);

    const active = topologies.find((t) => t.id === activeId);
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        return allServers
            .filter((s) => !canvasServerIds.has(s.id) && (
                s.name.toLowerCase().includes(q) ||
                s.ip.includes(q) ||
                s.instance.toLowerCase().includes(q)
            ))
            .slice(0, 10);
    }, [allServers, canvasServerIds, query]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await onCreate(newName.trim());
        setNewName('');
        setCreating(false);
    };

    const panelCls = isDark
        ? 'bg-[#0f172a] border-slate-700 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
        : 'bg-white/95 border-gray-200 text-gray-900 shadow-lg';

    return (
        <div className={`flex items-center gap-3 border-b px-4 py-3 ${isDark ? 'border-slate-700 bg-[#0b1220]' : 'border-gray-200 bg-gray-50'}`}>
            <LayoutGrid size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />

            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${panelCls}`}
                >
                    {active?.name ?? 'Select topology'}
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        ({active?.node_count ?? 0} VMs)
                    </span>
                    <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className={`absolute left-0 top-full z-50 mt-2 min-w-[320px] rounded-2xl border p-2 ${panelCls}`}
                        >
                            {topologies.map((t) => (
                                <div
                                    key={t.id}
                                    className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group ${
                                        t.id === activeId
                                            ? isDark ? 'bg-cyan-500/18' : 'bg-cyan-50'
                                            : isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => { onSelect(t.id); setOpen(false); }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{t.name}</div>
                                        <div className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                            {t.node_count} VMs · {t.edge_count} links
                                        </div>
                                    </div>
                                    {topologies.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className={`mt-2 border-t pt-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                {creating ? (
                                    <div className="flex gap-1 px-1">
                                        <input
                                            autoFocus
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            placeholder="Topology name..."
                                            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none ${
                                                isDark ? 'border-slate-600 bg-[#0b1220] text-white placeholder:text-slate-500' : 'bg-white border-gray-300'
                                            }`}
                                        />
                                        <button onClick={handleCreate} className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-[#06111f]">OK</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCreating(true)}
                                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold ${
                                            isDark ? 'text-cyan-300 hover:bg-slate-800' : 'text-cyan-600 hover:bg-cyan-50'
                                        }`}
                                    >
                                        <Plus size={12} /> New Topology Page
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div ref={searchRef} className="relative min-w-0 flex-1 max-w-2xl">
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${isDark ? 'border-slate-700 bg-[#111827]' : 'border-gray-200 bg-white'}`}>
                    <Search size={16} className={isDark ? 'text-cyan-400/80' : 'text-cyan-600'} />
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSearchOpen(true);
                        }}
                        onFocus={() => setSearchOpen(true)}
                        placeholder="Search VM by name or IP to add..."
                        className={`w-full bg-transparent text-sm outline-none placeholder:text-slate-500 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    />
                </div>

                {searchOpen && query.trim().length >= 2 && (
                    <div className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border ${panelCls}`}>
                        {results.length === 0 ? (
                            <div className={`px-4 py-5 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                No matching VMs found
                            </div>
                        ) : (
                            results.map((server) => (
                                <button
                                    key={server.id}
                                    type="button"
                                    onClick={() => {
                                        onAddServer(server);
                                        setQuery('');
                                        setSearchOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                        isDark ? 'border-b border-slate-800 hover:bg-slate-800' : 'border-b border-gray-100 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                        <ServerIcon size={18} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{server.name}</div>
                                        <div className={`font-mono text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{server.ip}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>Add</span>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {onLink && topologies.length > 1 && (
                <button
                    onClick={() => setLinkMode(!linkMode)}
                    className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                        linkMode
                            ? 'border-cyan-400 bg-cyan-500 text-[#06111f]'
                            : isDark ? 'border-slate-600 bg-[#111827] text-white/70 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Link this topology to another page"
                >
                    <Link2 size={12} /> Link Pages
                </button>
            )}

            {linkMode && onLink && (
                <div className="flex gap-1">
                    {topologies.filter((t) => t.id !== activeId).map((t) => (
                        <button
                            key={t.id}
                            onClick={() => { onLink(t.id); setLinkMode(false); }}
                            className={`rounded-lg border px-2 py-1 text-[10px] ${
                                isDark ? 'border-slate-600 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            → {t.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
