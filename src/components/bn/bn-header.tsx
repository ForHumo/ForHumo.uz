"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
    Search, ShoppingCart, Menu, X, User, Bell, LayoutGrid,
    Package, ChevronRight, LogIn, Navigation, Headphones, Heart, Store,
    Mic, Camera, ShoppingBag, ChevronLeft,
} from "lucide-react";
import { BN, groupThousands } from "@/lib/bn-theme";
import { BnLink, useBnHref, useBnBase, BnThemeToggle, BnLangSwitch } from "./bn-nav";
import { useBnScrolled } from "./bn-scroll";

/** Header uchun kichik kategoriya DTO (dropdown menyu) */
export interface BnHeaderCategoryDTO {
    slug: string;
    name: string;
    productCount: number;
}

// Foydalanuvchi so'rovi: Katalog/Bozorlar/Do'konlar OLIB TASHLANDI (navbar/asosiy'da bor).
// Faqat gorizontal 1 qatorda: Mening joylashuvim → Topshirish punkti → Buyurtmalarim → Humo Support
const NAV = [
    { href: "/joylashuv",     labelKey: "location",     icon: Navigation },
    { href: "/punktlar",      labelKey: "pickupPoint",  icon: Package },
    { href: "/buyurtmalarim", labelKey: "myOrders",     icon: Package },
] as const;

