"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    Search, X, Hash, BadgeCheck, Loader2,
    UserPlus, UserCheck, MessageCircle, Heart,
} from "lucide-react";

interface SUser { name: string | null; username: string | null; image: string | null; verified: boolean; isFollowing: boolean; isMe: boolean }
interface SPost { id: string; text: string | null; createdAt: string; likes: number; comments: number; author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null }
interface STag { tag: string; count: number }

function avatarOf(image: string | null, seed: string | null) {
    return image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || "user")}`;
}

export function NxSearch() {
    const { searchOpen, setSearchOpen } = useNxPlayer();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ users: SUser[]; posts: SPost[]; tags: STag[] }>({ users: [], posts: [], tags: [] });
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
            setQuery(""); setResults({ users: [], posts: [], tags: [] });
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
        if (!q) { setResults({ users: [], posts: [], tags: [] }); setLoading(false); return; }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const d = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}`).then(r => r.json());
                setResults({ users: d.users ?? [], posts: d.posts ?? [], tags: d.tags ?? [] });
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
                        placeholder="Odamlar, postlar, #hashtag..."
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
                    ) : loading && results.users.length === 0 && results.posts.length === 0 && results.tags.length === 0 ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : (results.users.length === 0 && results.posts.length === 0 && results.tags.length === 0) ? (
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
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
