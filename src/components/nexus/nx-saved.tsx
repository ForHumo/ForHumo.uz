"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Bookmark, History, Loader2, Trash2, Play, Clock, Film, Search } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

// ─────────────────────────────────────────────────────────────────────────────
// NxSaved — 3 tab: Postlar (saqlangan) / Video (watchLater) / Tarix (lokal watch)
// ─────────────────────────────────────────────────────────────────────────────

interface SavedPost {
    id: string; text: string | null; media: string[]; createdAt: string;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null } | null;
    likes: number; comments: number;
}
interface SavedVid {
    id: string; title: string; thumbUrl: string | null; durationSec: number; views: number;
    orientation: "HORIZONTAL" | "VERTICAL"; price: number; isSaved: boolean;
    author: { name: string | null; username: string | null; image: string | null } | null;
}

function avatarOf(a: SavedPost["author"] | SavedVid["author"]) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

const PAGE = 30;

export function NxSaved() {
    const { savedOpen, setSavedOpen, savedDefaultTab, watchHistory, clearHistory, openVideo, openShorts } = useNxPlayer();
    const [tab, setTab] = useState<"all" | "videos" | "history">("all");
    const [posts, setPosts] = useState<SavedPost[]>([]);
    const [videos, setVideos] = useState<SavedVid[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => { if (savedOpen) setTab(savedDefaultTab === "history" ? "history" : "all"); }, [savedOpen, savedDefaultTab]);
    useEffect(() => { if (!savedOpen) setQuery(""); }, [savedOpen]);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/nexus/posts?scope=saved&limit=${PAGE}&offset=0`).then(r => r.json());
            const list: SavedPost[] = d.posts ?? [];
            setPosts(list);
            setHasMore((d.hasMore ?? false) || list.length === PAGE);
        } finally { setLoading(false); }
    }, []);
    const loadVideos = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch("/api/nexus/videos/library").then(r => r.ok ? r.json() : { watchLater: [] });
            setVideos(d.watchLater ?? []);
            setHasMore(false);
        } finally { setLoading(false); }
    }, []);
    useEffect(() => {
        if (!savedOpen) return;
        if (tab === "all") loadPosts();
        else if (tab === "videos") loadVideos();
    }, [savedOpen, tab, loadPosts, loadVideos]);

    async function loadMorePosts() {
        if (loadingMore || !hasMore || tab !== "all") return;
        setLoadingMore(true);
        try {
            const d = await fetch(`/api/nexus/posts?scope=saved&limit=${PAGE}&offset=${posts.length}`).then(r => r.json());
            const list: SavedPost[] = d.posts ?? [];
            setPosts(prev => [...prev, ...list]);
            setHasMore(list.length === PAGE);
        } finally { setLoadingMore(false); }
    }

    async function unsavePost(id: string) {
        setPosts(prev => prev.filter(p => p.id !== id));
        await fetch(`/api/nexus/posts/${id}/save`, { method: "POST" }).catch(() => { });
    }
    async function unsaveVideo(id: string) {
        setVideos(prev => prev.filter(v => v.id !== id));
        await fetch(`/api/nexus/videos/${id}/watch-later`, { method: "POST" }).catch(() => { });
    }

    if (!savedOpen) return null;

    // Qidiruv filtri (client-side)
    const q = query.trim().toLowerCase();
    const filteredPosts = q ? posts.filter(p => (p.text || "").toLowerCase().includes(q) || (p.author?.name || p.author?.username || "").toLowerCase().includes(q)) : posts;
    const filteredVideos = q ? videos.filter(v => v.title.toLowerCase().includes(q) || (v.author?.name || v.author?.username || "").toLowerCase().includes(q)) : videos;
    const filteredHistory = q ? watchHistory.filter(v => v.title.toLowerCase().includes(q)) : watchHistory;

    function openVideoFrom(v: SavedVid) {
        setSavedOpen(false);
        if (v.orientation === "VERTICAL" && v.price === 0) {
            const verts = videos.filter(x => x.orientation === "VERTICAL" && x.price === 0);
            const idx = Math.max(0, verts.findIndex(x => x.id === v.id));
            openShorts(verts.map(s => ({
                id: s.id, image: s.thumbUrl || "", author: s.author?.name || s.author?.username || "Foydalanuvchi",
                views: fmtViews(s.views), likes: "0", duration: fmtDur(s.durationSec), videoSrc: "",
            })), idx);
            return;
        }
        openVideo({
            id: v.id, title: v.title, image: v.thumbUrl || "",
            author: v.author?.name || v.author?.username || "Foydalanuvchi",
            avatar: avatarOf(v.author), views: fmtViews(v.views), duration: fmtDur(v.durationSec),
        });
    }

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }} onClick={() => setSavedOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[88vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "90vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        {([
                            ["all", "Postlar", Bookmark],
                            ["videos", "Video", Film],
                            ["history", "Tarix", History],
                        ] as const).map(([id, label, Icon]) => (
                            <button key={id} onClick={() => setTab(id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition flex-shrink-0"
                                style={tab === id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.85)" }}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setSavedOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Qidiruv */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <input value={query} onChange={e => setQuery(e.target.value)}
                            placeholder={tab === "all" ? "Post ichidan qidirish..." : tab === "videos" ? "Video ichidan qidirish..." : "Tarix ichidan qidirish..."}
                            className="w-full h-9 rounded-xl pl-9 pr-9 text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                        {query && (
                            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-3.5 h-3.5" style={{ color: "rgba(160,180,220,0.70)" }} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex flex-col gap-2">
                            {[0,1,2,3,4].map(i => <SavedSkeleton key={i} />)}
                        </div>
                    ) : tab === "all" ? (
                        filteredPosts.length === 0 ? (
                            <Empty icon={Bookmark} text={q ? `"${query}" bo'yicha topilmadi` : "Saqlangan post yo'q — lentada bookmark belgisini bosing"} />
                        ) : (
                            <>
                                <div className="flex flex-col gap-2">
                                    {filteredPosts.map(p => (
                                        <div key={p.id} className="flex gap-3 p-3 rounded-2xl" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                            <Link href={`/nexus/p/${p.id}`} onClick={() => setSavedOpen(false)} className="flex gap-3 flex-1 min-w-0">
                                                {p.media[0] && (
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.10)" }}>
                                                        <img src={p.media[0]} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <img src={avatarOf(p.author)} alt="" className="w-5 h-5 rounded-md object-cover bg-white" />
                                                        <span className="text-xs font-bold text-white truncate">{p.author?.name || p.author?.username || "Foydalanuvchi"}</span>
                                                        {p.author?.verified && <NxVerifiedBadge category={p.author?.verifiedCategory} size={11} />}
                                                        <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(80,100,150,0.7)" }}>{timeAgo(p.createdAt)}</span>
                                                    </div>
                                                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(190,205,240,0.85)" }}>{p.text || "(media post)"}</p>
                                                </div>
                                            </Link>
                                            <button onClick={() => unsavePost(p.id)} title="Saqlanganlardan olib tashlash"
                                                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 self-center"
                                                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {!q && hasMore && (
                                    <div className="flex justify-center mt-3">
                                        <button onClick={loadMorePosts} disabled={loadingMore}
                                            className="px-5 py-2 rounded-xl text-xs font-black text-white active:scale-95 disabled:opacity-50"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Yuklanmoqda</> : "Ko'proq"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )
                    ) : tab === "videos" ? (
                        filteredVideos.length === 0 ? (
                            <Empty icon={Film} text={q ? `"${query}" bo'yicha topilmadi` : "Belgilangan video yo'q — video kartochkasidagi belgilash tugmasini bosing"} />
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {filteredVideos.map(v => (
                                    <div key={v.id} className="text-left group relative">
                                        <button onClick={() => openVideoFrom(v)} className="w-full">
                                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5" style={{ border: "1px solid rgba(43,62,232,0.18)", background: "rgba(43,62,232,0.08)" }}>
                                                {v.thumbUrl
                                                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-white/30" /></div>}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.40)" }}>
                                                    <Play className="w-6 h-6 text-white fill-white" />
                                                </div>
                                                {v.durationSec > 0 && <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                                            </div>
                                            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug text-left">{v.title}</p>
                                            <p className="text-[9px] mt-0.5 text-left" style={{ color: "rgba(100,120,170,0.75)" }}>{v.author?.name || v.author?.username || "Foydalanuvchi"}</p>
                                        </button>
                                        <button onClick={() => unsaveVideo(v.id)} title="Belgilashdan olib tashlash"
                                            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 md:hover:opacity-100 transition-opacity"
                                            style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(6px)" }}>
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        filteredHistory.length === 0 ? (
                            <Empty icon={History} text={q ? `"${query}" bo'yicha topilmadi` : "Hali video ko'rmadingiz"} />
                        ) : (
                            <>
                                <div className="flex justify-end mb-2">
                                    <button onClick={clearHistory} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                                        style={{ color: "rgba(239,68,68,0.85)", background: "rgba(239,68,68,0.08)" }}>
                                        <Trash2 className="w-3 h-3" /> Tarixni tozalash
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredHistory.map((v, i) => (
                                        <button key={i} onClick={() => { setSavedOpen(false); openVideo(v); }} className="text-left group">
                                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5" style={{ border: "1px solid rgba(43,62,232,0.15)", background: "rgba(43,62,232,0.08)" }}>
                                                {v.image && <img src={v.image} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.45)" }}>
                                                    <Play className="w-6 h-6 text-white fill-white" />
                                                </div>
                                                {v.duration && <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-0.5" style={{ background: "rgba(5,8,24,0.85)" }}><Clock className="w-2.5 h-2.5" />{v.duration}</span>}
                                            </div>
                                            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#00CEC8] transition-colors">{v.title}</p>
                                            <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,120,170,0.75)" }}>{v.author}</p>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>
        </>
    );
}

function SavedSkeleton() {
    return (
        <div className="flex gap-3 p-3 rounded-2xl animate-pulse" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.12)" }}>
            <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }} />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded" style={{ background: "rgba(43,62,232,0.15)", width: "40%" }} />
                <div className="h-2 rounded" style={{ background: "rgba(43,62,232,0.10)" }} />
                <div className="h-2 rounded" style={{ background: "rgba(43,62,232,0.10)", width: "80%" }} />
            </div>
        </div>
    );
}

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                <Icon className="w-5 h-5" style={{ color: "rgba(43,62,232,0.45)" }} />
            </div>
            <p className="text-xs" style={{ color: "rgba(130,150,200,0.75)" }}>{text}</p>
        </div>
    );
}
