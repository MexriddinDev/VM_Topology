import React from 'react';
import { motion } from 'framer-motion';
import type { Server, VmLayer } from '../../types';

interface DepNode {
    label: string;
    icon: string;
    color: string;
}

const LAYER_DEPS: Record<VmLayer, DepNode[]> = {
    infra:    [],
    app:      [{ label: 'HTTP', icon: '⬡', color: '#16a34a' }],
    database: [{ label: 'PostgreSQL', icon: '🗄', color: '#d97706' }],
    redis:    [{ label: 'Redis', icon: '⚡', color: '#db2777' }],
};

const LAYER_ICONS: Record<VmLayer, string> = {
    infra: '🖥', app: '⬡', database: '🗄', redis: '⚡',
};

export default function DependencyMiniGraph({ server }: { server: Server }) {
    const layers = server.layers ?? ['infra'];
    const deps: DepNode[] = layers.flatMap((l) => LAYER_DEPS[l] ?? []);

    const self: DepNode = {
        label: server.name,
        icon: '🖥',
        color: server.status === 'down' ? '#dc2626' : '#16a34a',
    };

    const allNodes: DepNode[] = [self, ...deps];

    return (
        <div
            className="rounded-xl p-3 relative overflow-hidden bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/8"
            style={{ minHeight: 90 }}
        >
            <div className="relative flex items-center gap-2 flex-wrap">
                {allNodes.map((node, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <div className="text-black/20 dark:text-white/20 text-xs">→</div>}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex flex-col items-center gap-1 flex-shrink-0"
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-base"
                                style={{
                                    background: `${node.color}18`,
                                    border: `1px solid ${node.color}44`,
                                    boxShadow: i === 0 ? `0 0 10px ${node.color}44` : 'none',
                                }}
                            >
                                {node.icon}
                            </div>
                            <span className="text-[9px] opacity-50 text-center max-w-[48px] truncate">{node.label}</span>
                        </motion.div>
                    </React.Fragment>
                ))}
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
                {layers.map((l) => (
                    <span key={l} className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/8 opacity-60">
                        {LAYER_ICONS[l]} {l}
                    </span>
                ))}
            </div>
        </div>
    );
}
