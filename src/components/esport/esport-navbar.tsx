"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Users, Trophy, BarChart3, ArrowLeftRight, ShieldCheck, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import EsportNotifications from "@/components/esport/esport-notifications";
import { NavbarSupportButton } from "@/components/layout/navbar-support-button";
import { useEsT } from "@/lib/esport-i18n";

const LINKS: { tkey: string; href: string; icon: LucideIcon }[] = [
    { tkey: "nav.home", href: "/esport", icon: Home },
    { tkey: "nav.athlete", href: "/esport/athlete", icon: User },
    { tkey: "nav.teams", href: "/esport/teams", icon: Users },
    { tkey: "nav.tournaments", href: "/esport/tournaments", icon: Trophy },
    { tkey: "nav.divisions", href: "/esport/standings", icon: BarChart3 },
    { tkey: "nav.transfer", href: "/esport/transfers", icon: ArrowLeftRight },
];

export default function EsportNavbar() {
    const t = useEsT();
    const [isAdmin, setIsAdmin] = useState(false);
    const { data: session } = useSession();
    const pathname = usePathname();
    const current = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/esport";

    useEffect(() => {
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, []);

    const links = isAdmin ? [...LINKS, { tkey: "nav.admin", href: "/esport/admin", icon: ShieldCheck }] : LINKS;
    const isActive = (href: string) => href === "/esport" ? current === "/esport" : current.startsWith(href);

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-40 shrink-0"
        >
            {/* tepa neon chiziq */}
            <div className="h-[2px] w-full es-accent-bg3 opacity-80" />
            <div className="es-nav border-b backdrop-blur-2xl">
                {/* 1-qator: brend + boshqaruvlar */}
                <div className="container mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
                    <Link href="/" className="flex shrink-0 items-center gap-1.5 es-faint transition-opacity hover:opacity-70">
                        <Home size={13} />
                        <span className="hidden text-xs font-medium sm:block">For Humo</span>
                    </Link>
                    <span className="es-faint">›</span>
                    <Link href="/esport" className="group flex min-w-0 flex-1 items-center gap-2">
                        <div className="relative shrink-0">
                            <motion.div className="absolute inset-0 rounded-xl es-accent-bg3 blur-md"
                                animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.18, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                            <Image src="/esport-logo.png" alt="Humo eSport" width={28} height={28} className="relative h-7 w-7 rounded-xl object-contain" />
                        </div>
                        <span className="es-accent-text3 truncate text-[15px] font-black tracking-tight">Humo eSport</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <NavbarSupportButton variant="green" />
                        {session?.user && <EsportNotifications />}
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

                {/* 2-qator: ikonkali bitta panel — active element kengayadi */}
                <div className="container mx-auto flex max-w-6xl justify-center px-3 pb-2.5">
                    <nav className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 es-soft nx-hide-scrollbar">
                        {links.map(l => {
                            const active = isActive(l.href);
                            const Icon = l.icon;
                            return (
                                <Link key={l.href} href={l.href} title={t(l.tkey)}
                                    className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${active ? "text-white" : "es-mut hover:opacity-70"}`}>
                                    {active && <motion.span layoutId="es-nav-active" className="absolute inset-0 -z-10 rounded-full es-accent-bg" transition={{ type: "spring", stiffness: 460, damping: 34 }} />}
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <AnimatePresence initial={false}>
                                        {active && (
                                            <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }} className="overflow-hidden whitespace-nowrap">
                                                {t(l.tkey)}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </motion.header>
    );
}
