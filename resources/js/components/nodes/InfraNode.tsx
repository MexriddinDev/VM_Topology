import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Server as VmServer, NodeStatus, VmLayer } from '../../types';
import { useTheme } from '../../context/ThemeContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const LAYER_LABEL: Record<VmLayer, string> = {
    infra:    'OS',
    app:      'APP',
    database: 'DB',
    redis:    'REDIS',
};

const STATUS: Record<string, {
    accent: string;
    accentDim: string;
    accentGlow: string;
    label: string;
    dotPulse: boolean;
}> = {
    healthy: {
        accent:    '#22c55e',
        accentDim: '#22c55e22',
        accentGlow:'#22c55e55',
        label:     'UP',
        dotPulse:  true,
    },
    warning: {
        accent:    '#f59e0b',
        accentDim: '#f59e0b22',
        accentGlow:'#f59e0b55',
        label:     'DEGRADED',
        dotPulse:  false,
    },
    down: {
        accent:    '#C72F12',
        accentDim: '#ef444418',
        accentGlow:'#C72F12',
        label:     'DOWN',
        dotPulse:  false,
    },
    unknown: {
        accent:    '#71717a',
        accentDim: '#71717a18',
        accentGlow:'#71717a22',
        label:     'UNKNOWN',
        dotPulse:  false,
    },
};

const HANDLE_POSITIONS = [
    { pos: Position.Top,    id: 'top'    },
    { pos: Position.Right,  id: 'right'  },
    { pos: Position.Bottom, id: 'bottom' },
    { pos: Position.Left,   id: 'left'   },
] as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MetricBarProps {
    label: string;
    value: number;
    accent: string;
    isDark: boolean;
}

