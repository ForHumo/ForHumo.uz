"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, Play, Pause, SkipBack, SkipForward,
    Download, Bookmark, Share2, Clock, Mic,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
interface Episode {
    id: string;
    title: string;
    duration: string;
    date: string;
    description: string;
    new: boolean;
}

interface Podcast {
    id: string;
    name: string;
    host: string;
    avatar: string;
    cover: string;
    category: string;
    subscribers: number;
    episodes: Episode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_PODCASTS: Podcast[] = [
    {
        id: "pod1", name: "DevTalk UZ", host: "Bobur Karimov", avatar: "BK",
        cover: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&q=80",
        category: "Texnologiya", subscribers: 12400,
        episodes: [
            { id: "e1", title: "Qanday qilib Next.js loyihasini deploy qilish kerak?", duration: "48:32", date: "24 May 2026", description: "Vercel, Railway va VPS uchun to'liq qo'llanma.", new: true },
            { id: "e2", title: "TypeScript vs JavaScript — 2026 yilda qaysi biri?", duration: "41:15", date: "17 May 2026", description: "Ikki tilning kuchli va zaif tomonlari muhokamasi.", new: false },
            { id: "e3", title: "O'zbekistonda IT bozori: imkoniyatlar va qiyinchiliklar", duration: "55:44", date: "10 May 2026", description: "Mahalliy IT mutaxassislar bilan suhbat.", new: false },
        ],
    },
    {
        id: "pod2", name: "Biznes Sirri", host: "Sarvar Umarov", avatar: "SU",
        cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
        category: "Biznes", subscribers: 28900,
        episodes: [
            { id: "e4", title: "Startapdan korporatsiyagacha — asoschining hikoyasi", duration: "1:12:08", date: "23 May 2026", description: "O'zbek startapi Juma.uz asoschisi bilan suhbat.", new: true },
            { id: "e5", title: "Investitsiya jalb qilish sirlari", duration: "38:21", date: "16 May 2026", description: "Pitch deck va investor bilan muloqot strategiyasi.", new: false },
        ],
    },
    {
        id: "pod3", name: "Mindset UZ", host: "Nilufar Xasanova", avatar: "NX",
        cover: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=80",
        category: "Shaxsiy o'sish", subscribers: 45200,
        episodes: [
            { id: "e6", title: "Har kuni 5 da erta turish — 30 kunlik tajriba", duration: "29:45", date: "22 May 2026", description: "Ertalabki odatlar va ularning ta'siri.", new: true },
            { id: "e7", title: "Prokrastinatsiyani yengish: amaliy usullar", duration: "35:12", date: "15 May 2026", description: "Vaqtni boshqarish bo'yicha eng samarali texnikalar.", new: false },
            { id: "e8", title: "O'z-o'zingga ishonch: psixologik asoslar", duration: "43:58", date: "8 May 2026", description: "Psixolog Dilnoza Yusupova bilan suhbat.", new: false },
        ],
    },
    {
        id: "pod4", name: "Musiqa Tarixlari", host: "Anvar Toshmatov", avatar: "AT",
        cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80",
        category: "Musiqa", subscribers: 9800,
        episodes: [
            { id: "e9",  title: "O'zbek klassik musiqasi: shashmaqom tarixi", duration: "58:33", date: "21 May 2026", description: "Shashmaqomning kelib chiqishi va rivojlanishi.", new: true },
            { id: "e10", title: "Dutor: milliy cholg'u asbobi", duration: "44:17", date: "14 May 2026", description: "Dutor yasovchi usta bilan suhbat.", new: false },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxPodcasts
// ─────────────────────────────────────────────────────────────────────────────
export function NxPodcasts() {
    const { podcastsOpen, setPodcastsOpen, openShareSheet } = useNxPlayer();

    const [detail,     setDetail]     = useState<Podcast | null>(null);
    const [playing,    setPlaying]    = useState<string | null>(null);
    const [progress,   setProgress]   = useState(0);
    const [savedEps,   setSavedEps]   = useState<Set<string>>(new Set());

    if (!podcastsOpen) return null;

    // ── Episode player inside podcast detail ───────────────────────────────
    const currentEp = detail?.episodes.find(e => e.id === playing) ?? null;

    if (detail) {
        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => { setDetail(null); setPlaying(null); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{detail.name}</p>
                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{detail.host}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* Podcast cover + info */}
                    <div className="p-4 flex gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                            <img src={detail.cover} alt={detail.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-white mb-1">{detail.name}</p>
                            <p className="text-[11px] mb-1" style={{ color: "rgba(140,160,210,0.70)" }}>{detail.host}</p>
                            <div className="flex items-center gap-1.5">
                                <Mic className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                <span className="text-[10px]" style={{ color: "#00CEC8" }}>
                                    {(detail.subscribers / 1000).toFixed(1)}K obunachi
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mini player if episode selected */}
                    {currentEp && (
                        <div className="mx-4 mb-4 p-3 rounded-2xl" style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.30)" }}>
                            <p className="text-[11px] font-bold text-white mb-2 line-clamp-1">{currentEp.title}</p>
                            {/* Fake progress */}
                            <div className="h-1 rounded-full overflow-hidden mb-3 cursor-pointer"
                                style={{ background: "rgba(43,62,232,0.25)" }}
                                onClick={e => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setProgress(((e.clientX - rect.left) / rect.width) * 100);
                                }}>
                                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                            </div>
                            {/* Controls */}
                            <div className="flex items-center justify-center gap-6">
                                <button onClick={() => setProgress(p => Math.max(0, p - 5))}>
                                    <SkipBack className="w-5 h-5" style={{ color: "rgba(140,160,210,0.70)" }} />
                                </button>
                                <button
                                    onClick={() => setPlaying(p => p === currentEp.id ? null : currentEp.id)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {playing === currentEp.id
                                        ? <Pause className="w-5 h-5 text-white" />
                                        : <Play  className="w-5 h-5 text-white ml-0.5" />
                                    }
                                </button>
                                <button onClick={() => setProgress(p => Math.min(100, p + 5))}>
                                    <SkipForward className="w-5 h-5" style={{ color: "rgba(140,160,210,0.70)" }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Episode list */}
                    <div className="px-4 pb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                            style={{ color: "rgba(100,120,170,0.60)" }}>
                            Epizodlar — {detail.episodes.length} ta
                        </p>
                        <div className="flex flex-col gap-3">
                            {detail.episodes.map(ep => {
                                const isPlaying = playing === ep.id;
                                const isSaved   = savedEps.has(ep.id);
                                return (
                                    <div key={ep.id}
                                        className="p-4 rounded-2xl"
                                        style={{
                                            background: isPlaying ? "rgba(43,62,232,0.18)" : "rgba(8,12,32,0.95)",
                                            border: `1px solid ${isPlaying ? "rgba(43,62,232,0.45)" : "rgba(43,62,232,0.15)"}`,
                                        }}>
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => { setPlaying(ep.id); setProgress(0); }}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                                style={{
                                                    background: isPlaying ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)",
                                                    border: "1px solid rgba(43,62,232,0.25)",
                                                }}>
                                                {isPlaying
                                                    ? <Pause className="w-4 h-4 text-white" />
                                                    : <Play  className="w-4 h-4 text-white ml-0.5" />
                                                }
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {ep.new && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                            style={{ background: "rgba(16,185,129,0.20)", color: "#10B981" }}>
                                                            Yangi
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[12px] font-bold text-white leading-snug mb-1 line-clamp-2">{ep.title}</p>
                                                <p className="text-[10px] mb-1 line-clamp-1" style={{ color: "rgba(120,140,190,0.70)" }}>{ep.description}</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" style={{ color: "rgba(100,120,170,0.50)" }} />
                                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{ep.duration}</span>
                                                    </div>
                                                    <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.50)" }}>{ep.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-3 mt-3 ml-13">
                                            <button
                                                onClick={() => setSavedEps(prev => { const n = new Set(prev); n.has(ep.id) ? n.delete(ep.id) : n.add(ep.id); return n; })}
                                                className="flex items-center gap-1.5 text-[10px] font-semibold"
                                                style={{ color: isSaved ? "#00CEC8" : "rgba(100,120,170,0.60)" }}>
                                                <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "#00CEC8" : "none"} />
                                                {isSaved ? "Saqlangan" : "Saqlash"}
                                            </button>
                                            <button className="flex items-center gap-1.5 text-[10px] font-semibold"
                                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                                <Download className="w-3.5 h-3.5" />
                                                Yuklash
                                            </button>
                                            <button
                                                onClick={() => openShareSheet(ep.title)}
                                                className="flex items-center gap-1.5 text-[10px] font-semibold"
                                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                                <Share2 className="w-3.5 h-3.5" />
                                                Ulashish
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Podcast catalog ────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setPodcastsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Podkastlar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>O'zbek podkast platformasi</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8" style={{ scrollbarWidth: "none" }}>
                {/* Featured horizontal scroll */}
                <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                    style={{ color: "rgba(100,120,170,0.60)" }}>
                    Ommabop podkastlar
                </p>
                <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                    {MOCK_PODCASTS.map(p => (
                        <button key={p.id} onClick={() => setDetail(p)}
                            className="flex-shrink-0 w-40 text-left rounded-2xl overflow-hidden"
                            style={{ border: "1px solid rgba(43,62,232,0.20)" }}>
                            <div className="h-32 overflow-hidden">
                                <img src={p.cover} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2.5" style={{ background: "rgba(8,12,32,0.95)" }}>
                                <p className="text-[11px] font-black text-white leading-tight line-clamp-1">{p.name}</p>
                                <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,120,170,0.60)" }}>{p.host}</p>
                                <div className="flex items-center gap-1 mt-1.5">
                                    <Mic className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />
                                    <span className="text-[9px]" style={{ color: "#00CEC8" }}>
                                        {(p.subscribers / 1000).toFixed(0)}K
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Full list */}
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 mt-4"
                    style={{ color: "rgba(100,120,170,0.60)" }}>
                    Barcha podkastlar
                </p>
                <div className="flex flex-col gap-3">
                    {MOCK_PODCASTS.map(p => (
                        <button key={p.id} onClick={() => setDetail(p)}
                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                            style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                                <img src={p.cover} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-white mb-0.5 truncate">{p.name}</p>
                                <p className="text-[10px] mb-1" style={{ color: "rgba(120,140,190,0.70)" }}>{p.host}</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(43,62,232,0.15)", color: "rgba(120,140,200,0.80)" }}>
                                        {p.category}
                                    </span>
                                    <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>
                                        {p.episodes.length} epizod
                                    </span>
                                </div>
                            </div>
                            {p.episodes.some(e => e.new) && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#10B981" }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
