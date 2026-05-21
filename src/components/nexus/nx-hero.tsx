"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Play, Star, Eye, ChevronLeft, ChevronRight,
    Flame, Radio, Music2, BookOpen,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Featured kontentlar
// ─────────────────────────────────────────────────────────────────────────────
const FEATURED = [
    {
        id: 1,
        type: "KINO",
        typeIcon: Play,
        typeColor: "#a78bfa",
        badge: "TREND",
        title: "Abadiyat Soyasida",
        desc: "Ikki dunyoning tutashgan nuqtasida sevgi va qurbon bo'lish haqida epik drama.",
        image: "https://picsum.photos/seed/hero1/1200/600",
        rating: "4.9",
        views: "2.4M",
        year: "2024",
        duration: "2s 18d",
        action: "Tomosha qilish",
    },
    {
        id: 2,
        type: "JONLI",
        typeIcon: Radio,
        typeColor: "#f87171",
        badge: "LIVE",
        title: "Nexus Global Launch Event",
        desc: "Platformaning rasmiy taqdimot efiri — yangi imkoniyatlar, kreatorlar va surprizlar.",
        image: "https://picsum.photos/seed/hero2/1200/600",
        rating: "5.0",
        views: "18.5K",
        year: "",
        duration: "",
        action: "Efirga kirish",
    },
    {
        id: 3,
        type: "MUSIQA",
        typeIcon: Music2,
        typeColor: "#34d399",
        badge: "YANGI",
        title: "Bahor Ohanglari — To'plam",
        desc: "20 ta o'zbek ijodkordan bitta mavsumiy albom. Lossless sifatda tinglang.",
        image: "https://picsum.photos/seed/hero3/1200/600",
        rating: "4.8",
        views: "950K",
        year: "2026",
        duration: "1s 12d",
        action: "Tinglash",
    },
    {
        id: 4,
        type: "KITOB",
        typeIcon: BookOpen,
        typeColor: "#fbbf24",
        badge: "TOP",
        title: "Raqamli Ozodlik",
        desc: "Texnologiya, erkinlik va shaxsiy ma'lumotlar haqida dolzarb rivojlanish kitobi.",
        image: "https://picsum.photos/seed/hero4/1200/600",
        rating: "4.7",
        views: "340K",
        year: "2025",
        duration: "6 soat",
        action: "O'qish",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxHero — auto-rotating slider
// ─────────────────────────────────────────────────────────────────────────────
export function NxHero() {
    const [current, setCurrent] = useState(0);
    const [paused,  setPaused]  = useState(false);

    const next = useCallback(() =>
        setCurrent(c => (c + 1) % FEATURED.length), []);
    const prev = useCallback(() =>
        setCurrent(c => (c - 1 + FEATURED.length) % FEATURED.length), []);

    // Auto-rotate every 5s
    useEffect(() => {
        if (paused) return;
        const id = setInterval(next, 5000);
        return () => clearInterval(id);
    }, [paused, next]);

    const item = FEATURED[current];
    const TypeIcon = item.typeIcon;

    return (
        <div
            className="mx-4 mt-3 mb-1 relative overflow-hidden cursor-pointer"
            style={{ borderRadius: "1.5rem", height: "clamp(200px, 42vw, 380px)" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* ── Rasm ──────────────────────────────────────────────── */}
            {FEATURED.map((f, i) => (
                <img
                    key={f.id}
                    src={f.image}
                    alt={f.title}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                    style={{ opacity: i === current ? 1 : 0 }}
                    draggable={false}
                />
            ))}

            {/* ── Gradient overlay ──────────────────────────────────── */}
            <div
                className="absolute inset-0"
                style={{
                    background: [
                        "linear-gradient(to top, rgba(5,8,24,0.96) 0%, rgba(5,8,24,0.55) 45%, rgba(5,8,24,0.10) 100%)",
                        "linear-gradient(to right, rgba(5,8,24,0.50) 0%, transparent 60%)",
                    ].join(","),
                }}
            />

            {/* ── Badge (yuqori chap) ────────────────────────────────── */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
                {/* Kontent turi */}
                <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest"
                    style={{
                        background: "rgba(5,8,24,0.75)",
                        border: `1px solid ${item.typeColor}40`,
                        color: item.typeColor,
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <TypeIcon className="w-3 h-3" />
                    {item.type}
                </span>

                {/* Trend/Live/Yangi badge */}
                {item.badge === "LIVE" ? (
                    <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black"
                        style={{ background: "linear-gradient(90deg,#EF4444,#F97316)", boxShadow: "0 0 12px rgba(239,68,68,0.50)" }}
                    >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                    </span>
                ) : (
                    <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            boxShadow: "0 0 12px rgba(43,62,232,0.40)",
                        }}
                    >
                        {item.badge}
                    </span>
                )}
            </div>

            {/* ── Nav tugmalar ──────────────────────────────────────── */}
            <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)", border: "1px solid rgba(43,62,232,0.30)" }}
            >
                <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)", border: "1px solid rgba(43,62,232,0.30)" }}
            >
                <ChevronRight className="w-4 h-4 text-white" />
            </button>

            {/* ── Pastki kontent ────────────────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">

                {/* Sarlavha */}
                <h2 className="font-black text-xl md:text-3xl leading-tight mb-1.5 text-white"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.80)" }}>
                    {item.title}
                </h2>

                {/* Tavsif */}
                <p className="text-xs md:text-sm leading-relaxed mb-3 line-clamp-2 md:line-clamp-1 max-w-lg"
                    style={{ color: "rgba(180,195,230,0.80)" }}>
                    {item.desc}
                </p>

                {/* Stats + Tugma */}
                <div className="flex items-center gap-3 flex-wrap">

                    {/* Play / Action tugmasi */}
                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-150 active:scale-95"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            boxShadow: "0 4px 20px rgba(43,62,232,0.50)",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(43,62,232,0.70)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(43,62,232,0.50)"}
                    >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        {item.action}
                    </button>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[11px] font-semibold"
                        style={{ color: "rgba(160,180,220,0.80)" }}>
                        {item.rating && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {item.rating}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {item.views}
                        </span>
                        {item.duration && (
                            <span className="hidden sm:flex items-center gap-1">
                                <Flame className="w-3 h-3" style={{ color: "#f97316" }} />
                                {item.duration}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Indicator nuqtalar ────────────────────────────────── */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                {FEATURED.map((_, i) => (
                    <button
                        key={i}
                        onClick={e => { e.stopPropagation(); setCurrent(i); }}
                        className="transition-all duration-300 rounded-full"
                        style={{
                            width:  i === current ? "20px" : "6px",
                            height: "6px",
                            background: i === current
                                ? "linear-gradient(90deg,#2B3EE8,#00CEC8)"
                                : "rgba(255,255,255,0.25)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
