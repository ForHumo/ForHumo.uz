"use client";

import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";

export function AuthBarrier({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const t = useTranslations("Hero"); // Using Hero translations for branding

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
                {/* Background effects */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full animate-pulse delay-1000" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-8"
                >
                    <div className="space-y-4">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md">
                                For Humo
                            </h1>
                            <p className="text-xl text-blue-200/80 mt-2 font-medium">
                                yagona raqamli ekotizim
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] space-y-4"
                    >
                        <button
                            onClick={() => signIn("google")}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 font-bold h-14 rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95 overflow-hidden relative group"
                        >
                            <img
                                src="https://authjs.dev/img/providers/google.svg"
                                alt="Google"
                                className="w-6 h-6"
                            />
                            <span>Continue with Google</span>
                        </button>

                        <button
                            onClick={() => signIn("telegram")}
                            className="w-full flex items-center justify-center gap-3 bg-[#24A1DE] text-white hover:bg-[#24A1DE]/90 font-bold h-14 rounded-2xl transition-all shadow-[0_0_20px_rgba(36,161,222,0.2)] hover:shadow-[0_0_30px_rgba(36,161,222,0.4)] active:scale-95 overflow-hidden relative group border border-white/10"
                        >
                            <svg className="w-6 h-6 fill-current drop-shadow-sm" viewBox="0 0 24 24">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.667 3.473-1.512 5.79-2.508 6.953-2.99 3.287-1.365 3.97-1.603 4.417-1.611z"/>
                            </svg>
                            <span>Continue with Telegram</span>
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
