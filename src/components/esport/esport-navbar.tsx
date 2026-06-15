"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Home, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const LINKS = [
    { label: "Asosiy", href: "/esport" },
    { label: "Sportchi", href: "/esport/athlete" },
    { label: "Jamoalar", href: "/esport/teams" },
    { label: "Turnirlar", href: "/esport/tournaments" },
    { label: "Divizionlar", href: "/esport/standings" },
    { label: "Transfer", href: "/esport/transfers" },
];

export default function EsportNavbar() {
    const [isAdmin, setIsAdmin] = useState(false);
    const { data: session } = useSession();
    const locale = useLocale();
    const pathname = usePathname();
    const current = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/esport";

    useEffect(() => {
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, []);

    const links = isAdmin ? [...LINKS, { label: "Admin", href: "/esport/admin" }] : LINKS;
    const isActive = (href: string) => href === "/esport" ? current === "/esport" : current.startsWith(href);

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="sticky top-0 z-40 w-full"
        >
            <div className="es-nav border-b backdrop-blur-2xl transition-colors duration-500">
                {/* tepa neon chiziq */}
                <div className="h-[2px] w-full es-accent-bg3 opacity-80" />
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="flex h-14 items-center gap-3">

                        {/* Breadcrumb: For Humo → Humo eSport */}
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Link href="/" className="flex shrink-0 items-center gap-1.5 es-faint transition-opacity hover:opacity-70">
                                <Home size={13} />
                                <span className="hidden text-xs font-medium sm:block">For Humo</span>
                            </Link>
                            <ChevronRight size={11} className="shrink-0 es-faint" />

                            <Link href="/esport" className="group flex shrink-0 items-center gap-2">
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-xl es-accent-bg3 blur-md"
                                        animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.18, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                    <Image src="/esport-logo.png" alt="Humo eSport" width={28} height={28} className="relative h-7 w-7 rounded-xl object-contain" />
                                </div>
                                <span className="es-accent-text3 text-[15px] font-black tracking-tight transition-opacity group-hover:opacity-80">
                                    Humo eSport
                                </span>
                            </Link>

                            {/* Desktop linklar — sirpanuvchi active indikator */}
                            <nav className="ml-3 hidden items-center gap-0.5 md:flex">
                                {links.map(l => {
                                    const active = isActive(l.href);
                                    return (
                                        <motion.div key={l.href} whileTap={{ scale: 0.92 }} className="relative">
                                            <Link href={l.href}
                                                className={`relative z-10 block rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity ${active ? "text-white" : "es-mut hover:opacity-70"}`}>
                                                {active && (
                                                    <motion.span layoutId="es-nav-pill"
                                                        className="absolute inset-0 -z-10 rounded-lg es-accent-bg"
                                                        transition={{ type: "spring", stiffness: 480, damping: 34 }} />
                                                )}
                                                {l.label}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* O'ng: til + tema + avatar */}
                        <div className="flex shrink-0 items-center gap-2">
                            <LanguageSwitcher />
                            <ThemeToggle />
                            {session?.user && (
                                <Link href="/id" title="Humo ID" className="group relative">
                                    <div className="h-8 w-8 overflow-hidden rounded-full ring-2 es-bd transition-all group-hover:ring-[var(--es-c2)]">
                                        {session.user.image ? (
                                            <Image src={session.user.image} alt={session.user.name ?? ""} width={32} height={32} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center es-accent-bg text-xs font-bold text-white">
                                                {(session.user.name ?? "U")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[var(--es-nav)]" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobil bo'lim-navi — sirpanuvchi active indikator */}
            <nav className="es-nav sticky top-14 z-30 flex gap-1 overflow-x-auto border-b px-3 py-2 backdrop-blur-2xl md:hidden nx-hide-scrollbar">
                {links.map(l => {
                    const active = isActive(l.href);
                    return (
                        <motion.div key={l.href} whileTap={{ scale: 0.92 }} className="relative shrink-0">
                            <Link href={l.href}
                                className={`relative z-10 block rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${active ? "text-white" : "es-mut"}`}>
                                {active && (
                                    <motion.span layoutId="es-nav-pill-m"
                                        className="absolute inset-0 -z-10 rounded-lg es-accent-bg"
                                        transition={{ type: "spring", stiffness: 480, damping: 34 }} />
                                )}
                                {l.label}
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>
        </motion.header>
    );
}
