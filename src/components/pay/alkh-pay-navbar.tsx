"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Home, ChevronRight } from "lucide-react";

export function AlkhPayNavbar() {
    const { data: session } = useSession();
    const locale = useLocale();

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="sticky top-0 z-40 w-full"
        >
            {/* Shisha navbar */}
            <div className="
                bg-white/70 dark:bg-[#050D1F]/80
                backdrop-blur-xl
                border-b border-blue-100/80 dark:border-blue-900/30
                transition-colors duration-500
            ">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center justify-between h-14 gap-4">

                        {/* Chap: For Humo → ALKH Pay breadcrumb */}
                        <div className="flex items-center gap-2 min-w-0">
                            {/* For Humo bosilganda bosh sahifaga */}
                            <Link
                                href="/"
                                className="flex items-center gap-1.5 text-gray-400 dark:text-white/30
                                    hover:text-gray-600 dark:hover:text-white/60
                                    transition-colors duration-200 shrink-0"
                            >
                                <Home size={14} />
                                <span className="text-xs font-medium hidden sm:block">For Humo</span>
                            </Link>

                            <ChevronRight size={12} className="text-gray-300 dark:text-white/20 shrink-0" />

                            {/* ALKH Pay — asosiy brand */}
                            <Link
                                href={`/${locale}/pay`}
                                className="flex items-center gap-2 group"
                            >
                                <div className="relative">
                                    {/* Logo glow */}
                                    <motion.div
                                        className="absolute inset-0 rounded-xl bg-blue-400/40 blur-md"
                                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                    <Image
                                        src="/logos/alkh-pay.png"
                                        alt="ALKH Pay"
                                        width={30}
                                        height={30}
                                        className="relative rounded-xl"
                                    />
                                </div>
                                <span className="font-black text-base tracking-tight
                                    text-transparent bg-clip-text
                                    bg-gradient-to-r from-blue-600 to-cyan-500
                                    dark:from-blue-400 dark:to-cyan-300
                                    group-hover:from-blue-500 group-hover:to-cyan-400
                                    transition-all duration-300">
                                    ALKH Pay
                                </span>
                            </Link>
                        </div>

                        {/* O'ng: til, tema, avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                            <LanguageSwitcher />
                            <ThemeToggle />

                            {/* Foydalanuvchi avatari → Humo ID */}
                            {session?.user && (
                                <Link
                                    href="/id"
                                    className="relative group"
                                    title="Humo ID ga o'tish"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden
                                        ring-2 ring-blue-400/40 dark:ring-blue-500/30
                                        group-hover:ring-blue-500/70 dark:group-hover:ring-blue-400/60
                                        transition-all duration-200">
                                        {session.user.image ? (
                                            <Image
                                                src={session.user.image}
                                                alt={session.user.name ?? "User"}
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full
                                                bg-gradient-to-br from-blue-500 to-cyan-400
                                                flex items-center justify-center
                                                text-white text-xs font-bold">
                                                {(session.user.name ?? "U")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    {/* Online dot */}
                                    <span className="absolute bottom-0 right-0 w-2 h-2
                                        rounded-full bg-emerald-400
                                        ring-2 ring-white dark:ring-[#050D1F]" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
