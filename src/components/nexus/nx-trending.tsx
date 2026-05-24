"use client";

import { useState } from "react";
import { X, TrendingUp, Hash, Flame, ChevronRight, Search, Globe, Music2, Film, Mic2 } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Trend {
    id: string;
    rank: number;
    tag: string;
    category: string;
    posts: string;
    rising: boolean;
    hot: boolean;
}

interface NewsItem {
    id: string;
    title: string;
    source: string;
    time: string;
    image: string;
    category: string;
}

const MOCK_TRENDS: Trend[] = [
    { id: "t1",  rank: 1,  tag: "#HumoNexus",       category: "Texnologiya",  posts: "124K", rising: true,  hot: true  },
    { id: "t2",  rank: 2,  tag: "#UzbekistanMusic",  category: "Musiqa",       posts: "89K",  rising: true,  hot: true  },
    { id: "t3",  rank: 3,  tag: "#AIKelajak",        category: "Texnologiya",  posts: "67K",  rising: false, hot: true  },
    { id: "t4",  rank: 4,  tag: "#ToshkentLive",     category: "Mahalliy",     posts: "54K",  rising: true,  hot: false },
    { id: "t5",  rank: 5,  tag: "#NexusPro",         category: "Texnologiya",  posts: "48K",  rising: false, hot: false },
    { id: "t6",  rank: 6,  tag: "#StartupUZ",        category: "Biznes",       posts: "41K",  rising: true,  hot: false },
    { id: "t7",  rank: 7,  tag: "#KinoUzbekiston",   category: "Kino",         posts: "38K",  rising: false, hot: false },
    { id: "t8",  rank: 8,  tag: "#SardorMamadaliev",  category: "Musiqa",       posts: "33K",  rising: true,  hot: false },
    { id: "t9",  rank: 9,  tag: "#WebDev2025",        category: "Texnologiya",  posts: "29K",  rising: false, hot: false },
    { id: "t10", rank: 10, tag: "#Ramazon2025",       category: "Madaniyat",    posts: "27K",  rising: false, hot: false },
    { id: "t11", rank: 11, tag: "#FutkJamoasi",       category: "Sport",        posts: "24K",  rising: true,  hot: false },
    { id: "t12", rank: 12, tag: "#ReactNative",       category: "Texnologiya",  posts: "21K",  rising: false, hot: false },
];

const MOCK_NEWS: NewsItem[] = [
    { id: "n1", title: "Humo Nexus — O'zbekistonning yetakchi platformasi bo'ldi", source: "TechUZ",    time: "12 daq",  image: "https://picsum.photos/seed/news1/120/80", category: "Texnologiya" },
    { id: "n2", title: "Yangi musiqa albomi: O'zbek rop san'ati rivojlanmoqda",     source: "MuzikUZ",   time: "35 daq",  image: "https://picsum.photos/seed/news2/120/80", category: "Musiqa"      },
    { id: "n3", title: "Toshkentda xalqaro IT-forum ochildi",                       source: "InfoUZ",    time: "1 soat",  image: "https://picsum.photos/seed/news3/120/80", category: "Texnologiya" },
    { id: "n4", title: "Startup UZ: 50+ loyiha yakunlandi, keyingi bosqich",        source: "BiznesUZ",  time: "2 soat",  image: "https://picsum.photos/seed/news4/120/80", category: "Biznes"      },
    { id: "n5", title: "O'zbekiston kinosi xalqaro festivalda yuqori o'rin oldi",    source: "KinoUZ",    time: "3 soat",  image: "https://picsum.photos/seed/news5/120/80", category: "Kino"        },
];

const CATS = ["Barchasi", "Texnologiya", "Musiqa", "Kino", "Sport", "Biznes", "Mahalliy"] as const;
type Cat = typeof CATS[number];

const CAT_ICONS: Record<string, React.ElementType> = {
    Texnologiya: Globe,
    Musiqa:      Music2,
    Kino:        Film,
    default:     Hash,
};

// ─────────────────────────────────────────────────────────────────────────────
// NxTrending
// ─────────────────────────────────────────────────────────────────────────────
export function NxTrending() {
    const { trendingOpen, setTrendingOpen } = useNxPlayer();
    const [cat,  setCat]  = useState<Cat>("Barchasi");
    const [tab,  setTab]  = useState<"trends" | "news">("trends");
    const [q,    setQ]    = useState("");

    if (!trendingOpen) return null;

    const filtered = MOCK_TRENDS.filter(t =>
        (cat === "Barchasi" || t.category === cat) &&
        (!q || t.tag.toLowerCase().includes(q.toLowerCase()))
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setTrendingOpen(false)}
            />

            {/* Modal */}
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
                            style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}>
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white leading-tight">Trendlar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Hozir nima muhokama qilinmoqda
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setTrendingOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {(["trends", "news"] as const).map(t => (
                        <button key={t}
                            onClick={() => setTab(t)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#F97316,#EF4444)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}
                        >{t === "trends" ? "Trendlar" : "Yangiliklar"}</button>
                    ))}
                </div>

                {/* Search */}
                {tab === "trends" && (
                    <div className="px-5 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                            <input
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Trend qidirish..."
                                className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Category chips */}
                {tab === "trends" && (
                    <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        {CATS.map(c => (
                            <button key={c}
                                onClick={() => setCat(c)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                                style={cat === c ? {
                                    background: "linear-gradient(135deg,#F97316,#EF4444)",
                                    color: "white",
                                } : {
                                    background: "rgba(43,62,232,0.10)",
                                    border: "1px solid rgba(43,62,232,0.22)",
                                    color: "rgba(140,160,210,0.85)",
                                }}
                            >{c}</button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {tab === "trends" ? (
                        <div className="flex flex-col gap-1">
                            {filtered.map(t => {
                                const CatIcon = CAT_ICONS[t.category] ?? CAT_ICONS.default;
                                return (
                                    <button key={t.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-150 group"
                                        style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.12)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.30)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.12)"}
                                    >
                                        {/* Rank */}
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black"
                                            style={t.rank <= 3 ? {
                                                background: "linear-gradient(135deg,#F97316,#EF4444)",
                                                color: "white",
                                            } : {
                                                background: "rgba(43,62,232,0.12)",
                                                color: "rgba(140,160,210,0.80)",
                                            }}>
                                            {t.rank}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-black text-white">{t.tag}</span>
                                                {t.hot && (
                                                    <Flame className="w-3 h-3 flex-shrink-0" style={{ color: "#F97316" }} />
                                                )}
                                                {t.rising && (
                                                    <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: "#10B981" }} />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <CatIcon className="w-2.5 h-2.5" style={{ color: "rgba(43,62,232,0.60)" }} />
                                                <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                                    {t.category} · {t.posts} post
                                                </span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                            style={{ color: "rgba(43,62,232,0.60)" }} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {MOCK_NEWS.map(n => (
                                <button key={n.id}
                                    className="flex gap-3 p-3 rounded-2xl w-full text-left transition-all duration-150"
                                    style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.12)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.30)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.12)"}
                                >
                                    <img src={n.image} alt={n.title}
                                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white leading-snug line-clamp-2">{n.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg"
                                                style={{ background: "rgba(43,62,232,0.20)", color: "rgba(100,140,220,0.90)" }}>
                                                {n.category}
                                            </span>
                                            <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                                {n.source} · {n.time} oldin
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
