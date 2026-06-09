"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { Search, Loader2, Plus, Play, Eye, Flame, Zap, Hash, Film, BadgeCheck } from "lucide-react";
import { NxVideoCreate } from "./nx-video-create";

interface VAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface Vid {
    id: string; title: string; thumbUrl: string | null; videoUrl: string;
    durationSec: number; views: number; createdAt: string;
    likeCount: number; commentCount: number; author: VAuthor | null;
}

const FILTERS = [
    { id: "trend", label: "Trendda", icon: Flame },
    { id: "new", label: "Yangi", icon: Zap },
    { id: "gaming", label: "Gaming", icon: Hash },
    { id: "tech", label: "Tech", icon: Hash },
    { id: "talim", label: "Ta'lim", icon: Hash },
    { id: "musiqa", label: "Musiqa", icon: Hash },
    { id: "kino", label: "Kino", icon: Hash },
] as const;

function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function avatarOf(a: VAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }

export function VideoView() {
    const { openVideo } = useNxPlayer();
    const [videos, setVideos] = useState<Vid[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<string>("trend");
    const [uploadOpen, setUploadOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ kind: "LONG", limit: "40" });
        if (query.trim()) params.set("q", query.trim());
        params.set("sort", filter === "new" ? "new" : "trend");
        if (!["trend", "new"].includes(filter)) params.set("category", filter);
        try {
            const d = await fetch(`/api/nexus/videos?${params.toString()}`).then(r => r.json());
            setVideos(d.videos ?? []);
        } finally { setLoading(false); }
    }, [query, filter]);

    useEffect(() => { const t = setTimeout(load, query ? 300 : 0); return () => clearTimeout(t); }, [load, query]);

    function open(v: Vid) {
        openVideo({
            id: v.id, title: v.title, image: v.thumbUrl || "",
            author: v.author?.name || v.author?.username || "Foydalanuvchi",
            avatar: avatarOf(v.author), views: fmtViews(v.views), duration: fmtDur(v.durationSec),
        });
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {/* Header */}
            <div className="mx-4 mt-4 mb-3 p-5 rounded-2xl relative overflow-hidden" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(43,62,232,0.22) 0%, transparent 70%)" }} />
                <div className="flex items-center justify-between gap-3 mb-4 relative">
                    <h2 className="text-2xl md:text-3xl font-black text-white">Video <span style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Dunyo</span></h2>
                    <button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 16px rgba(43,62,232,0.4)" }}>
                        <Plus className="w-4 h-4" /> Video yuklash
                    </button>
                </div>
                <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Video qidiring..."
                        className="w-full h-11 rounded-xl pl-11 pr-4 text-sm text-white outline-none" style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 relative" style={{ scrollbarWidth: "none" }}>
                    {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition active:scale-95"
                            style={filter === f.id
                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                : { background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.85)" }}>
                            <f.icon className="w-3 h-3" />{f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                        <Film className="w-6 h-6" style={{ color: "rgba(43,62,232,0.45)" }} />
                    </div>
                    <p className="text-sm font-bold text-white/70 mb-1">{query ? "Video topilmadi" : "Hali video yo'q"}</p>
                    {!query && <button onClick={() => setUploadOpen(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Birinchi videoni yuklang</button>}
                </div>
            ) : (
                <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map(v => (
                        <button key={v.id} onClick={() => open(v)} className="text-left group">
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(43,62,232,0.18)", background: "rgba(43,62,232,0.08)" }}>
                                {v.thumbUrl
                                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a2a8a,#0a3d3a)" }}><Film className="w-8 h-8 text-white/40" /></div>}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.35)" }}>
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div>
                                </div>
                                {v.durationSec > 0 && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                            </div>
                            <div className="flex gap-2.5">
                                <img src={avatarOf(v.author)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-white" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00CEC8] transition-colors">{v.title}</h4>
                                    <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: "rgba(100,120,170,0.8)" }}>
                                        <span className="truncate inline-flex items-center gap-0.5">{v.author?.name || v.author?.username || "Foydalanuvchi"}{v.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}</span>
                                        <span>·</span>
                                        <span className="flex items-center gap-0.5 flex-shrink-0"><Eye className="w-2.5 h-2.5" />{fmtViews(v.views)}</span>
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <NxVideoCreate open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={load} />
        </div>
    );
}
