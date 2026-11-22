"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Home, Users, Trophy, BarChart3, Gamepad2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const LINKS = [
    { href: "/esport-test", label: "Asosiy", icon: Home },
    { href: "/esport-test/teams", label: "Jamoalar", icon: Users },
    { href: "/esport-test/tournaments", label: "Turnirlar", icon: Trophy },
    { href: "/esport-test/standings", label: "Reyting", icon: BarChart3 },
];

export default function EtNavbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const current = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/esport-test";
    const isActive = (href: string) =>
        href === "/esport-test" ? current === "/esport-test" : current.startsWith(href);

    return (
        <header className="et-nav">
            <div className="et-nav-line" />
            <div className="et-nav-r1">
                <Link href="/" className="et-crumb"><Home size={13} /> For Humo</Link>
                <span style={{ color: "var(--es-faint)" }}>›</span>
                <Link href="/esport-test" className="et-brand">
                    <span className="bl"><Gamepad2 size={17} color="#fff" /></span>
                    <span className="bn et-grad">Humo eSport</span>
                </Link>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <LanguageSwitcher />
                    <ThemeToggle />
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
                {LINKS.map(l => {
                    const Icon = l.icon;
                    return (
                        <Link key={l.href} href={l.href} className={`et-pill${isActive(l.href) ? " on" : ""}`}>
                            <Icon size={15} /> {l.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
