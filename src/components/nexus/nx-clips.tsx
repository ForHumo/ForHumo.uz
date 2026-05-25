"use client";

import { useState } from "react";
import { X, Scissors, Play, Share2, Download, Heart, Copy, Check, Clock, Film } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock clips
// ─────────────────────────────────────────────────────────────────────────────
interface Clip {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    from: string;
    views: string;
    likes: number;
    timeAgo: string;
    author: string;
}

const MY_CLIPS: Clip[] = [
    { id: "c1", title: "Ajoyib moment — 2:45",     thumbnail: "https://picsum.photos/seed/cl1/280/160", duration: "0:30", from: "Nexus Live Concert", views: "14.2K", likes: 823,  timeAgo: "3 soat oldin",  author: "Siz" },
    { id: "c2", title: "Eng qiziq qism",            thumbnail: "https://picsum.photos/seed/cl2/280/160", duration: "0:45", from: "Tech Review 2025",   views: "8.7K",  likes: 511,  timeAgo: "1 kun oldin",   author: "Siz" },
    { id: "c3", title: "Bu yerda hammasi boshlanadi",thumbnail: "https://picsum.photos/seed/cl3/280/160", duration: "0:15", from: "Futbol highlights",  views: "32.1K", likes: 2140, timeAgo: "2 kun oldin",   author: "Siz" },
];

const TRENDING_CLIPS: Clip[] = [
    { id: "tc1", title: "Reaktsiyam haqiqiy edi",   thumbnail: "https://picsum.photos/seed/tcl1/280/160", duration: "0:22", from: "Nexus Podcast #44", views: "98.4K", likes: 7820, timeAgo: "5 soat oldin", author: "Jasur Umarov" },
    { id: "tc2", title: "Bu tarixiy moment",         thumbnail: "https://picsum.photos/seed/tcl2/280/160", duration: "0:35", from: "Jonli efir 2025",  views: "210K",  likes: 15600, timeAgo: "1 kun oldin", author: "IT Academy UZ" },
    { id: "tc3", title: "Ha, shunday bo'ldi",        thumbnail: "https://picsum.photos/seed/tcl3/280/160", duration: "0:18", from: "Kino tahlil",     views: "45.2K", likes: 3421, timeAgo: "3 kun oldin", author: "Dilnoza Y." },
    { id: "tc4", title: "Eng yaxshi qism birinchi",  thumbnail: "https://picsum.photos/seed/tcl4/280/160", duration: "0:28", from: "Musiqa albom",    views: "67.8K", likes: 4982, timeAgo: "4 kun oldin", author: "Shahlo M." },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxClips
// ─────────────────────────────────────────────────────────────────────────────
export function NxClips() {
    const { clipsOpen, setClipsOpen, openShareSheet } = useNxPlayer();
    const [tab, setTab] = useState<"mine" | "trending">("trending");
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const toggleLike = (id: string) => {
        setLikedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const copyClip = (id: string) => {
        navigator.clipboard.writeText(`https://nexus.humo.uz/clip/${id}`).catch(() => {});
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clips = tab === "mine" ? MY_CLIPS : TRENDING_CLIPS;

    if (!clipsOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setClipsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[90vh] md:rounded-3xl"
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
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                            <Scissors className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Kliplar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Video lahzalarni kesib ulashing
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setClipsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {([["trending", "Trendda"], ["mine", "Mening kliplarim"]] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === key ? {
                                background: "linear-gradient(135deg,#EF4444,#F97316)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Create clip CTA */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px dashed rgba(239,68,68,0.30)" }}>
                        <Scissors className="w-4 h-4 flex-shrink-0" style={{ color: "#F97316" }} />
                        <p className="text-xs flex-1" style={{ color: "rgba(200,215,240,0.80)" }}>
                            Video ko'rayotganda kesmochini bosib, klip yarating
                        </p>
                        <Film className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(80,100,150,0.50)" }} />
                    </div>
                </div>

                {/* Clips list */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    <div className="flex flex-col gap-4">
                        {clips.map(clip => {
                            const isLiked = likedIds.has(clip.id);
                            const isCopied = copiedId === clip.id;
                            const isPlaying = playingId === clip.id;
                            return (
                                <div key={clip.id}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    {/* Thumbnail */}
                                    <div className="relative">
                                        <img src={clip.thumbnail} alt={clip.title}
                                            className="w-full object-cover" style={{ height: 160 }} />
                                        {/* Overlay */}
                                        <div className="absolute inset-0"
                                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 60%)" }} />
                                        {/* Duration badge */}
                                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-lg"
                                            style={{ background: "rgba(0,0,0,0.75)" }}>
                                            <Clock className="w-2.5 h-2.5 text-white" />
                                            <span className="text-[10px] font-bold text-white">{clip.duration}</span>
                                        </div>
                                        {/* Play button */}
                                        <button
                                            onClick={() => setPlayingId(isPlaying ? null : clip.id)}
                                            className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                                                style={{
                                                    background: isPlaying ? "rgba(239,68,68,0.90)" : "rgba(255,255,255,0.20)",
                                                    backdropFilter: "blur(8px)",
                                                }}>
                                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                            </div>
                                        </button>
                                        {/* From label */}
                                        <div className="absolute bottom-2 left-2">
                                            <p className="text-[9px] font-bold text-white/70">{clip.from}</p>
                                            <p className="text-xs font-black text-white">{clip.title}</p>
                                        </div>
                                    </div>

                                    {/* Meta + actions */}
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        <div className="flex-1">
                                            <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                                {clip.author} · {clip.views} ko'rish · {clip.timeAgo}
                                            </span>
                                        </div>
                                        <button onClick={() => toggleLike(clip.id)}
                                            className="flex items-center gap-1 text-xs font-bold">
                                            <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`}
                                                style={{ color: isLiked ? "#EF4444" : "rgba(140,160,210,0.60)" }} />
                                            <span style={{ color: isLiked ? "#EF4444" : "rgba(140,160,210,0.70)" }}>
                                                {clip.likes + (isLiked ? 1 : 0)}
                                            </span>
                                        </button>
                                        <button onClick={() => copyClip(clip.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                                            style={{ background: "rgba(43,62,232,0.12)" }}>
                                            {isCopied
                                                ? <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                                                : <Copy className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.70)" }} />
                                            }
                                        </button>
                                        <button
                                            onClick={() => openShareSheet(clip.title)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                                            style={{ background: "rgba(43,62,232,0.12)" }}>
                                            <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.70)" }} />
                                        </button>
                                        <button className="w-7 h-7 flex items-center justify-center rounded-lg"
                                            style={{ background: "rgba(43,62,232,0.12)" }}>
                                            <Download className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.70)" }} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