function MetricBar({ label, value, accent, isDark }: MetricBarProps) {
    const barColor =
        value >= 85 ? '#ef4444' :
            value >= 65 ? '#f59e0b' :
                accent;

    const trackBg = isDark ? '#27272a' : '#e4e4e7';
    const textColor = isDark ? '#a1a1aa' : '#71717a';
    const valColor  = isDark ? '#d4d4d8' : '#3f3f46';

    return (
        <div>
            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'baseline',
                marginBottom:   4,
            }}>
                <span style={{
                    fontSize:      9,
                    fontFamily:    'ui-monospace, monospace',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:          textColor,
                }}>
                    {label}
                </span>
                <span style={{
                    fontSize:   11,
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 500,
                    color:       valColor,
                }}>
                    {value}%
                </span>
            </div>
            <div style={{
                height:       3,
                borderRadius: 2,
                background:   trackBg,
                overflow:     'hidden',
            }}>
                <div style={{
                    height:       '100%',
                    width:        `${value}%`,
                    borderRadius: 2,
                    background:   barColor,
                    transition:   'width 0.4s ease',
                }} />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function InfraNode({ data, selected }: NodeProps<VmServer>) {
    const { isDark } = useTheme();

    const statusKey = (data.status ?? 'unknown') as NodeStatus;
    const cfg       = STATUS[statusKey in STATUS ? statusKey : 'unknown'];
    const isDown    = statusKey === 'down';
    const layers    = data.layers ?? ['infra'];

    // Theme-aware colors
    const cardBg      = isDark ? '#18181b' : '#ffffff';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    const nameColor   = isDown
        ? (isDark ? '#52525b' : '#a1a1aa')
        : (isDark ? '#fafafa'  : '#18181b');
    const ipColor = isDark ? '#52525b' : '#a1a1aa';
    const tagBg   = isDark ? '#27272a' : '#f4f4f5';
    const tagText = isDark ? '#71717a' : '#71717a';
    const tagBorder = isDark ? '#3f3f46' : '#e4e4e7';

    const cardShadow = selected
        ? `0 0 0 2px ${cfg.accent}, 0 8px 32px rgba(0,0,0,0.28)`
        : isDown
            ? `0 0 0 1px ${cfg.accent}55, 0 2px 8px rgba(0,0,0,0.12)`
            : `0 0 0 1px ${borderColor}, 0 2px 8px rgba(0,0,0,0.06)`;

    return (
        <div
            style={{
                position:     'relative',
                width:        220,
                borderRadius: 8,
                background:   cardBg,
                boxShadow:    cardShadow,
                border:       `1px solid ${borderColor}`,
                borderLeft:   `3px solid ${cfg.accent}`,
                overflow:     'visible',
                opacity:      isDown ? 0.72 : 1,
                transition:   'box-shadow 0.15s, opacity 0.2s',
            }}
        >
            {/* React Flow handles */}
            {HANDLE_POSITIONS.flatMap(({ pos, id }) => [
                <Handle
                    key={`${id}-s`}
                    type="source"
                    position={pos}
                    id={`${id}-s`}
                    style={{
                        background:   cfg.accent,
                        border:       `2px solid ${cardBg}`,
                        width:         8,
                        height:        8,
                        borderRadius: '50%',
                    }}
                />,
                <Handle
                    key={`${id}-t`}
                    type="target"
                    position={pos}
                    id={`${id}-t`}
                    style={{
                        background:   cfg.accent,
                        border:       `2px solid ${cardBg}`,
                        width:         8,
                        height:        8,
                        borderRadius: '50%',
                    }}
                />,
            ])}

            <div style={{ padding: '12px 12px 12px 10px' }}>

                {/* ── Header row ── */}
                <div style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:             7,
                    marginBottom:   10,
                }}>
                    {/* Status dot */}
                    <span style={{
                        width:        6,
                        height:       6,
                        borderRadius: '50%',
                        flexShrink:   0,
                        background:   cfg.accent,
                        boxShadow:    isDown ? 'none' : `0 0 5px ${cfg.accentGlow}`,
                    }} />

                    {/* Server name */}
                    <span style={{
                        flex:          1,
                        fontSize:      12,
                        fontFamily:    'ui-monospace, monospace',
                        fontWeight:    500,
                        color:          nameColor,
                        whiteSpace:    'nowrap',
                        overflow:      'hidden',
                        textOverflow:  'ellipsis',
                        letterSpacing: '-0.01em',
                    }}>
                        {data.name}
                    </span>

                    {/* Status badge */}
                    <span style={{
                        fontSize:      8,
                        fontFamily:    'ui-monospace, monospace',
                        fontWeight:    600,
                        letterSpacing: '0.1em',
                        color:          cfg.accent,
                        background:    cfg.accentDim,
                        border:        `0.5px solid ${cfg.accent}44`,
                        padding:       '2px 5px',
                        borderRadius:   3,
                        flexShrink:    0,
                    }}>
                        {cfg.label}
                    </span>
                </div>

                {/* ── IP address ── */}
                <div style={{
                    fontSize:      10,
                    fontFamily:    'ui-monospace, monospace',
                    color:          ipColor,
                    marginBottom:  8,
                    letterSpacing: '0.02em',
                }}>
                    {data.ip}
                </div>

                {/* ── Layer tags ── */}
                <div style={{
                    display:       'flex',
                    flexWrap:      'wrap',
                    gap:            4,
                    marginBottom:  isDown ? 0 : 10,
                }}>
                    {layers.map((layer) => (
                        <span
                            key={layer}
                            style={{
                                fontSize:      8,
                                fontFamily:    'ui-monospace, monospace',
                                fontWeight:    600,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding:       '2px 5px',
                                borderRadius:   3,
                                background:    tagBg,
                                color:          tagText,
                                border:        `0.5px solid ${tagBorder}`,
                                opacity:        isDown ? 0.4 : 1,
                            }}
                        >
                            {LAYER_LABEL[layer]}
                        </span>
                    ))}
                </div>

                {/* ── Metrics (hidden when down) ── */}
                {!isDown && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <MetricBar
                            label="CPU"
                            value={data.cpu_percent}
                            accent={cfg.accent}
                            isDark={isDark}
                        />
                        <MetricBar
                            label="RAM"
                            value={data.ram_percent}
                            accent={cfg.accent}
                            isDark={isDark}
                        />
                    </div>
                )}

                {/* ── Offline message ── */}
                {isDown && (
                    <div style={{
                        fontSize:      9,
                        fontFamily:    'ui-monospace, monospace',
                        color:          '#ef4444',
                        opacity:        0.6,
                        letterSpacing: '0.04em',
                        marginTop:     6,
                    }}>
                        // host unreachable
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(InfraNode);
