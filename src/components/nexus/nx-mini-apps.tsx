"use client";

import { useState } from "react";
import { X, Grid3X3, Star, TrendingUp, Clock, Search, ChevronRight, ExternalLink } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mini-apps — Telegram Mini Apps style embedded tools
// ─────────────────────────────────────────────────────────────────────────────
interface MiniApp {
    id: string;
    name: string;
    description: string;
    icon: string;         // emoji icon (only exception since it's part of app identity)
    category: "game" | "tool" | "finance" | "social" | "media";
    color: string;
    users: string;
    rating: number;
    featured: boolean;
    isNew: boolean;
}

const MINI_APPS: MiniApp[] = [
    { id: "ma1",  name: "Nexus Quiz",      description: "Bilimingizni sinab ko'ring",        icon: "Q",  category: "game",    color: "#8B5CF6", users: "45K",  rating: 4.8, featured: true,  isNew: false },
    { id: "ma2",  name: "So'z O'yini",      description: "Uz tilida so'z topish o'yini",      icon: "S",  category: "game",    color: "#10B981", users: "32K",  rating: 4.6, featured: true,  isNew: false },
    { id: "ma3",  name: "Valyuta",          description: "Real vaqtli valyuta konvertori",    icon: "$",  category: "finance", color: "#F59E0B", users: "120K", rating: 4.9, featured: false, isNew: false },
    { id: "ma4",  name: "Ob-havo",          description: "Shahar ob-havo ma'lumotlari",       icon: "W",  category: "tool",    color: "#2B3EE8", users: "89K",  rating: 4.7, featured: true,  isNew: false },
    { id: "ma5",  name: "Tarjimon",         description: "Matn va ovoz tarjimoni",            icon: "T",  category: "tool",    color: "#06B6D4", users: "210K", rating: 4.9, featured: false, isNew: true  },
    { id: "ma6",  name: "Rasm Muharrir",    description: "Rasmlarni tahrirlash va filtrlash", icon: "P",  category: "media",   color: "#EC4899", users: "67K",  rating: 4.5, featured: false, isNew: true  },
    { id: "ma7",  name: "Ovoz Yozuvchi",    description: "Ovoz yozing va almashing",          icon: "M",  category: "media",   color: "#EF4444", users: "#38K", rating: 4.4, featured: false, isNew: false },
    { id: "ma8",  name: "Nexus Polls",      description: "So'rovnoma yarating",               icon: "V",  category: "social",  color: "#F97316", users: "55K",  rating: 4.6, featured: false, isNew: false },
    { id: "ma9",  name: "Daromad Tracker",  description: "Yaratuvchi daromadini hisoblang",   icon: "D",  category: "finance", color: "#10B981", users: "28K",  rating: 4.7, featured: false, isNew: true  },
    { id: "ma10", name: "Tetris Nexus",     description: "Klassik Tetris o'yini",             icon: "N",  category: "game",    color: "#8B5CF6", users: "91K",  rating: 4.8, featured: false, isNew: false },
    { id: "ma11", name: "Qalqon",           description: "Hisobni himoya diagnostikasi",       icon: "K",  category: "tool",    color: "#64748B", users: "44K",  rating: 4.5, featured: false, isNew: false },
    { id: "ma12", name: "Shior Generator",  description: "Biznes uchun shior yaratuvchi",      icon: "G",  category: "social",  color: "#0EA5E9", users: "19K",  rating: 4.3, featured: false, isNew: true  },
];

const CATS = ["Barchasi", "O'yin", "Vosita", "Moliya", "Ijtimoiy", "Media"] as const;
type Cat = typeof CATS[number];
const CAT_MAP: Record<Cat, string | null> = {
    "Barchasi": null, "O'yin": "game", "Vosita": "tool",
    "Moliya": "finance", "Ijtimoiy": "social", "Media": "media",
};

