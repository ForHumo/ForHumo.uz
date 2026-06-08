"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface Props {
    value: string;
    onChange: (val: string) => void;
    accent?: "blue" | "green";   // green = Humo Market
}

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

type MapMode = "street" | "satellite";

// ── Leaflet CSS loader (once per page) ───────────────────────────────────────
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

export function LocationPicker({ value, onChange, accent = "blue" }: Props) {
    const confirmBtn = accent === "green" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500";
    const mapOnly = accent === "green";                       // Market: faqat xarita, qo'lda yozish yo'q
    const markerColor = accent === "green" ? "16,185,129" : "59,130,246";
    const ringAccent = accent === "green" ? "focus:ring-green-500/40 focus:border-green-500/60" : "focus:ring-blue-500/40 focus:border-blue-500/60";
    const iconAccent = accent === "green" ? "text-green-500" : "text-blue-400";
    const spinAccent = accent === "green" ? "border-green-500" : "border-blue-500";
    const t = useTranslations("Onboarding");
    const tCommon = useTranslations("Common");

    const [mapOpen, setMapOpen] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState("");
    const [pendingAddress, setPendingAddress] = useState("");
    const [mapMode, setMapMode] = useState<MapMode>("street");

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<import("leaflet").Map | null>(null);
    const markerRef = useRef<import("leaflet").Marker | null>(null);
    const streetLayerRef = useRef<import("leaflet").TileLayer | null>(null);
    const satLayerRef = useRef<import("leaflet").TileLayer | null>(null);

    // ── Reverse geocode ───────────────────────────────────────────────────────
    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`,
                { headers: { "User-Agent": "ForHumo.uz/1.0" } }
            );
            const data = await res.json();
            const a = data.address ?? {};
            const parts: string[] = [];
            if (a.country) parts.push(a.country);
            if (a.state || a.region) parts.push(a.state ?? a.region);
            if (a.city || a.town || a.village) parts.push(a.city ?? a.town ?? a.village);
            if (a.suburb || a.quarter) parts.push(a.suburb ?? a.quarter);
            if (a.road || a.street) parts.push(a.road ?? a.street);
            if (a.house_number) parts.push(a.house_number);
            return parts.join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        } catch {
            return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    }, []);

    // ── Build Leaflet map when modal opens ────────────────────────────────────
    useEffect(() => {
        if (!mapOpen || !mapContainerRef.current) return;
        if (mapRef.current) return;

        injectLeafletCss();
        let destroyed = false;

        import("leaflet").then((L) => {
            if (destroyed || !mapContainerRef.current) return;

            // Fix icon paths for Next.js bundling
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const map = L.map(mapContainerRef.current, {
                center: [DEFAULT_LAT, DEFAULT_LNG],
                zoom: 13,
                zoomControl: true,
                attributionControl: true,
            });
            map.attributionControl.setPrefix(false);

            const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 19,
            });
            const sat = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                { attribution: "© Esri", maxZoom: 19 }
            );

            street.addTo(map);
            streetLayerRef.current = street;
            satLayerRef.current = sat;

            const pinIcon = L.divIcon({
                className: "",
                html: `<div style="width:22px;height:22px;background:rgb(${markerColor});border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });

            const marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { draggable: true, icon: pinIcon }).addTo(map);

            marker.on("dragend", async () => {
                const { lat, lng } = marker.getLatLng();
                const addr = await reverseGeocode(lat, lng);
                setPendingAddress(addr);
            });

            map.on("click", async (e: import("leaflet").LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                setPendingAddress(addr);
            });

            mapRef.current = map;
            markerRef.current = marker;
            if (value) setPendingAddress(value);
        });

        return () => {
            destroyed = true;
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
            streetLayerRef.current = null;
            satLayerRef.current = null;
        };
    }, [mapOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Switch tile layers ────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        const street = streetLayerRef.current;
        const sat = satLayerRef.current;
        if (!map || !street || !sat) return;
        if (mapMode === "satellite") {
            if (map.hasLayer(street)) map.removeLayer(street);
            if (!map.hasLayer(sat)) sat.addTo(map);
        } else {
            if (map.hasLayer(sat)) map.removeLayer(sat);
            if (!map.hasLayer(street)) street.addTo(map);
        }
    }, [mapMode]);

    // ── Geolocation (triggered from inside the modal) ─────────────────────────
    async function detectGeo() {
        if (!navigator.geolocation) {
            setGeoError(t("location_geo_unsupported"));
            return;
        }
        setGeoLoading(true);
        setGeoError("");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                const addr = await reverseGeocode(lat, lon);
                setPendingAddress(addr);
                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([lat, lon], 16);
                    markerRef.current.setLatLng([lat, lon]);
                }
                setGeoLoading(false);
            },
            (err) => {
                setGeoLoading(false);
                setGeoError(err.code === 1 ? t("location_geo_denied") : t("location_geo_failed"));
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    function openMap() {
        setPendingAddress(value);
        setGeoError("");
        setMapOpen(true);
    }

    function confirmLocation() {
        if (pendingAddress.trim()) onChange(pendingAddress.trim());
        setMapOpen(false);
    }

    return (
        <div className="space-y-2">
            {mapOnly ? (
                /* Market: manzil faqat xaritadan tanlanadi (qo'lda yozish yo'q) */
                <button
                    type="button"
                    onClick={openMap}
                    className="w-full flex items-start gap-2 text-left rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-green-400 dark:hover:border-green-500/50 bg-gray-50 dark:bg-white/[0.05] px-4 py-3 transition-all"
                >
                    <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className={`text-sm ${value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/30"}`}>
                        {value || "Manzilni xaritadan tanlang"}
                    </span>
                </button>
            ) : (
                <>
                    {/* Text input (onboarding) */}
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={t("location_full_ph")}
                        rows={3}
                        className={`w-full bg-background/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${ringAccent} transition-all resize-none`}
                    />
                    <button
                        type="button"
                        onClick={openMap}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border/60 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 13l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
                        </svg>
                        {t("location_select")}
                    </button>
                </>
            )}

            {/* ── MAP MODAL ── */}
            <AnimatePresence>
                {mapOpen && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.22 }}
                            className="w-full sm:max-w-lg bg-card border border-border/60 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            style={{ maxHeight: "90vh" }}
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0 gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-foreground truncate">{t("location_pick_title")}</h3>
                                    <p className="text-xs text-muted-foreground">{t("location_pick_hint")}</p>
                                </div>

                                {/* Street / Satellite toggle */}
                                <div className="flex items-center bg-muted/60 rounded-lg p-0.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setMapMode("street")}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                                            mapMode === "street"
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {t("location_street")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMapMode("satellite")}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                                            mapMode === "satellite"
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {t("location_satellite")}
                                    </button>
                                </div>
                            </div>

                            {/* Leaflet map */}
                            <div ref={mapContainerRef} className="flex-1 min-h-[280px]" style={{ height: 300 }} />

                            {/* Bottom panel */}
                            <div className="px-4 py-3 border-t border-border/60 space-y-3 shrink-0">
                                {/* Geo detect button */}
                                <button
                                    type="button"
                                    onClick={detectGeo}
                                    disabled={geoLoading}
                                    className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-border/60 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-60"
                                >
                                    {geoLoading ? (
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${spinAccent} border-t-transparent animate-spin`} />
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                    {geoLoading ? t("location_detecting") : t("location_auto")}
                                </button>

                                {geoError && <p className="text-xs text-red-500">{geoError}</p>}

                                {/* Tanlangan manzil */}
                                <div className="flex items-start gap-2">
                                    <svg className={`w-4 h-4 ${iconAccent} shrink-0 mt-2.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {mapOnly ? (
                                        <div className="flex-1 bg-muted/40 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground min-h-[2.5rem] flex items-center">
                                            {pendingAddress || <span className="text-muted-foreground/70">Xaritani bosib manzilni tanlang</span>}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={pendingAddress}
                                            onChange={(e) => setPendingAddress(e.target.value)}
                                            placeholder={t("location_address_ph")}
                                            rows={2}
                                            className={`flex-1 bg-muted/40 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 ${ringAccent} resize-none transition-all`}
                                        />
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMapOpen(false)}
                                        className="flex-1 h-10 rounded-xl border border-border/60 hover:bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        {tCommon("cancel")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmLocation}
                                        className={`flex-1 h-10 rounded-xl ${confirmBtn} active:scale-[.98] text-white text-sm font-semibold transition-all`}
                                    >
                                        {tCommon("confirm")}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
