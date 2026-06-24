import React, { useEffect, useRef, useState } from 'react';

interface Props {
    label: string;
    color: string;
}

export default function MetricSparkline({ label, color }: Props) {
    const [data, setData] = useState<number[]>(() =>
        Array.from({ length: 20 }, () => Math.random() * 80 + 10)
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => [...prev.slice(1), Math.random() * 80 + 10]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const width = 320;
    const height = 48;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return `${x},${y}`;
    });

    const pathD = `M ${pts.join(' L ')}`;
    const areaD = `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;

    return (
        <div className="bg-white/5 rounded-lg p-2.5">
            <div className="text-[9px] text-white/40 uppercase tracking-wider mb-2">{label}</div>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height: 48 }}>
                <defs>
                    <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill={`url(#grad-${label})`} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                {/* Latest value dot */}
                <circle
                    cx={(data.length - 1) / (data.length - 1) * width}
                    cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
                    r={3}
                    fill={color}
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
            </svg>
        </div>
    );
}
