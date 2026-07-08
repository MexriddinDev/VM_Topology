import React from 'react';
import type { Server } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
    nodes: Server[];
    onFilterStatus: (status: string | null) => void;
    activeFilter: string | null;
}

export default function StatusOverviewBar({ nodes, onFilterStatus, activeFilter }: Props) {
    const { isDark } = useTheme();
    const { t } = useI18n();

    const counts = {
        up: nodes.filter((n) => n.status === 'up').length,
        down: nodes.filter((n) => n.status === 'down').length,
    };

    const items = [
        { key: 'up', label: t('topology.online'), count: counts.up, color: '#16a34a', bg: isDark ? '#0a1f12' : '#f0fdf4' },
        { key: 'down', label: t('topology.offline'), count: counts.down, color: '#dc2626', bg: isDark ? '#1f0a0a' : '#fef2f2' },
    ];

    const barBg = isDark ? '#1a1a1a' : '#ffffff';
    const border = isDark ? '#333' : '#d4d4d4';

    return (
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3" style={{ background: barBg, borderColor: border }}>
            <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {t('topology.status')}
            </span>

            {items.map(({ key, label, count, color, bg }) => (
                <button
                    key={key}
                    onClick={() => onFilterStatus(activeFilter === key ? null : key)}
                    className="flex items-center gap-2 rounded-md border-2 px-4 py-2 text-sm font-black transition-all"
                    style={{
                        borderColor: activeFilter === key ? color : border,
                        background: activeFilter === key ? bg : 'transparent',
                        color: isDark ? '#fafafa' : '#171717',
                    }}
                >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
                    <span style={{ color }}>{count}</span>
                    <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>{label}</span>
                </button>
            ))}

            {activeFilter && (
                <button
                    onClick={() => onFilterStatus(null)}
                    className={`text-sm font-semibold underline ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
                >
                    {t('alerts.allStates')}
                </button>
            )}

            <span className={`ml-auto text-sm font-semibold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {nodes.length} VM
            </span>
        </div>
    );
}
