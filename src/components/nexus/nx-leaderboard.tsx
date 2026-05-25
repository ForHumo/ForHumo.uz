"use client";

import { useState } from "react";
import { X, Trophy, Medal, Crown, TrendingUp, Star, Users, Eye, Heart, Music2, Film, Mic2, BookOpen } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Creator {
    id: string;
    rank: number;
    name: string;
    username: string;
    avatar: string;
    category: "music" | "video" | "podcast" | "book";
    followers: string;
    views: string;
    likes: string;
    score: number;
    rising: boolean;
    verified: boolean;
}

const CREATORS: Creator[] = [
    { id:"c1",  rank:1,  name:"Sardor Mamadaliev", username:"sardor_m",   avatar:"https://picsum.photos/seed/lb1/80/80",  category:"music",   followers:"1.2M", views:"45M",  likes:"8.2M",  score:9850, rising:false, verified:true  },
    { id:"c2",  rank:2,  name:"Design UZ",         username:"design_uz",  avatar:"https://picsum.photos/seed/lb2/80/80",  category:"video",   followers:"890K", views:"32M",  likes:"5.1M",  score:8740, rising:true,  verified:true  },
    { id:"c3",  rank:3,  name:"AI Hub UZ",         username:"aihub_uz",   avatar:"https://picsum.photos/seed/lb3/80/80",  category:"podcast", followers:"650K", views:"18M",  likes:"3.4M",  score:7620, rising:true,  verified:true  },
    { id:"c4",  rank:4,  name:"Zulfiya",           username:"zulfiya_m",  avatar:"https://picsum.photos/seed/lb4/80/80",  category:"music",   followers:"540K", views:"21M",  likes:"4.8M",  score:7100, rising:false, verified:true  },
    { id:"c5",  rank:5,  name:"Startup UZ",        username:"startupuz",  avatar:"https://picsum.photos/seed/lb5/80/80",  category:"podcast", followers:"420K", views:"12M",  likes:"2.1M",  score:6450, rising:true,  verified:false },
    { id:"c6",  rank:6,  name:"Kino Dunyo",        username:"kino_dunyo", avatar:"https://picsum.photos/seed/lb6/80/80",  category:"video",   followers:"380K", views:"14M",  likes:"2.9M",  score:6100, rising:false, verified:true  },
    { id:"c7",  rank:7,  name:"Madina",            username:"madina_uz",  avatar:"https://picsum.photos/seed/lb7/80/80",  category:"music",   followers:"310K", views:"11M",  likes:"3.2M",  score:5800, rising:true,  verified:false },
    { id:"c8",  rank:8,  name:"Kitob Tavsiya",     username:"kitob_tv",   avatar:"https://picsum.photos/seed/lb8/80/80",  category:"book",    followers:"280K", views:"8M",   likes:"1.8M",  score:5400, rising:false, verified:true  },
    { id:"c9",  rank:9,  name:"CodeUZ",            username:"code_uz",    avatar:"https://picsum.photos/seed/lb9/80/80",  category:"video",   followers:"245K", views:"9M",   likes:"1.6M",  score:5100, rising:true,  verified:false },
    { id:"c10", rank:10, name:"Bobur Yusupov",     username:"bobur_y",    avatar:"https://picsum.photos/seed/lb10/80/80", category:"music",   followers:"210K", views:"7M",   likes:"2.4M",  score:4800, rising:false, verified:false },
];

const CAT_TABS = ["Hammasi", "Musiqa", "Video", "Podcast", "Kitob"] as const;
type CatTab = typeof CAT_TABS[number];
const PERIOD_TABS = ["Haftalik", "Oylik", "Yillik"] as const;

const CAT_ICONS = { music: Music2, video: Film, podcast: Mic2, book: BookOpen };
const CAT_MAP: Record<CatTab, Creator["category"] | null> = {
    Hammasi: null, Musiqa: "music", Video: "video", Podcast: "podcast", Kitob: "book",
};

