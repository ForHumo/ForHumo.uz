"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import {
    Home, Grid3x3, Sparkles, Heart, ShoppingBag, Menu, X,
    MapPin, Package, Globe, Sun, Bell, User, ChevronDown,
} from "lucide-react";
import { BELIS, BELIS_LOCATION } from "@/lib/belis-theme";
import { BelisLocationMap } from "./belis-location-map";
import { BelisMapPickerModal, type BelisLatLng } from "./belis-map-picker-modal";
import { createPortal } from "react-dom";

// BelisLink — locale-aware Link (Nexus/BN naqshi).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BelisLink({ href, className, style, children, onClick, ...rest }: any) {
    return <Link href={href} className={className} style={style} onClick={onClick} {...rest}>{children}</Link>;
}

interface NavItem { href: string; labelKey: string; icon: React.ElementType }

const NAV_ITEMS: NavItem[] = [
    { href: "/belis",             labelKey: "home",        icon: Home },
    { href: "/belis/katalog",     labelKey: "catalog",     icon: Grid3x3 },
    { href: "/belis/kabinet",     labelKey: "account",     icon: Package },
    { href: "/belis/haqida",      labelKey: "about",       icon: Sparkles },
];

export function BelisHeader() {
    const t = useTranslations("belis");
    const { data: session } = useSession();
    const [addrOpen, setAddrOpen] = useState(false);
    const [belisMapOpen, setBelisMapOpen] = useState(false);
    const [clientLoc, setClientLoc] = useState<BelisLatLng | null>(null);
    const [langOpen, setLangOpen] = useState(false);
    const [notifCount] = useState(0);   // Kelajakda backend'dan

    // Foydalanuvchi lokatsiyasi — localStorage'da JSON sifatida saqlanadi
    // (yozma manzil taqiqlangan — memory feedback-location-map-only)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("belis:client-loc");
            if (raw) {
                const parsed = JSON.parse(raw) as BelisLatLng;
                if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
                    setClientLoc(parsed);
                }
            }
        } catch { /* noop */ }
    }, []);
    function saveLoc(v: BelisLatLng) {
        setClientLoc(v);
        try { localStorage.setItem("belis:client-loc", JSON.stringify(v)); } catch { /* noop */ }
        setAddrOpen(false);
    }

    return (
        <header className="sticky top-0 z-40 flex-shrink-0 backdrop-blur-md"
            style={{
                background: "rgba(231,235,215,0.94)",
                borderBottom: `1px solid ${BELIS.border}`,
            }}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                {/* Logo (image) */}
                <BelisLink href="/belis" className="flex items-center gap-2 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/belis/belis.png" alt="Belis" className="h-10 w-auto object-contain" />
                </BelisLink>

                {/* Manzillar (Belis + client) — ikkalasi ham xaritada */}
                <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                    {/* Belis manzili — bosilsa modal ichida xarita ochiladi */}
                    <button onClick={() => setBelisMapOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition hover:brightness-95 flex-shrink-0"
                        style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${BELIS.borderSoft}`, color: BELIS.text }}>
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                        <span className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Belis · Toshkent</span>
                    </button>

                    {/* Client manzili — xaritada tanlash (yozma taqiqlangan) */}
                    <button onClick={() => setAddrOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition hover:brightness-95 truncate max-w-[280px]"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}`, color: clientLoc ? BELIS.text : BELIS.text3 }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} style={{ color: clientLoc ? BELIS.goldDeep : BELIS.text2 }} />
                        <span className="truncate font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            {clientLoc?.address || "Yetkazish manzili — xaritadan"}
                        </span>
                    </button>
                </div>

                {/* Header actions */}
                <div className="ml-auto flex items-center gap-1">
                    <BelisLink href="/belis/kabinet"
                        title="Mening buyurtmalarim"
                        className="hidden md:flex w-9 h-9 rounded-lg items-center justify-center hover:brightness-95"
                        style={{ background: BELIS.surface }}>
                        <Package className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                    </BelisLink>

                    {/* Til (uz only for now) */}
                    <div className="relative">
                        <button onClick={() => setLangOpen(o => !o)}
                            title="Til"
                            className="flex items-center gap-1 w-9 h-9 rounded-lg justify-center hover:brightness-95"
                            style={{ background: BELIS.surface }}>
                            <Globe className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                        </button>
                        {langOpen && (
                            <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg z-50"
                                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, boxShadow: "0 8px 24px rgba(58,53,32,0.20)" }}>
                                <div className="px-3 py-2 text-xs" style={{ color: BELIS.text }}>
                                    🇺🇿 O&apos;zbekcha ✓
                                </div>
                                <div className="px-3 py-2 text-[10px] italic" style={{ color: BELIS.text3, borderTop: `1px solid ${BELIS.borderSoft}` }}>
                                    Rus/Eng tez orada
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rejim (day only) */}
                    <button title="Kunduz rejimi (tungi rejim tez orada)"
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:brightness-95"
                        style={{ background: BELIS.surface }}>
                        <Sun className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                    </button>

                    {/* Bildirishnoma */}
                    <button title="Bildirishnomalar"
                        className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:brightness-95"
                        style={{ background: BELIS.surface }}>
                        <Bell className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                        {notifCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-black flex items-center justify-center px-1"
                                style={{ background: BELIS.err, color: "white" }}>{notifCount}</span>
                        )}
                    </button>

                    {/* Profil */}
                    <BelisLink href="/belis/kabinet"
                        title="Kabinet"
                        className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden hover:brightness-95 flex-shrink-0"
                        style={{ background: BELIS.gold, border: `1px solid ${BELIS.gold}` }}>
                        {session?.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                        ) : session ? (
                            <span className="text-sm font-black" style={{ color: BELIS.onGold, fontFamily: "'Playfair Display', serif" }}>
                                {(session.user?.name ?? "U").slice(0, 1).toUpperCase()}
                            </span>
                        ) : (
                            <User className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.onGold }} />
                        )}
                    </BelisLink>
                </div>
            </div>

            {/* Bottom navbar */}
            <BelisNavbar />

            {/* Belis do'kon manzili modal (readonly xarita) */}
            {belisMapOpen && (
                <BelisShopMapModal onClose={() => setBelisMapOpen(false)} />
            )}

            {/* Mijoz yetkazish manzili — xaritadan (yozma taqiqlangan) */}
            {addrOpen && (
                <BelisMapPickerModal
                    value={clientLoc}
                    onChange={saveLoc}
                    onClose={() => setAddrOpen(false)}
                    title="Yetkazish manzili"
                />
            )}
        </header>
    );
}

