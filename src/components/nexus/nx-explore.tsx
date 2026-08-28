"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import {
    X, Search, Hash, Flame, Users, Loader2,
    UserPlus, UserCheck, Play, Music2, Radio, Eye,
    RefreshCw, Sparkles, MessageCircle, Heart,
} from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

interface DUser { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface DTag { tag: string; count: number }
interface DVid { id: string; title: string; thumbUrl: string | null; orientation: string; durationSec: number; views: number; price: number }
interface DTrack { id: string; title: string; artist: string | null; coverUrl: string | null; plays: number }
interface DLive { id: string; title: string; viewers: number; author: DUser | null }
interface DPost { id: string; text: string | null; media: string[]; likes: number; comments: number; author: DUser | null }

type Tab = "all" | "people" | "tags" | "videos" | "tracks" | "lives" | "posts";

function avatarOf(a: { image?: string | null; username?: string | null; name?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}
function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }

export function NxExplore() {
    const { exploreOpen, setExploreOpen, setSearchOpen, openVideo, openShorts, playTrack } = useNxPlayer();
    const [tab, setTab] = useState<Tab>("all");
    const [tags, setTags] = useState<DTag[]>([]);
    const [users, setUsers] = useState<DUser[]>([]);
    const [videos, setVideos] = useState<DVid[]>([]);
    const [tracks, setTracks] = useState<DTrack[]>([]);
    const [lives, setLives] = useState<DLive[]>([]);
    const [posts, setPosts] = useState<DPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userOffset, setUserOffset] = useState(0);
    const [hasMoreUsers, setHasMoreUsers] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [followBusy, setFollowBusy] = useState<string | null>(null);
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const d = await fetch(`/api/nexus/discover?rich=1&offset=0`).then(r => r.json());
            setTags(d.trendingTags ?? []);
            setUsers(d.suggestedUsers ?? []);
            setVideos(d.videos ?? []);
            setTracks(d.tracks ?? []);
            setLives(d.lives ?? []);
            setPosts(d.topPosts ?? []);
            setHasMoreUsers(!!d.hasMoreUsers);
            setUserOffset(0);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (exploreOpen) load(); }, [exploreOpen, load]);

    // Ochiq turganda 60s'da avtomatik yangilanish (jonli efirlar uchun muhim)
    useEffect(() => {
        if (!exploreOpen) return;
        const iv = setInterval(() => { if (!document.hidden) load(true); }, 60_000);
        return () => clearInterval(iv);
    }, [exploreOpen, load]);

    async function loadMoreUsers() {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const next = userOffset + 8;
            const d = await fetch(`/api/nexus/discover?offset=${next}`).then(r => r.json());
            const list: DUser[] = d.suggestedUsers ?? [];
            setUsers(prev => [...prev, ...list]);
            setUserOffset(next);
            setHasMoreUsers(!!d.hasMoreUsers);
        } finally { setLoadingMore(false); }
    }

    async function refresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    const follow = useCallback(async (u: DUser) => {
        if (!u.username || followBusy) return;
        setFollowBusy(u.username);
        setFollowed(prev => new Set(prev).add(u.username!));
        try {
            await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
        } finally { setFollowBusy(null); }
    }, [followBusy]);

    if (!exploreOpen) return null;
    const close = () => setExploreOpen(false);

    const TABS: { id: Tab; label: string; count: number }[] = [
        { id: "all",    label: "Barchasi", count: 0 },
        { id: "people", label: "Odamlar",  count: users.length },
        { id: "tags",   label: "Hashtag",  count: tags.length },
        { id: "posts",  label: "Postlar",  count: posts.length },
        { id: "videos", label: "Video",    count: videos.length },
        { id: "tracks", label: "Musiqa",   count: tracks.length },
        { id: "lives",  label: "Jonli",    count: lives.length },
    ];

    function openLive(id: string) { close(); window.location.assign(`/nexus/live/${id}`); }
    function playVid(v: DVid) {
        close();
        if (v.orientation === "VERTICAL" && v.price === 0) {
            openShorts([{ id: v.id, image: v.thumbUrl || "", author: "", views: fmtN(v.views), likes: "0", duration: fmtDur(v.durationSec), videoSrc: "" }], 0);
            return;
        }
        openVideo({ id: v.id, title: v.title, image: v.thumbUrl || "", author: "", avatar: "", views: fmtN(v.views), duration: fmtDur(v.durationSec) });
    }
    function listenTr(t: DTrack) {
        close();
        const tr: NxTrack = {
            id: t.id, title: t.title, artist: t.artist || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: "0:00", durationSec: 0, src: "",
        };
        playTrack(tr);
    }

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }} onClick={close} />

            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[620px] md:max-h-[92vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "92vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-4 pt-4 pb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <Flame className="w-5 h-5 flex-shrink-0" style={{ color: "#F97316" }} />
                        <h3 className="text-base font-black text-white flex-1">Kashfiyot</h3>
                        <button onClick={refresh} disabled={refreshing || loading} title="Yangilash"
                            className="w-8 h-8 flex items-center justify-center rounded-xl active:scale-95"
                            style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.25)" }}>
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} style={{ color: "#00CEC8" }} />
                        </button>
                        <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <button onClick={() => { close(); setSearchOpen(true); }}
                        className="w-full flex items-center gap-3 h-10 rounded-xl px-3.5 text-left"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <Search className="w-4 h-4" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <span className="text-sm" style={{ color: "rgba(140,160,210,0.7)" }}>Odamlar, video, musiqa, #hashtag...</span>
                    </button>

                    {/* Filter tabs */}
                    <div className="mt-3 -mx-1 pb-1 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95"
                                style={tab === t.id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(160,180,230,0.85)" }}>
                                {t.label}{tab === t.id && t.count > 0 ? ` (${t.count})` : ""}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : (
                        <>
                            {/* Jonli efirlar (all + lives) */}
                            {(tab === "all" || tab === "lives") && lives.length > 0 && (
                                <SectionHead icon={<Radio className="w-4 h-4" style={{ color: "#EF4444" }} />} title="Hozir jonli" accent="#EF4444">
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        {lives.map(l => (
                                            <button key={l.id} onClick={() => openLive(l.id)}
                                                className="text-left rounded-xl overflow-hidden active:scale-[0.98] transition"
                                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                                <div className="relative aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(40,10,20,0.9),rgba(30,15,50,0.9))" }}>
                                                    <img src={avatarOf(l.author)} alt="" className="w-10 h-10 rounded-full object-cover bg-white" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                                                    <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: "#EF4444" }}>
                                                        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                                                    </span>
                                                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.8)" }}>
                                                        <Eye className="w-2.5 h-2.5" />{fmtN(l.viewers)}
                                                    </span>
                                                </div>
                                                <div className="px-2 py-1.5">
                                                    <p className="text-[11px] font-bold text-white truncate">{l.title}</p>
                                                    <p className="text-[9px] truncate" style={{ color: "rgba(150,130,150,0.85)" }}>{l.author?.name || l.author?.username || "Streamer"}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </SectionHead>
                            )}

                            {/* Trending hashtaglar */}
                            {(tab === "all" || tab === "tags") && tags.length > 0 && (
                                <SectionHead icon={<Hash className="w-4 h-4" style={{ color: "#00CEC8" }} />} title="Trending hashtag" accent="#00CEC8">
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        {tags.slice(0, tab === "tags" ? 20 : 6).map((t, i) => (
                                            <Link key={t.tag} href={`/nexus/tag/${t.tag}`} onClick={close}
                                                className="flex items-center gap-2.5 p-2.5 rounded-xl active:scale-[0.98] transition"
                                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                <span className="text-sm font-black" style={{ color: "rgba(80,100,150,0.6)", minWidth: "16px" }}>{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                                                        <span className="text-[12px] font-bold text-white truncate">{t.tag}</span>
                                                    </div>
                                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.7)" }}>{t.count} post</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </SectionHead>
                            )}

                            {/* Kunning top postlari */}
                            {(tab === "all" || tab === "posts") && posts.length > 0 && (
                                <SectionHead icon={<Sparkles className="w-4 h-4" style={{ color: "#F5B301" }} />} title="Bugun eng aktiv" accent="#F5B301">
                                    <div className="flex flex-col gap-2 px-3">
                                        {posts.map(p => (
                                            <Link key={p.id} href={`/nexus/p/${p.id}`} onClick={close}
                                                className="flex gap-3 p-3 rounded-xl active:scale-[0.99] transition"
                                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(245,179,1,0.15)" }}>
                                                <img src={avatarOf(p.author)} alt="" className="w-9 h-9 rounded-xl object-cover bg-white flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-white truncate">{p.author?.name || p.author?.username || "Foydalanuvchi"}</span>
                                                        {p.author?.verified && <NxVerifiedBadge category={p.author?.verifiedCategory} size={12} />}
                                                    </div>
                                                    {p.text && <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "rgba(200,215,245,0.85)" }}>{p.text}</p>}
                                                    <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: "rgba(120,140,185,0.7)" }}>
                                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" style={{ color: "#EF4444" }} />{p.likes}</span>
                                                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" style={{ color: "#00CEC8" }} />{p.comments}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </SectionHead>
                            )}

                            {/* Yangi videolar */}
                            {(tab === "all" || tab === "videos") && videos.length > 0 && (
                                <SectionHead icon={<Play className="w-4 h-4" style={{ color: "#8B5CF6" }} />} title="Yangi videolar" accent="#8B5CF6">
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        {videos.map(v => (
                                            <button key={v.id} onClick={() => playVid(v)}
                                                className="text-left rounded-xl overflow-hidden active:scale-[0.98] transition"
                                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(139,92,246,0.20)" }}>
                                                <div className="relative aspect-video" style={{ background: "rgba(139,92,246,0.10)" }}>
                                                    {v.thumbUrl
                                                        ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6" style={{ color: "rgba(139,92,246,0.4)" }} /></div>}
                                                    {v.durationSec > 0 && <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                                                </div>
                                                <div className="px-2 py-1.5">
                                                    <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug">{v.title}</p>
                                                    <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: "rgba(120,140,185,0.7)" }}>
                                                        <Eye className="w-2.5 h-2.5" />{fmtN(v.views)}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </SectionHead>
                            )}

                            {/* Top musiqa */}
                            {(tab === "all" || tab === "tracks") && tracks.length > 0 && (
                                <SectionHead icon={<Music2 className="w-4 h-4" style={{ color: "#10B981" }} />} title="Top musiqa" accent="#10B981">
                                    <div className="flex flex-col gap-1 px-3">
                                        {tracks.map(t => (
                                            <button key={t.id} onClick={() => listenTr(t)}
                                                className="flex items-center gap-3 p-2 rounded-xl active:scale-[0.99] transition">
                                                <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                                                    {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-4 h-4" style={{ color: "rgba(16,185,129,0.5)" }} /></div>}
                                                </div>
                                                <div className="min-w-0 flex-1 text-left">
                                                    <p className="text-sm font-bold text-white truncate">{t.title}</p>
                                                    <p className="text-[11px] truncate" style={{ color: "rgba(120,150,135,0.8)" }}>{t.artist ?? "Noma'lum"}</p>
                                                </div>
                                                <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: "#10B981" }}>
                                                    <Play className="w-2.5 h-2.5 fill-current" />{fmtN(t.plays)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </SectionHead>
                            )}

                            {/* Tavsiya odamlar */}
                            {(tab === "all" || tab === "people") && (
                                <SectionHead icon={<Users className="w-4 h-4" style={{ color: "#00CEC8" }} />} title="Kim kuzatishga arziydi" accent="#00CEC8">
                                    {users.length === 0 ? (
                                        <p className="text-xs px-4" style={{ color: "rgba(120,140,185,0.6)" }}>Hozircha tavsiya yo&apos;q</p>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-2 px-3">
                                                {users.map((u, i) => {
                                                    const isF = !!u.username && followed.has(u.username);
                                                    return (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                                                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                            <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={close} className="flex items-center gap-3 flex-1 min-w-0">
                                                                <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-bold text-white truncate">{u.name || u.username || "Foydalanuvchi"}</span>
                                                                        {u.verified && <NxVerifiedBadge category={u.verifiedCategory} size={13} />}
                                                                    </div>
                                                                    {u.username && <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>@{u.username}</span>}
                                                                </div>
                                                            </Link>
                                                            {u.username && (
                                                                isF ? (
                                                                    <span className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                                                                        style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.35)", color: "rgba(160,180,240,0.9)" }}>
                                                                        <UserCheck className="w-3 h-3" /> Kuzatilmoqda
                                                                    </span>
                                                                ) : (
                                                                    <button onClick={() => follow(u)} disabled={followBusy === u.username}
                                                                        className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 flex-shrink-0 active:scale-95 transition"
                                                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                                                        <UserPlus className="w-3 h-3" /> Kuzatish
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {hasMoreUsers && (
                                                <div className="px-3 mt-2">
                                                    <button onClick={loadMoreUsers} disabled={loadingMore}
                                                        className="w-full py-2.5 rounded-xl text-xs font-black active:scale-[0.99] transition disabled:opacity-50"
                                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(180,195,235,0.9)" }}>
                                                        {loadingMore ? "..." : "Ko'proq ko'rsatish"}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </SectionHead>
                            )}

                            {tags.length === 0 && users.length === 0 && videos.length === 0 && tracks.length === 0 && lives.length === 0 && posts.length === 0 && (
                                <div className="text-center py-16 px-6">
                                    <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                                    <p className="text-sm font-black text-white/60 mb-1">Kashfiyot hozircha bo&apos;sh</p>
                                    <p className="text-xs" style={{ color: "rgba(80,100,150,0.75)" }}>Birinchi bo&apos;lib kontent qo&apos;shing yoki keyinroq qayta tekshiring.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function SectionHead({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
    return (
        <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 px-4">
                {icon}
                <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>{title}</h4>
            </div>
            {children}
        </div>
    );
}
