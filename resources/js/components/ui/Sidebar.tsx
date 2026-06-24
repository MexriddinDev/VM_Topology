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
                                }: Props) {
    return (
        <aside className="w-16 h-screen bg-[#070B13] border-r border-slate-800 flex flex-col justify-between">

            {/* Logo */}
            <div>
                <div className="h-20 flex justify-center items-center">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.45 }}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-[0_0_18px_rgba(56,189,248,.4)]"
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
                                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400"
                                    />
                                )}

                                <div
                                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        active
                                            ? "bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_20px_rgba(56,189,248,.35)]"
                                            : "bg-[#111827] group-hover:bg-[#1B2638]"
                                    }`}
                                >
                                    <Icon
                                        size={20}
                                        className={
                                            active
                                                ? "text-white"
                                                : "text-slate-400 group-hover:text-cyan-300"
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
                    <div className="w-11 h-11 rounded-xl bg-[#111827] group-hover:bg-[#1B2638] flex items-center justify-center transition-all">
                        <Settings
                            size={20}
                            className="text-slate-400 group-hover:text-cyan-300"
                        />
                    </div>
                </button>

                <button className="w-full flex justify-center">
                    <img
                        src="https://i.pravatar.cc/150"
                        alt="User"
                        className="w-9 h-9 rounded-full border-2 border-cyan-500 shadow-md"
                    />
                </button>

            </div>

        </aside>
    );
}
