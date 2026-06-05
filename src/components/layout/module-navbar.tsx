"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Home, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Har bir modul uchun config
// ─────────────────────────────────────────────────────────────────────────────
export interface ModuleNavConfig {
    name: string;                    // "Humo eSport"
    logoSrc: string;                 // "/logos/humo-esport.png"
    href: string;                    // "/esport"
    accentFrom: string;              // "from-green-500"  (Tailwind gradient)
    accentTo: string;                // "to-cyan-400"
    glowColor: string;               // "rgba(0,200,100,0.4)"
    // Ichki navigatsiya (ixtiyoriy)
    links?: { label: string; href: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleNavbar — universal modul navbari
// ─────────────────────────────────────────────────────────────────────────────
export function ModuleNavbar({ config, extra }: {
    config: ModuleNavConfig;
    extra?: React.ReactNode;   // qo'shimcha elementlar (masalan: Zij balans)
}) {
    const { data: session } = useSession();
    const locale = useLocale();

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="sticky top-0 z-40 w-full"
        >
            <div className="bg-white/75 dark:bg-[#050D1F]/85 backdrop-blur-xl
                border-b border-gray-100/80 dark:border-white/[0.06]
                transition-colors duration-500">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center h-14 gap-3">

                        {/* Breadcrumb: For Humo → Modul */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Link href="/"
                                className="flex items-center gap-1.5 text-gray-400 dark:text-white/25
                                    hover:text-gray-600 dark:hover:text-white/50 transition-colors shrink-0">
                                <Home size={13} />
                                <span className="text-xs font-medium hidden sm:block">For Humo</span>
                            </Link>

                            <ChevronRight size={11} className="text-gray-300 dark:text-white/15 shrink-0" />

                            {/* Modul brendi */}
                            <Link href={`/${locale}${config.href}`}
                                className="flex items-center gap-2 group shrink-0">
                                {/* Logo + glow */}
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-xl blur-md opacity-60"
                                        style={{ backgroundColor: config.glowColor }}
                                        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                    <Image src={config.logoSrc} alt={config.name}
                                        width={28} height={28} className="relative rounded-xl" />
                                </div>
                                {/* Gradient matn */}
                                <span className={`font-black text-[15px] tracking-tight text-transparent bg-clip-text
                                    bg-gradient-to-r ${config.accentFrom} ${config.accentTo}
                                    group-hover:opacity-80 transition-opacity duration-200`}>
                                    {config.name}
                                </span>
                            </Link>

                            {/* Ichki linklar */}
                            {config.links && (
                                <nav className="hidden md:flex items-center gap-1 ml-3">
                                    {config.links.map((l) => (
                                        <Link key={l.href} href={`/${locale}${l.href}`}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg
                                                text-gray-500 dark:text-white/35
                                                hover:text-gray-800 dark:hover:text-white/70
                                                hover:bg-gray-100/80 dark:hover:bg-white/[0.06]
                                                transition-all duration-150">
                                            {l.label}
                                        </Link>
                                    ))}
                                </nav>
                            )}
                        </div>

                        {/* O'ng: extra slot + til + tema + avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                            {extra}
                            <LanguageSwitcher />
                            <ThemeToggle />

                            {session?.user && (
                                <Link href="/id" title="Humo ID" className="relative group">
                                    <div className="w-8 h-8 rounded-full overflow-hidden
                                        ring-2 ring-gray-200/80 dark:ring-white/10
                                        group-hover:ring-blue-400/50 transition-all duration-200">
                                        {session.user.image ? (
                                            <Image src={session.user.image} alt={session.user.name ?? ""}
                                                width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br
                                                ${config.accentFrom} ${config.accentTo}
                                                flex items-center justify-center text-white text-xs font-bold`}>
                                                {(session.user.name ?? "U")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full
                                        bg-emerald-400 ring-2 ring-white dark:ring-[#050D1F]" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
