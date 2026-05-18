"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function AIShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="relative overflow-hidden">
                {/* Background glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />
                    <div className="absolute top-1/3 -left-20 h-[400px] w-[400px] rounded-full bg-white/[0.02] blur-3xl" />
                    <div className="absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-white/[0.02] blur-3xl" />
                </div>

                {/* Hero section */}
                <div className="relative flex flex-col items-center px-4 pt-28 pb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="mb-8"
                    >
                        <Image
                            src="/logo-white.png"
                            alt="Humo AI"
                            width={80}
                            height={80}
                            className="mx-auto"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
