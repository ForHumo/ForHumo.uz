"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Search, Hash, TrendingUp, Flame, Users,
    Play, Music2, Radio, BookOpen, Zap, Star,
    BadgeCheck, ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const TRENDING_TOPICS = [
    { tag: "HumoNexus",        posts: "24.5K", trend: "+120%", hot: true  },
    { tag: "OzbekTech",        posts: "18.2K", trend: "+85%",  hot: true  },
    { tag: "BahorOhangi",      posts: "12.1K", trend: "+200%", hot: true  },
    { tag: "React19",          posts: "9.8K",  trend: "+45%",  hot: false },
    { tag: "StartupUZ",        posts: "7.3K",  trend: "+32%",  hot: false },
    { tag: "AIRevolution",     posts: "5.9K",  trend: "+67%",  hot: false },
    { tag: "MilliyMusiqa",     posts: "4.2K",  trend: "+18%",  hot: false },
    { tag: "ToshkentKino",     posts: "3.8K",  trend: "+29%",  hot: false },
    { tag: "Gaming2026",       posts: "3.1K",  trend: "+41%",  hot: false },
    { tag: "DigitalArtUZ",     posts: "2.7K",  trend: "+15%",  hot: false },
];

const TRENDING_CREATORS = [
    { name: "Humo Official",  handle: "@humo",        subs: "125K", verified: true,  cat: "Tech"    },
    { name: "Madina Ergash",  handle: "@madina_music", subs: "89K",  verified: true,  cat: "Musiqa"  },
    { name: "Sardor Dev",     handle: "@sardor_dev",   subs: "62K",  verified: false, cat: "Ta'lim"  },
    { name: "Tech UZ",        handle: "@tech_uz",      subs: "54K",  verified: true,  cat: "Tech"    },
    { name: "Film Lab",       handle: "@filmlab",      subs: "41K",  verified: false, cat: "Kino"    },
];

const CATEGORIES = [
    { id: "all",     label: "Barchasi",  icon: Flame,    color: "#F97316" },
    { id: "video",   label: "Video",     icon: Play,     color: "#2B3EE8" },
    { id: "music",   label: "Musiqa",    icon: Music2,   color: "#10B981" },
    { id: "live",    label: "Jonli",     icon: Radio,    color: "#EF4444" },
    { id: "edu",     label: "Ta'lim",    icon: BookOpen, color: "#F59E0B" },
    { id: "tech",    label: "Tech",      icon: Zap,      color: "#8B5CF6" },
    { id: "gaming",  label: "Gaming",    icon: Star,     color: "#6366F1" },
    { id: "social",  label: "Ijtimoiy",  icon: Users,    color: "#00CEC8" },
];

const TRENDING_CONTENT = [
    { title: "Nexus Launch Event 2026",     type: "live",  views: "42K",  image: "https://picsum.photos/seed/ex10/800/450" },
    { title: "Bahor Ohangi — Madina",       type: "music", views: "1.2M", image: "https://picsum.photos/seed/ex11/400/400" },
    { title: "React 19 Full Tutorial",      type: "video", views: "310K", image: "https://picsum.photos/seed/ex12/800/450" },
    { title: "AI va Biznes Kelajagi",       type: "book",  views: "58K",  image: "https://picsum.photos/seed/ex13/400/600" },
    { title: "Pro Gaming Finals",           type: "live",  views: "28K",  image: "https://picsum.photos/seed/ex14/800/450" },
    { title: "Milliy Musiqa Festivali",     type: "music", views: "890K", image: "https://picsum.photos/seed/ex15/400/400" },
];

const TYPE_COLORS: Record<string, string> = {
    live:  "#EF4444",
    music: "#10B981",
    video: "#2B3EE8",
    book:  "#F59E0B",
};
const TYPE_LABELS: Record<string, string> = {
    live: "JONLI", music: "Musiqa", video: "Video", book: "Kitob",
};

