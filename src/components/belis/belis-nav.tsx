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
    const [clientAddr, setClientAddr] = useState<string>("");
    const [langOpen, setLangOpen] = useState(false);
    const [notifCount] = useState(0);   // Kelajakda backend'dan

    // Foydalanuvchi manzili — localStorage'da saqlanadi
    useEffect(() => {
        try { setClientAddr(localStorage.getItem("belis:client-addr") ?? ""); } catch {}
    }, []);
    function saveAddr(v: string) {
        setClientAddr(v);
        try { localStorage.setItem("belis:client-addr", v); } catch {}
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

                {/* Manzillar (Belis + client) */}
                <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                    {/* Belis manzili — statik */}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${BELIS_LOCATION.lat},${BELIS_LOCATION.lng}`}
                        target="_blank" rel="noopener"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition hover:brightness-95 flex-shrink-0"
                        style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BELIS.borderSoft}`, color: BELIS.text }}>
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                        <span className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Belis · Toshkent</span>
                    </a>

                    {/* Client manzili — bosilib tahrirlanadi */}
                    <button onClick={() => setAddrOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition hover:brightness-95 truncate max-w-[240px]"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}`, color: clientAddr ? BELIS.text : BELIS.text3 }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                        <span className="truncate font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            {clientAddr || "Yetkazish manzili"}
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

            {/* Bottom navbar — Asosiy / Katalog / AI / Saqlangan / Savat */}
            <BelisNavbar />

            {/* Manzil modal */}
            {addrOpen && (
                <AddressModal
                    value={clientAddr}
                    onSave={(v) => { saveAddr(v); setAddrOpen(false); }}
                    onClose={() => setAddrOpen(false)}
                />
            )}
        </header>
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

function AddressModal({ value, onSave, onClose }: {
    value: string;
    onSave: (v: string) => void;
    onClose: () => void;
}) {
    const [v, setV] = useState(value);
    return (
        <div className="fixed inset-0 z-[60]" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(58,53,32,0.55)", backdropFilter: "blur(4px)" }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[440px] rounded-2xl overflow-hidden"
                style={{ background: BELIS.bg, border: `1px solid ${BELIS.gold}`, boxShadow: "0 24px 64px rgba(58,53,32,0.55)" }}
                onClick={e => e.stopPropagation()}>
                <div className="p-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: BELIS.gold }}>
                        <MapPin className="w-4 h-4" style={{ color: BELIS.onGold }} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-sm font-black flex-1" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>
                        Yetkazish manzili
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:brightness-95"
                        style={{ background: BELIS.surface }}>
                        <X className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                    </button>
                </div>
                <div className="p-4">
                    <label className="text-[11px] block mb-1.5" style={{ color: BELIS.text2 }}>
                        Manzilingizni kiriting (yetkazib berish uchun)
                    </label>
                    <textarea value={v} onChange={e => setV(e.target.value)}
                        maxLength={200} rows={3}
                        placeholder="Toshkent, Chilonzor, ..."
                        className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                    <p className="text-[10px] mt-2" style={{ color: BELIS.text3 }}>
                        Bu manzil brauzerda saqlanadi — buyurtma paytida avto-to&apos;ldiriladi.
                    </p>
                </div>
                <div className="p-3 flex gap-2 justify-end" style={{ background: BELIS.surface, borderTop: `1px solid ${BELIS.borderSoft}` }}>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold"
                        style={{ background: BELIS.bg, color: BELIS.text2, border: `1px solid ${BELIS.border}` }}>
                        Bekor
                    </button>
                    <button onClick={() => onSave(v.trim())}
                        className="px-5 py-2 rounded-lg text-xs font-black transition hover:brightness-110"
                        style={{ background: "linear-gradient(135deg,#EBD79A,#D4AF37)", color: BELIS.onGold }}>
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
    );
}

// Eski BelisNav backwards compat — barcha eski import'lar ishlashi uchun
export { BelisHeader as BelisNav };
