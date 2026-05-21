"use client";

import { useState, useEffect, useRef } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { Search, X, TrendingUp, Clock, Play, Music, BookOpen, Radio, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const TRENDING = [
    "Humo Nexus Launch",
    "O'zbek kino 2026",
    "Madina Ergash yangi qo'shiq",
    "React 19 darslar",
    "Jonli efir turnir",
    "Lossless musiqa",
];

const RECENT = ["Nexus arxitektura", "Bahor ohangi", "Toshkent kino"];

interface Result {
    type: "video" | "music" | "book" | "live";
    title: string;
    sub: string;
    image: string;
    meta: string;
}

const ALL_RESULTS: Result[] = [
    { type: "video", title: "Nexus Arxitekturasi: Zamonaviy Super-App",   sub: "Nexus Dev",    image: "vid20",  meta: "85K ko'rish"   },
    { type: "video", title: "O'zbekiston 2026 — Texnologiya bo'yicha",    sub: "Tech UZ",      image: "vid21",  meta: "170K ko'rish"  },
    { type: "music", title: "Bahor Ohangi",                               sub: "Madina",       image: "music50",meta: "450K tinglash" },
    { type: "music", title: "Tun Yulduzi",                                sub: "Sardor",       image: "music51",meta: "900K tinglash" },
    { type: "live",  title: "Nexus Launch Event 2026",                    sub: "Humo Official",image: "live10", meta: "18.5K tomoshabin"},
    { type: "book",  title: "Raqamli Ozodlik",                            sub: "A. Karimov",   image: "book60", meta: "4.8 reyting"   },
    { type: "video", title: "React 19 yangiliklari va amaliy misollar",   sub: "Sardor",       image: "vid22",  meta: "255K ko'rish"  },
    { type: "music", title: "Sevgi Qo'shig'i",                            sub: "Kamola",       image: "music52",meta: "1.35M tinglash"},
    { type: "book",  title: "AI va Biznes Kelajagi",                      sub: "M. Toshmatov", image: "book61", meta: "4.9 reyting"   },
    { type: "live",  title: "Pro Gaming Tournament Final",                sub: "eSport UZ",    image: "live11", meta: "9.2K tomoshabin"},
    { type: "video", title: "Musiqa yaratish: bepul vositalar",           sub: "Madina",       image: "vid23",  meta: "340K ko'rish"  },
    { type: "book",  title: "Kreator Iqtisodiyoti",                       sub: "S. Ergashev",  image: "book62", meta: "4.7 reyting"   },
];

const TYPE_ICONS = {
    video: Play,
    music: Music,
    book:  BookOpen,
    live:  Radio,
} as const;

const TYPE_COLORS = {
    video: "rgba(43,62,232,0.70)",
    music: "rgba(16,185,129,0.70)",
    book:  "rgba(245,158,11,0.70)",
    live:  "rgba(239,68,68,0.70)",
} as const;

const FILTERS = ["Barchasi", "Video", "Musiqa", "Jonli", "Kitob"] as const;
type Filter = typeof FILTERS[number];

// ─────────────────────────────────────────────────────────────────────────────
// NxSearch — to'liq ekran qidiruv overlay
// ─────────────────────────────────────────────────────────────────────────────
export function NxSearch() {
    const { searchOpen, setSearchOpen } = useNxPlayer();
    const [query,  setQuery]  = useState("");
    const [filter, setFilter] = useState<Filter>("Barchasi");
    const inputRef = useRef<HTMLInputElement>(null);

    /* Ochilganda fokus */
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery("");
            setFilter("Barchasi");
        }
    }, [searchOpen]);

    /* Klaviatura */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && searchOpen) setSearchOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [searchOpen, setSearchOpen]);

    /* Filtrlangan natijalar */
    const typeMap: Record<Filter, Result["type"] | null> = {
        "Barchasi": null,
        "Video":    "video",
        "Musiqa":   "music",
        "Jonli":    "live",
        "Kitob":    "book",
    };

    const results = ALL_RESULTS.filter(r => {
        const matchType = typeMap[filter] === null || r.type === typeMap[filter];
        const matchQ    = query.trim() === "" || r.title.toLowerCase().includes(query.toLowerCase()) || r.sub.toLowerCase().includes(query.toLowerCase());
        return matchType && matchQ;
    });

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 transition-opacity duration-300"
                style={{
                    background: "rgba(5,8,24,0.85)",
                    backdropFilter: "blur(12px)",
                    opacity: searchOpen ? 1 : 0,
                    pointerEvents: searchOpen ? "auto" : "none",
                }}
                onClick={() => setSearchOpen(false)}
            />

            {/* Panel */}
            <div
                className="fixed inset-x-0 top-0 z-50 flex flex-col transition-all duration-300"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    borderBottom: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 8px 48px rgba(0,0,0,0.60)",
                    maxHeight: searchOpen ? "80vh" : "0",
                    opacity: searchOpen ? 1 : 0,
                    pointerEvents: searchOpen ? "auto" : "none",
                    transform: searchOpen ? "translateY(0)" : "translateY(-8px)",
                }}
            >
                {/* ── Qidiruv input ──────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.12)" }}>
                    <Search className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Kontent, kreator, kanal..."
                        className="flex-1 bg-transparent text-white text-base outline-none"
                        style={{ caretColor: "#00CEC8" }}
                    />
                    {query && (
                        <button onClick={() => setQuery("")}>
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.60)" }} />
                        </button>
                    )}
                    <button
                        onClick={() => setSearchOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                        style={{ background: "rgba(43,62,232,0.12)", color: "rgba(160,176,224,0.80)" }}
                    >
                        Bekor
                    </button>
                </div>

                {/* ── Filtr chips ─────────────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150"
                            style={{
                                background: filter === f ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.10)",
                                color: filter === f ? "#fff" : "rgba(140,160,210,0.80)",
                                border: filter === f ? "none" : "1px solid rgba(43,62,232,0.16)",
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* ── Kontent ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {query.trim() === "" ? (
                        /* Trending + Oxirgi */
                        <div className="px-4 py-3">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2.5" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Trendda
                            </p>
                            {TRENDING.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(t)}
                                    className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl mb-0.5 text-left transition-all duration-150 hover:bg-blue-500/5"
                                >
                                    <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                                    <span className="text-sm text-white/80">{t}</span>
                                    <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "rgba(43,62,232,0.30)" }} />
                                </button>
                            ))}

                            <p className="text-[9px] font-black uppercase tracking-widest mt-4 mb-2.5" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Oxirgi qidiruvlar
                            </p>
                            {RECENT.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(t)}
                                    className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl mb-0.5 text-left transition-all duration-150 hover:bg-blue-500/5"
                                >
                                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(100,120,170,0.50)" }} />
                                    <span className="text-sm" style={{ color: "rgba(160,180,220,0.75)" }}>{t}</span>
                                    <X className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "rgba(100,120,170,0.40)" }} />
                                </button>
                            ))}
                        </div>
                    ) : results.length === 0 ? (
                        /* Bo'sh natija */
                        <div className="flex flex-col items-center justify-center py-16">
                            <Search className="w-12 h-12 mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                            <p className="text-sm font-bold text-white/40">Natija topilmadi</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(100,120,170,0.50)" }}>
                                &ldquo;{query}&rdquo; bo'yicha hech narsa yo'q
                            </p>
                        </div>
                    ) : (
                        /* Natijalar */
                        <div className="px-4 py-3">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>
                                {results.length} ta natija
                            </p>
                            {results.map((r, i) => {
                                const Icon = TYPE_ICONS[r.type];
                                return (
                                    <button
                                        key={i}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-xl mb-1 text-left transition-all duration-150 hover:bg-blue-500/5 group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-14 h-9 rounded-lg overflow-hidden flex-shrink-0"
                                            style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                            <img
                                                src={`https://picsum.photos/seed/${r.image}/200/112`}
                                                alt={r.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                style={{ background: "rgba(5,8,24,0.55)" }}>
                                                <Icon className="w-3.5 h-3.5" style={{ color: "#fff" }} />
                                            </div>
                                        </div>

                                        {/* Ma'lumot */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-white truncate group-hover:text-[#00CEC8] transition-colors">
                                                {r.title}
                                            </p>
                                            <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(100,120,170,0.70)" }}>
                                                {r.sub} · {r.meta}
                                            </p>
                                        </div>

                                        {/* Tur belgisi */}
                                        <div
                                            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                            style={{ background: TYPE_COLORS[r.type].replace("0.70", "0.15") }}
                                        >
                                            <Icon className="w-3 h-3" style={{ color: TYPE_COLORS[r.type] }} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
