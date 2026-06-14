"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ModuleNavbar } from "@/components/layout/module-navbar";

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
    const pathname = usePathname();
    const current = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/esport";

    useEffect(() => {
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, []);

    const links = isAdmin ? [...LINKS, { label: "Admin", href: "/esport/admin" }] : LINKS;

    return (
        <>
            <ModuleNavbar config={{
                name: "Humo eSport", logoSrc: "/esport-logo.png", href: "/esport",
                accentFrom: "from-sky-400", accentTo: "to-cyan-300", glowColor: "rgba(0,180,255,0.45)",
                links,
            }} />
            {/* Mobil bo'lim-navi (desktopда ModuleNavbar linklari ko'rinadi) */}
            <nav className="sticky top-14 z-30 flex gap-1.5 overflow-x-auto border-b px-3 py-2 backdrop-blur-xl md:hidden es-bd nx-hide-scrollbar"
                style={{ background: "hsl(var(--background) / 0.85)" }}>
                {links.map(l => {
                    const active = current === l.href;
                    return (
                        <Link key={l.href} href={l.href}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${active ? "text-white es-accent-bg" : "es-mut"}`}>
                            {l.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
