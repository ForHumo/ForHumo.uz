"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Bookmark, Film, Music2, FileText, Heart, Share2, Trash2, Play } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock saved items
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_SAVED = [
    {
        id: "v1", type: "video" as const,
        title: "Next.js 15 — Server Components bilan ishlash",
        author: "Sardor Dev", image: "https://picsum.photos/seed/sv1/800/450",
        duration: "18:42", views: "124K",
    },
    {
        id: "v2", type: "video" as const,
        title: "O'zbekiston AI Conference 2026 highlights",
        author: "Tech UZ", image: "https://picsum.photos/seed/sv2/800/450",
        duration: "32:10", views: "87K",
    },
    {
        id: "m1", type: "music" as const,
        title: "Bahor Ohangi", author: "Madina",
        image: "https://picsum.photos/seed/sm1/400/400",
        duration: "3:47", views: "1.2M",
    },
    {
        id: "m2", type: "music" as const,
        title: "Tun Yulduzi", author: "Sardor",
        image: "https://picsum.photos/seed/sm2/400/400",
        duration: "4:12", views: "880K",
    },
    {
        id: "b1", type: "book" as const,
        title: "Raqamli Millat — O'zbekiston 2030", author: "Humo Press",
        image: "https://picsum.photos/seed/sb1/400/600",
        duration: "320 bet", views: "45K",
    },
    {
        id: "v3", type: "video" as const,
        title: "React 19 — yangi xususiyatlar to'liq sharhi",
        author: "Nexus Dev", image: "https://picsum.photos/seed/sv3/800/450",
        duration: "24:08", views: "310K",
    },
    {
        id: "p1", type: "post" as const,
        title: "\"Texnologiya odamlar uchun\" — fikrlar to'plami",
        author: "@humo_official", image: "https://picsum.photos/seed/sp1/800/400",
        duration: "", views: "4.1K like",
    },
    {
        id: "m3", type: "music" as const,
        title: "Yangi Kun", author: "Islom",
        image: "https://picsum.photos/seed/sm3/400/400",
        duration: "3:28", views: "670K",
    },
];

const TYPE_ICONS = {
    video: Film,
    music: Music2,
    book:  FileText,
    post:  Heart,
};

const TYPE_LABELS: Record<string, string> = {
    all:   "Barchasi",
    video: "Videolar",
    music: "Musiqa",
    book:  "Kitoblar",
    post:  "Postlar",
};

// ─────────────────────────────────────────────────────────────────────────────
// NxSaved — saqlangan kontentlar paneli
// ─────────────────────────────────────────────────────────────────────────────
export function NxSaved() {
    const { savedOpen, setSavedOpen } = useNxPlayer();
    const [filter, setFilter]       = useState("all");
    const [removed, setRemoved]     = useState<Set<string>>(new Set());

    if (!savedOpen) return null;

    const visible = MOCK_SAVED.filter(
        item => !removed.has(item.id) && (filter === "all" || item.type === filter)
    );

    const remove = (id: string) => setRemoved(prev => new Set([...prev, id]));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                onClick={() => setSavedOpen(false)}
            />

            {/* Panel */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:right-auto md:w-[560px] flex flex-col rounded-t-3xl md:rounded-3xl overflow-hidden"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.25)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
                    maxHeight: "88vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Bookmark className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white">Saqlangan</h2>
                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                {visible.length} ta element
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSavedOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                    >
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                    </button>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
                    {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-150"
                            style={filter === key ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "#fff",
                            } : {
                                background: "rgba(43,62,232,0.08)",
                                border: "1px solid rgba(43,62,232,0.18)",
                                color: "rgba(140,160,210,0.85)",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: "none" }}>
                    {visible.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.10)" }}>
                                <Bookmark className="w-7 h-7" style={{ color: "rgba(43,62,232,0.50)" }} />
                            </div>
                            <p className="text-sm font-bold text-white">Hali hech narsa saqlanmagan</p>
                            <p className="text-xs text-center" style={{ color: "rgba(100,120,170,0.70)" }}>
                                Video, musiqa yoki postlardagi saqlash tugmasini bosing
                            </p>
                        </div>
                    )}
                    {visible.map(item => {
                        const TypeIcon = TYPE_ICONS[item.type];
                        const isMusic  = item.type === "music";
                        return (
                            <div
                                key={item.id}
                                className="flex gap-3 py-3 transition-all duration-150 group"
                                style={{ borderBottom: "1px solid rgba(43,62,232,0.08)" }}
                            >
                                {/* Thumbnail */}
                                <div className={`relative flex-shrink-0 rounded-xl overflow-hidden ${isMusic ? "w-14 h-14" : "w-24 h-14"}`}
                                    style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{ background: "rgba(5,8,24,0.55)" }}>
                                        <Play className="w-4 h-4 text-white fill-white" />
                                    </div>
                                    {/* Type badge */}
                                    <div className="absolute top-1 left-1 w-5 h-5 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(5,8,24,0.80)" }}>
                                        <TypeIcon className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white leading-snug line-clamp-2 mb-0.5">{item.title}</p>
                                    <p className="text-[10px] font-medium" style={{ color: "rgba(100,120,170,0.75)" }}>{item.author}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {item.duration && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                                style={{ background: "rgba(43,62,232,0.12)", color: "rgba(120,150,220,0.80)" }}>
                                                {item.duration}
                                            </span>
                                        )}
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{item.views}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-blue-500/10"
                                        title="Ulashish"
                                    >
                                        <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(100,140,220,0.70)" }} />
                                    </button>
                                    <button
                                        onClick={() => remove(item.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-red-500/10"
                                        title="O'chirish"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(239,68,68,0.70)" }} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
