"use client";

import { useTranslations } from "next-intl";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import {
    Home, Grid3x3, Heart, ShoppingBag, Menu, X,
    MapPin, Package, Globe, Sun, Bell, LogIn, Sparkles,
} from "lucide-react";
import { BELIS } from "@/lib/belis-theme";
import { BelisLocationMap } from "./belis-location-map";
import { BelisMapPickerModal, type BelisLatLng } from "./belis-map-picker-modal";
import { BelisSmartLink, useBelisHref, useBelisPath } from "./belis-base";
import { createPortal } from "react-dom";
import NextLink from "next/link";

// BelisLink — base-aware. `href="/kabinet"` → belis.uz: /uz/kabinet, forhumo.uz: /uz/belis/kabinet
// Eski `href="/belis/kabinet"` ham qabul qilinadi (base helper strip qiladi).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BelisLink({ href, className, style, children, onClick, title, target, rel, ...rest }: any) {
    const to = useBelisHref();
    return <NextLink href={to(href)} className={className} style={style} onClick={onClick} title={title} target={target} rel={rel} {...rest}>{children}</NextLink>;
}

interface NavItem {
    href: string;
    labelKey: string;
    icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/",           labelKey: "home",        icon: Home },
    { href: "/katalog",    labelKey: "catalog",     icon: Grid3x3 },
    { href: "/ai",         labelKey: "aiAssistant", icon: Sparkles },
    { href: "/saqlangan",  labelKey: "saved",       icon: Heart },
    { href: "/savat",      labelKey: "cart",        icon: ShoppingBag },
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
                <BelisLink href="/" className="flex items-center gap-2 flex-shrink-0">
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
                    <BelisLink href="/kabinet"
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

                    {/* Profil / Kirish — boshqa ikonlar bilan bir xil forma (kvadrat) */}
                    {session ? (
                        <BelisLink href="/kabinet"
                            title="Kabinet"
                            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden hover:brightness-95 flex-shrink-0"
                            style={{ background: BELIS.gold, border: `1px solid ${BELIS.gold}` }}>
                            {session.user?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-black" style={{ color: BELIS.onGold, fontFamily: "'Playfair Display', serif" }}>
                                    {(session.user?.name ?? "U").slice(0, 1).toUpperCase()}
                                </span>
                            )}
                        </BelisLink>
                    ) : (
                        <button onClick={() => signIn("google")}
                            title="Kirish"
                            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-black hover:brightness-95 flex-shrink-0"
                            style={{ background: BELIS.gold, color: BELIS.onGold }}>
                            <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                            Kirish
                        </button>
                    )}
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
    const path = useBelisPath();
    const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

    return (
        <div className="fixed bottom-4 left-0 right-0 z-[110] flex justify-center pointer-events-none">
            <nav
                className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-2xl"
                style={{
                    background: "rgba(240, 242, 225, 0.78)",
                    backdropFilter: "blur(14px) saturate(150%)",
                    WebkitBackdropFilter: "blur(14px) saturate(150%)",
                    border: `1px solid ${BELIS.borderSoft}`,
                    boxShadow: "0 12px 32px rgba(58,53,32,0.18), 0 2px 6px rgba(58,53,32,0.06)",
                }}
            >
                {NAV_ITEMS.map(it => {
                    const Icon = it.icon;
                    const active = isActive(it.href);
                    return (
                        <BelisLink key={it.href} href={it.href}
                            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-colors"
                            style={{
                                background: active ? BELIS.goldSoft : "transparent",
                                color: active ? BELIS.onGold : BELIS.text2,
                                fontFamily: "'Montserrat', sans-serif",
                            }}>
                            {Icon ? (
                                <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.6}
                                    style={{ color: active ? BELIS.goldDeep : BELIS.text2 }} />
                            ) : null}
                            <span className="hidden sm:inline">{t(it.labelKey)}</span>
                        </BelisLink>
                    );
                })}
            </nav>
        </div>
    );
}

// Suppress unused import warning if BelisSmartLink not used yet
void BelisSmartLink;

// Eski AddressModal (yozma) o'chirildi — endi faqat BelisMapPickerModal (xaritada).
// Qoida: feedback-location-map-only — har doim xaritadan.

// Eski BelisNav backwards compat — barcha eski import'lar ishlashi uchun
export { BelisHeader as BelisNav };
