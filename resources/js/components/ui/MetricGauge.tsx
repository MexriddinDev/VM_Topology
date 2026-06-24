import React from 'react';

interface Props {
    label: string;
    value: number;
    warn?: number;
    crit?: number;
    size?: 'sm' | 'lg';
}

export default function MetricGauge({ label, value, warn = 80, crit = 90, size = 'sm' }: Props) {
    const clamped = Math.min(100, Math.max(0, value));
    const color = clamped >= crit ? '#dc2626' : clamped >= warn ? '#d97706' : '#16a34a';

    const r = size === 'lg' ? 42 : 28;
    const cx = size === 'lg' ? 55 : 40;
    const cy = size === 'lg' ? 55 : 40;
    const w = size === 'lg' ? 110 : 80;
    const h = size === 'lg' ? 70 : 50;
    const stroke = size === 'lg' ? 8 : 6;
    const circumference = Math.PI * r;
    const progress = (clamped / 100) * circumference;

    return (
        <div className={`flex flex-col items-center rounded-xl p-3 ${size === 'lg' ? 'bg-black/5 dark:bg-white/5' : 'bg-white/5'}`}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.1}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                />
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${circumference}`}
                    style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
                />
                <text x={cx} y={cy - 6} textAnchor="middle" fill="currentColor" fontSize={size === 'lg' ? 18 : 13} fontWeight="800" fontFamily="monospace">
                    {clamped.toFixed(0)}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" fillOpacity={0.4} fontSize={size === 'lg' ? 10 : 8} fontFamily="monospace">
                    %
                </text>
            </svg>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 -mt-1">{label}</div>
        </div>
    );
}
