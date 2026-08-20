"use client";

// BN home "Yaqin do'konlar" qatori. Foydalanuvchidan brauzer geolocation
// so'raydi (bir marta permission). Ruxsat bersa — Haversine bo'yicha eng
// yaqin APPROVED do'konlar. Rad etsa yoki xatolik bo'lsa — komponent
// jim yashiradi (home boshqa qatorlarni buzmaydi).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, ChevronRight, Store, Loader2, Navigation, Route } from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

function directionsUrl(destLat: number, destLng: number, originLat?: number, originLng?: number): string {
    const base = "https://www.google.com/maps/dir/?api=1&destination=" + destLat + "," + destLng;
    return originLat != null && originLng != null
        ? base + "&origin=" + originLat + "," + originLng
        : base;
}

interface NearbyShop {
    slug: string;
    name: string;
    logoUrl: string | null;
    tier: keyof typeof TIER_META;
    verifiedTier: "NONE" | "RETAIL" | "WHOLESALE";
    city: string;
    address: string | null;
    marketSlug: string | null;
    marketName: string | null;
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
    rating: number;
    ratingCount: number;
    productCount: number;
    lat: number;
    lng: number;
    distKm: number;
}

const COORDS_KEY = "bn-user-coords-v1";     // sessionStorage — session davomida 1 marta so'raladi

interface CachedCoords { lat: number; lng: number; at: number; }

function formatDist(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
}

export function BnNearbyRow() {
    const t = useTranslations("bn.nearby");
    const [state, setState] = useState<"idle" | "prompt" | "loading" | "ready" | "denied" | "empty">("idle");
    const [shops, setShops] = useState<NearbyShop[]>([]);
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("geolocation" in navigator)) {
            setState("denied");
            return;
        }

        // Session davomida saqlangan koordinatalar bo'lsa — darhol yuklaymiz
        try {
            const raw = sessionStorage.getItem(COORDS_KEY);
            if (raw) {
                const cached = JSON.parse(raw) as CachedCoords;
                if (Date.now() - cached.at < 30 * 60 * 1000) {
                    void loadNearby(cached.lat, cached.lng);
                    return;
                }
            }
        } catch { /* ignore */ }

        setState("prompt");
    }, []);

    async function loadNearby(lat: number, lng: number) {
        setState("loading");
        setUserLoc({ lat, lng });
        try {
            const r = await fetch(`/api/bn/nearby?lat=${lat}&lng=${lng}&radius=5&limit=12`);
            if (!r.ok) { setState("empty"); return; }
            const d = await r.json();
            const arr = (d.shops ?? []) as NearbyShop[];
            if (arr.length === 0) { setState("empty"); return; }
            setShops(arr);
            setState("ready");
        } catch { setState("empty"); }
    }

    function requestLocation() {
        setState("loading");
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude: lat, longitude: lng } = pos.coords;
                try {
                    sessionStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lng, at: Date.now() }));
                } catch { /* ignore */ }
                void loadNearby(lat, lng);
            },
            () => setState("denied"),
            { timeout: 8000, maximumAge: 5 * 60 * 1000 },
        );
    }

    // Jim yashirin — komponent home boshqa qatorlarini buzmasin
    if (state === "idle" || state === "denied" || state === "empty") return null;

    // Ruxsat so'rash CTA — kichkina banner
    if (state === "prompt") {
        return (
            <section className="mb-8">
                <div className="p-4 rounded-2xl flex items-center gap-3"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                    <span className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <MapPin className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-black leading-tight">{t("promptTitle")}</p>
                        <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>{t("promptText")}</p>
                    </div>
                    <button onClick={requestLocation}
                        className="h-9 px-3 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 flex-shrink-0"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        <Navigation className="w-3.5 h-3.5" />
                        {t("promptCta")}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-10">
            <div className="flex items-end justify-between gap-3 mb-4">
                <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <Navigation className="w-[18px] h-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-[18px] sm:text-[21px] font-black tracking-tight leading-none">{t("title")}</h2>
                        <p className="text-[12.5px] mt-1.5" style={{ color: BN.text3 }}>
                            {state === "loading" ? t("loading") : t("subtitle", { n: shops.length })}
                        </p>
                    </div>
                </div>
            </div>

            {state === "loading" ? (
                <div className="p-8 grid place-items-center rounded-2xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.gold }} />
                </div>
            ) : (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1" data-no-swipe>
                    {shops.map(s => (
                        <div key={s.slug}
                            className="flex-shrink-0 w-[240px] p-3 rounded-2xl flex items-center gap-2.5 transition-transform active:scale-[0.99]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            {/* Do'konga o'tish — asosiy bosish */}
                            <BnLink href={`/d/${s.slug}`}
                                className="flex-1 min-w-0 flex items-center gap-2.5">
                                <span className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                                    style={{ background: BN.surfaceUp }}>
                                    {s.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={s.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="w-5 h-5" style={{ color: BN.text3 }} />
                                    )}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5">
                                        <span className="block text-[12.5px] font-black truncate">{s.name}</span>
                                        {s.tier !== "NEW" && (
                                            <span className="px-1 py-0.5 rounded text-[9px] font-black leading-none flex-shrink-0"
                                                style={{ background: `${TIER_META[s.tier].color}1F`, color: TIER_META[s.tier].color }}>
                                                {TIER_META[s.tier].label}
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>
                                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">
                                            {s.marketName ? s.marketName : s.city}
                                        </span>
                                    </span>
                                    <span className="mt-1 inline-block text-[10.5px] font-black px-1.5 py-0.5 rounded"
                                        style={{ background: BN.goldSoft, color: BN.gold }}>
                                        {formatDist(s.distKm)}
                                    </span>
                                </span>
                            </BnLink>
                            {/* Route — Google Maps ochish (yangi tab) */}
                            <a href={directionsUrl(s.lat, s.lng, userLoc?.lat, userLoc?.lng)}
                                target="_blank" rel="noopener"
                                aria-label={t("routeAria", { name: s.name })}
                                className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 transition-transform active:scale-[0.9]"
                                style={{ background: BN.gold, color: BN.onGold }}>
                                <Route className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