// ─────────────────────────────────────────────────────────────────────────────
// NxExplore
// ─────────────────────────────────────────────────────────────────────────────
export function NxExplore() {
    const { exploreOpen, setExploreOpen, openChannel, openVideo, setGoLiveOpen, playTrack, setReaderOpen } = useNxPlayer();
    const [query,    setQuery]    = useState("");
    const [category, setCategory] = useState("all");
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    const toggleFollow = (handle: string) =>
        setFollowed(prev => {
            const next = new Set(prev);
            next.has(handle) ? next.delete(handle) : next.add(handle);
            return next;
        });

    const openContent = (item: typeof TRENDING_CONTENT[number]) => {
        if (item.type === "live")  { setGoLiveOpen(true); return; }
        if (item.type === "music") { playTrack({ title: item.title, artist: "Nexus", image: item.image, duration: "3:30", durationSec: 210, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }); return; }
        if (item.type === "book")  { setReaderOpen(true); return; }
        openVideo({ title: item.title, author: "Nexus Creator", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=nexus", image: item.image, views: item.views, duration: "12:34" });
    };

    if (!exploreOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }}
                onClick={() => setExploreOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[620px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border:     "1px solid rgba(43,62,232,0.22)",
                    boxShadow:  "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight:  "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header + Search */}
                <div className="px-4 pt-4 pb-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                        <h3 className="text-base font-black text-white flex-1">Kashfiyot</h3>
                        <button onClick={() => setExploreOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    {/* Search bar */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(43,62,232,0.50)" }} />
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Mavzu, kreator, hashtag..."
                            className="w-full h-10 rounded-xl pl-10 pr-4 text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                    </div>
                    {/* Category chips */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                        {CATEGORIES.map(c => (
                            <button key={c.id} onClick={() => setCategory(c.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-150"
                                style={category === c.id ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                                } : {
                                    background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)",
                                    color: "rgba(140,160,210,0.80)",
                                }}>
                                <c.icon className="w-3 h-3" />{c.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* ── Trending Hashtags ── */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Flame className="w-4 h-4" style={{ color: "#F97316" }} />
                                <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>
                                    Trendda
                                </h4>
                            </div>
                            <button className="flex items-center gap-1 text-[10px] font-bold"
                                style={{ color: "rgba(43,62,232,0.60)" }}>
                                Barchasi <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {TRENDING_TOPICS.slice(0, 6).map((t, i) => (
                                <button key={t.tag}
                                    className="flex items-start gap-2.5 p-3 rounded-xl text-left transition-all duration-150"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.35)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.14)"}
                                >
                                    <span className="text-sm font-black"
                                        style={{ color: "rgba(80,100,150,0.60)", minWidth: "16px" }}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                                            <span className="text-[12px] font-bold text-white truncate">{t.tag}</span>
                                            {t.hot && <Flame className="w-3 h-3 flex-shrink-0" style={{ color: "#F97316" }} />}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{t.posts} post</span>
                                            <span className="text-[9px] font-bold" style={{ color: "#10B981" }}>{t.trend}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Trend Kreatorlar ── */}
                    <div className="px-4 pb-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>
                                    Yuksalayotgan kreatorlar
                                </h4>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {TRENDING_CREATORS.map(c => (
                                <button key={c.handle} onClick={() => { openChannel(c.name); setExploreOpen(false); }}
                                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.35)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.14)"}
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                                        style={{ border: "2px solid rgba(43,62,232,0.25)" }}>
                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.name}`}
                                            alt={c.name} className="w-full h-full object-cover bg-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-white">{c.name}</span>
                                            {c.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>
                                            <span>{c.handle}</span>
                                            <span>·</span>
                                            <span>{c.subs} obunachi</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                                style={{ background: "rgba(43,62,232,0.15)", color: "#2B3EE8" }}>
                                                {c.cat}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="px-3 py-1.5 rounded-xl text-[11px] font-black flex-shrink-0 transition-all duration-150"
                                        style={followed.has(c.handle) ? {
                                            background: "rgba(43,62,232,0.15)",
                                            border: "1px solid rgba(43,62,232,0.35)",
                                            color: "rgba(160,180,240,0.90)",
                                        } : {
                                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                            color: "#fff",
                                        }}
                                        onClick={e => { e.stopPropagation(); toggleFollow(c.handle); }}
                                    >
                                        {followed.has(c.handle) ? "Kuzatilmoqda" : "Kuzatish"}
                                    </button>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Trend Kontentlar ── */}
                    <div className="px-4 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4" style={{ color: "#F59E0B" }} />
                            <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>
                                Trendda kontentlar
                            </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {TRENDING_CONTENT.map((c, i) => (
                                <button key={i}
                                    onClick={() => { openContent(c); setExploreOpen(false); }}
                                    className="group relative rounded-xl overflow-hidden text-left transition-all duration-150"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)", aspectRatio: c.type === "music" || c.type === "book" ? "1/1" : "16/9" }}
                                >
                                    <img src={c.image} alt={c.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0"
                                        style={{ background: "linear-gradient(to top, rgba(5,8,24,0.90) 0%, transparent 55%)" }} />
                                    <div className="absolute top-2 left-2">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
                                            style={{ background: TYPE_COLORS[c.type] }}>
                                            {TYPE_LABELS[c.type]}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2">
                                        <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">{c.title}</p>
                                        <p className="text-[9px] mt-0.5" style={{ color: "rgba(160,180,220,0.70)" }}>{c.views} ko'rishlar</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
