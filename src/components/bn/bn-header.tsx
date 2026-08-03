"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSession, signIn } from "next-auth/react";
import {
    Search, ShoppingCart, Menu, X, Store, MapPin, User,
    LayoutGrid, Heart, Package, ChevronRight, LogIn,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { MOCK_CATEGORIES } from "@/lib/bn-mock";

export function BnHeader() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const el = document.querySelector<HTMLElement>(".fixed.inset-0.z-\\[100\\]");
        const onScroll = () => setScrolled((el?.scrollTop ?? 0) > 8);
        el?.addEventListener("scroll", onScroll, { passive: true });
        return () => el?.removeEventListener("scroll", onScroll);
    }, []);

    // Menyu ochiqda orqa fon skroli to'xtasin
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const t = q.trim();
        router.push(t ? `/bn/qidiruv?q=${encodeURIComponent(t)}` : "/bn/qidiruv");
        setMenuOpen(false);
    }

    return (
        <>
            <header
                className="sticky top-0 z-40 transition-shadow"
                style={{
                    background: scrolled ? "rgba(10,10,10,0.92)" : BN.bg,
                    backdropFilter: scrolled ? "blur(12px)" : undefined,
                    borderBottom: `1px solid ${BN.border}`,
                    boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.5)" : undefined,
                }}
            >
                <div className="mx-auto max-w-[1280px] px-4">
                    {/* Yuqori qator */}
                    <div className="flex items-center gap-3 h-16">
                        {/* Mobil menyu */}
                        <button
                            onClick={() => setMenuOpen(true)}
                            aria-label="Menyu"
                            className="md:hidden w-10 h-10 -ml-1 flex items-center justify-center rounded-xl transition-colors"
                            style={{ background: BN.surface }}
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Logo */}
                        <Link href="/bn" className="flex items-center gap-2.5 flex-shrink-0 group">
                            <span
                                className="w-9 h-9 rounded-xl grid place-items-center font-black text-[15px] transition-transform group-active:scale-95"
                                style={{
                                    background: `linear-gradient(140deg, ${BN.goldLight}, ${BN.goldDark})`,
                                    color: "#0A0A0A",
                                    boxShadow: `0 4px 16px rgba(245,179,1,0.25)`,
                                }}
                            >
                                BN
                            </span>
                            <span className="hidden sm:block font-black text-[17px] tracking-tight leading-none">
                                Bozor Narxida
                            </span>
                        </Link>

                        {/* Qidiruv (desktop) */}
                        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl mx-2">
                            <div className="relative w-full">
                                <Search
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
                                    style={{ color: BN.text3 }}
                                />
                                <input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder="Mahsulot, do'kon yoki bozor qidiring..."
                                    className="w-full h-11 rounded-2xl pl-11 pr-4 text-[14px] outline-none transition-all focus:ring-2"
                                    style={{
                                        background: BN.surface,
                                        border: `1px solid ${BN.border}`,
                                        color: BN.text,
                                        caretColor: BN.gold,
                                        // @ts-expect-error CSS custom property
                                        "--tw-ring-color": BN.goldEdge,
                                    }}
                                />
                            </div>
                        </form>

                        <div className="flex-1 md:hidden" />

                        {/* O'ng tugmalar */}
                        <nav className="flex items-center gap-1.5">
                            <IconLink href="/bn/sevimlilar" label="Sevimlilar">
                                <Heart className="w-[18px] h-[18px]" />
                            </IconLink>
                            <IconLink href="/bn/savat" label="Savat" badge={0}>
                                <ShoppingCart className="w-[18px] h-[18px]" />
                            </IconLink>

                            {status === "authenticated" ? (
                                <Link
                                    href="/bn/kabinet"
                                    className="ml-1 flex items-center gap-2 h-10 pl-1 pr-3 rounded-xl transition-colors"
                                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                >
                                    {session?.user?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={session.user.image}
                                            alt=""
                                            className="w-8 h-8 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: BN.surfaceUp }}>
                                            <User className="w-4 h-4" />
                                        </span>
                                    )}
                                    <span className="hidden lg:block text-[13px] font-bold max-w-[110px] truncate">
                                        {session?.user?.name ?? "Kabinet"}
                                    </span>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => signIn("google")}
                                    className="ml-1 flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-black transition-transform active:scale-[0.97]"
                                    style={{ background: BN.gold, color: "#0A0A0A" }}
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="hidden sm:inline">Kirish</span>
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Qidiruv (mobil) */}
                    <form onSubmit={submitSearch} className="md:hidden pb-3">
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

                    {/* Pastki navigatsiya (desktop) */}
                    <div className="hidden md:flex items-center gap-1 h-11 -mb-px">
                        <button
                            onClick={() => setCatOpen(v => !v)}
                            className="flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-bold transition-colors"
                            style={{
                                background: catOpen ? BN.goldSoft : "transparent",
                                color: catOpen ? BN.gold : BN.text2,
                            }}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Katalog
                        </button>
                        <NavLink href="/bn/bozorlar" icon={<Store className="w-4 h-4" />}>Bozorlar</NavLink>
                        <NavLink href="/bn/dokonlar" icon={<MapPin className="w-4 h-4" />}>Do&apos;konlar</NavLink>
                        <NavLink href="/bn/buyurtmalarim" icon={<Package className="w-4 h-4" />}>Buyurtmalarim</NavLink>

                        <div className="flex-1" />

                        <Link
                            href="/bn/sotuvchi"
                            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-black transition-colors"
                            style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}
                        >
                            <Store className="w-4 h-4" />
                            Sotuvchi bo&apos;lish
                        </Link>
                    </div>
                </div>

                {/* Katalog paneli (desktop) */}
                {catOpen && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setCatOpen(false)} />
                        <div
                            className="absolute left-0 right-0 top-full z-40 hidden md:block"
                            style={{ background: BN.surface, borderBottom: `1px solid ${BN.border}`, boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}
                        >
                            <div className="mx-auto max-w-[1280px] px-4 py-5 grid grid-cols-5 gap-2">
                                {MOCK_CATEGORIES.map(c => (
                                    <Link
                                        key={c.slug}
                                        href={`/bn/k/${c.slug}`}
                                        onClick={() => setCatOpen(false)}
                                        className="group p-3 rounded-xl transition-colors"
                                        style={{ background: BN.surfaceUp }}
                                    >
                                        <p className="text-[13px] font-bold mb-0.5 group-hover:text-[#F5B301] transition-colors">
                                            {c.name}
                                        </p>
                                        <p className="text-[11px]" style={{ color: BN.text3 }}>
                                            {c.productCount.toLocaleString("uz-UZ")} ta
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* Mobil menyu */}
            {menuOpen && (
                <div className="fixed inset-0 z-[110] md:hidden">
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setMenuOpen(false)} />
                    <div
                        className="absolute inset-y-0 left-0 w-[86%] max-w-[340px] overflow-y-auto"
                        style={{ background: BN.surface, borderRight: `1px solid ${BN.border}` }}
                    >
                        <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: `1px solid ${BN.border}` }}>
                            <span className="font-black text-[16px]">Menyu</span>
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
                            <Link
                                href="/bn/sotuvchi"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 w-full h-12 px-4 rounded-2xl text-[14px] font-black mb-3"
                                style={{ background: BN.gold, color: "#0A0A0A" }}
                            >
                                <Store className="w-[18px] h-[18px]" />
                                Sotuvchi bo&apos;lish
                            </Link>

                            <MobileLink href="/bn/bozorlar" onClick={() => setMenuOpen(false)} icon={<Store className="w-[18px] h-[18px]" />}>
                                Bozorlar
                            </MobileLink>
                            <MobileLink href="/bn/dokonlar" onClick={() => setMenuOpen(false)} icon={<MapPin className="w-[18px] h-[18px]" />}>
                                Do&apos;konlar
                            </MobileLink>
                            <MobileLink href="/bn/savat" onClick={() => setMenuOpen(false)} icon={<ShoppingCart className="w-[18px] h-[18px]" />}>
                                Savat
                            </MobileLink>
                            <MobileLink href="/bn/buyurtmalarim" onClick={() => setMenuOpen(false)} icon={<Package className="w-[18px] h-[18px]" />}>
                                Buyurtmalarim
                            </MobileLink>
                            <MobileLink href="/bn/sevimlilar" onClick={() => setMenuOpen(false)} icon={<Heart className="w-[18px] h-[18px]" />}>
                                Sevimlilar
                            </MobileLink>

                            <p className="px-3 pt-5 pb-2 text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                Kategoriyalar
                            </p>
                            {MOCK_CATEGORIES.map(c => (
                                <Link
                                    key={c.slug}
                                    href={`/bn/k/${c.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between h-11 px-3 rounded-xl text-[14px] font-medium"
                                >
                                    <span>{c.name}</span>
                                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: BN.text3 }}>
                                        {c.productCount.toLocaleString("uz-UZ")}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-bold transition-colors hover:text-white"
            style={{ color: BN.text2 }}
        >
            {icon}
            {children}
        </Link>
    );
}

function MobileLink({
    href, icon, children, onClick,
}: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold"
        >
            <span style={{ color: BN.gold }}>{icon}</span>
            {children}
        </Link>
    );
}

function IconLink({
    href, label, badge, children,
}: { href: string; label: string; badge?: number; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            aria-label={label}
            className="relative w-10 h-10 grid place-items-center rounded-xl transition-colors"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            {children}
            {!!badge && badge > 0 && (
                <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black"
                    style={{ background: BN.gold, color: "#0A0A0A" }}
                >
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </Link>
    );
}
