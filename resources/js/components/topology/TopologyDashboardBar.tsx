import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Trash2, Link2, ChevronDown } from 'lucide-react';
import type { TopologyDashboard } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    topologies: TopologyDashboard[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onCreate: (name: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onLink?: (targetId: number) => void;
}

export default function TopologyDashboardBar({
    topologies,
    activeId,
    onSelect,
    onCreate,
    onDelete,
    onLink,
}: Props) {
    const { isDark } = useTheme();
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [linkMode, setLinkMode] = useState(false);

    const active = topologies.find((t) => t.id === activeId);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await onCreate(newName.trim());
        setNewName('');
        setCreating(false);
    };

    const panelCls = isDark
        ? 'bg-[rgba(12,14,24,0.96)] border-white/10 text-white'
        : 'bg-white/95 border-gray-200 text-gray-900 shadow-lg';

    return (
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-white/8 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
            <LayoutGrid size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />

            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${panelCls} border`}
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
                            className={`absolute top-full left-0 mt-1 z-50 min-w-[280px] rounded-xl border p-2 ${panelCls}`}
                        >
                            {topologies.map((t) => (
                                <div
                                    key={t.id}
                                    className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group ${
                                        t.id === activeId
                                            ? isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                                            : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
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

                            <div className={`border-t mt-2 pt-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                {creating ? (
                                    <div className="flex gap-1 px-1">
                                        <input
                                            autoFocus
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            placeholder="Topology name..."
                                            className={`flex-1 text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                                isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300'
                                            }`}
                                        />
                                        <button onClick={handleCreate} className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white">OK</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCreating(true)}
                                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold ${
                                            isDark ? 'text-indigo-400 hover:bg-white/5' : 'text-indigo-600 hover:bg-indigo-50'
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

            {onLink && topologies.length > 1 && (
                <button
                    onClick={() => setLinkMode(!linkMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        linkMode
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
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
                            className={`text-[10px] px-2 py-1 rounded-lg border ${
                                isDark ? 'border-white/10 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
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
