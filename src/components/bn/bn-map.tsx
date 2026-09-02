"use client";

// BN interaktiv 2D xarita — Toshkent bo'ylab bozorlar va do'konlar.
// Leaflet + OpenStreetMap. Klikda do'kon/bozor sahifasiga link.
// SSR yo'q (client-only) — dynamic import bilan yuklanadi.

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Store, MapPin, Loader2, Crown } from "lucide-react";
import { BN } from "@/lib/bn-theme";

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

export function BnMap() {
    const locale = useLocale();
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

        // Bozor markerlari (katta, tilla)
        data.markets.forEach(m => {
            const marketName = locale === "ru" ? (m.nameRu ?? m.name) : m.name;
            const icon = leaflet.divIcon({
                html: `<div style="width: 40px; height: 40px; background: ${BN.gold}; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #0A0E27; font-size: 12px; font-weight: 800;">B</div>`,
                className: "",
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });
            const marker = leaflet.marker([m.lat, m.lng], { icon }).addTo(map);
            marker.bindPopup(`
                <div style="min-width: 180px; font-family: sans-serif;">
                    <b style="font-size: 14px; color: #0A0E27;">${marketName}</b><br>
                    <span style="font-size: 12px; color: #666;">${m.district ?? ""}${m.district ? ", " : ""}${m.city}</span><br>
                    <a href="/m/${m.slug}" style="color: #F5B301; font-weight: 600; text-decoration: none; font-size: 12px;">${locale === "ru" ? "Открыть" : locale === "en" ? "Open" : "Ochish"} →</a>
                </div>
            `);
        });

        // Do'kon markerlari (kichik, oq)
        data.shops.forEach(s => {
            const isPrem = s.isPremium;
            const isVerified = s.verifiedTier !== "NONE";
            const color = isPrem ? "#8B5CF6" : isVerified ? BN.gold : "#94A3B8";
            const icon = leaflet.divIcon({
                html: `<div style="width: 24px; height: 24px; background: #fff; border: 2px solid ${color}; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 10px; font-weight: 700;">S</div>`,
                className: "",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
            const marker = leaflet.marker([s.lat, s.lng], { icon }).addTo(map);
            const badge = isPrem
                ? '<span style="background: #8B5CF6; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">PREMIUM</span>'
                : isVerified
                    ? '<span style="background: #F5B301; color: #0A0E27; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">VERIFIED</span>'
                    : "";
            marker.bindPopup(`
                <div style="min-width: 180px; font-family: sans-serif;">
                    <b style="font-size: 13px; color: #0A0E27;">${s.name}</b> ${badge}<br>
                    <span style="font-size: 11px; color: #666;">${s.address ?? s.city}</span><br>
                    ${s.rating > 0 ? `<span style="font-size: 11px; color: #F5B301;">★ ${s.rating.toFixed(1)} (${s.ratingCount})</span> · ` : ""}
                    <span style="font-size: 11px; color: #666;">${s.productCount} ${locale === "ru" ? "товаров" : locale === "en" ? "items" : "mahsulot"}</span><br>
                    <a href="/d/${s.slug}" style="color: #F5B301; font-weight: 600; text-decoration: none; font-size: 12px;">${locale === "ru" ? "Открыть" : locale === "en" ? "Open" : "Ochish"} →</a>
                </div>
            `);
        });

        return () => {
            map.remove();
        };
    }, [L, data, locale]);

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
                    <div className="w-3 h-3 rounded-full" style={{ background: BN.gold, border: "2px solid #fff" }} />
                    <span style={{ color: BN.text2 }}>{locale === "ru" ? "Базары" : locale === "en" ? "Bazaars" : "Bozorlar"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#fff", border: "2px solid #8B5CF6" }} />
                    <span style={{ color: BN.text2 }}>Premium</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#fff", border: `2px solid ${BN.gold}` }} />
                    <span style={{ color: BN.text2 }}>Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#fff", border: "2px solid #94A3B8" }} />
                    <span style={{ color: BN.text2 }}>{locale === "ru" ? "Обычный" : locale === "en" ? "Regular" : "Oddiy"}</span>
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
