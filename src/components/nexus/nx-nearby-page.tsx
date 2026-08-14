"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, ShieldAlert, Compass, RefreshCw, Power } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Person {
    profileId: string;
    username: string | null;
    name: string | null;
    image: string | null;
    distanceKm: number;
    distanceLabel: string;
    verified: boolean;
    lastSeenAt: string | null;
}

type Stage = "loading" | "prompt" | "denied" | "ready" | "loading-people" | "list";

export function NxNearbyPage() {
    const [stage, setStage] = useState<Stage>("loading");
    const [enabled, setEnabled] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [radius, setRadius] = useState(5);
    const [people, setPeople] = useState<Person[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function loadStatus() {
        try {
            // Kim men'ning nearby holatimni bilishimiz uchun disable endpoint'iga oldindan chaqirmaslik uchun
            // birinchi GET /api/nexus/nearby chaqiramiz koordinatalar bilan (agar bor bo'lsa).
            // Sodda yondashuv: geolokatsiya so'raymiz; agar allaqachon enable qilingan bo'lsa qayta yangilash yaxshi.
            setStage("prompt");
        } catch { setStage("prompt"); }
    }
    useEffect(() => { loadStatus(); }, []);

    async function enable() {
        setError(null);
        if (!navigator.geolocation) { setError("Geolokatsiya qo'llab-quvvatlanmaydi"); setStage("denied"); return; }
        setStage("loading");
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                setCoords({ lat, lng });
                const r = await fetch("/api/nexus/nearby/enable", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat, lng }),
                });
                if (!r.ok) {
                    const d = await r.json().catch(() => ({}));
                    setError(d?.error || "Yoqib bo'lmadi"); setStage("prompt"); return;
                }
                setEnabled(true);
                setStage("ready");
                fetchPeople(lat, lng, radius);
            },
            err => {
                setError(err.message || "Ruxsat berilmadi");
                setStage("denied");
            },
            { timeout: 15000, maximumAge: 60_000 },
        );
    }

    async function disable() {
        setStage("loading");
        try {
            await fetch("/api/nexus/nearby/disable", { method: "POST" });
        } finally {
            setEnabled(false);
            setCoords(null);
            setPeople([]);
            setStage("prompt");
        }
    }

    async function fetchPeople(lat: number, lng: number, r: number) {
        setStage("loading-people");
        try {
            const res = await fetch(`/api/nexus/nearby?lat=${lat}&lng=${lng}&radius=${r}&limit=100`);
            const d = await res.json();
            if (!res.ok) { setError(d?.error || "Xato"); setStage("ready"); return; }
            setPeople(d.people || []);
            setStage("list");
        } catch { setError("Tarmoq xatosi"); setStage("ready"); }
    }

    function refresh() {
        if (coords) fetchPeople(coords.lat, coords.lng, radius);
    }

    function relTime(iso: string | null): string {
        if (!iso) return "";
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return "hozir onlayn";
        if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
        if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
        return `${Math.floor(s / 86400)} kun oldin`;
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-black">Yaqin atrofdagi</h1>
                    <p className="text-xs opacity-70">Sizga yaqin joydagi ForHumo foydalanuvchilari.</p>
                </div>
                {enabled && (
                    <button onClick={disable} className="h-9 px-3 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center gap-1.5">
                        <Power className="w-3.5 h-3.5" /> O'chirish
                    </button>
                )}
            </div>

            {(stage === "prompt" || stage === "denied") && !enabled && (
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-6 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/15 text-teal-500 flex items-center justify-center mb-3">
                        <MapPin className="w-7 h-7" />
                    </div>
                    <div className="font-black mb-2">Geolokatsiyani ulashing</div>
                    <p className="text-xs opacity-70 mb-2 leading-relaxed">
                        Yaqin atrofdagi foydalanuvchilarni ko'rish uchun joyingizni ulashing.
                        Sizning aniq koordinatalaringiz boshqalarga ko'rinmaydi — faqat masofa.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-500 text-xs font-bold flex items-start gap-2 mb-4">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Ixtiyoriy. Istalgan vaqt "O'chirish" bilan koordinatalarni server'dan olib tashlash mumkin.</span>
                    </div>
                    {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
                    <button onClick={enable} className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2">
                        <MapPin className="w-4 h-4" /> Joyimni ulashish
                    </button>
                </div>
            )}

            {stage === "loading" && (
                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" /></div>
            )}

            {(stage === "ready" || stage === "loading-people" || stage === "list") && (
                <>
                    <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3 mb-4 flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        <div className="flex-1 text-xs">
                            <label className="opacity-70">Radius: <strong className="text-teal-500">{radius} km</strong></label>
                            <input type="range" min="1" max="50" step="1" value={radius}
                                onChange={e => setRadius(Number(e.target.value))}
                                onMouseUp={refresh} onTouchEnd={refresh}
                                className="w-full mt-1 accent-teal-500" />
                        </div>
                        <button onClick={refresh} className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-500 flex items-center justify-center"
                            title="Yangilash">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {stage === "loading-people" && (
                        <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto opacity-60" /></div>
                    )}

                    {stage === "list" && people.length === 0 && (
                        <div className="text-center py-10 opacity-60 text-xs">
                            Yaqin atrofda hech kim topilmadi. Radiusni oshirib ko'ring.
                        </div>
                    )}

                    <div className="space-y-1">
                        {people.map(p => (
                            <Link key={p.profileId} href={p.username ? `/nexus/u/${p.username}` : "/nexus"}
                                className="w-full p-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                                {p.image
                                    ? <img src={p.image} alt="" className="w-11 h-11 rounded-full object-cover" />
                                    : <div className="w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">{(p.name || p.username || "?").charAt(0).toUpperCase()}</div>}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate flex items-center gap-1">
                                        {p.name || p.username || "?"}
                                        {p.verified && <span className="text-blue-500">✓</span>}
                                    </div>
                                    <div className="text-xs opacity-60 truncate">
                                        {p.username && <>@{p.username} · </>}
                                        <span className="text-teal-500 font-bold">{p.distanceLabel}</span>
                                        {p.lastSeenAt && <> · {relTime(p.lastSeenAt)}</>}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
