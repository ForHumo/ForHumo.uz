"use client";

import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Premium loading screen
function LoadingScreen() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
            {/* Ambient background orbs */}
            <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-blue-500/15 blur-[110px] pointer-events-none" />
            <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] left-[40%] w-[25vw] h-[25vw] rounded-full bg-blue-600/08 blur-[80px] pointer-events-none" />

            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.35 }}
                className="relative mb-6"
            >
                <motion.div
                    animate={{ y: [-7, 7, -7] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    className="relative"
                >
                    {/* Glow ring behind logo */}
                    <div className="absolute inset-[-16px] rounded-full bg-blue-500/20 blur-2xl" />
                    <div className="relative w-24 h-24">
                        <Image
                            src="/logo.png"
                            alt="For Humo"
                            fill
                            className="object-contain drop-shadow-[0_0_28px_rgba(0,136,255,0.65)]"
                            priority
                        />
                    </div>
                </motion.div>
            </motion.div>

            {/* Brand name */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-2xl font-black tracking-tight text-foreground mb-8 select-none"
            >
                For Humo
            </motion.p>

            {/* Animated loading bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative w-40 h-[3px] bg-border rounded-full overflow-hidden"
            >
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", repeatDelay: 0.2 }}
                    style={{ width: "50%" }}
                />
            </motion.div>
        </div>
    );
}

export function AuthBarrier({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <LoadingScreen />;
    }

    if (!session) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-background to-background" />
                <div className="absolute top-0 left-0 w-full h-full opacity-25 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-400/15 blur-[120px] rounded-full animate-pulse delay-1000" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="max-w-sm w-full text-center space-y-8"
                >
                    {/* Logo + title */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.12 }}
                        className="space-y-3"
                    >
                        <div className="flex justify-center">
                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-xl shadow-blue-500/25">
                                <Image src="/logo.png" alt="For Humo" fill className="object-cover" priority />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                                For Humo
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1 font-medium">
                                Humo ID orqali kiring
                            </p>
                        </div>
                    </motion.div>

                    {/* Sign-in card */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.26 }}
                        className="bg-card/60 backdrop-blur-2xl border border-border/60 p-6 rounded-2xl shadow-2xl space-y-4"
                    >
                        <p className="text-sm text-muted-foreground text-left font-medium">
                            Humo ID — barcha For Humo loyihalariga kirish
                        </p>

                        <button
                            onClick={() => signIn("google")}
                            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold h-12 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[.98] text-sm"
                        >
                            <img
                                src="https://authjs.dev/img/providers/google.svg"
                                alt="Google"
                                className="w-5 h-5"
                            />
                            Google orqali kirish
                        </button>

                        <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                            Kirib, siz For Humo{" "}
                            <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
                                Maxfiylik Siyosati
                            </a>
                            ga rozilik bildirasiz.
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
