"use client";

// BN interaktiv 2D xarita — Toshkent bo'ylab bozorlar va do'konlar.
// Leaflet + OpenStreetMap. Klikda do'kon/bozor sahifasiga link.
// SSR yo'q (client-only) — dynamic import bilan yuklanadi.

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Store, MapPin, Loader2, Crown } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { useBnFormat } from "./bn-format-hook";
import { bnCity } from "@/lib/bn-seo";

interface Shop {
    slug: string; name: string; city: string; address: string | null;
    lat: number; lng: number;
    tier: string; verifiedTier: string; rating: number; ratingCount: number;
    productCount: number; orderCount: number;
    logoUrl: string | null;
    isPremium: boolean;
    market: { slug: string; name: string } | null;
}
interface Market {
    slug: string; name: string; nameRu: string | null; city: string;
    address: string | null; district: string | null; lat: number; lng: number;
    coverUrl: string | null;
}
interface Data { shops: Shop[]; markets: Market[]; }

// Leaflet dinamik yuklash (server'da leaflet ishlamaydi)
type LeafletModule = typeof import("leaflet");

// Popup HTML satr sifatida quriladi — do'kon/bozor nomi va manzili sotuvchi
// kiritgan matn, shuning uchun har bir qiymat HTML-escape qilinadi (XSS).
function escapeHtml(v: string | number | null | undefined): string {
    return String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function BnMap() {
    const locale = useLocale();
    const t = useTranslations("bn.map");
    const fmt = useBnFormat();
    const mapRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [L, setL] = useState<LeafletModule | null>(null);

    // Leaflet + CSS yuklash
    useEffect(() => {
        (async () => {
            const leaflet = await import("leaflet");
            // CSS'ni sahifaga qo'shish (agar hali qo'shilmagan bo'lsa)
            if (!document.querySelector('link[href*="leaflet"]')) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }
            setL(leaflet);
        })();
    }, []);

    // Ma'lumotni olib kelish
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/bn/map/shops");
                if (!r.ok) throw new Error();
                setData(await r.json());
            } catch { setData({ shops: [], markets: [] }); }
            finally { setLoading(false); }
        })();
    }, []);

    // Xaritani ishga tushurish
    useEffect(() => {
        if (!L || !data || !mapRef.current) return;

        const leaflet = L;
        const el = mapRef.current;

        // Element hali tozalanmaganini tekshirish
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leafletContainer = (el as any)._leaflet_id;
        if (leafletContainer) return;

        // Toshkent markazi
        const map = leaflet.map(el, {
            center: [41.2995, 69.2401],
            zoom: 11,
            scrollWheelZoom: true,
        });

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
            maxZoom: 19,
        }).addTo(map);

        // Ranglar — BN tokenlari (popup foni bn-styles.css'da BN surface).
        // Oq halqa (#fff) ataylab: OSM xarita plitkalari har ikki temada och.

        // Bozor markerlari (katta, tilla)
        data.markets.forEach(m => {
            const marketName = locale === "ru" ? (m.nameRu ?? m.name) : m.name;
            const icon = leaflet.divIcon({
                html: `<div style="width: 40px; height: 40px; background: ${BN.gold}; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: ${BN.onGold}; font-size: 12px; font-weight: 800;">B</div>`,
                className: "",
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });
            const marker = leaflet.marker([m.lat, m.lng], { icon }).addTo(map);
            marker.bindPopup(`
                <div style="min-width: 180px; font-family: sans-serif;">
                    <b style="font-size: 14px; color: ${BN.text};">${escapeHtml(marketName)}</b><br>
                    <span style="font-size: 12px; color: ${BN.text3};">${escapeHtml(m.district)}${m.district ? ", " : ""}${escapeHtml(bnCity(m.city, locale))}</span><br>
                    <a href="/m/${encodeURIComponent(m.slug)}" style="color: ${BN.gold}; font-weight: 600; text-decoration: none; font-size: 12px;">${escapeHtml(t("open"))} →</a>
                </div>
            `);
        });

        // Do'kon markerlari (kichik): Premium — to'la tilla (bozorning kichik nusxasi),
        // Verified — tilla halqa, Oddiy — kulrang halqa. Fon BN surface — tungi
        // temada ham halqa/harf o'qiladi.
        data.shops.forEach(s => {
            const isPrem = s.isPremium;
            const isVerified = s.verifiedTier !== "NONE";
            const ring = isPrem ? "#fff" : isVerified ? BN.gold : BN.text3;
            const fill = isPrem ? BN.gold : BN.surface;
            const ink = isPrem ? BN.onGold : ring;
            const icon = leaflet.divIcon({
                html: `<div style="width: 24px; height: 24px; background: ${fill}; border: 2px solid ${ring}; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: ${ink}; font-size: 10px; font-weight: 700;">S</div>`,
                className: "",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
            const marker = leaflet.marker([s.lat, s.lng], { icon }).addTo(map);
            const badge = isPrem
                ? `<span style="background: ${BN.gold}; color: ${BN.onGold}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${escapeHtml(t("legendPremium"))}</span>`
                : isVerified
                    ? `<span style="background: ${BN.goldSoft}; color: ${BN.gold}; border: 1px solid ${BN.borderGold}; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${escapeHtml(t("legendVerified"))}</span>`
                    : "";
            marker.bindPopup(`
                <div style="min-width: 180px; font-family: sans-serif;">
                    <b style="font-size: 13px; color: ${BN.text};">${escapeHtml(s.name)}</b> ${badge}<br>
                    <span style="font-size: 11px; color: ${BN.text3};">${escapeHtml(s.address ?? bnCity(s.city, locale))}</span><br>
                    ${s.rating > 0 ? `<span style="font-size: 11px; color: ${BN.gold};">★ ${escapeHtml(s.rating.toFixed(1))} (${escapeHtml(s.ratingCount)})</span> · ` : ""}
                    <span style="font-size: 11px; color: ${BN.text3};">${escapeHtml(fmt.products(s.productCount))}</span><br>
                    <a href="/d/${encodeURIComponent(s.slug)}" style="color: ${BN.gold}; font-weight: 600; text-decoration: none; font-size: 12px;">${escapeHtml(t("open"))} →</a>
                </div>
            `);
        });

        return () => {
            map.remove();
        };
    }, [L, data, locale, t, fmt]);

    if (loading || !L) {
        return (
            <div className="rounded-2xl h-[500px] flex items-center justify-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} />
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            {/* Legend */}
            <div className="p-3 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ background: BN.surfaceUp, borderBottom: `1px solid ${BN.border}` }}>
                <div className="flex items-center gap-1.5">
                    {/* Legenda markerlarni takrorlaydi: bozor — katta tilla, Premium — kichik tilla */}
                    <div className="w-4 h-4 rounded-full" style={{ background: BN.gold, border: "2px solid #fff" }} />
                    <span style={{ color: BN.text2 }}>{t("legendMarkets")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: BN.gold, border: "2px solid #fff" }} />
                    <span style={{ color: BN.text2 }}>{t("legendPremium")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: BN.surface, border: `2px solid ${BN.gold}` }} />
                    <span style={{ color: BN.text2 }}>{t("legendVerified")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: BN.surface, border: `2px solid ${BN.text3}` }} />
                    <span style={{ color: BN.text2 }}>{t("legendRegular")}</span>
                </div>
                <div className="ml-auto flex items-center gap-3 text-[11px]" style={{ color: BN.text3 }}>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data?.markets.length ?? 0}</span>
                    <span className="flex items-center gap-1"><Store className="w-3 h-3" />{data?.shops.length ?? 0}</span>
                </div>
            </div>
            {/* Map */}
            <div ref={mapRef} className="w-full h-[500px]" />
        </div>
    );
}
