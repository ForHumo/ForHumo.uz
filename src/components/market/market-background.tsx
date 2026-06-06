"use client";

import { motion } from "framer-motion";

// Barcha market sahifalarida bir xil yashil fon
export function MarketBackground() {
    return (
        <div className="fixed inset-0 -z-[1] overflow-hidden pointer-events-none">
            <div className="absolute inset-0
                bg-gradient-to-br from-white via-green-50/40 to-emerald-50/60
                dark:from-[#020C05] dark:via-[#030F06] dark:to-[#051209]
                transition-colors duration-700" />
            <motion.div className="absolute rounded-full blur-[140px] opacity-25 dark:opacity-15 bg-green-400 dark:bg-emerald-600"
                style={{ width: 700, height: 700, top: "-15%", right: "-10%" }}
                animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div className="absolute rounded-full blur-[180px] opacity-15 dark:opacity-10 bg-lime-300 dark:bg-green-500"
                style={{ width: 500, height: 500, bottom: "5%", left: "-8%" }}
                animate={{ x: [0, -30, 40, 0], y: [0, 25, -15, 0], scale: [1, 0.92, 1.1, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(34,197,94,0.6) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(34,197,94,0.6) 1px, transparent 1px)`,
                    backgroundSize: "56px 56px",
                }} />
        </div>
    );
}
