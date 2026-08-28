"use client";

// Nexus joylashuv tanlash — HAR DOIM kartada tanlanadi (foydalanuvchi qoidasi).
// Text input yo'q. Ochilganda: qidiruv + AI taklif + xarita + reverse geocode.

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Loader2, X, Sparkles, LocateFixed, Check } from "lucide-react";

export interface NxGeoValue {
    name: string;
    lat: number;
    lng: number;
}

interface Props {
    value: NxGeoValue | null;
    onChange: (v: NxGeoValue | null) => void;
    disabled?: boolean;
}

const DEFAULT_LAT = 41.2995; // Toshkent markazi
const DEFAULT_LNG = 69.2401;

// Leaflet CSS bir marta yuklash
let leafletCssLoaded = false;
function ensureLeafletCss() {
    if (leafletCssLoaded || typeof document === "undefined") return;
    leafletCssLoaded = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
}

interface GeoResult { name: string; lat: number; lng: number; city?: string; country?: string }

export function NxLocationPicker({ value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                style={value
                    ? { background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }
                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(160,180,230,0.85)" }}>
                <MapPin className="w-3.5 h-3.5" />
                {value ? <span className="truncate max-w-[180px]">{value.name}</span> : "Joylashuv"}
                {value && (
                    <span onClick={e => { e.stopPropagation(); onChange(null); }}
                        className="ml-0.5 -mr-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10">
                        <X className="w-2.5 h-2.5" />
                    </span>
                )}
            </button>
            {open && <MapModal value={value} onChange={onChange} onClose={() => setOpen(false)} />}
        </>
    );
}

function MapModal({ value, onChange, onClose }: {
    value: NxGeoValue | null;
    onChange: (v: NxGeoValue | null) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GeoResult[]>([]);
    const [aiCandidates, setAiCandidates] = useState<string[]>([]);
    const [searching, setSearching] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [gpsBusy, setGpsBusy] = useState(false);
    const [pending, setPending] = useState<NxGeoValue | null>(value);
    const [reverseBusy, setReverseBusy] = useState(false);

    const mapDivRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerRef = useRef<any>(null);

    // Xaritani ochish (dinamik leaflet import)
    useEffect(() => {
        let cancelled = false;
        ensureLeafletCss();
        (async () => {
            const L = await import("leaflet");
            if (cancelled || !mapDivRef.current) return;
            const startLat = pending?.lat ?? DEFAULT_LAT;
            const startLng = pending?.lng ?? DEFAULT_LNG;
            const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false })
                .setView([startLat, startLng], pending ? 15 : 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

            // Marker
            const icon = L.divIcon({
                className: "",
                html: `<div style="width:26px;height:26px;border-radius:50%;background:#00CEC8;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,206,200,0.6);"></div>`,
                iconSize: [26, 26], iconAnchor: [13, 13],
            });
            const marker = L.marker([startLat, startLng], { icon, draggable: true }).addTo(map);
            markerRef.current = marker;

            marker.on("dragend", () => {
                const p = marker.getLatLng();
                setPending(pv => ({ name: pv?.name ?? "", lat: p.lat, lng: p.lng }));
                reverseGeocode(p.lat, p.lng);
            });
            map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
                marker.setLatLng([e.latlng.lat, e.latlng.lng]);
                setPending({ name: "", lat: e.latlng.lat, lng: e.latlng.lng });
                reverseGeocode(e.latlng.lat, e.latlng.lng);
            });
            mapRef.current = map;
        })();
        return () => {
            cancelled = true;
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function reverseGeocode(lat: number, lng: number) {
        setReverseBusy(true);
        try {
            const d = await fetch(`/api/nexus/geo/search?lat=${lat}&lng=${lng}`).then(r => r.json());
            if (d?.result?.name) setPending({ name: d.result.name, lat, lng });
        } finally { setReverseBusy(false); }
    }

    // Debounced qidiruv (Nominatim)
    useEffect(() => {
        const q = query.trim();
        if (!q || q.length < 2) { setResults([]); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const d = await fetch(`/api/nexus/geo/search?q=${encodeURIComponent(q)}`).then(r => r.json());
                setResults(d.results ?? []);
            } finally { setSearching(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    async function askAi() {
        const q = query.trim();
        if (!q || aiBusy) return;
        setAiBusy(true);
        try {
            const d = await fetch("/api/nexus/geo/ai", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hint: q }),
            }).then(r => r.json());
            setAiCandidates(d.candidates ?? []);
            // Har candidate ni Nominatim'ga o'tkazib natijalarni birlashtiramiz
            if (Array.isArray(d.candidates) && d.candidates.length) {
                const all: GeoResult[] = [];
                for (const c of d.candidates) {
                    const r = await fetch(`/api/nexus/geo/search?q=${encodeURIComponent(c)}`).then(x => x.json());
                    if (r.results?.[0]) all.push(r.results[0]);
                }
                if (all.length) setResults(prev => dedup([...all, ...prev]));
            }
        } finally { setAiBusy(false); }
    }

    function dedup(arr: GeoResult[]): GeoResult[] {
        const seen = new Set<string>();
        return arr.filter(r => {
            const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
            if (seen.has(k)) return false;
            seen.add(k); return true;
        }).slice(0, 8);
    }

    function selectResult(r: GeoResult) {
        setPending({ name: r.name, lat: r.lat, lng: r.lng });
        if (mapRef.current && markerRef.current) {
            mapRef.current.setView([r.lat, r.lng], 15);
            markerRef.current.setLatLng([r.lat, r.lng]);
        }
    }

    async function useGps() {
        if (!navigator.geolocation || gpsBusy) return;
        setGpsBusy(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([latitude, longitude], 16);
                    markerRef.current.setLatLng([latitude, longitude]);
                }
                setPending({ name: "", lat: latitude, lng: longitude });
                reverseGeocode(latitude, longitude);
                setGpsBusy(false);
            },
            () => setGpsBusy(false),
            { enableHighAccuracy: true, timeout: 8000 },
        );
    }

    function confirm() {
        if (pending && pending.lat && pending.lng) {
            onChange({
                name: pending.name || `${pending.lat.toFixed(4)}, ${pending.lng.toFixed(4)}`,
                lat: pending.lat, lng: pending.lng,
            });
        }
        onClose();
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[92vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "94vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Joylashuvni tanlang
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Qidiruv + AI */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0 space-y-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(0,206,200,0.55)" }} />
                            <input value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Chorsu bozori, Amir Temur ko'chasi..."
                                className="w-full h-10 rounded-xl pl-9 pr-9 text-sm text-white outline-none"
                                style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.25)", caretColor: "#00CEC8" }} />
                            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: "#00CEC8" }} />}
                        </div>
                        <button onClick={askAi} disabled={!query.trim() || aiBusy} title="AI orqali topish"
                            className="h-10 px-3 flex items-center gap-1 rounded-xl text-[11px] font-black transition active:scale-95 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.18),rgba(0,206,200,0.18))",
                                border: "1px solid rgba(139,92,246,0.35)", color: "#C4B5FD" }}>
                            {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            AI
                        </button>
                        <button onClick={useGps} disabled={gpsBusy} title="Joyimni aniqlash (GPS)"
                            className="h-10 w-10 flex items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-50"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                            {gpsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#2B3EE8" }} /> : <LocateFixed className="w-3.5 h-3.5" style={{ color: "#2B3EE8" }} />}
                        </button>
                    </div>
                    {aiCandidates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[10px]" style={{ color: "rgba(196,181,253,0.85)" }}>
                            <span className="font-black opacity-70">AI takliflari:</span>
                            {aiCandidates.map((c, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.10)" }}>{c}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Natijalar ro'yxati */}
                {results.length > 0 && (
                    <div className="max-h-40 overflow-y-auto px-3 pb-2 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
                        <div className="flex flex-col gap-1">
                            {results.map((r, i) => (
                                <button key={i} onClick={() => selectResult(r)}
                                    className="w-full flex items-start gap-2 p-2 rounded-lg text-left transition active:scale-[0.99]"
                                    style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{r.name}</p>
                                        {(r.city || r.country) && (
                                            <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                {[r.city, r.country].filter(Boolean).join(", ")}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Xarita */}
                <div className="flex-1 relative min-h-[280px]" style={{ background: "#0b1428" }}>
                    <div ref={mapDivRef} className="absolute inset-0" style={{ background: "#0b1428" }} />
                    <div className="absolute top-2 left-2 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(6px)", color: "#fff" }}>
                            Bosib yoki markerni sudrab tanlang
                        </div>
                    </div>
                </div>

                {/* Tasdiqlash */}
                <div className="px-4 py-3 flex-shrink-0 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    {pending && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)" }}>
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">
                                    {reverseBusy ? "Nom aniqlanmoqda..." : (pending.name || `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`)}
                                </p>
                                <p className="text-[9px] font-mono" style={{ color: "rgba(140,160,210,0.70)" }}>
                                    {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
                                </p>
                            </div>
                        </div>
                    )}
                    <button onClick={confirm} disabled={!pending}
                        className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Check className="w-4 h-4" /> Tasdiqlash
                    </button>
                </div>
            </div>
        </>
    );
}
