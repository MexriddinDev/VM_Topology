import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { Alert } from '../../types';

interface ToastItem extends Alert {
    toastId: string;
}

interface Props {
    alerts: Alert[];
}

export default function AlertToast({ alerts }: Props) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const seenIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const newAlerts = alerts.filter(a => !seenIds.current.has(a.id));
        if (newAlerts.length === 0) return;

        newAlerts.forEach(a => seenIds.current.add(a.id));

        const newToasts: ToastItem[] = newAlerts.slice(0, 3).map(a => ({
            ...a,
            toastId: `toast-${a.id}-${Date.now()}`,
        }));

        setToasts(prev => [...newToasts, ...prev].slice(0, 5));

        // Auto-dismiss
        newToasts.forEach(t => {
            setTimeout(() => {
                setToasts(prev => prev.filter(x => x.toastId !== t.toastId));
            }, t.severity === 'critical' ? 8000 : 5000);
        });
    }, [alerts]);

    const dismiss = (toastId: string) =>
        setToasts(prev => prev.filter(t => t.toastId !== toastId));

    const getStyle = (severity: string) => ({
        critical: {
            bg: 'rgba(239,68,68,0.12)',
            border: 'rgba(239,68,68,0.4)',
            glow: '0 0 20px rgba(239,68,68,0.3)',
            icon: <XCircle size={16} className="text-red-400 flex-shrink-0" />,
            accent: '#ef4444',
        },
        warning: {
            bg: 'rgba(245,158,11,0.12)',
            border: 'rgba(245,158,11,0.4)',
            glow: '0 0 20px rgba(245,158,11,0.2)',
            icon: <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />,
            accent: '#f59e0b',
        },
        info: {
            bg: 'rgba(59,130,246,0.12)',
            border: 'rgba(59,130,246,0.4)',
            glow: 'none',
            icon: <Info size={16} className="text-blue-400 flex-shrink-0" />,
            accent: '#3b82f6',
        },
    }[severity] ?? {
        bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', glow: 'none',
        icon: <Info size={16} />, accent: '#fff',
    });

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ width: 340 }}>
            <AnimatePresence>
                {toasts.map(toast => {
                    const style = getStyle(toast.severity);
                    return (
                        <motion.div
                            key={toast.toastId}
                            initial={{ x: 80, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 80, opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="pointer-events-auto rounded-xl p-3 flex items-start gap-2.5"
                            style={{
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                                boxShadow: style.glow,
                                backdropFilter: 'blur(12px)',
                            }}
                        >
                            {style.icon}
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: style.accent }}>
                                    {toast.severity} · {toast.type.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-white/80 leading-snug">{toast.message}</div>
                                <div className="text-[9px] text-white/30 mt-1 font-mono">{toast.instance}</div>
                            </div>
                            <button
                                onClick={() => dismiss(toast.toastId)}
                                className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
                            >
                                <X size={12} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
