"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Home, Grid3x3, ShoppingBag, User, Info, Menu, X } from "lucide-react";
import { useState } from "react";
import { BELIS } from "@/lib/belis-theme";

/**
 * BelisLink — locale-aware Link (Nexus/BN naqshi).
 * `href="/belis/katalog"` yozing, `/uz/belis/...` YOZMANG (double locale bug).
 */
export function BelisLink({ href, className, style, children, onClick, ...rest }: {
    href: string;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    onClick?: () => void;
    [k: string]: unknown;
}) {
    return <Link href={href as never} className={className} style={style} onClick={onClick} {...rest}>{children}</Link>;
}

interface NavItem { href: string; labelKey: string; icon: React.ElementType }

export function BelisNav() {
    const t = useTranslations("belis.nav");
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const items: NavItem[] = [
        { href: "/belis",            labelKey: "home",     icon: Home },
        { href: "/belis/katalog",    labelKey: "catalog",  icon: Grid3x3 },
        { href: "/belis/savat",      labelKey: "cart",     icon: ShoppingBag },
        { href: "/belis/kabinet",    labelKey: "account",  icon: User },
        { href: "/belis/haqida",     labelKey: "about",    icon: Info },
    ];

    const isActive = (href: string) =>
        href === "/belis" ? pathname === "/belis" : pathname.startsWith(href);

    return (
        <header className="sticky top-0 z-40 flex-shrink-0 backdrop-blur-md"
            style={{
                background: "rgba(231,235,215,0.90)",
                borderBottom: `1px solid ${BELIS.border}`,
            }}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
                {/* Logo */}
                <BelisLink href="/belis" className="flex items-center gap-2 flex-shrink-0"
                    onClick={() => setOpen(false)}>
                    <span
                        style={{
                            fontFamily: "'Great Vibes', 'Pinyon Script', cursive",
                            fontSize: 40,
                            lineHeight: 1,
                            color: BELIS.gold,
                            textShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        }}>
                        Belis
                    </span>
                </BelisLink>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
                    {items.map(it => {
                        const Icon = it.icon;
                        const active = isActive(it.href);
                        return (
                            <BelisLink key={it.href} href={it.href}
                                className="px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5"
                                style={{
                                    fontFamily: "'Montserrat', sans-serif",
                                    color: active ? BELIS.gold : BELIS.text2,
                                    background: active ? "rgba(212,175,55,0.10)" : "transparent",
                                }}>
                                <Icon className="w-4 h-4" strokeWidth={1.5} />
                                {t(it.labelKey)}
                            </BelisLink>
                        );
                    })}
                </nav>

                {/* Mobile burger */}
                <div className="ml-auto md:hidden">
                    <button onClick={() => setOpen(o => !o)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${BELIS.border}` }}>
                        {open ? <X className="w-5 h-5" style={{ color: BELIS.gold }} strokeWidth={1.5} />
                              : <Menu className="w-5 h-5" style={{ color: BELIS.gold }} strokeWidth={1.5} />}
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className="md:hidden border-t"
                    style={{ borderColor: BELIS.borderSoft, background: BELIS.surface }}>
                    <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
                        {items.map(it => {
                            const Icon = it.icon;
                            const active = isActive(it.href);
                            return (
                                <BelisLink key={it.href} href={it.href}
                                    onClick={() => setOpen(false)}
                                    className="px-3 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2.5"
                                    style={{
                                        fontFamily: "'Montserrat', sans-serif",
                                        color: active ? BELIS.gold : BELIS.text2,
                                        background: active ? "rgba(212,175,55,0.12)" : "transparent",
                                    }}>
                                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                                    {t(it.labelKey)}
                                </BelisLink>
                            );
                        })}
                    </nav>
                </div>
            )}
        </header>
    );
}
