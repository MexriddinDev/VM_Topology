import { motion } from 'framer-motion';
import { Network, ServerCog, TriangleAlert, ShieldCheck } from 'lucide-react';

export type Page = 'topology' | 'servers' | 'alerts';

interface Props {
    page: Page;
    setPage: (page: Page) => void;
    alertCount: number;
}

const items = [
    { id: 'topology' as Page, title: 'Topology', icon: Network },
    { id: 'servers' as Page, title: 'Servers', icon: ServerCog },
    { id: 'alerts' as Page, title: 'Alerts', icon: TriangleAlert },
];

export default function Sidebar({ page, setPage, alertCount }: Props) {
    return (
        <aside className="flex w-16 flex-shrink-0 flex-col justify-between border-r border-slate-700 bg-[#050814]">
            <div>
                <div className="flex h-20 items-center justify-center">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.4 }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_18px_rgba(56,189,248,.4)]"
                    >
                        <ShieldCheck size={22} className="text-white" />
                    </motion.div>
                </div>

                <div className="space-y-3">
                    {items.map((item) => {
                        const active = page === item.id;
                        const Icon = item.icon;

                        return (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setPage(item.id)}
                                className="group relative flex w-full justify-center"
                                title={item.title}
                            >
                                {active && (
                                    <motion.div layoutId="sidebar-indicator" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400" />
                                )}

                                <div
                                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                                        active
                                            ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_22px_rgba(56,189,248,.35)]'
                                            : 'border-slate-700 bg-[#111827] group-hover:border-cyan-400/30 group-hover:bg-[#1F2A44]'
                                    }`}
                                >
                                    <Icon
                                        size={20}
                                        className={active ? 'text-white' : 'text-slate-400 group-hover:text-cyan-300'}
                                    />

                                    {item.id === 'alerts' && alertCount > 0 && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md"
                                        >
                                            {alertCount > 99 ? '99+' : alertCount}
                                        </motion.div>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <div className="pb-5 space-y-3">
                <button className="flex w-full justify-center">
                    <img
                        src="https://i.pravatar.cc/150"
                        alt="User"
                        className="h-9 w-9 rounded-full border-2 border-cyan-500 shadow-md"
                    />
                </button>
            </div>
        </aside>
    );
}
