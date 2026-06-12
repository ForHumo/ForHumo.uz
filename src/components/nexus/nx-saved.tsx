"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Bookmark, History, Loader2, Trash2, Play, BadgeCheck, Clock } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxSaved — REAL: "Saqlangan" = DB'dagi saqlangan postlar (scope=saved),
// "Tarix" = real lokal ko'rish tarixi (ctx watchHistory).
// ─────────────────────────────────────────────────────────────────────────────

interface SavedPost {
    id: string; text: string | null; media: string[]; createdAt: string;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    likes: number; comments: number;
}

function avatarOf(a: SavedPost["author"]) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function NxSaved() {
    const { savedOpen, setSavedOpen, savedDefaultTab, watchHistory, clearHistory, openVideo } = useNxPlayer();
    const [tab, setTab] = useState<"all" | "history">("all");
    const [posts, setPosts] = useState<SavedPost[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (savedOpen) setTab(savedDefaultTab); }, [savedOpen, savedDefaultTab]);

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/nexus/posts?scope=saved&limit=30")
            .then(r => r.json())
            .then(d => setPosts(d.posts ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { if (savedOpen && tab === "all") load(); }, [savedOpen, tab, load]);

    async function unsave(id: string) {
        setPosts(prev => prev.filter(p => p.id !== id));
        await fetch(`/api/nexus/posts/${id}/save`, { method: "POST" }).catch(() => { });
    }

    if (!savedOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }} onClick={() => setSavedOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[85vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "88vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header + tablar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex gap-2">
                        {([["all", "Saqlangan", Bookmark], ["history", "Ko'rish tarixi", History]] as const).map(([id, label, Icon]) => (
                            <button key={id} onClick={() => setTab(id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition"
                                style={tab === id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.85)" }}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setSavedOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                    {tab === "all" ? (
                        loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                        ) : posts.length === 0 ? (
                            <Empty icon={Bookmark} text="Saqlangan post yo'q — lentada bookmark belgisini bosing" />
                        ) : (
                            <div className="flex flex-col gap-2">
                                {posts.map(p => (
                                    <div key={p.id} className="flex gap-3 p-3 rounded-2xl" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                        {p.media[0] && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.10)" }}>
                                                <img src={p.media[0]} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <img src={avatarOf(p.author)} alt="" className="w-5 h-5 rounded-md object-cover bg-white" />
                                                <span className="text-xs font-bold text-white truncate">{p.author?.name || p.author?.username || "Foydalanuvchi"}</span>
                                                {p.author?.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(80,100,150,0.7)" }}>{timeAgo(p.createdAt)}</span>
                                            </div>
                                            <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(190,205,240,0.85)" }}>{p.text || "(media post)"}</p>
                                        </div>
                                        <button onClick={() => unsave(p.id)} title="Saqlanganlardan olib tashlash"
                                            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 self-center"
                                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        watchHistory.length === 0 ? (
                            <Empty icon={History} text="Hali video ko'rmadingiz" />
                        ) : (
                            <>
                                <div className="flex justify-end mb-2">
                                    <button onClick={clearHistory} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                                        style={{ color: "rgba(239,68,68,0.85)", background: "rgba(239,68,68,0.08)" }}>
                                        <Trash2 className="w-3 h-3" /> Tarixni tozalash
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {watchHistory.map((v, i) => (
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