// ─────────────────────────────────────────────────────────────────────────────
// NxMiniApps
// ─────────────────────────────────────────────────────────────────────────────
export function NxMiniApps() {
    const { miniAppsOpen, setMiniAppsOpen } = useNxPlayer();
    const [cat, setCat] = useState<Cat>("Barchasi");
    const [q, setQ] = useState("");
    const [openAppId, setOpenAppId] = useState<string | null>(null);

    const featured = MINI_APPS.filter(a => a.featured);
    const filtered = MINI_APPS.filter(a =>
        (!CAT_MAP[cat] || a.category === CAT_MAP[cat]) &&
        (!q || a.name.toLowerCase().includes(q.toLowerCase()))
    );

    const openApp = MINI_APPS.find(a => a.id === openAppId);

    if (!miniAppsOpen) return null;

    // Embedded "app" view
    if (openApp) {
        return (
            <div className="fixed inset-0 z-[60] flex flex-col"
                style={{ background: "rgba(8,12,32,0.99)" }}>
                {/* App header */}
                <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white"
                        style={{ background: openApp.color }}>
                        {openApp.icon}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-white">{openApp.name}</p>
                        <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{openApp.description}</p>
                    </div>
                    <button onClick={() => setOpenAppId(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                {/* Mock app content */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
                        style={{ background: `${openApp.color}25`, border: `2px solid ${openApp.color}40` }}>
                        {openApp.icon}
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-white mb-2">{openApp.name}</h3>
                        <p className="text-sm" style={{ color: "rgba(140,160,210,0.70)" }}>
                            {openApp.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current"
                                style={{ color: i < Math.floor(openApp.rating) ? "#F59E0B" : "rgba(80,100,150,0.30)" }} />
                        ))}
                        <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{openApp.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white"
                        style={{ background: openApp.color }}>
                        <ExternalLink className="w-4 h-4" />
                        Ilovani ochish
                    </div>
                    <p className="text-[10px] text-center" style={{ color: "rgba(80,100,150,0.50)" }}>
                        {openApp.users} foydalanuvchi
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setMiniAppsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Grid3X3 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Mini Ilovalar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {MINI_APPS.length} ta ilova mavjud
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setMiniAppsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                        <input value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Ilova qidirish..."
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none" />
                    </div>
                </div>

                {/* Category chips */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {CATS.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={cat === c ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {c}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {/* Featured row */}
                    {cat === "Barchasi" && !q && (
                        <div className="mb-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                                <p className="text-xs font-black text-white">Tavsiya etilgan</p>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                {featured.map(app => (
                                    <button key={app.id}
                                        onClick={() => setOpenAppId(app.id)}
                                        className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                                            style={{ background: app.color }}>
                                            {app.icon}
                                        </div>
                                        <p className="text-[9px] font-bold text-center text-white/80 max-w-[64px] truncate">{app.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All apps list */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <Clock className="w-3.5 h-3.5" style={{ color: "rgba(80,100,150,0.70)" }} />
                        <p className="text-xs font-black text-white">
                            {cat === "Barchasi" && !q ? "Barcha ilovalar" : `${filtered.length} ta natija`}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {filtered.map(app => (
                            <button key={app.id}
                                onClick={() => setOpenAppId(app.id)}
                                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0"
                                    style={{ background: app.color }}>
                                    {app.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <p className="text-sm font-bold text-white truncate">{app.name}</p>
                                        {app.isNew && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black"
                                                style={{ background: "rgba(16,185,129,0.20)", color: "#10B981" }}>
                                                YANGI
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] truncate" style={{ color: "rgba(80,100,150,0.75)" }}>
                                        {app.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Star className="w-2.5 h-2.5 fill-current" style={{ color: "#F59E0B" }} />
                                        <span className="text-[9px] font-bold" style={{ color: "#F59E0B" }}>{app.rating}</span>
                                        <span style={{ color: "rgba(80,100,150,0.40)" }}>·</span>
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.60)" }}>{app.users}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(80,100,150,0.40)" }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
