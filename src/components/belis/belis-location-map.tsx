"use client";

// Belis do'koni Google Maps embed + "Route ochish" tugmasi.
// Google Maps'da Belis Place ID bo'yicha ro'yxatga olingan.

import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_LOCATION, belisDirectionsUrl } from "@/lib/belis-theme";

interface Props {
    /** Sarlavha (default: "Bizning manzil") */
    title?: string;
    /** Compact rejim — kichik xarita (booking wizard, sidebar uchun) */
    compact?: boolean;
}

export function BelisLocationMap({ title = "Bizning manzil", compact = false }: Props) {
    const height = compact ? 200 : 360;

    return (
        <div className="rounded-2xl overflow-hidden"
            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
            {/* Header */}
            <div className="flex items-center gap-2 p-4">
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <MapPin className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black" style={{ color: BELIS.text }}>{title}</p>
                    <p className="text-[11.5px]" style={{ color: BELIS.text2 }}>
                        Belis · {BELIS_LOCATION.address}
                    </p>
                </div>
            </div>

            {/* Google Maps iframe */}
            <div className="relative w-full" style={{ height, background: BELIS.surfaceUp }}>
                <iframe
                    src={BELIS_LOCATION.mapsEmbedSrc}
                    width="100%"
                    height={height}
                    style={{ border: 0, display: "block" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="Belis do'koni — Google Maps"
                />
            </div>

            {/* CTA tugmalari */}
            <div className="p-3 flex flex-col sm:flex-row gap-2" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                <a
                    href={belisDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}
                >
                    <Navigation className="w-4 h-4" /> Yo&apos;nalish (Route)
                </a>
                <a
                    href={BELIS_LOCATION.mapsShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5"
                    style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }}
                >
                    <ExternalLink className="w-4 h-4" /> Google Maps
                </a>
            </div>
        </div>
    );
}
