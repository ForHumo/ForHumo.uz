"use client";

import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";

export function AuthBarrier({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full animate-pulse delay-1000" />
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
                        transition={{ delay: 0.15 }}
                        className="space-y-3"
                    >
                        <div className="flex justify-center">
                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-xl shadow-primary/30">
                                <Image
                                    src="/logo.png"
                                    alt="For Humo"
                                    fill
                                    className="object-cover"
                                    priority
                                />
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
                        transition={{ delay: 0.28 }}
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
