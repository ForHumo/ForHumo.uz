"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Eye, ThumbsUp, Share2, Loader2, Send, BadgeCheck,
    MessageSquare, UserPlus, UserCheck, Play, Trash2, Lock, Coins,
    ChevronLeft, ChevronRight,
} from "lucide-react";

interface VAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface SeriesPart { id: string; title: string; thumbUrl: string | null; durationSec: number; views: number }
interface VData {
    id: string; title: string; description: string | null; videoUrl: string; thumbUrl: string | null;
    durationSec: number; views: number; createdAt: string; likeCount: number; commentCount: number;
    priceZij: number; locked: boolean;
    series?: { prev: SeriesPart | null; next: SeriesPart | null };
    isLiked: boolean; isSubscribed: boolean; isMine: boolean; author: VAuthor | null;
}
interface Rec { id: string; title: string; thumbUrl: string | null; durationSec: number; views: number; author: { name: string | null; username: string | null; image: string | null } | null }
interface VComment { id: string; text: string; createdAt: string; isMine: boolean; author: VAuthor | null }

function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}
function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}

export function NxVideoPlayer() {
    const { video, videoOpen, closeVideo, openVideo, openShareSheet } = useNxPlayer();
    const [data, setData] = useState<VData | null>(null);
    const [rec, setRec] = useState<Rec[]>([]);
    const [loading, setLoading] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [subscribed, setSubscribed] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<VComment[]>([]);
    const [cInput, setCInput] = useState("");
    const [cBusy, setCBusy] = useState(false);
    const [buying, setBuying] = useState(false);
    const [buyErr, setBuyErr] = useState<string | null>(null);

    const vid = video?.id ?? null;

    const loadDetail = useCallback(() => {
        if (!vid) return;
        setLoading(true);
        fetch(`/api/nexus/videos/${vid}`)
            .then(r => r.json())
            .then(d => {
                if (d.video) {
                    setData(d.video); setRec(d.recommended ?? []);
                    setLiked(d.video.isLiked); setLikeCount(d.video.likeCount); setSubscribed(d.video.isSubscribed);
                }
            })
            .finally(() => setLoading(false));
    }, [vid]);

    useEffect(() => {
        if (!videoOpen || !vid) return;
        setData(null); setShowComments(false); setComments([]); setBuyErr(null);
        loadDetail();
        fetch(`/api/nexus/videos/${vid}/view`, { method: "POST" }).catch(() => { });
    }, [videoOpen, vid, loadDetail]);

    // Pullik videoni sotib olish — muvaffaqiyatda videoUrl ochiladi
    async function buy() {
        if (!vid || buying) return;
        setBuying(true); setBuyErr(null);
        try {
            const r = await fetch(`/api/nexus/videos/${vid}/purchase`, { method: "POST" });
            const d = await r.json().catch(() => ({}));
            if (r.ok) loadDetail();
            else setBuyErr(d.error || "Xarid amalga oshmadi");
        } catch { setBuyErr("Tarmoq xatosi"); }
        finally { setBuying(false); }
    }

    const loadComments = useCallback(() => {
        if (!vid) return;
        fetch(`/api/nexus/videos/${vid}/comments`).then(r => r.json()).then(d => setComments(d.comments ?? [])).catch(() => { });
    }, [vid]);
    useEffect(() => { if (showComments) loadComments(); }, [showComments, loadComments]);

    async function toggleLike() {
        if (!vid) return;
        const next = !liked;
        setLiked(next); setLikeCount(c => Math.max(0, c + (next ? 1 : -1)));
        try { const r = await fetch(`/api/nexus/videos/${vid}/like`, { method: "POST" }); if (r.ok) { const d = await r.json(); setLiked(d.liked); setLikeCount(d.count); } } catch { /* noop */ }
    }
    async function toggleSub() {
        if (!data?.author?.username) return;
        setSubscribed(s => !s);
        await fetch("/api/nexus/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.author.username }) }).catch(() => { });
    }
    async function sendComment() {
        if (!vid || !cInput.trim() || cBusy) return;
        setCBusy(true); const text = cInput.trim(); setCInput("");
        try {
            const r = await fetch(`/api/nexus/videos/${vid}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
            if (r.ok) { const d = await r.json(); setComments(c => [d.comment, ...c]); }
        } finally { setCBusy(false); }
    }
    async function del() {
        if (!vid) return;
        await fetch(`/api/nexus/videos/${vid}`, { method: "DELETE" }).catch(() => { });
        closeVideo();
    }

    if (!videoOpen || !video) return null;

    const title = data?.title ?? video.title;
    const author = data?.author ?? null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row" style={{ background: "rgba(5,8,24,0.97)" }}>
            <button onClick={closeVideo} className="absolute top-3 right-3 z-30 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <X className="w-5 h-5 text-white" />
            </button>

            {/* Video */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-0">
                {data?.locked ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {data.thumbUrl && <img src={data.thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" style={{ filter: "blur(20px)" }} />}
                        <div className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-2xl text-center w-full" style={{ background: "rgba(8,12,32,0.92)", border: "1px solid rgba(43,62,232,0.30)", maxWidth: 380 }}>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                <Lock className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white mb-1">Pullik video</p>
                                <p className="text-xs leading-relaxed" style={{ color: "rgba(150,170,220,0.8)" }}>Sotib olganingizdan so&apos;ng video ochiladi, pul avtorning ALKH Pay hisobiga tushadi.</p>
                            </div>
                            <button onClick={buy} disabled={buying}
                                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Coins className="w-4 h-4" /> Sotib olish — {data.priceZij} Ƶ</>}
                            </button>
                            {buyErr && <p className="text-xs text-red-400 font-bold">{buyErr}</p>}
                        </div>
                    </div>
                ) : data?.videoUrl ? (
                    <video key={data.id} src={data.videoUrl} poster={data.thumbUrl || undefined} controls autoPlay playsInline
                        className="w-full h-full max-h-screen object-contain" />
                ) : loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-white/60" />
                ) : video.image ? (
                    <img src={video.image} alt={title} className="max-w-full max-h-full object-contain opacity-60" />
                ) : (
                    <Play className="w-12 h-12 text-white/30" />
                )}
            </div>

            {/* Info panel */}
            <div className="md:w-96 flex flex-col overflow-y-auto flex-shrink-0" style={{ background: "rgba(8,12,32,0.98)", borderLeft: "1px solid rgba(43,62,232,0.18)", scrollbarWidth: "none", maxHeight: "100vh" }}>
                <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                    <h3 className="text-base font-black text-white leading-snug mb-1">{title}</h3>
                    <p className="text-[11px] mb-3 flex items-center gap-2" style={{ color: "rgba(100,120,170,0.8)" }}>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtViews(data?.views ?? 0)} ko&apos;rish</span>
                        {data && <><span>·</span><span>{timeAgo(data.createdAt)}</span></>}
                    </p>

                    {/* Author + obuna */}
                    {author && (
                        <div className="flex items-center gap-2.5 mb-3">
                            <Link href={author.username ? `/nexus/u/${author.username}` : "/nexus"} onClick={closeVideo} className="flex items-center gap-2.5 flex-1 min-w-0">
                                <img src={avatarOf(author)} alt="" className="w-9 h-9 rounded-full object-cover bg-white" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                <div className="min-w-0 flex items-center gap-1">
                                    <span className="text-sm font-bold text-white truncate">{author.name || author.username || "Foydalanuvchi"}</span>
                                    {author.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                </div>
                            </Link>
                            {!data?.isMine && (
                                <button onClick={toggleSub} className="px-3.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                                    style={subscribed
                                        ? { background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.35)", color: "rgba(160,180,240,0.9)" }
                                        : { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                    {subscribed ? <><UserCheck className="w-3.5 h-3.5" /> Obunada</> : <><UserPlus className="w-3.5 h-3.5" /> Obuna</>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Amallar */}
                    <div className="flex items-center gap-2">
                        <button onClick={toggleLike} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                            style={{ background: liked ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)", border: `1px solid ${liked ? "rgba(43,62,232,0.40)" : "rgba(43,62,232,0.14)"}`, color: liked ? "#00CEC8" : "rgba(160,176,224,0.85)" }}>
                            <ThumbsUp className="w-3.5 h-3.5" style={{ fill: liked ? "#00CEC8" : "none" }} /> {fmtViews(likeCount)}
                        </button>
                        <button onClick={() => setShowComments(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                            style={{ background: showComments ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(160,176,224,0.85)" }}>
                            <MessageSquare className="w-3.5 h-3.5" /> {fmtViews(data?.commentCount ?? 0)}
                        </button>
                        <button onClick={() => openShareSheet(title, data?.id ? `${typeof window !== "undefined" ? window.location.origin : "https://forhumo.uz"}/nexus/v/${data.id}` : undefined)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(160,176,224,0.85)" }}>
                            <Share2 className="w-3.5 h-3.5" /> Ulash
                        </button>
                        {data?.isMine && (
                            <button onClick={del} className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                        )}
                    </div>

                    {/* Seriya — oldingi/keyingi qism */}
                    {(data?.series?.prev || data?.series?.next) && (
                        <div className="flex gap-2 mt-3">
                            {([["prev", data.series?.prev, ChevronLeft, "Oldingi qism"], ["next", data.series?.next, ChevronRight, "Keyingi qism"]] as const).map(([key, part, Icon, label]) => part && (
                                <button key={key}
                                    onClick={() => openVideo({ id: part.id, title: part.title, image: part.thumbUrl || "", author: data?.author?.name || data?.author?.username || "", avatar: avatarOf(data?.author ?? null), views: fmtViews(part.views), duration: fmtDur(part.durationSec) })}
                                    className="flex-1 flex items-center gap-2 p-2 rounded-xl text-left min-w-0"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    {key === "prev" && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                    <div className="w-12 h-7 rounded overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }}>
                                        {part.thumbUrl && <img src={part.thumbUrl} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: "rgba(0,206,200,0.8)" }}>{label}</p>
                                        <p className="text-[11px] font-bold text-white truncate">{part.title}</p>
                                    </div>
                                    {key === "next" && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                </button>
                            ))}
                        </div>
                    )}

                    {data?.description && <p className="text-xs mt-3 leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(180,195,235,0.8)" }}>{data.description}</p>}
                </div>

                {/* Izohlar */}
                {showComments && (
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                        <div className="flex gap-2 mb-3">
                            <input value={cInput} onChange={e => setCInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment()}
                                placeholder="Izoh yozing..." className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                            <button onClick={sendComment} disabled={cBusy || !cInput.trim()} className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {cBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {comments.length === 0 ? (
                            <p className="text-xs text-center py-3" style={{ color: "rgba(120,140,185,0.6)" }}>Birinchi izohni qoldiring</p>
                        ) : comments.map(c => (
                            <div key={c.id} className="flex gap-2 py-2">
                                <img src={avatarOf(c.author)} alt="" className="w-7 h-7 rounded-lg object-cover bg-white flex-shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-white">{c.author?.name || c.author?.username || "Foydalanuvchi"}</span>
                                        {c.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.7)" }}>{timeAgo(c.createdAt)}</span>
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: "rgba(200,215,245,0.85)" }}>{c.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tavsiya */}
                {rec.length > 0 && (
                    <div className="px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>Keyingi videolar</p>
                        {rec.map(r => (
                            <button key={r.id} onClick={() => openVideo({ id: r.id, title: r.title, image: r.thumbUrl || "", author: r.author?.name || r.author?.username || "", avatar: avatarOf(r.author), views: fmtViews(r.views), duration: fmtDur(r.durationSec) })}
                                className="w-full flex gap-2.5 mb-3 group text-left">
                                <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(43,62,232,0.15)", background: "rgba(43,62,232,0.08)" }}>
                                    {r.thumbUrl ? <img src={r.thumbUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-white/30" /></div>}
                                    {r.durationSec > 0 && <span className="absolute bottom-1 right-1 px-1 rounded text-[8px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(r.durationSec)}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00CEC8] transition-colors">{r.title}</p>
                                    <p className="text-[9px] mt-1" style={{ color: "rgba(100,120,170,0.7)" }}>{r.author?.name || r.author?.username || ""} · {fmtViews(r.views)} ko&apos;rish</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