// Belis do'kon manzili modali (readonly — foydalanuvchi ko'radi + route ochadi)
function BelisShopMapModal({ onClose }: { onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(58,53,32,0.65)", backdropFilter: "blur(6px)" }}
            onClick={onClose}>
            <div className="w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="p-3 flex items-center justify-end sm:justify-between">
                    <span className="hidden sm:inline text-[13px] font-black" style={{ color: BELIS.bg }}>Belis do&apos;kon manzili</span>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full grid place-items-center"
                        style={{ background: BELIS.surface, color: BELIS.text2 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <BelisLocationMap title="Belis do'kon manzili" />
            </div>
        </div>,
        document.body,
    );
}

export function BelisNavbar() {
    const t = useTranslations("belis.nav");
    const pathname = usePathname();
    const isActive = (href: string) =>
        href === "/belis" ? pathname === "/belis" : pathname.startsWith(href);

    return (
        <div className="border-t" style={{ borderColor: BELIS.borderSoft }}>
            <nav className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map(it => {
                    const Icon = it.icon;
                    const active = isActive(it.href);
                    return (
                        <BelisLink key={it.href} href={it.href}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap transition relative"
                            style={{
                                fontFamily: "'Montserrat', sans-serif",
                                color: active ? BELIS.gold : BELIS.text2,
                                fontWeight: active ? 700 : 500,
                            }}>
                            <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.5} />
                            {t(it.labelKey)}
                            {active && (
                                <span className="absolute bottom-0 left-2 right-2 h-0.5"
                                    style={{ background: BELIS.gold, borderRadius: "2px 2px 0 0" }} />
                            )}
                        </BelisLink>
                    );
                })}
            </nav>
        </div>
    );
}

// Eski AddressModal (yozma) o'chirildi — endi faqat BelisMapPickerModal (xaritada).
// Qoida: feedback-location-map-only — har doim xaritadan.

// Eski BelisNav backwards compat — barcha eski import'lar ishlashi uchun
export { BelisHeader as BelisNav };