const RANK_STYLES = [
    { bg: "linear-gradient(135deg,#F59E0B,#F97316)", icon: Crown,  iconColor: "#FFF" },
    { bg: "linear-gradient(135deg,#94A3B8,#64748B)", icon: Medal,  iconColor: "#FFF" },
    { bg: "linear-gradient(135deg,#B45309,#92400E)", icon: Medal,  iconColor: "#FFF" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxLeaderboard
// ─────────────────────────────────────────────────────────────────────────────
export function NxLeaderboard() {
    const { leaderboardOpen, setLeaderboardOpen, openChannel } = useNxPlayer();
    const [cat,    setCat]    = useState<CatTab>("Hammasi");
    const [period, setPeriod] = useState<typeof PERIOD_TABS[number]>("Haftalik");

    if (!leaderboardOpen) return null;

    const filtered = CREATORS.filter(c => !CAT_MAP[cat] || c.category === CAT_MAP[cat]);

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setLeaderboardOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(245,158,11,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                            <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Eng yaxshi yaratuvchilar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Nexus Leaderboard
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setLeaderboardOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Period tabs */}
                <div className="px-5 pb-2 flex gap-2 flex-shrink-0">
                    {PERIOD_TABS.map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                            style={period === p ? {
                                background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>{p}</button>
                    ))}
                </div>

                {/* Category tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {CAT_TABS.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={cat === c ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>{c}</button>
                    ))}
                </div>

                {/* Top 3 podium */}
                {filtered.length >= 3 && (
                    <div className="px-5 pb-4 flex items-end justify-center gap-3 flex-shrink-0">
                        {/* 2nd */}
                        <PodiumCard creator={filtered[1]} />
                        {/* 1st */}
                        <PodiumCard creator={filtered[0]} isFirst />
                        {/* 3rd */}
                        <PodiumCard creator={filtered[2]} />
                    </div>
                )}

                {/* Rank list */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                <Trophy className="w-6 h-6" style={{ color: "rgba(43,62,232,0.40)" }} />
                            </div>
                            <p className="text-sm font-bold text-white">Natija topilmadi</p>
                            <p className="text-[11px]" style={{ color: "rgba(80,100,150,0.70)" }}>Boshqa davr yoki kategoriyani tanlang</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        {filtered.slice(3).map(c => {
                            const CatIcon = CAT_ICONS[c.category];
                            return (
                                <button key={c.id}
                                    onClick={() => { openChannel(c.name); setLeaderboardOpen(false); }}
                                    className="flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-150 group"
                                    style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.12)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.30)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.12)"}
                                >
                                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                                        style={{ background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.80)" }}>
                                        {c.rank}
                                    </div>
                                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                            {c.verified && (
                                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ background: "#2B3EE8" }}>
                                                    <Star className="w-2 h-2 text-white fill-white" />
                                                </div>
                                            )}
                                            {c.rising && (
                                                <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: "#10B981" }} />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <CatIcon className="w-2.5 h-2.5" style={{ color: "rgba(43,62,232,0.60)" }} />
                                            <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                                {c.followers} obunachilar · {c.score.toLocaleString()} ball
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Eye className="w-2.5 h-2.5" style={{ color: "rgba(80,100,150,0.60)" }} />
                                            <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>{c.views}</span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end mt-0.5">
                                            <Heart className="w-2.5 h-2.5" style={{ color: "rgba(239,68,68,0.60)" }} />
                                            <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>{c.likes}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

function PodiumCard({ creator, isFirst = false }: { creator: Creator; isFirst?: boolean }) {
    const { openChannel, setLeaderboardOpen } = useNxPlayer();
    const style = RANK_STYLES[creator.rank - 1] ?? RANK_STYLES[2];
    const RankIcon = style.icon;
    return (
        <button
            onClick={() => { openChannel(creator.name); setLeaderboardOpen(false); }}
            className={`flex flex-col items-center gap-1.5 transition-all duration-150 active:scale-95 ${isFirst ? "mb-2" : ""}`}
            style={{ width: isFirst ? 90 : 72 }}
        >
            <div className="relative">
                <img src={creator.avatar} alt={creator.name}
                    className="rounded-2xl object-cover"
                    style={{
                        width: isFirst ? 64 : 52,
                        height: isFirst ? 64 : 52,
                        boxShadow: isFirst ? "0 0 20px rgba(245,158,11,0.45)" : "none",
                    }} />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: style.bg }}>
                    <RankIcon className="w-3 h-3" style={{ color: style.iconColor }} />
                </div>
            </div>
            <p className="text-[10px] font-black text-white text-center leading-tight truncate w-full px-1">
                {creator.name}
            </p>
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(43,62,232,0.18)" }}>
                <Users className="w-2 h-2" style={{ color: "#00CEC8" }} />
                <span className="text-[9px] font-black" style={{ color: "#00CEC8" }}>{creator.followers}</span>
            </div>
        </button>
    );
}
