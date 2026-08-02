"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import {
    Search, X, Hash, BadgeCheck, Loader2,
    UserPlus, UserCheck, MessageCircle, Heart, Play, Eye, Music2, Radio, Lock,
} from "lucide-react";

interface SAuthor { name: string | null; username: string | null; image?: string | null; verified: boolean }
interface SUser { name: string | null; username: string | null; image: string | null; verified: boolean; isFollowing: boolean; isMe: boolean }
interface SPost { id: string; text: string | null; createdAt: string; likes: number; comments: number; author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null }
interface STag { tag: string; count: number }
interface SVideo { id: string; title: string; thumbUrl: string | null; duration: string; orientation: string; views: number; price: number; author: SAuthor | null }
interface STrack { id: string; title: string; artist: string | null; coverUrl: string | null; audioUrl: string; duration: string; durationSec: number; kind: string; plays: number; author: SAuthor | null }
interface SLive { id: string; title: string; status: string; author: SAuthor | null }

type SResults = { users: SUser[]; posts: SPost[]; tags: STag[]; videos: SVideo[]; tracks: STrack[]; lives: SLive[] };
const EMPTY_RESULTS: SResults = { users: [], posts: [], tags: [], videos: [], tracks: [], lives: [] };
function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

function avatarOf(image: string | null, seed: string | null) {
    return image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || "user")}`;
}

export function NxSearch() {
    const { searchOpen, setSearchOpen, openVideo, openShorts, playTrack } = useNxPlayer();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SResults>(EMPTY_RESULTS);
    const [discover, setDiscover] = useState<{ trendingTags: STag[]; suggestedUsers: SUser[] }>({ trendingTags: [], suggestedUsers: [] });
    const [loading, setLoading] = useState(false);
    const [followBusy, setFollowBusy] = useState<string | null>(null);
    const [followed, setFollowed] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    /* Ochilganda: fokus + discover yuklash; yopilganda tozalash */
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            fetch("/api/nexus/discover").then(r => r.json()).then(setDiscover).catch(() => { });
        } else {
            setQuery(""); setResults(EMPTY_RESULTS);
        }
    }, [searchOpen]);

    /* Escape */
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && searchOpen) setSearchOpen(false); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [searchOpen, setSearchOpen]);

    /* Debounced qidiruv */
    useEffect(() => {
        const q = query.trim();
        if (!q) { setResults(EMPTY_RESULTS); setLoading(false); return; }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const d = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}`).then(r => r.json());
                setResults({
                    users: d.users ?? [], posts: d.posts ?? [], tags: d.tags ?? [],
                    videos: d.videos ?? [], tracks: d.tracks ?? [], lives: d.lives ?? [],
                });
            } finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const follow = useCallback(async (u: SUser) => {
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

    const close = () => setSearchOpen(false);
    const hasQuery = query.trim().length > 0;
    const isFollowingNow = (u: SUser) => u.isFollowing || (!!u.username && followed.has(u.username));
    const hasAny = results.users.length || results.posts.length || results.tags.length || results.videos.length || results.tracks.length || results.lives.length;

    function avatarA(a: SAuthor | null) {
        return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
    }
    function playVideo(v: SVideo) {
        close();
        if (v.orientation === "VERTICAL" && v.price === 0) {
            openShorts([{ id: v.id, image: v.thumbUrl || "", author: v.author?.name || v.author?.username || "Foydalanuvchi", views: fmtN(v.views), likes: "0", duration: v.duration, videoSrc: "" }], 0);
            return;
        }
        openVideo({ id: v.id, title: v.title, image: v.thumbUrl || "", author: v.author?.name || v.author?.username || "Foydalanuvchi", avatar: avatarA(v.author), views: fmtN(v.views), duration: v.duration });
    }
    function listenTrack(t: STrack) {
        close();
        const tr: NxTrack = {
            id: t.id, title: t.title, artist: t.artist || t.author?.name || t.author?.username || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: t.duration, durationSec: t.durationSec, src: t.audioUrl,
        };
        playTrack(tr);
    }

    function UserRow({ u }: { u: SUser }) {
        return (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
                <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={close} className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={avatarOf(u.image, u.username)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-white truncate">{u.name || u.username || "Foydalanuvchi"}</span>
                            {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                        </div>
                        {u.username && <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{u.username}</span>}
                    </div>
                </Link>
                {!u.isMe && u.username && (
                    isFollowingNow(u) ? (
                        <span className="px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(140,160,210,0.85)" }}>
                            <UserCheck className="w-3 h-3" /> Kuzatilmoqda
                        </span>
                    ) : (
                        <button onClick={() => follow(u)} disabled={followBusy === u.username}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 flex-shrink-0 active:scale-95 transition"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                            <UserPlus className="w-3 h-3" /> Kuzatish
                        </button>
                    )
                )}
            </div>
        );
    }

    function Section({ label, children }: { label: string; children: React.ReactNode }) {
        return (
            <div className="mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 px-2" style={{ color: "rgba(43,62,232,0.55)" }}>{label}</p>
                {children}
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 transition-opacity duration-300"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)", opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? "auto" : "none" }}
                onClick={close} />

            <div className="fixed inset-x-0 top-0 z-50 flex flex-col transition-all duration-300"
                style={{
                    background: "rgba(8,12,32,0.98)", borderBottom: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 8px 48px rgba(0,0,0,0.60)", maxHeight: searchOpen ? "85vh" : "0",
                    opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? "auto" : "none",
                    transform: searchOpen ? "translateY(0)" : "translateY(-8px)",
                }}>
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.12)" }}>
                    <Search className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                    <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Odamlar, video, audio, jonli, #hashtag..."
                        className="flex-1 bg-transparent text-white text-base outline-none" style={{ caretColor: "#00CEC8" }} />
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00CEC8" }} />
                        : query && <button onClick={() => setQuery("")}><X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.60)" }} /></button>}
                    <button onClick={close} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(43,62,232,0.12)", color: "rgba(160,176,224,0.80)" }}>Bekor</button>
                </div>

                {/* Kontent */}
                <div className="flex-1 overflow-y-auto px-2 py-3" style={{ scrollbarWidth: "none" }}>
                    {!hasQuery ? (
                        /* ── Kashf (bo'sh holat) ── */
                        <>
                            {discover.trendingTags.length > 0 && (
                                <Section label="Trenddagi hashtaglar">
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {discover.trendingTags.map(t => (
                                            <Link key={t.tag} href={`/nexus/tag/${t.tag}`} onClick={close}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(180,195,235,0.9)" }}>
                                                <Hash className="w-3 h-3" style={{ color: "#00CEC8" }} />{t.tag}
                                                <span className="text-[10px]" style={{ color: "rgba(120,140,185,0.6)" }}>{t.count}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </Section>
                            )}
                            {discover.suggestedUsers.length > 0 && (
                                <Section label="Tavsiya qilingan odamlar">
                                    {discover.suggestedUsers.map((u, i) => <UserRow key={i} u={u} />)}
                                </Section>
                            )}
                            {discover.trendingTags.length === 0 && discover.suggestedUsers.length === 0 && (
                                <p className="text-center py-12 text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Qidirishni boshlang...</p>
                            )}
                        </>
                    ) : loading && !hasAny ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : !hasAny ? (
                        <div className="flex flex-col items-center justify-center py-14">
                            <Search className="w-10 h-10 mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                            <p className="text-sm font-bold text-white/40">Natija topilmadi</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(100,120,170,0.50)" }}>&ldquo;{query}&rdquo; bo&apos;yicha hech narsa yo&apos;q</p>
                        </div>
                    ) : (
                        /* ── Natijalar ── */
                        <>
                            {results.users.length > 0 && (
                                <Section label="Odamlar">{results.users.map((u, i) => <UserRow key={i} u={u} />)}</Section>
                            )}
                            {results.tags.length > 0 && (
                                <Section label="Hashtaglar">
                                    {results.tags.map(t => (
                                        <Link key={t.tag} href={`/nexus/tag/${t.tag}`} onClick={close}
                                            className="flex items-center gap-3 px-2 py-2 rounded-xl">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.12)" }}>
                                                <Hash className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">#{t.tag}</p>
                                                <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>{t.count} ta post</p>
                                            </div>
                                        </Link>
                                    ))}
                                </Section>
                            )}
                            {results.posts.length > 0 && (
                                <Section label="Postlar">
                                    {results.posts.map(p => (
                                        <Link key={p.id} href={p.author?.username ? `/nexus/u/${p.author.username}` : "/nexus"} onClick={close}
                                            className="flex items-start gap-3 px-2 py-2 rounded-xl">
                                            <img src={avatarOf(p.author?.image ?? null, p.author?.username ?? null)} alt="" className="w-9 h-9 rounded-xl object-cover bg-white flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-white truncate">{p.author?.name || p.author?.username || "Foydalanuvchi"}</span>
                                                    {p.author?.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                </div>
                                                <p className="text-[13px] leading-snug mt-0.5 line-clamp-2" style={{ color: "rgba(200,215,245,0.85)" }}>{p.text}</p>
                                                <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "rgba(120,140,185,0.6)" }}>
                                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likes}</span>
                                                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comments}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </Section>
                            )}
                            {results.videos.length > 0 && (
                                <Section label="Videolar">
                                    {results.videos.map(v => (
                                        <button key={v.id} onClick={() => playVideo(v)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left active:scale-[0.99] transition">
                                            <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(11,18,40,0.7)" }}>
                                                {v.thumbUrl ? <img src={v.thumbUrl} alt="" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4" style={{ color: "rgba(120,140,185,0.4)" }} /></div>}
                                                {v.price > 0 && <span className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 rounded text-[8px] font-black text-white" style={{ background: "rgba(43,62,232,0.9)" }}><Lock className="w-2 h-2" />{fmtN(v.price)}</span>}
                                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{v.duration}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{v.title}</p>
                                                <p className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: "rgba(120,140,185,0.7)" }}>
                                                    {v.author?.name || v.author?.username || "Foydalanuvchi"} · <Eye className="w-2.5 h-2.5" />{fmtN(v.views)}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </Section>
                            )}
                            {results.tracks.length > 0 && (
                                <Section label="Audio">
                                    {results.tracks.map(t => (
                                        <button key={t.id} onClick={() => listenTrack(t)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left active:scale-[0.99] transition">
                                            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }}>
                                                {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-4 h-4" style={{ color: "rgba(120,140,185,0.5)" }} /></div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-white truncate">{t.title}</p>
                                                <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.75)" }}>{t.artist || t.author?.name || "Noma'lum"}</p>
                                            </div>
                                            <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: "rgba(100,120,170,0.7)" }}><Play className="w-2.5 h-2.5" />{fmtN(t.plays)}</span>
                                        </button>
                                    ))}
                                </Section>
                            )}
                            {results.lives.length > 0 && (
                                <Section label="Jonli efirlar">
                                    {results.lives.map(s => (
                                        <Link key={s.id} href={`/nexus/live/${s.id}`} onClick={close} className="flex items-center gap-3 px-2 py-2 rounded-xl">
                                            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))" }}>
                                                <img src={avatarA(s.author)} alt="" className="w-7 h-7 rounded-full object-cover bg-white" />
                                                {s.status === "LIVE" && <span className="absolute -bottom-px inset-x-0 text-center text-[7px] font-black text-white py-px" style={{ background: "#EF4444" }}>LIVE</span>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-white truncate">{s.title}</p>
                                                <p className="text-[11px] flex items-center gap-1" style={{ color: "rgba(120,140,185,0.75)" }}>
                                                    <Radio className="w-2.5 h-2.5" />{s.status === "LIVE" ? "Hozir jonli" : "Tez orada"} · {s.author?.name || s.author?.username || "Streamer"}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </Section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
