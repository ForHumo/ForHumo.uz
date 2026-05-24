"use client";

import { useState } from "react";
import { X, UserPlus, Users, Search, Star, TrendingUp, Music2, Film, Mic2, BookOpen, Check } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Suggested {
    id: string;
    name: string;
    username: string;
    avatar: string;
    bio: string;
    category: "music" | "video" | "podcast" | "book" | "tech";
    followers: string;
    mutuals: number;
    verified: boolean;
    trending: boolean;
}

const SUGGESTED: Suggested[] = [
    { id:"s1",  name:"Dilnoza Yusupova", username:"dilnoza_y",  avatar:"https://picsum.photos/seed/sg1/80/80",  bio:"O'zbek estrada qo'shiqchisi",      category:"music",   followers:"2.1M", mutuals:3,  verified:true,  trending:true  },
    { id:"s2",  name:"IT Academy UZ",   username:"it_academy",  avatar:"https://picsum.photos/seed/sg2/80/80",  bio:"Texnologiya va dasturlash kurslari", category:"tech",    followers:"850K", mutuals:12, verified:true,  trending:false },
    { id:"s3",  name:"Jasur Umarov",    username:"jasur_film",  avatar:"https://picsum.photos/seed/sg3/80/80",  bio:"Kino kritiki va tahlilchi",         category:"video",   followers:"420K", mutuals:5,  verified:false, trending:true  },
    { id:"s4",  name:"Ozoda Nursaidova",username:"ozoda_n",    avatar:"https://picsum.photos/seed/sg4/80/80",  bio:"Taniqli podkast muallifi",          category:"podcast", followers:"310K", mutuals:8,  verified:true,  trending:false },
    { id:"s5",  name:"Nexus Kitchen",   username:"nx_kitchen",  avatar:"https://picsum.photos/seed/sg5/80/80",  bio:"O'zbek taomlari va retseptlari",    category:"video",   followers:"280K", mutuals:2,  verified:false, trending:false },
    { id:"s6",  name:"Rustam Nazarov",  username:"rustam_dev",  avatar:"https://picsum.photos/seed/sg6/80/80",  bio:"Senior Frontend Developer",         category:"tech",    followers:"195K", mutuals:15, verified:false, trending:true  },
    { id:"s7",  name:"Baraka Books",    username:"baraka_bks",  avatar:"https://picsum.photos/seed/sg7/80/80",  bio:"Kitob tavsiyalari va sharhlari",    category:"book",    followers:"165K", mutuals:4,  verified:true,  trending:false },
    { id:"s8",  name:"Shahlo Musiqasi", username:"shahlo_m",    avatar:"https://picsum.photos/seed/sg8/80/80",  bio:"Klassik va zamonaviy musiqa",       category:"music",   followers:"140K", mutuals:1,  verified:false, trending:false },
];

const CAT_ICONS: Record<string, React.ElementType> = {
    music: Music2, video: Film, podcast: Mic2, book: BookOpen, tech: Star,
};
const CAT_COLORS: Record<string, string> = {
    music: "#10B981", video: "#EF4444", podcast: "#8B5CF6", book: "#F59E0B", tech: "#2B3EE8",
};

const CATS = ["Barchasi", "Musiqa", "Video", "Podcast", "Kitob", "Tech"] as const;
type Cat = typeof CATS[number];
const CAT_MAP: Record<Cat, string | null> = {
    Barchasi: null, Musiqa: "music", Video: "video", Podcast: "podcast", Kitob: "book", Tech: "tech",
};

// ─────────────────────────────────────────────────────────────────────────────
// NxSuggestions
// ─────────────────────────────────────────────────────────────────────────────
export function NxSuggestions() {
    const { suggestionsOpen, setSuggestionsOpen, openChannel } = useNxPlayer();
    const [cat,      setCat]      = useState<Cat>("Barchasi");
    const [q,        setQ]        = useState("");
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    if (!suggestionsOpen) return null;

    const filtered = SUGGESTED.filter(s =>
        (!CAT_MAP[cat] || s.category === CAT_MAP[cat]) &&
        (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.username.toLowerCase().includes(q.toLowerCase()))
    );

    const toggle = (id: string) => {
        setFollowed(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setSuggestionsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            <UserPlus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Kimni kuzatish kerak</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {SUGGESTED.length} tavsiya · {followed.size} ta kuzatilmoqda
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSuggestionsOpen(false)}
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
                            placeholder="Yaratuvchi qidirish..."
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none" />
                    </div>
                </div>

                {/* Category chips */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {CATS.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={cat === c ? {
                                background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>{c}</button>
                    ))}
                </div>

                {/* Follow All */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <button
                        onClick={() => setFollowed(new Set(SUGGESTED.map(s => s.id)))}
                        className="w-full py-2.5 rounded-xl text-xs font-black text-white transition-all duration-150"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                        Hammasini kuzatish
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    <div className="flex flex-col gap-3">
                        {filtered.map(s => {
                            const CatIcon = CAT_ICONS[s.category] ?? Star;
                            const catColor = CAT_COLORS[s.category] ?? "#2B3EE8";
                            const isFollowed = followed.has(s.id);
                            return (
                                <div key={s.id}
                                    className="flex items-center gap-3 p-3 rounded-2xl"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    {/* Avatar */}
                                    <button
                                        onClick={() => { openChannel(s.name); setSuggestionsOpen(false); }}
                                        className="relative flex-shrink-0">
                                        <img src={s.avatar} alt={s.name} className="w-12 h-12 rounded-xl object-cover" />
                                        {s.trending && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                                style={{ background: "#F97316" }}>
                                                <TrendingUp className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                            {s.verified && (
                                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ background: "#2B3EE8" }}>
                                                    <Star className="w-2 h-2 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <CatIcon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: catColor }} />
                                            <p className="text-[10px] truncate" style={{ color: "rgba(80,100,150,0.80)" }}>
                                                {s.bio}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold" style={{ color: "#00CEC8" }}>
                                                {s.followers} obunachilar
                                            </span>
                                            {s.mutuals > 0 && (
                                                <>
                                                    <span style={{ color: "rgba(80,100,150,0.40)" }}>·</span>
                                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                                        {s.mutuals} umumiy do'st
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Follow button */}
                                    <button onClick={() => toggle(s.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all duration-200 flex-shrink-0"
                                        style={isFollowed ? {
                                            background: "rgba(16,185,129,0.15)",
                                            border: "1px solid rgba(16,185,129,0.35)",
                                            color: "#10B981",
                                        } : {
                                            background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                            color: "white",
                                        }}>
                                        {isFollowed
                                            ? <><Check className="w-3 h-3" /> Kuzatilmoqda</>
                                            : <><Users className="w-3 h-3" /> Kuzatish</>
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
