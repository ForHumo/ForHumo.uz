"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Home, User, Users, Trophy, BarChart3, ArrowLeftRight, ShieldCheck, CreditCard, Headset, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useEsT, ES_BASE } from "@/lib/esport-i18n";
import EsportNotifications from "@/components/esport/esport-notifications";

// Humo eSport — mustaqil platforma: support in-app "Humo Support" (hali tayyor emas)
// o'rniga Telegram support bot orqali. Vaqtinchalik, lekin hammaga qulay va mustaqil.
const SUPPORT_BOT_URL = "https://t.me/ForHumo_SupportBot";

const LINKS: { href: string; tkey: string; icon: LucideIcon }[] = [
    { href: ES_BASE, tkey: "nav.home", icon: Home },
    { href: `${ES_BASE}/athlete`, tkey: "nav.athlete", icon: User },
    { href: `${ES_BASE}/cards`, tkey: "nav.cards", icon: CreditCard },
    { href: `${ES_BASE}/teams`, tkey: "nav.teams", icon: Users },
    { href: `${ES_BASE}/tournaments`, tkey: "nav.tournaments", icon: Trophy },
    { href: `${ES_BASE}/standings`, tkey: "nav.divisions", icon: BarChart3 },
    { href: `${ES_BASE}/transfers`, tkey: "nav.transfer", icon: ArrowLeftRight },
];

export default function EtNavbar() {
    const t = useEsT();
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isAdmin, setIsAdmin] = useState(false);
    const current = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/, "") || ES_BASE;
    const isActive = (href: string) =>
        href === ES_BASE ? current === ES_BASE : current.startsWith(href);

    useEffect(() => {
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, []);

    const links = isAdmin ? [...LINKS, { href: `${ES_BASE}/admin`, tkey: "nav.admin", icon: ShieldCheck }] : LINKS;

    return (
        <header className="et-nav">
            <div className="et-nav-line" />
            <div className="et-nav-r1">
                <Link href="/" className="et-crumb"><Home size={13} /> For Humo</Link>
                <span style={{ color: "var(--es-faint)" }}>›</span>
                <Link href={ES_BASE} className="et-brand">
                    <span className="bl"><Image src="/esport-logo.png" alt="Humo eSport" width={30} height={30} /></span>
                    <span className="bn et-grad">Humo eSport</span>
                </Link>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <a href={SUPPORT_BOT_URL} target="_blank" rel="noopener noreferrer"
                        title={t("nav.support")} aria-label={t("nav.support")}
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 34, height: 34, borderRadius: 10, color: "var(--es-c2)",
                            background: "color-mix(in srgb, var(--es-c2) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--es-c2) 26%, transparent)",
                        }}>
                        <Headset size={16} />
                    </a>
                    {session?.user && <EsportNotifications />}
                    {session?.user && (
                        <Link href="/id" title="Humo ID" aria-label="Humo ID"
                            style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--es-card-bd)", display: "block" }}>
                            {session.user.image
                                ? <Image src={session.user.image} alt="" width={32} height={32} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,var(--es-c1),var(--es-c2))", color: "#fff", fontWeight: 700, fontSize: 13 }}>{(session.user.name ?? "U")[0].toUpperCase()}</span>}
                        </Link>
                    )}
                </div>
            </div>
            <nav className="et-pills">
                {links.map(l => {
                    const Icon = l.icon;
                    return (
                        <Link key={l.href} href={l.href} className={`et-pill${isActive(l.href) ? " on" : ""}`}>
                            <Icon size={15} /> {t(l.tkey)}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
