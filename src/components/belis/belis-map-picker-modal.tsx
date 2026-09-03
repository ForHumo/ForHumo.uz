"use client";

// Belis manzil tanlash — Leaflet + OpenStreetMap.
// Faqat modal (trigger tashqi: header tugmasi).
// Text input QAT'IY YO'Q — foydalanuvchi xaritada belgi qo'yadi.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Locate, X, Check, Layers, MapPin } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

export interface BelisLatLng {
    lat: number;
    lng: number;
    address: string;
}

interface Props {
    value: BelisLatLng | null;
    onChange: (val: BelisLatLng) => void;
    onClose: () => void;
    title?: string;
}

// Toshkent markazi
const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

type MapMode = "street" | "satellite";

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

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`,
        );
        const data = await res.json();
        const a = data.address ?? {};
        const parts: string[] = [];
        if (a.city || a.town || a.village) parts.push(a.city ?? a.town ?? a.village);
        if (a.suburb || a.quarter || a.neighbourhood) parts.push(a.suburb ?? a.quarter ?? a.neighbourhood);
        if (a.road || a.street) parts.push(a.road ?? a.street);
        if (a.house_number) parts.push(a.house_number);
        return parts.join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

export function BelisMapPickerModal({ value, onChange, onClose, title = "Yetkazish manzili" }: Props) {
    const [pending, setPending] = useState<BelisLatLng | null>(value);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState("");
    const [mapMode, setMapMode] = useState<MapMode>("street");
    const [mounted, setMounted] = useState(false);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<import("leaflet").Map | null>(null);
    const markerRef = useRef<import("leaflet").Marker | null>(null);
    const streetLayerRef = useRef<import("leaflet").TileLayer | null>(null);
    const satLayerRef = useRef<import("leaflet").TileLayer | null>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted || !mapContainerRef.current || mapRef.current) return;

        injectLeafletCss();
        let destroyed = false;

        const startLat = value?.lat ?? DEFAULT_LAT;
        const startLng = value?.lng ?? DEFAULT_LNG;

        import("leaflet").then((L) => {
            if (destroyed || !mapContainerRef.current) return;

            const map = L.map(mapContainerRef.current, {
                center: [startLat, startLng],
                zoom: value ? 16 : 12,
                zoomControl: true,
            });
            map.attributionControl.setPrefix(false);

            const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 19,
            });
            const sat = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                { attribution: "© Esri", maxZoom: 19 },
            );

            street.addTo(map);
            streetLayerRef.current = street;
            satLayerRef.current = sat;

            // BELIS oltin marker
            const pinIcon = L.divIcon({
                className: "",
                html: `<div style="width:26px;height:26px;background:#D4AF37;border:3px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(212,175,55,0.55),0 2px 4px rgba(0,0,0,0.35);"></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
            });

            const marker = L.marker([startLat, startLng], { draggable: true, icon: pinIcon }).addTo(map);

            marker.on("dragend", async () => {
                const { lat, lng } = marker.getLatLng();
                const addr = await reverseGeocode(lat, lng);
                setPending({ lat, lng, address: addr });
            });

            map.on("click", async (e: import("leaflet").LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                setPending({ lat: e.latlng.lat, lng: e.latlng.lng, address: addr });
            });

            mapRef.current = map;
            markerRef.current = marker;
            if (value) setPending(value);
        });

        return () => {
            destroyed = true;
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
            streetLayerRef.current = null;
            satLayerRef.current = null;
        };
    }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const m = mapRef.current;
        const s = streetLayerRef.current;
        const sat = satLayerRef.current;
        if (!m || !s || !sat) return;
        if (mapMode === "satellite") {
            if (m.hasLayer(s)) m.removeLayer(s);
            if (!m.hasLayer(sat)) sat.addTo(m);
        } else {
            if (m.hasLayer(sat)) m.removeLayer(sat);
            if (!m.hasLayer(s)) s.addTo(m);
        }
    }, [mapMode]);

    async function detectGeo() {
        if (!navigator.geolocation) {
            setGeoError("Brauzer joylashuvni qo'llab-quvvatlamaydi");
            return;
        }
        setGeoLoading(true); setGeoError("");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                const addr = await reverseGeocode(lat, lng);
                setPending({ lat, lng, address: addr });
                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([lat, lng], 17);
                    markerRef.current.setLatLng([lat, lng]);
                }
                setGeoLoading(false);
            },
            (err) => {
                setGeoLoading(false);
                setGeoError(err.code === 1 ? "Joylashuvga ruxsat berilmadi" : "Joylashuvni aniqlab bo'lmadi");
            },
            { timeout: 10000, enableHighAccuracy: true },
        );
    }

    function confirm() {
        if (pending) onChange(pending);
    }

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4"
                style={{ background: "rgba(58,53,32,0.65)", backdropFilter: "blur(6px)" }}
                onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    className="w-full sm:max-w-[560px] max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5"
                        style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                <MapPin className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-[15px] font-black" style={{ color: BELIS.text }}>{title}</h3>
                                <p className="text-[11.5px]" style={{ color: BELIS.text3 }}>
                                    Xaritada belgini surib qo&apos;ying yoki bosing
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setMapMode(m => m === "street" ? "satellite" : "street")}
                                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-bold"
                                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text2 }}
                            >
                                <Layers className="w-3 h-3" />
                                {mapMode === "street" ? "Sun'iy yo'ldosh" : "Ko'cha"}
                            </button>
                            <button type="button" onClick={onClose}
                                className="w-8 h-8 grid place-items-center rounded-full hover:brightness-95"
                                style={{ background: BELIS.bg, color: BELIS.text3 }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="relative flex-1" style={{ height: 380, minHeight: 300, background: BELIS.surfaceUp }}>
                        <div ref={mapContainerRef} className="absolute inset-0" />
                    </div>

                    {/* Bottom */}
                    <div className="px-4 py-3 space-y-3" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                        <button type="button" onClick={detectGeo} disabled={geoLoading}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold disabled:opacity-60"
                            style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text2 }}>
                            <Locate className={`w-4 h-4 ${geoLoading ? "animate-spin" : ""}`} style={{ color: BELIS.goldDeep }} />
                            {geoLoading ? "Aniqlanmoqda…" : "Joriy joyimni topish"}
                        </button>

                        {geoError && (
                            <p className="text-[12px]" style={{ color: BELIS.err }}>{geoError}</p>
                        )}

                        {pending && (
                            <div className="rounded-xl p-3" style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}>
                                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BELIS.text3 }}>
                                    Tanlangan
                                </p>
                                <p className="text-[13.5px] font-bold" style={{ color: BELIS.text }}>
                                    {pending.address}
                                </p>
                                <p className="text-[11px] mt-1 font-mono" style={{ color: BELIS.text3 }}>
                                    {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 h-11 rounded-xl text-[13px] font-bold"
                                style={{ background: BELIS.bg, color: BELIS.text2, border: `1px solid ${BELIS.border}` }}>
                                Bekor
                            </button>
                            <button type="button" onClick={confirm} disabled={!pending}
                                className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-40"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                <Check className="w-4 h-4" /> Tasdiqlash
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body,
    );
}