export function BnHeader({
    categories = [], cartCount = 0, favCount = 0,
}: { categories?: BnHeaderCategoryDTO[]; cartCount?: number; favCount?: number }) {
    void favCount;   // hozircha faqat cartCount ishlatiladi, favCount kelajakda profil menyusida
    const router = useRouter();
    const to = useBnHref();
    const { hasShop } = useBnBase();
    const { data: session, status } = useSession();
    const t = useTranslations("bn");
    const tNav = useTranslations("bn.nav");
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    // BN'da window emas, layout div'i scroll bo'ladi (bn-scroll.ts) — ilgari
    // window.scrollY doim 0 edi va header hech qachon "glass" holatga o'tmasdi.
    const scrolled = useBnScrolled(8);
    // Mahsulot sahifasi (vitrina) — header media ustida suzuvchi shaffof kapsula bo'ladi
    const overlay = isProductRoute(usePathname() ?? "");

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
            {overlay ? (
                <BnOverlayHeader
                    cartCount={cartCount}
                    scrolled={scrolled}
                    onMenu={() => setMenuOpen(true)}
                />
            ) : (
            <header
                className="sticky top-0 z-40 transition-shadow"
                style={{
                    background: scrolled ? BN.glass : BN.bg,
                    backdropFilter: scrolled ? "blur(10px)" : undefined,
                    WebkitBackdropFilter: scrolled ? "blur(10px)" : undefined,
                    borderBottom: `1px solid ${BN.border}`,
                    boxShadow: scrolled ? BN.shadow : undefined,
                }}
            >
                <div className="mx-auto max-w-[1280px] px-4">
                    {/* ── Desktop ── */}
                    <div className="hidden md:flex items-start gap-4 py-3">
                        <BnLink href="/" className="flex items-center gap-2.5 flex-shrink-0 group h-14">
                            <BnLogo size={52} />
                            <span className="bn-display font-black text-[20px] tracking-tight leading-none">{t("brandName")}</span>
                        </BnLink>

                        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                            {/* Qidiruv — chap ovoz, o'ng AI */}
                            <form onSubmit={submitSearch}>
                                <div
                                    className="relative flex items-center h-11 rounded-2xl overflow-hidden transition-colors"
                                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                >
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
                                        style={{ color: BN.text3 }}
                                    />
                                    <input
                                        value={q}
                                        onChange={e => setQ(e.target.value)}
                                        placeholder={t("search.placeholder")}
                                        className="flex-1 h-full pl-11 pr-2 bg-transparent text-[14px] outline-none"
                                        style={{ color: BN.text, caretColor: BN.gold }}
                                    />
                                    <SearchExtraBtn
                                        label={t("search.voice")}
                                        onClick={() => router.push(to("/qidiruv?mode=voice"))}
                                    >
                                        <Mic className="w-[17px] h-[17px]" />
                                    </SearchExtraBtn>
                                    <SearchExtraBtn
                                        label={t("search.camera")}
                                        onClick={() => router.push(to("/scan"))}
                                        gold
                                    >
                                        <Camera className="w-[17px] h-[17px]" />
                                    </SearchExtraBtn>
                                </div>
                            </form>

                            {/* Ikkinchi qator — GORIZONTAL 1 QATOR, o'ralmaydi */}
                            <nav className="flex items-center gap-0.5 overflow-x-auto bn-noscroll">
                                {NAV.map(n => {
                                    const Icon = n.icon;
                                    return (
                                        <BnLink
                                            key={n.href}
                                            href={n.href}
                                            className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap flex-shrink-0"
                                            style={{ color: BN.text2 }}
                                        >
                                            <Icon className="w-[15px] h-[15px]" />
                                            {tNav(n.labelKey)}
                                        </BnLink>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => window.dispatchEvent(new Event("support:open"))}
                                    className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap flex-shrink-0 hover:brightness-110 transition-all"
                                    style={{ background: BN.goldSoft, color: BN.gold }}
                                >
                                    <Headphones className="w-[15px] h-[15px]" />
                                    {tNav("support")}
                                </button>
                            </nav>
                        </div>

                        {/* O'ng ustun — profil va aynan uning ostida "Sotuvchi bo'lish" */}
                        <div className="flex flex-col items-stretch gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                                <BnLangSwitch />
                                <BnThemeToggle />
                                <IconBtn href="/bildirishnomalar" label={tNav("notifications")}>
                                    <Bell className="w-[17px] h-[17px]" />
                                </IconBtn>
                                <IconBtn href="/savat" label={tNav("cart")} badge={cartCount}>
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
                                            {session?.user?.name ?? tNav("profile")}
                                        </span>
                                    </BnLink>
                                ) : (
                                    <button
                                        onClick={() => signIn("google")}
                                        className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-black transition-transform active:scale-[0.97]"
                                        style={{ background: BN.gold, color: BN.onGold }}
                                    >
                                        <LogIn className="w-4 h-4" />
                                        {t("auth.signIn")}
                                    </button>
                                )}
                            </div>

                            <BnLink
                                href={hasShop ? "/kabinet" : "/sotuvchi"}
                                className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12.5px] font-black transition-colors"
                                style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}
                            >
                                <Store className="w-[15px] h-[15px]" />
                                {hasShop ? t("seller.openCabinet") : t("seller.become")}
                            </BnLink>
                        </div>
                    </div>

                    {/* ── Mobil ── */}
                    <div className="md:hidden">
                        <div className="flex items-center gap-2.5 h-14">
                            <button
                                onClick={() => setMenuOpen(true)}
                                aria-label={tNav("menu")}
                                className="w-9 h-9 -ml-1 grid place-items-center rounded-xl flex-shrink-0"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <Menu className="w-[18px] h-[18px]" />
                            </button>

                            <BnLink href="/" className="flex items-center gap-2 flex-shrink-0">
                                <BnLogo size={42} />
                                <span className="bn-display font-black text-[17px] tracking-tight leading-none">{t("brandName")}</span>
                            </BnLink>

                            <div className="flex-1" />

                            <BnThemeToggle compact />
                            <IconBtn href="/bildirishnomalar" label={tNav("notifications")} compact>
                                <Bell className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn href="/savat" label={tNav("cart")} compact badge={cartCount}>
                                <ShoppingCart className="w-4 h-4" />
                            </IconBtn>
                        </div>

                        <form onSubmit={submitSearch} className="pb-3">
                            <div
                                className="relative flex items-center h-11 rounded-2xl overflow-hidden"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <Search
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] pointer-events-none"
                                    style={{ color: BN.text3 }}
                                />
                                <input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder={t("search.placeholderShort")}
                                    className="flex-1 h-full pl-10 pr-2 bg-transparent text-[14px] outline-none"
                                    style={{ color: BN.text, caretColor: BN.gold }}
                                />
                                <SearchExtraBtn
                                    label={t("search.voice")}
                                    onClick={() => router.push(to("/qidiruv?mode=voice"))}
                                >
                                    <Mic className="w-4 h-4" />
                                </SearchExtraBtn>
                                <SearchExtraBtn
                                    label={t("search.cameraShort")}
                                    onClick={() => router.push(to("/scan"))}
                                    gold
                                >
                                    <Camera className="w-4 h-4" />
                                </SearchExtraBtn>
                            </div>
                        </form>
                    </div>
                </div>
            </header>
            )}

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
                                <span className="bn-display font-black text-[16px]">{t("brandName")}</span>
                            </div>
                            <button
                                onClick={() => setMenuOpen(false)}
                                aria-label={tNav("close")}
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
                                        <span className="block text-[14px] font-black truncate">{session?.user?.name ?? tNav("profile")}</span>
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
                                    {t("auth.signInWithHumoID")}
                                </button>
                            )}

                            <BnLink
                                href={hasShop ? "/kabinet" : "/sotuvchi"}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-black mb-4"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                <Store className="w-[18px] h-[18px]" />
                                {hasShop ? t("seller.openCabinet") : t("seller.become")}
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
                                        {tNav(n.labelKey)}
                                    </BnLink>
                                );
                            })}
                            <BnLink
                                href="/sevimlilar"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold"
                            >
                                <span style={{ color: BN.gold }}><Heart className="w-[18px] h-[18px]" /></span>
                                {tNav("favorites")}
                            </BnLink>
                            <button
                                type="button"
                                onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event("support:open")); }}
                                className="flex items-center gap-3 h-12 px-3 rounded-xl text-[14px] font-bold text-left"
                            >
                                <span style={{ color: BN.gold }}><Headphones className="w-[18px] h-[18px]" /></span>
                                {tNav("support")}
                            </button>

                            <div className="flex items-center gap-2 px-3 pt-4">
                                <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                    {tNav("themeAndLang")}
                                </span>
                                <div className="flex-1" />
                                <BnLangSwitch compact />
                                <BnThemeToggle compact />
                            </div>

                            <p className="px-3 pt-5 pb-2 text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                {tNav("categories")}
                            </p>
                            {categories.map(c => (
                                <BnLink
                                    key={c.slug}
                                    href={`/k/${c.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between h-11 px-3 rounded-xl text-[14px] font-medium"
                                >
                                    <span>{c.name}</span>
                                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: BN.text3 }}>
                                        {groupThousands(c.productCount)}
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

export function BnLogo({ size = 52, variant = "auto" }: { size?: number; variant?: "auto" | "dark" }) {
    // Manba PNG'da logo atrofida ~40% bo'sh joy bor. scale bilan qoplaymiz.
    // variant="dark" — mavzudan qat'i nazar tungi logo (media ustidagi sahna uchun).
    if (variant === "dark") {
        return (
            <span
                className="relative flex-shrink-0 overflow-hidden grid place-items-center"
                style={{ width: size, height: size }}
            >
                <img
                    src="/bn/logo-dark.png"
                    alt="Bozor Narxida"
                    width={size}
                    height={size}
                    style={{ transform: "scale(1.35)" }}
                    className="max-w-none object-contain"
                />
            </span>
        );
    }
    return (
        <span
            className="relative flex-shrink-0 overflow-hidden grid place-items-center"
            style={{ width: size, height: size }}
        >
            <img
                src="/bn/logo.png"
                alt="Bozor Narxida"
                width={size}
                height={size}
                style={{ transform: "scale(1.35)" }}
                className="max-w-none object-contain dark:hidden"
            />
            <img
                src="/bn/logo-dark.png"
                alt=""
                width={size}
                height={size}
                aria-hidden="true"
                style={{ transform: "scale(1.35)" }}
                className="max-w-none object-contain hidden dark:block"
            />
        </span>
    );
}

// ── Mahsulot sahifasi: shaffof suzuvchi header ──────────────────────────────

/** `/p/<slug>` yoki `/d/<do'kon>/<mahsulot>` (prefiksli `/uz/bn/...` ham). */
export function isProductRoute(pathname: string): boolean {
    return /(?:^|\/)(?:p\/[^/]+|d\/[^/]+\/[^/]+)\/?$/.test(pathname);
}

const OVERLAY_NAV = [
    { href: "/bozorlar",      key: "footer.markets" },
    { href: "/dokonlar",      key: "footer.shops" },
    { href: "/katalog",       key: "nav.catalog" },
    { href: "/buyurtmalarim", key: "footer.myOrders" },
    { href: "/yordam",        key: "footer.help" },
] as const;

function BnOverlayHeader({
    cartCount, scrolled, onMenu,
}: { cartCount: number; scrolled: boolean; onMenu: () => void }) {
    const router = useRouter();
    const to = useBnHref();
    const { data: session, status } = useSession();
    const t = useTranslations("bn");

    function goBack() {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(to("/"));
    }

    return (
        <header className="bn-stage fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-6 md:pt-5 pointer-events-none">
            <div
                className="pointer-events-auto mx-auto max-w-[1344px] flex items-center gap-1 md:gap-1.5 h-14 md:h-[66px] px-1.5 md:pl-4 md:pr-2 rounded-full transition-[background-color,box-shadow] duration-300"
                style={{
                    background: scrolled ? "rgba(16, 21, 20, 0.80)" : "rgba(20, 26, 25, 0.34)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    backdropFilter: "blur(20px) saturate(140%)",
                    WebkitBackdropFilter: "blur(20px) saturate(140%)",
                    boxShadow: scrolled ? "0 12px 40px rgba(0, 0, 0, 0.35)" : "none",
                }}
            >
                <button
                    type="button"
                    onClick={goBack}
                    aria-label={t("back.label")}
                    className="md:hidden w-11 h-11 grid place-items-center rounded-full flex-shrink-0"
                    style={{ color: BN.text }}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <BnLink href="/" className="flex items-center gap-2 md:gap-2.5 min-w-0 md:mr-5">
                    <BnLogo size={34} variant="dark" />
                    <span className="bn-display-sans font-bold text-[16px] md:text-[18px] tracking-tight leading-none truncate">
                        {t("brandName")}
                    </span>
                </BnLink>

                <nav aria-label={t("navbar.ariaLabel")} className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0">
                    {OVERLAY_NAV.map(n => (
                        <BnLink
                            key={n.href}
                            href={n.href}
                            className="h-11 px-3.5 flex items-center rounded-full text-[14.5px] font-medium whitespace-nowrap transition-colors hover:bg-white/10"
                            style={{ color: BN.text2 }}
                        >
                            {t(n.key)}
                        </BnLink>
                    ))}
                </nav>
                <div className="flex-1 lg:hidden" />

                <OverlayIcon href="/qidiruv" label={t("search.submit")} className="hidden md:grid">
                    <Search className="w-[19px] h-[19px]" />
                </OverlayIcon>
                <span className="hidden md:block"><BnLangSwitch /></span>
                <OverlayIcon href="/bildirishnomalar" label={t("nav.notifications")} className="hidden md:grid">
                    <Bell className="w-[19px] h-[19px]" />
                </OverlayIcon>
                <OverlayIcon href="/savat" label={t("nav.cart")} badge={cartCount}>
                    <ShoppingCart className="w-[19px] h-[19px]" />
                </OverlayIcon>

                {status === "authenticated" ? (
                    <BnLink
                        href="/profil"
                        aria-label={t("nav.profile")}
                        className="hidden md:grid w-11 h-11 place-items-center rounded-full overflow-hidden flex-shrink-0"
                        style={{ background: BN.surfaceUp }}
                    >
                        {session?.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={session.user.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                            <User className="w-[18px] h-[18px]" />
                        )}
                    </BnLink>
                ) : (
                    <button
                        type="button"
                        onClick={() => signIn("google")}
                        className="hidden md:flex items-center h-11 ml-1 px-5 rounded-full text-[14.5px] font-bold flex-shrink-0 transition-transform active:scale-[0.97]"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {t("auth.signIn")}
                    </button>
                )}

                <button
                    type="button"
                    onClick={onMenu}
                    aria-label={t("nav.menu")}
                    className="md:hidden w-11 h-11 grid place-items-center rounded-full flex-shrink-0"
                    style={{ color: BN.text }}
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}

function OverlayIcon({
    href, label, badge, className = "", children,
}: { href: string; label: string; badge?: number; className?: string; children: React.ReactNode }) {
    return (
        <BnLink
            href={href}
            aria-label={badge && badge > 0 ? `${label} (${badge})` : label}
            title={label}
            className={`relative w-11 h-11 place-items-center rounded-full flex-shrink-0 transition-colors hover:bg-white/10 ${className || "grid"}`}
            style={{ color: BN.text }}
        >
            {children}
            {badge !== undefined && badge > 0 && (
                <span
                    className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[11px] font-black leading-none tabular-nums"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </BnLink>
    );
}

function SearchExtraBtn({
    label, onClick, gold, children,
}: { label: string; onClick: () => void; gold?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="grid place-items-center w-9 h-9 rounded-xl mr-1 flex-shrink-0 transition-colors active:scale-95"
            style={{
                background: gold ? BN.goldSoft : "transparent",
                color: gold ? BN.gold : BN.text2,
            }}
        >
            {children}
        </button>
    );
}

function IconBtn({
    href, label, compact, children, badge,
}: { href: string; label: string; compact?: boolean; children: React.ReactNode; badge?: number }) {
    return (
        <BnLink
            href={href}
            aria-label={badge && badge > 0 ? `${label} (${badge})` : label}
            title={label}
            className={`relative grid place-items-center rounded-xl transition-colors ${compact ? "w-9 h-9" : "w-10 h-10"}`}
            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
        >
            {children}
            {badge !== undefined && badge > 0 && (
                <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black leading-none tabular-nums"
                    style={{ background: BN.gold, color: BN.onGold, border: `2px solid var(--bn-bg)` }}
                >
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </BnLink>
    );
}
