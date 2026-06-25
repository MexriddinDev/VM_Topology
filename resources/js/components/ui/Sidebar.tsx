import { motion } from "framer-motion";
import {
    Network,
    ServerCog,
    TriangleAlert,
    Settings,
    ShieldCheck,
} from "lucide-react";

export type Page = "topology" | "servers" | "alerts";

interface Props {
    page: Page;
    setPage: (page: Page) => void;
    alertCount: number;
    isDark?: boolean;
}

const items = [
    {
        id: "topology" as Page,
        title: "Topology",
        icon: Network,
    },
    {
        id: "servers" as Page,
        title: "Servers",
        icon: ServerCog,
    },
    {
        id: "alerts" as Page,
        title: "Alerts",
        icon: TriangleAlert,
    },
];

export default function Sidebar({
                                    page,
                                    setPage,
                                    alertCount,
                                    isDark = true,
                                }: Props) {
    const bgClass = isDark ? 'bg-[#070B13]' : 'bg-gray-100';
    const borderClass = isDark ? 'border-slate-800' : 'border-gray-200';
    const hoverBgClass = isDark ? 'bg-[#1B2638]' : 'bg-gray-200';
    const textClass = isDark ? 'text-slate-400' : 'text-gray-600';
    const textHoverClass = isDark ? 'group-hover:text-indigo-400' : 'group-hover:text-indigo-600';
    const inactiveBgClass = isDark ? 'bg-[#111827]' : 'bg-gray-200';
    const activeBgClass = isDark
        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-[0_0_20px_rgba(99,102,241,.35)]'
        : 'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[0_0_20px_rgba(99,102,241,.25)]';

    return (
        <aside className={`w-16 h-screen ${bgClass} border-r ${borderClass} flex flex-col justify-between`}>

            {/* Logo */}
            <div>
                <div className="h-20 flex justify-center items-center">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.45 }}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,.4)]"
                    >
                        <ShieldCheck
                            size={22}
                            className="text-white"
                        />
                    </motion.div>
                </div>

                {/* Navigation */}
                <div className="space-y-3">
                    {items.map((item) => {
                        const active = page === item.id;
                        const Icon = item.icon;

                        return (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setPage(item.id)}
                                className="relative flex justify-center w-full group"
                                title={item.title}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`}
                                    />
                                )}

                                <div
                                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        active
                                            ? activeBgClass
                                            : inactiveBgClass
                                    } ${!active && (isDark ? 'group-hover:bg-[#1B2638]' : 'group-hover:bg-gray-200')}`}
                                >
                                    <Icon
                                        size={20}
                                        className={
                                            active
                                                ? "text-white"
                                                : `${textClass} ${textHoverClass}`
                                        }
                                    />

                                    {item.id === "alerts" &&
                                        alertCount > 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md"
                                            >
                                                {alertCount > 99
                                                    ? "99+"
                                                    : alertCount}
                                            </motion.div>
                                        )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom */}
            <div className="pb-5 space-y-3">

                <button className="w-full flex justify-center group">
                    <div className={`w-11 h-11 rounded-xl ${inactiveBgClass} ${isDark ? 'group-hover:bg-[#1B2638]' : 'group-hover:bg-gray-200'} flex items-center justify-center transition-all`}>
                        <Settings
                            size={20}
                            className={`${textClass} ${textHoverClass}`}
                        />
                    </div>
                </button>

                <button className="w-full flex justify-center">
                    <img
                        src="https://i.pravatar.cc/150"
                        alt="User"
                        className={`w-9 h-9 rounded-full border-2 ${isDark ? 'border-indigo-500' : 'border-indigo-400'} shadow-md`}
                    />
                </button>

            </div>

        </aside>
    );
}
