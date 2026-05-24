"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Music, Play, Headphones, Flame, Clock, TrendingUp, Star } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type Period = "week" | "month" | "year";

interface TopItem {
    rank: number;
    name: string;
    sub: string;
    plays: number;
    barPct: number; // pre-computed, deterministic
}

interface StatCard {
    label: string;
    value: string;
    sub: string;
    icon: typeof Music;
    color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic mock — same output every render, no Math.random()
// ─────────────────────────────────────────────────────────────────────────────
const TOP_TRACKS: Record<Period, TopItem[]> = {
    week: [
        { rank: 1, name: "Lo-fi Study Beats",    sub: "Jasur Beats",      plays: 47, barPct: 100 },
        { rank: 2, name: "Toshkent Kechalari",   sub: "Shahlo Musiqasi",  plays: 38, barPct: 81  },
        { rank: 3, name: "Bahor Shamoli",         sub: "Anvar Toshmatov",  plays: 29, barPct: 62  },
        { rank: 4, name: "City Groove",           sub: "Nexus Beats",      plays: 22, barPct: 47  },
        { rank: 5, name: "Shashmaqom Remix",      sub: "Art Kollektiv",    plays: 18, barPct: 38  },
    ],
    month: [
        { rank: 1, name: "Toshkent Kechalari",   sub: "Shahlo Musiqasi",  plays: 186, barPct: 100 },
        { rank: 2, name: "Lo-fi Study Beats",    sub: "Jasur Beats",      plays: 154, barPct: 83  },
        { rank: 3, name: "City Groove",           sub: "Nexus Beats",      plays: 98,  barPct: 53  },
        { rank: 4, name: "Shashmaqom Remix",      sub: "Art Kollektiv",    plays: 76,  barPct: 41  },
        { rank: 5, name: "Yoz Yomg'iri",          sub: "Nilufar Xasanova", plays: 61,  barPct: 33  },
    ],
    year: [
        { rank: 1, name: "Bahor Shamoli",         sub: "Anvar Toshmatov",  plays: 1840, barPct: 100 },
        { rank: 2, name: "Toshkent Kechalari",    sub: "Shahlo Musiqasi",  plays: 1620, barPct: 88  },
        { rank: 3, name: "Lo-fi Study Beats",     sub: "Jasur Beats",      plays: 1290, barPct: 70  },
        { rank: 4, name: "Yoz Yomg'iri",           sub: "Nilufar Xasanova", plays: 980,  barPct: 53  },
        { rank: 5, name: "Shashmaqom Remix",       sub: "Art Kollektiv",    plays: 740,  barPct: 40  },
    ],
};

const TOP_ARTISTS: Record<Period, TopItem[]> = {
    week:  [
        { rank: 1, name: "Jasur Beats",      sub: "Producer",   plays: 89,   barPct: 100 },
        { rank: 2, name: "Shahlo Musiqasi",  sub: "Pop",        plays: 72,   barPct: 81  },
        { rank: 3, name: "Anvar Toshmatov",  sub: "Klassik",    plays: 54,   barPct: 61  },
    ],
    month: [
        { rank: 1, name: "Shahlo Musiqasi",  sub: "Pop",        plays: 342,  barPct: 100 },
        { rank: 2, name: "Jasur Beats",      sub: "Producer",   plays: 289,  barPct: 84  },
        { rank: 3, name: "Nilufar Xasanova", sub: "Soul",       plays: 167,  barPct: 49  },
    ],
    year:  [
        { rank: 1, name: "Anvar Toshmatov",  sub: "Klassik",    plays: 3200, barPct: 100 },
        { rank: 2, name: "Shahlo Musiqasi",  sub: "Pop",        plays: 2800, barPct: 88  },
        { rank: 3, name: "Jasur Beats",      sub: "Producer",   plays: 2100, barPct: 66  },
    ],
};

const STAT_CARDS: Record<Period, StatCard[]> = {
    week: [
        { label: "Tinglash vaqti",  value: "14s 22d",   sub: "+3s o'tgan haftadan",    icon: Clock,       color: "#2B3EE8" },
        { label: "Ijrolar soni",    value: "318",        sub: "kuniga ~45 ta",          icon: Play,        color: "#00CEC8" },
        { label: "Eng faol kun",    value: "Shanba",     sub: "87 ta ijro",            icon: Flame,       color: "#F59E0B" },
        { label: "Yangi kashfiyot", value: "12 ta",      sub: "yangi artist",          icon: Star,        color: "#8B5CF6" },
    ],
    month: [
        { label: "Tinglash vaqti",  value: "62s 14d",   sub: "+8s o'tgan oydan",       icon: Clock,       color: "#2B3EE8" },
        { label: "Ijrolar soni",    value: "1,240",      sub: "kuniga ~40 ta",          icon: Play,        color: "#00CEC8" },
        { label: "Eng faol kun",    value: "Juma",       sub: "156 ta ijro",           icon: Flame,       color: "#F59E0B" },
        { label: "Yangi kashfiyot", value: "34 ta",      sub: "yangi artist",          icon: Star,        color: "#8B5CF6" },
    ],
    year: [
        { label: "Tinglash vaqti",  value: "12d 8s",    sub: "2025 yildan +40%",      icon: Clock,       color: "#2B3EE8" },
        { label: "Ijrolar soni",    value: "14,820",     sub: "kuniga ~41 ta",          icon: Play,        color: "#00CEC8" },
        { label: "Eng faol oy",     value: "Yanvar",     sub: "2,340 ta ijro",         icon: Flame,       color: "#F59E0B" },
        { label: "Yangi kashfiyot", value: "248 ta",     sub: "yangi artist",          icon: Star,        color: "#8B5CF6" },
    ],
};

const GENRE_DATA: Record<Period, { label: string; pct: number; color: string }[]> = {
    week: [
        { label: "Pop",       pct: 38, color: "#2B3EE8" },
        { label: "Lo-fi",     pct: 28, color: "#00CEC8" },
        { label: "Klassik",   pct: 18, color: "#8B5CF6" },
        { label: "Hip-hop",   pct: 16, color: "#F59E0B" },
    ],
    month: [
        { label: "Pop",       pct: 42, color: "#2B3EE8" },
        { label: "Lo-fi",     pct: 24, color: "#00CEC8" },
        { label: "Hip-hop",   pct: 20, color: "#F59E0B" },
        { label: "Klassik",   pct: 14, color: "#8B5CF6" },
    ],
    year: [
        { label: "Klassik",   pct: 33, color: "#8B5CF6" },
        { label: "Pop",       pct: 31, color: "#2B3EE8" },
        { label: "Lo-fi",     pct: 22, color: "#00CEC8" },
        { label: "Hip-hop",   pct: 14, color: "#F59E0B" },
    ],
};

const PERIOD_LABELS: Record<Period, string> = { week: "Bu hafta", month: "Bu oy", year: "Bu yil" };

// ─────────────────────────────────────────────────────────────────────────────
// NxStats
// ─────────────────────────────────────────────────────────────────────────────
export function NxStats() {
    const { statsOpen, setStatsOpen } = useNxPlayer();
    const [period, setPeriod] = useState<Period>("month");

    if (!statsOpen) return null;

    const cards   = STAT_CARDS[period];
    const tracks  = TOP_TRACKS[period];
    const artists = TOP_ARTISTS[period];
    const genres  = GENRE_DATA[period];

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setStatsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Mening statistikam</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Tinglash tahlili</p>
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#00CEC8" }} />
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {/* Period selector */}
                <div className="flex gap-2 px-4 pt-4 pb-2">
                    {(["week", "month", "year"] as Period[]).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className="flex-1 py-2 text-[11px] font-black rounded-xl transition-all"
                            style={{
                                background: period === p ? "rgba(43,62,232,0.30)" : "rgba(43,62,232,0.08)",
                                border: `1px solid ${period === p ? "rgba(43,62,232,0.60)" : "rgba(43,62,232,0.15)"}`,
                                color: period === p ? "white" : "rgba(100,120,170,0.60)",
                            }}>
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>

                <div className="px-4 pb-8">
                    {/* Stat cards — 2x2 grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6 mt-3">
                        {cards.map((c, i) => {
                            const Icon = c.icon;
                            return (
                                <div key={i} className="p-3.5 rounded-2xl"
                                    style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                            style={{ background: `${c.color}22` }}>
                                            <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wide"
                                            style={{ color: "rgba(100,120,170,0.60)" }}>
                                            {c.label}
                                        </span>
                                    </div>
                                    <p className="text-lg font-black text-white leading-none mb-0.5">{c.value}</p>
                                    <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.60)" }}>{c.sub}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Genre donut — simplified bar chart */}
                    <div className="mb-6 p-4 rounded-2xl"
                        style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-4"
                            style={{ color: "rgba(100,120,170,0.60)" }}>
                            Janrlar
                        </p>
                        {/* Segmented bar */}
                        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                            {genres.map((g, i) => (
                                <div key={i} className="rounded-full"
                                    style={{ width: `${g.pct}%`, background: g.color, transition: "width 0.5s ease" }} />
                            ))}
                        </div>
                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-2">
                            {genres.map((g, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                                    <span className="text-[11px] text-white">{g.label}</span>
                                    <span className="text-[10px] ml-auto font-bold"
                                        style={{ color: "rgba(140,160,210,0.70)" }}>{g.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top tracks */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Music className="w-4 h-4" style={{ color: "#00CEC8" }} />
                            <p className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Eng ko'p eshitilgan qo'shiqlar
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {tracks.map(t => (
                                <div key={t.rank} className="p-3 rounded-xl"
                                    style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.12)" }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[11px] font-black w-4 text-right flex-shrink-0"
                                            style={{ color: t.rank === 1 ? "#F59E0B" : "rgba(100,120,170,0.50)" }}>
                                            {t.rank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-white truncate">{t.name}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{t.sub}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Headphones className="w-3 h-3" style={{ color: "rgba(100,120,170,0.50)" }} />
                                            <span className="text-[10px] font-bold text-white">{t.plays}</span>
                                        </div>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.12)" }}>
                                        <div className="h-full rounded-full"
                                            style={{
                                                width: `${t.barPct}%`,
                                                background: t.rank === 1
                                                    ? "linear-gradient(90deg,#F59E0B,#EF4444)"
                                                    : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                                transition: "width 0.5s ease",
                                            }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top artists */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4" style={{ color: "#F59E0B" }} />
                            <p className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Sevimli ijrochilar
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {artists.map(a => (
                                <div key={a.rank} className="flex items-center gap-3 p-3 rounded-2xl"
                                    style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.12)" }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        {a.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-white truncate">{a.name}</p>
                                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{a.sub}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">{a.plays.toLocaleString()}</p>
                                        <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>ijro</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
