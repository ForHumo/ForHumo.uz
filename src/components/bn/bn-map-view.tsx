"use client";

// BN xarita ko'rsatish (readonly) — do'kon/bozor sahifasida.
// Faqat pin + "Yo'l ko'rsatish" tugmasi (Yandex/Google Maps'ni tashqarida ochadi).

import { useEffect, useRef } from "react";
import { Navigation } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Props {
    lat: number;
    lng: number;
    label?: string;           // pin ustidagi qisqa nom (masalan do'kon nomi)
    height?: number;          // default 220
}

let leafletCssInjected = false;
function injectLeafletCss() {
    if (leafletCssInjected || typeof document === "undefined") return;
    leafletCssInjected = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    document.head.appendChild(link);
}

export function BnMapView({ lat, lng, label, height = 220 }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<import("leaflet").Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        injectLeafletCss();

        let destroyed = false;
        import("leaflet").then((L) => {
            if (destroyed || !containerRef.current) return;

            const map = L.map(containerRef.current, {
                center: [lat, lng],
                zoom: 16,
                zoomControl: true,
                scrollWheelZoom: false,
                dragging: true,
                attributionControl: true,
            });
            map.attributionControl.setPrefix(false);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 19,
            }).addTo(map);

            const pinIcon = L.divIcon({
                className: "",
                html: `<div style="width:26px;height:26px;background:#e0b64e;border:3px solid white;border-radius:50%;box-shadow:0 3px 12px rgba(224,182,78,0.5);"></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
            });
            const m = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
            if (label) m.bindTooltip(label, { permanent: false, direction: "top", offset: [0, -8] });

            mapRef.current = map;
        });

        return () => {
            destroyed = true;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [lat, lng, label]);

    return (
        <div className="space-y-2">
            <div
                className="rounded-2xl overflow-hidden relative"
                style={{ height, background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
            >
                <div ref={containerRef} className="absolute inset-0" />
            </div>
            <div className="flex gap-2">
                <a
                    href={`https://yandex.uz/maps/?ll=${lng},${lat}&z=17&pt=${lng},${lat}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 flex-1 h-10 rounded-xl text-[12.5px] font-bold"
                    style={{ background: BN.surface, color: BN.text2, border: `1px solid ${BN.border}` }}
                >
                    <Navigation className="w-3.5 h-3.5" />
                    Yandex xaritada
                </a>
                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 flex-1 h-10 rounded-xl text-[12.5px] font-bold"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Navigation className="w-3.5 h-3.5" />
                    Yo&apos;l ko&apos;rsatish
                </a>
            </div>
        </div>
    );
}
