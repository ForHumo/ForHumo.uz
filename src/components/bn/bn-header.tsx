"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
    Search, ShoppingCart, Menu, X, Store, MapPin, User, Bell,
    LayoutGrid, Package, ChevronRight, LogIn, Navigation, Headphones, Heart,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink, useBnHref, useBnBase, BnThemeToggle, BnLangSwitch } from "./bn-nav";
import { MOCK_CATEGORIES } from "@/lib/bn-mock";

const NAV = [
    { href: "/katalog",       label: "Katalog",          icon: LayoutGrid },
    { href: "/bozorlar",      label: "Bozorlar",         icon: Store },
    { href: "/dokonlar",      label: "Do'konlar",        icon: MapPin },
    { href: "/buyurtmalarim", label: "Buyurtmalarim",    icon: Package },
    { href: "/joylashuv",     label: "Mening joylashuvim", icon: Navigation },
    { href: "/punktlar",      label: "Topshirish punkti", icon: Package },
] as const;

export function BnHeader() {
    const router = useRouter();
    const to = useBnHref();
    const { locale } = useBnBase();
    const { data: session, status } = useSession();
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const supportUrl = `https://forhumo.uz/${locale}/support/bn/chat`;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const t = q.trim();
        router.push(to(t ? `/qidiruv?q=${encodeURIComponent(t)}` : "/qidiruv"));
        setMenuOpen(false);
    }

    return (
        <>
            <header
                className="sticky top-0 z-40 transition-shadow"
                style={{
                    background: scrolled ? BN.glass : BN.bg,
                    backdropFilter: scrolled ? "blur(16px) saturate(180%)" : undefined,
                    WebkitBackdropFilter: scrolled ? "blur(16px) saturate(180%)" : undefined,
                    borderBottom: `1px solid ${BN.border}`,
                    boxShadow: scrolled ? BN.shadow : undefined,
                }}
            >
                <div className="mx-auto max-w-[1280px] px-4">
                    {/* ── Desktop ── */}
                    <div className="hidden md:flex items-start gap-4 py-3">
                        <BnLink href="/" className="flex items-center gap-2.5 flex-shrink-0 group h-11">
                            <BnLogo />
                            <span className="font-black text-[17px] tracking-tight leading-none">Bozor Narxida</span>
                        </BnLink>

                        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                            {/* Qidiruv */}
                            <form onSubmit={submitSearch}>
                                <div className="relative">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
                                        style={{ color: BN.text3 }}
                                    />
                                    <input
                                        value={q}
                                        onChange={e => setQ(e.target.value)}
                                        placeholder="Mahsulot, do'kon yoki bozor qidiring..."
                                        className="w-full h-11 rounded-2xl pl-11 pr-4 text-[14px] outline-none transition-colors"
                                        style={{
                                            background: BN.surface,
                                            border: `1px solid ${BN.border}`,
                                            color: BN.text,
                                            caretColor: BN.gold,
                                        }}
                                    />
                                </div>
                            </form>

                            {/* Bo'limlar */}
                            <nav className="flex items-center gap-0.5 flex-wrap">
                                {NAV.map(n => {
                                    const Icon = n.icon;
                                    return (
                                        <BnLink
                                            key={n.href}
                                            href={n.href}
                                            className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12.5px] font-bold transition-colors whitespace-nowrap"
                                            style={{ color: BN.text2 }}
                                        >
                                            <Icon className="w-[15px] h-[15px]" />
                                            {n.label}
                                        </BnLink>
                                    );
                                })}
                                <a
                                    href={supportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12.5px] font-bold transition-colors whitespace-nowrap"
                                    style={{ color: BN.text2 }}
                                >
                                    <Headphones className="w-[15px] h-[15px]" />
                                    Humo Support
                                </a>
                            </nav>
                        </div>

                        {/* O'ng ustun — profil va aynan uning ostida "Sotuvchi bo'lish" */}
                        <div className="flex flex-col items-stretch gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                                <BnLangSwitch />
                                <BnThemeToggle />
                                <IconBtn href="/bildirishnomalar" label="Bildirishnomalar">
                                    <Bell className="w-[17px] h-[17px]" />
                                </IconBtn>
                                <IconBtn href="/savat" label="Savat">
                                    <ShoppingCart className="w-[17px] h-[17px]" />
                                </IconBtn>

                                {status === "authenticated" ? (
                                    <BnLink
                                        href="/profil"
                                        className="flex items-center gap-2 h-10 pl-1 pr-3 rounded-xl transition-colors"
                                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                    >
                                        {session?.user?.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={session.user.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                        ) : (
                                            <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: BN.surfaceUp }}>
                                                <User className="w-4 h-4" />
                                            </span>
                                        )}
                                        <span className="text-[13px] font-bold max-w-[100px] truncate">
                                            {session?.user?.name ?? "Profil"}
                                        </span>
                                    </BnLink>
                                ) : (
                                    <button
                                        onClick={() => signIn("google")}
                                        className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-black transition-transform active:scale-[0.97]"
                                        style={{ background: BN.gold, color: BN.onGold }}
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Kirish
                                    </button>
                                )}
                            </div>

                            <BnLink
                                href="/sotuvchi"
                                className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12.5px] font-black transition-colors"
                                style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}
                            >
                                <Store className="w-[15px] h-[15px]" />
                                Sotuvchi bo&apos;lish
                            </BnLink>
                        </div>
                    </div>

                    {/* ── Mobil ── */}
                    <div className="md:hidden">
                        <div className="flex items-center gap-2.5 h-14">
                            <button
                                onClick={() => setMenuOpen(true)}
                                aria-label="Menyu"
                                className="w-9 h-9 -ml-1 grid place-items-center rounded-xl flex-shrink-0"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <Menu className="w-[18px] h-[18px]" />
                            </button>

                            <BnLink href="/" className="flex items-center gap-2 flex-shrink-0">
                                <BnLogo size={32} />
                                <span className="font-black text-[15px] tracking-tight leading-none">Bozor Narxida</span>
                            </BnLink>

                            <div className="flex-1" />

                            <BnThemeToggle compact />
                            <IconBtn href="/bildirishnomalar" label="Bildirishnomalar" compact>
                                <Bell className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn href="/savat" label="Savat" compact>
                                <ShoppingCart className="w-4 h-4" />
                            </IconBtn>
                        </div>

                        <form onSubmit={submitSearch} className="pb-3">
                            <div className="relative">
                                <Search
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] pointer-events-none"
                                    style={{ color: BN.text3 }}
                                />
                                <input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder="Nima qidiryapsiz?"
                                    className="w-full h-11 rounded-2xl pl-10 pr-4 text-[14px] outline-none"
                                    style={{
                                        background: BN.surface,
                                        border: `1px solid ${BN.border}`,
                                        color: BN.text,
                                        caretColor: BN.gold,
                                    }}
                                />
                            </div>
                        </form>
                    </div>
                </div>
            </header>

            {/* ── Mobil menyu ── */}
            {menuOpen && (
                <div className="fixed inset-0 z-[110] md:hidden">
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setMenuOpen(false)} />
                    <div
                        className="absolute inset-y-0 left-0 w-[86%] max-w-[340px] overflow-y-auto"
                        style={{ background: BN.surface, borderRight: `1px solid ${BN.border}` }}
                    >
                        <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: `1px solid ${BN.border}` }}>
                            <div className="flex items-center gap-2">
                                <BnLogo size={30} />
                                <span className="font-black text-[15px]">Bozor Narxida</span>
                            </div>
                            <button
                                onClick={() => setMenuOpen(false)}
                                aria-label="Yopish"
                                className="w-9 h-9 grid place-items-center rounded-lg"
                                style={{ background: BN.surfaceUp }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-3">
                            {status === "authenticated" ? (
                                <BnLink
                                    href="/profil"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-3 w-full p-3 rounded-2xl mb-2.5"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    {session?.user?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={session.user.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                    ) : (
                                        <span className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: BN.surfaceTop }}>
                                            <User className="w-5 h-5" />
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block text-[14px] font-black truncate">{session?.user?.name ?? "Profil"}</span>
                                        <span className="block text-[11.5px]" style={{ color: BN.text3 }}>Humo ID</span>
                                    </span>
                                </BnLink>
                            ) : (
                                <button
                                    onClick={() => signIn("google")}
                                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-black mb-2.5"
                                    style={{ background: BN.surfaceUp, color: BN.text }}
                                >
                                    <LogIn className="w-[18px] h-[18px]" />
                                    Humo ID bilan kirish
                                </button>
                            )}

                            <BnLink
                                href="/sotuvchi"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-black mb-4"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                <Store className="w-[18px] h-[18px]" />
                                Sotuvchi bo&apos;lish
                            </BnLink>

                            {NAV.map(n => {
                                const Icon = n.icon;
                                return (
                                    <BnLink
                                        key={n.href}
                                        href={n.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold"
                                    >
                                        <span style={{ color: BN.gold }}><Icon className="w-[18px] h-[18px]" /></span>
                                        {n.label}
                                    </BnLink>
                                );
                            })}
                            <BnLink
                                href="/sevimlilar"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold"
                            >
                                <span style={{ color: BN.gold }}><Heart className="w-[18px] h-[18px]" /></span>
                                Sevimlilar
                            </BnLink>
                            <a
                                href={supportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold"
                            >
                                <span style={{ color: BN.gold }}><Headphones className="w-[18px] h-[18px]" /></span>
                                Humo Support
                            </a>

                            <div className="flex items-center gap-2 px-3 pt-4">
                                <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                    Til va rejim
                                </span>
                                <div className="flex-1" />
                                <BnLangSwitch compact />
                                <BnThemeToggle compact />
                            </div>

                            <p className="px-3 pt-5 pb-2 text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                Kategoriyalar
                            </p>
                            {MOCK_CATEGORIES.map(c => (
                                <BnLink
                                    key={c.slug}
                                    href={`/k/${c.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between h-11 px-3 rounded-xl text-[14px] font-medium"
                                >
                                    <span>{c.name}</span>
                                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: BN.text3 }}>
                                        {c.productCount.toLocaleString("uz-UZ")}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                </BnLink>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function BnLogo({ size = 36 }: { size?: number }) {
    return (
        <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/bn/logo.png"
                alt="Bozor Narxida"
                width={size}
                height={size}
                className="w-full h-full object-contain dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/bn/logo-dark.png"
                alt=""
                width={size}
                height={size}
                aria-hidden="true"
                className="w-full h-full object-contain hidden dark:block"
            />
        </span>
    );
}

function IconBtn({
    href, label, compact, children,
}: { href: string; label: string; compact?: boolean; children: React.ReactNode }) {
    return (
        <BnLink
            href={href}
            aria-label={label}
            title={label}
            className={`grid place-items-center rounded-xl transition-colors ${compact ? "w-9 h-9" : "w-10 h-10"}`}
            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
        >
            {children}
        </BnLink>
    );
}
