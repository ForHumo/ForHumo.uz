"use client";

import { motion } from "framer-motion";

export function BackgroundEffects() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
            {/* Top-left orb — blue (visible in both themes) */}
            <motion.div
                animate={{
                    opacity: [0.25, 0.45, 0.25],
                    scale: [1, 1.12, 1],
                    x: [0, 28, 0],
                    y: [0, -24, 0],
                }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full
                    bg-blue-500/20 dark:bg-blue-500/20
                    blur-[100px]"
            />

            {/* Bottom-right orb — cyan/purple */}
            <motion.div
                animate={{
                    opacity: [0.15, 0.3, 0.15],
                    scale: [1, 1.18, 1],
                    x: [0, -36, 0],
                    y: [0, 36, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[40%] -right-[10%] w-[55vw] h-[55vw] rounded-full
                    bg-sky-400/15 dark:bg-purple-500/10
                    blur-[120px]"
            />

            {/* Center subtle glow — light mode accent */}
            <motion.div
                animate={{ opacity: [0.06, 0.12, 0.06] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[15%] left-[35%] w-[30vw] h-[30vw] rounded-full
                    bg-cyan-400/20 dark:bg-transparent
                    blur-[80px]"
            />
        </div>
    );
}
