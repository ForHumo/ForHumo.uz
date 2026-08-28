"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { Link } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { NxText } from "./nx-rich-text";
import {
    Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
    BadgeCheck, Image as ImgIcon, Loader2, Trash2, Send, X, Flag,
    MapPin, Lock, Users, BarChart2, CheckCircle2, Star, Pencil,
    ArrowUp, RefreshCw, Compass, UserPlus, Sparkles, Clock,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import { NxVerifiedBadge } from "./nx-verified-badge";

// ─────────────────────────────────────────────────────────────────────────────
// Tiplar (real API)
// ─────────────────────────────────────────────────────────────────────────────
interface Author { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface Post {
    id: string; text: string | null; media: string[]; hashtags: string[];
    shareCount: number; createdAt: string;
    privacy?: "PUBLIC" | "FOLLOWERS" | "SUBSCRIBERS" | "PRIVATE"; location?: string | null;
    pollOptions?: string[]; pollEndsAt?: string | null; pollVotes?: number[]; myVote?: number | null;
    editedAt?: string | null;
    author: Author | null; likes: number; comments: number;
    liked: boolean; saved: boolean; isMine: boolean;
}
const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}
function avatarOf(a: Author | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "user")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxSocialFeed
// ─────────────────────────────────────────────────────────────────────────────
export function NxSocialFeed({ authorUsername, tag, postId, controlledTab, hideTabBar }: {
    authorUsername?: string; tag?: string; postId?: string;
    controlledTab?: "foryou" | "following" | "explore";
    hideTabBar?: boolean;
} = {}) {
    const profileMode = !!authorUsername || !!tag || !!postId;
    const { openShareSheet } = useNxPlayer();
    const { data: session } = useSession();
    const PAGE = 15;

    const [posts, setPosts] = useState<Post[]>([]);
    const [tabState, setTab] = useState<"foryou" | "following" | "explore">("foryou");
    const tab = controlledTab ?? tabState;
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [postText, setPostText] = useState("");
    const [media, setMedia] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function aiSuggest() {
        if (aiBusy) return;
        setAiBusy(true);
        try {
            const res = await fetch("/api/nexus/ai/suggest-post", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hint: postText.trim().slice(0, 200) }),
            });
            if (res.ok) {
                const d = await res.json();
                if (d.text) setPostText(d.text);
            }
        } catch { /* jim */ } finally { setAiBusy(false); }
    }

    // ── Yangi postlar bildirishi (H-3) ──
    const [newCount, setNewCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const topPostIdRef = useRef<string | null>(null);

    // ── Pull-to-refresh (H-2) ──
    const pullYRef = useRef<number>(0);
    const [pullOffset, setPullOffset] = useState(0);
    const [pullActive, setPullActive] = useState(false);
    const scrollerRef = useRef<HTMLDivElement>(null);

    const loadFirst = useCallback(async () => {
        setLoading(true);
        if (postId) {
            // Bitta post (permalink)
            const d = await fetch(`/api/nexus/posts/${postId}`).then(r => r.json()).catch(() => ({}));
            setPosts(d.post ? [d.post] : []); setOffset(0); setHasMore(false);
            setLoading(false);
            return;
        }
        const url = authorUsername
            ? `/api/nexus/posts?author=${encodeURIComponent(authorUsername)}&limit=${PAGE}&offset=0`
            : tag
                ? `/api/nexus/posts?tag=${encodeURIComponent(tag)}&limit=${PAGE}&offset=0`
                : `/api/nexus/posts?tab=${tab}&limit=${PAGE}&offset=0`;
        const data = await fetch(url).then(r => r.json());
        const list: Post[] = data.posts ?? [];
        setPosts(list); setOffset(list.length); setHasMore(data.hasMore ?? false);
        topPostIdRef.current = list[0]?.id ?? null;
        setNewCount(0);
        setLoading(false);
    }, [tab, authorUsername, tag, postId]);

    useEffect(() => { loadFirst(); }, [loadFirst]);

    // ── Yangi post pollingi (H-3) — faqat umumiy feed ──
    useEffect(() => {
        if (profileMode) return;
        const iv = setInterval(async () => {
            try {
                const url = `/api/nexus/posts?tab=${tab}&limit=5&offset=0`;
                const d = await fetch(url).then(r => r.json());
                const list: Post[] = d.posts ?? [];
                const topId = topPostIdRef.current;
                if (!topId) { topPostIdRef.current = list[0]?.id ?? null; return; }
                let count = 0;
                for (const p of list) { if (p.id === topId) break; count++; }
                if (count > 0) setNewCount(prev => Math.max(prev, count));
            } catch { /* jim */ }
        }, 25_000);
        return () => clearInterval(iv);
    }, [tab, profileMode]);

    async function refreshTop() {
        setRefreshing(true);
        await loadFirst();
        setRefreshing(false);
        if (scrollerRef.current) scrollerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ── Pull-to-refresh handlers (H-2) ──
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const el = scrollerRef.current;
        if (!el || el.scrollTop > 0 || profileMode) return;
        pullYRef.current = e.touches[0].clientY;
        setPullActive(true);
    }, [profileMode]);
    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!pullActive) return;
        const dy = e.touches[0].clientY - pullYRef.current;
        if (dy > 0) setPullOffset(Math.min(80, dy * 0.5));
    }, [pullActive]);
    const onTouchEnd = useCallback(() => {
        if (!pullActive) return;
        setPullActive(false);
        if (pullOffset > 55) refreshTop();
        setPullOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pullActive, pullOffset]);

    async function loadMore() {
        setLoadingMore(true);
        const url = authorUsername
            ? `/api/nexus/posts?author=${encodeURIComponent(authorUsername)}&limit=${PAGE}&offset=${offset}`
            : tag
                ? `/api/nexus/posts?tag=${encodeURIComponent(tag)}&limit=${PAGE}&offset=${offset}`
                : `/api/nexus/posts?tab=${tab}&limit=${PAGE}&offset=${offset}`;
        const data = await fetch(url).then(r => r.json());
        const list: Post[] = data.posts ?? [];
        setPosts(prev => [...prev, ...list]); setOffset(o => o + list.length); setHasMore(data.hasMore ?? false);
        setLoadingMore(false);
    }

    function patch(id: string, fn: (p: Post) => Post) {
        setPosts(prev => prev.map(p => p.id === id ? fn(p) : p));
    }

    async function toggleLike(p: Post) {
        patch(p.id, x => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }));
        try {
            const res = await fetch(`/api/nexus/posts/${p.id}/like`, { method: "POST" });
            if (res.ok) { const d = await res.json(); patch(p.id, x => ({ ...x, liked: d.liked, likes: d.count })); }
        } catch { /* keyingi load tiklaydi */ }
    }
    async function toggleSave(p: Post) {
        patch(p.id, x => ({ ...x, saved: !x.saved }));
        await fetch(`/api/nexus/posts/${p.id}/save`, { method: "POST" }).catch(() => {});
    }
    async function deletePost(id: string) {
        setPosts(prev => prev.filter(p => p.id !== id));
        await fetch(`/api/nexus/posts/${id}`, { method: "DELETE" }).catch(() => {});
    }

    // So'rovnomada ovoz berish — optimistik
    async function votePoll(p: Post, idx: number) {
        if (p.myVote === idx) return;
        patch(p.id, x => {
            const votes = [...(x.pollVotes ?? x.pollOptions?.map(() => 0) ?? [])];
            if (x.myVote != null && votes[x.myVote] != null) votes[x.myVote] = Math.max(0, votes[x.myVote] - 1);
            votes[idx] = (votes[idx] ?? 0) + 1;
            return { ...x, myVote: idx, pollVotes: votes };
        });
        try {
            const r = await fetch(`/api/nexus/posts/${p.id}/vote`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ option: idx }),
            });
            if (r.ok) { const d = await r.json(); patch(p.id, x => ({ ...x, pollVotes: d.votes, myVote: d.myVote })); }
        } catch { /* keyingi load tiklaydi */ }
    }

    // "+" composer'dan yangi post kelganda lentaga qo'shish
    useEffect(() => {
        const h = (e: Event) => {
            const post = (e as CustomEvent).detail as Post | undefined;
            if (post && !profileMode) {
                setPosts(prev => [post, ...prev]);
                topPostIdRef.current = post.id;
            }
        };
        window.addEventListener("nexus:post-created", h);
        return () => window.removeEventListener("nexus:post-created", h);
    }, [profileMode]);

    async function pickFiles(files: FileList | null) {
        if (!files?.length) return;
        setUploading(true);
        try {
            for (const file of Array.from(files).slice(0, 4)) {
                const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const blob = await upload(`nexus/${Date.now()}-${safe}`, file, {
                    access: "public", handleUploadUrl: "/api/market/upload/client-token",
                });
                setMedia(prev => [...prev, blob.url]);
            }
        } catch { /* ignore */ } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
    }

    async function submitPost() {
        if (!postText.trim() && !media.length) return;
        setSending(true);
        try {
            const res = await fetch("/api/nexus/posts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: postText, media }),
            });
            const d = await res.json();
            if (res.ok) {
                setPosts(prev => [d.post, ...prev]);
                topPostIdRef.current = d.post?.id ?? topPostIdRef.current;
                setPostText(""); setMedia([]);
            }
        } finally { setSending(false); }
    }

    return (
        <div
            ref={scrollerRef}
            className="max-w-2xl mx-auto"
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ transform: pullOffset > 0 ? `translate3d(0,${pullOffset}px,0)` : undefined, transition: pullActive ? "none" : "transform 200ms ease-out" }}
        >
            {/* Pull-to-refresh indicator (H-2) */}
            {(pullOffset > 0 || refreshing) && (
                <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: -50, height: 50 }}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{ background: "rgba(8,14,32,0.90)", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing || pullOffset > 55 ? "animate-spin" : ""}`}
                            style={{ color: "#00CEC8", transform: !refreshing && pullOffset <= 55 ? `rotate(${pullOffset * 4}deg)` : undefined }} />
                        <span className="text-[10px] font-black" style={{ color: "rgba(200,215,245,0.90)" }}>
                            {refreshing ? "Yangilanmoqda..." : pullOffset > 55 ? "Qo'yib yuboring" : "Pastga torting"}
                        </span>
                    </div>
                </div>
            )}

            {/* NEW POSTS ↑ chip (H-3) */}
            {!profileMode && newCount > 0 && (
                <div className="sticky top-2 z-30 flex justify-center pointer-events-none">
                    <button onClick={refreshTop}
                        className="pointer-events-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black text-white nx-pop shadow-lg active:scale-95"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 6px 20px rgba(43,62,232,0.45)" }}>
                        <ArrowUp className="w-3.5 h-3.5" />
                        {newCount === 1 ? "1 yangi post" : `${newCount}+ yangi post`}
                    </button>
                </div>
            )}

            {/* ── Tab (faqat umumiy feed va tashqi controlled emas) ── */}
            {!profileMode && !hideTabBar && (
            <div className="sticky top-0 z-20 flex gap-0 mx-4 mt-4 mb-3 rounded-2xl overflow-hidden backdrop-blur-md"
                style={{ background: "rgba(8,14,32,0.85)", border: "1px solid rgba(43,62,232,0.18)" }}>
                {(["foryou", "following", "explore"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="flex-1 py-2.5 text-xs font-black transition-all duration-200"
                        style={tab === t ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { color: "rgba(140,160,210,0.75)" }}
                    >
                        {t === "foryou" ? "Recommendation" : t === "following" ? "Following" : "Explore"}
                    </button>
                ))}
            </div>
            )}

            {/* ── Post yaratish (faqat umumiy feed) ── */}
            {!profileMode && (
            <div className="mx-4 mb-4 p-4 rounded-2xl"
                style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <img src={session?.user?.image || "https://api.dicebear.com/9.x/avataaars/svg?seed=me"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <textarea value={postText} onChange={e => setPostText(e.target.value)}
                        placeholder="Nima haqida o'ylayapsiz?" rows={2}
                        className="flex-1 bg-transparent text-sm text-white outline-none resize-none leading-relaxed" style={{ caretColor: "#00CEC8" }} />
                </div>

                {/* Media preview */}
                {media.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pl-12">
                        {media.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(43,62,232,0.25)" }}>
                                {isVid(url) ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} alt="" className="w-full h-full object-cover" />}
                                <button onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                                    <X className="w-2.5 h-2.5 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-3 flex items-center justify-between pl-12">
                    <div className="flex items-center gap-2">
                        <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Rasm/video"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150" style={{ background: "rgba(43,62,232,0.08)" }}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00CEC8" }} /> : <ImgIcon className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.60)" }} />}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={e => pickFiles(e.target.files)} className="hidden" />
                        <button onClick={aiSuggest} disabled={aiBusy || sending} title="AI'dan mavzu"
                            className="h-8 px-2.5 flex items-center gap-1 rounded-xl text-[10px] font-black transition-all duration-150 active:scale-95 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.18),rgba(0,206,200,0.18))",
                                border: "1px solid rgba(139,92,246,0.35)", color: "#C4B5FD" }}>
                            {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {aiBusy ? "..." : "AI mavzu"}
                        </button>
                    </div>
                    <button onClick={submitPost} disabled={sending || uploading || (!postText.trim() && !media.length)}
                        className="px-4 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 active:scale-95 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {sending ? "Yuborilmoqda..." : "Ulashish"}
                    </button>
                </div>
            </div>
            )}

            {/* ── Postlar ── */}
            {loading ? (
                <div className="flex flex-col gap-3 px-4 pb-4">
                    {[0,1,2].map(i => <PostSkeleton key={i} />)}
                </div>
            ) : posts.length === 0 ? (
                <EmptyState tab={tab} profileMode={profileMode} />
            ) : (
                <div className="flex flex-col gap-3 px-4 pb-4">
                    {posts.map(p => (
                        <PostCard key={p.id} post={p}
                            onLike={() => toggleLike(p)} onSave={() => toggleSave(p)}
                            onDelete={() => deletePost(p.id)}
                            onShare={() => openShareSheet((p.text ?? "Humo Nexus posti").slice(0, 60), `${typeof window !== "undefined" ? window.location.origin : "https://forhumo.uz"}/nexus/p/${p.id}`)}
                            onBump={() => patch(p.id, x => ({ ...x, comments: x.comments + 1 }))}
                            onVote={idx => votePoll(p, idx)}
                        />
                    ))}
                    {hasMore && (
                        <button onClick={loadMore} disabled={loadingMore}
                            className="mx-auto mt-2 px-6 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: "rgba(43,62,232,0.15)" }}>
                            {loadingMore ? "..." : "Ko'proq"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PostCard
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post: p, onLike, onSave, onDelete, onShare, onBump, onVote }: {
    post: Post; onLike: () => void; onSave: () => void; onDelete: () => void; onShare: () => void; onBump: () => void;
    onVote: (idx: number) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [following, setFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [reported, setReported] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(p.text ?? "");
    const [editBusy, setEditBusy] = useState(false);
    const [localText, setLocalText] = useState<string | null>(null);
    const [edited, setEdited] = useState(!!p.editedAt);
    const shownText = localText ?? p.text;

    async function saveEdit() {
        if (editBusy) return;
        setEditBusy(true);
        try {
            const res = await fetch(`/api/nexus/posts/${p.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: editText }),
            });
            if (res.ok) { const d = await res.json(); setLocalText(d.text ?? ""); setEdited(true); setEditing(false); }
        } finally { setEditBusy(false); }
    }

    async function toggleFollow() {
        if (!p.author?.username) return;
        setFollowing(f => !f);
        await fetch("/api/nexus/follow", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: p.author.username }),
        }).catch(() => {});
    }

    async function reportPost() {
        if (reported) return;
        setReported(true);
        await fetch("/api/nexus/report", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "POST", targetId: p.id }),
        }).catch(() => {});
    }

    // Reading time chip (H-20) — 200+ char postlarda
    const wordCount = shownText ? shownText.trim().split(/\s+/).filter(Boolean).length : 0;
    const readMin = wordCount >= 60 ? Math.max(1, Math.round(wordCount / 200)) : 0;

    return (
        <div className="rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.005] hover:shadow-xl"
            style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                {p.author?.username ? (
                    <Link href={`/nexus/u/${p.author.username}`} className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                            <img src={avatarOf(p.author)} alt="" className="w-full h-full object-cover bg-white" />
                        </div>
                    </Link>
                ) : (
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                            <img src={avatarOf(p.author)} alt="" className="w-full h-full object-cover bg-white" />
                        </div>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        {p.author?.username ? (
                            <Link href={`/nexus/u/${p.author.username}`} className="text-sm font-bold text-white truncate hover:underline">
                                {p.author?.name ?? p.author.username}
                            </Link>
                        ) : (
                            <span className="text-sm font-bold text-white truncate">{p.author?.name ?? "Foydalanuvchi"}</span>
                        )}
                        {p.author?.verified && <NxVerifiedBadge category={p.author?.verifiedCategory} size={14} />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>
                        {p.author?.username && <span>@{p.author.username}</span>}
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
                        {p.privacy === "FOLLOWERS" && <Users className="w-3 h-3" />}
                        {p.privacy === "SUBSCRIBERS" && <Star className="w-3 h-3" style={{ color: "#8B5CF6" }} />}
                        {p.privacy === "PRIVATE" && <Lock className="w-3 h-3" />}
                        {p.location && (
                            <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{p.location}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!p.isMine && p.author?.username && (
                        <button onClick={toggleFollow}
                            className="px-3 py-1 rounded-xl text-[10px] font-black transition-all duration-150 active:scale-95"
                            style={following
                                ? { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.75)" }
                                : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.30)", color: "#2B3EE8" }}>
                            {following ? "Kuzatilmoqda" : "Kuzatish"}
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={() => setMenuOpen(!menuOpen)} className="w-7 h-7 flex items-center justify-center rounded-lg"
                            style={{ background: menuOpen ? "rgba(43,62,232,0.12)" : "transparent" }}>
                            <MoreHorizontal className="w-4 h-4" style={{ color: "rgba(80,100,150,0.70)" }} />
                        </button>
                        {menuOpen && (
                            p.isMine ? (
                                <div className="absolute right-0 top-8 z-10 rounded-xl overflow-hidden whitespace-nowrap" style={{ background: "rgba(8,14,32,0.98)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    <button onClick={() => { setMenuOpen(false); setEditText(shownText ?? ""); setEditing(true); }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold w-full" style={{ color: "rgba(180,195,235,0.95)" }}>
                                        <Pencil className="w-3.5 h-3.5" /> Tahrirlash
                                    </button>
                                    <button onClick={() => { setMenuOpen(false); onDelete(); }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold w-full" style={{ color: "#EF4444", borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                                        <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => { setMenuOpen(false); reportPost(); }} disabled={reported}
                                    className="absolute right-0 top-8 z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                                    style={{ background: "rgba(8,14,32,0.98)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
                                    <Flag className="w-3.5 h-3.5" /> {reported ? "Yuborildi" : "Shikoyat"}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Matn */}
            {editing ? (
                <div className="px-4 pb-3">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                        style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.25)", caretColor: "#00CEC8" }} />
                    <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(43,62,232,0.08)", color: "rgba(160,180,230,0.85)" }}>Bekor</button>
                        <button onClick={saveEdit} disabled={editBusy} className="px-4 py-1.5 rounded-lg text-xs font-black text-white flex items-center gap-1.5" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {editBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Saqlash
                        </button>
                    </div>
                </div>
            ) : shownText && (
                <div className="px-4 pb-3">
                    {readMin > 0 && (
                        <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"
                            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)", color: "#C4B5FD" }}>
                            <Clock className="w-2.5 h-2.5" />{readMin} daq o&apos;qish
                        </div>
                    )}
                    <NxText text={shownText} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(200,215,245,0.90)" }} />
                    {edited && <span className="text-[10px] ml-1" style={{ color: "rgba(80,100,150,0.7)" }}>(tahrirlangan)</span>}
                    {p.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {p.hashtags.map(h => <Link key={h} href={`/nexus/tag/${h}`} className="text-xs font-bold hover:underline" style={{ color: "#2B3EE8" }}>#{h}</Link>)}
                        </div>
                    )}
                </div>
            )}

            {/* So'rovnoma */}
            {(p.pollOptions?.length ?? 0) >= 2 && (() => {
                const opts = p.pollOptions!;
                const votes = p.pollVotes ?? opts.map(() => 0);
                const total = votes.reduce((a, b) => a + b, 0);
                const expired = !!p.pollEndsAt && new Date(p.pollEndsAt).getTime() < Date.now();
                const showResults = p.myVote != null || expired;
                const leftMs = p.pollEndsAt ? new Date(p.pollEndsAt).getTime() - Date.now() : 0;
                const leftLabel = expired ? "Tugagan" : leftMs > 86_400_000 ? `${Math.ceil(leftMs / 86_400_000)} kun qoldi` : `${Math.max(1, Math.ceil(leftMs / 3_600_000))} soat qoldi`;
                return (
                    <div className="mx-4 mb-3 flex flex-col gap-1.5">
                        {opts.map((opt, i) => {
                            const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0;
                            const isMyVote = p.myVote === i;
                            return (
                                <button key={i} onClick={() => !expired && onVote(i)} disabled={expired}
                                    className="relative w-full px-3 py-2.5 rounded-xl text-left overflow-hidden transition active:scale-[0.99]"
                                    style={{ background: "rgba(43,62,232,0.06)", border: `1px solid ${isMyVote ? "rgba(0,206,200,0.5)" : "rgba(43,62,232,0.20)"}` }}>
                                    {showResults && (
                                        <div className="absolute inset-y-0 left-0 transition-all duration-500"
                                            style={{ width: `${pct}%`, background: isMyVote ? "rgba(0,206,200,0.18)" : "rgba(43,62,232,0.16)" }} />
                                    )}
                                    <div className="relative flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-white flex items-center gap-1.5 min-w-0">
                                            <span className="truncate">{opt}</span>
                                            {isMyVote && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        </span>
                                        {showResults && <span className="text-[11px] font-black flex-shrink-0" style={{ color: isMyVote ? "#00CEC8" : "rgba(140,160,210,0.85)" }}>{pct}%</span>}
                                    </div>
                                </button>
                            );
                        })}
                        <p className="px-1 text-[10px] flex items-center gap-1" style={{ color: "rgba(80,100,150,0.75)" }}>
                            <BarChart2 className="w-3 h-3" />{total} ovoz · {leftLabel}
                        </p>
                    </div>
                );
            })()}

            {/* Media (Nexus feed rasm/video kartochka — DM bilan bir xil dizayn) */}
            {p.media.length > 0 && (
                <div className={`mx-4 mb-3 grid gap-1.5 ${p.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {p.media.map((url, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden bg-black">
                            {isVid(url) ? (
                                <video src={url} controls playsInline preload="metadata"
                                    className="w-full max-h-[420px] object-cover cursor-pointer" />
                            ) : (
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                    className="block active:scale-[0.99] transition-transform">
                                    <img src={url} alt="" loading="lazy"
                                        className="w-full max-h-[420px] object-cover cursor-zoom-in" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Harakatlar */}
            <div className="flex items-center gap-1 px-4 pb-3 pt-1" style={{ borderTop: "1px solid rgba(43,62,232,0.08)" }}>
                <LikeBtn liked={p.liked} count={p.likes} onClick={onLike} />
                <ActionBtn icon={MessageCircle} count={p.comments} onClick={() => setShowComments(s => !s)} />
                <ActionBtn icon={Share2} count={p.shareCount} onClick={onShare} />
                <div className="flex-1" />
                <SaveBtn saved={p.saved} onClick={onSave} />
            </div>

            {/* Izohlar */}
            {showComments && <CommentsSection postId={p.id} onAdded={onBump} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Izohlar
// ─────────────────────────────────────────────────────────────────────────────
interface CommentT { id: string; parentId: string | null; text: string; createdAt: string; author: Author | null; isMine: boolean }
function CommentsSection({ postId, onAdded }: { postId: string; onAdded: () => void }) {
    const [comments, setComments] = useState<CommentT[]>([]);
    const [canComment, setCanComment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [reportedC, setReportedC] = useState<Set<string>>(new Set());

    async function reportComment(id: string) {
        if (reportedC.has(id)) return;
        setReportedC(prev => new Set(prev).add(id));
        await fetch("/api/nexus/report", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "COMMENT", targetId: id }),
        }).catch(() => {});
    }

    useEffect(() => {
        fetch(`/api/nexus/posts/${postId}/comments`).then(r => r.json())
            .then(d => { setComments(d.comments ?? []); setCanComment(d.canComment ?? false); })
            .finally(() => setLoading(false));
    }, [postId]);

    async function submit() {
        if (!text.trim()) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/nexus/posts/${postId}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
            });
            const d = await res.json();
            if (res.ok) { setComments(prev => [...prev, d.comment]); setText(""); onAdded(); }
        } finally { setBusy(false); }
    }

    return (
        <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: "1px solid rgba(43,62,232,0.08)" }}>
            {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : (
                <>
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5 pt-2">
                            <img src={avatarOf(c.author)} alt="" className="w-7 h-7 rounded-lg object-cover bg-white flex-shrink-0" />
                            <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: "rgba(43,62,232,0.06)" }}>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{c.author?.name ?? c.author?.username ?? "Foydalanuvchi"}</span>
                                    {c.author?.verified && <NxVerifiedBadge category={(c.author as unknown as { verifiedCategory?: string | null })?.verifiedCategory} size={12} />}
                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.7)" }}>{timeAgo(c.createdAt)}</span>
                                    {!c.isMine && (
                                        <button onClick={() => reportComment(c.id)} disabled={reportedC.has(c.id)} title="Shikoyat"
                                            className="ml-auto flex items-center gap-0.5 text-[9px] active:scale-95"
                                            style={{ color: reportedC.has(c.id) ? "rgba(80,100,150,0.6)" : "#F59E0B" }}>
                                            <Flag className="w-2.5 h-2.5" />{reportedC.has(c.id) ? " Yuborildi" : ""}
                                        </button>
                                    )}
                                </div>
                                <NxText text={c.text} className="text-xs mt-0.5" style={{ color: "rgba(200,215,245,0.85)" }} />
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-xs text-center py-2" style={{ color: "rgba(80,100,150,0.7)" }}>Birinchi bo&apos;lib izoh qoldiring</p>}

                    {canComment ? (
                        <div className="flex gap-2 items-center pt-1">
                            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
                                placeholder="Izoh yozing..." maxLength={500}
                                className="flex-1 bg-transparent text-xs text-white outline-none rounded-xl px-3 py-2"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.18)" }} />
                            <button onClick={submit} disabled={busy || !text.trim()}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-center py-1" style={{ color: "rgba(80,100,150,0.7)" }}>Izoh yozish uchun tizimga kiring</p>
                    )}
                </>
            )}
        </div>
    );
}

function formatCount(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Like button — heart pop animation
// ─────────────────────────────────────────────────────────────────────────────
function LikeBtn({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
    const heartRef = useRef<SVGSVGElement>(null);
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (heartRef.current) {
            heartRef.current.classList.remove("nx-heart-pop");
            void (heartRef.current as unknown as HTMLElement).offsetWidth;
            heartRef.current.classList.add("nx-heart-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top = `${e.clientY - rect.top}px`;
        dot.style.background = "rgba(239,68,68,0.35)";
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button onClick={handleClick} className="nx-ripple-wrap nx-press flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ color: liked ? "#EF4444" : "rgba(80,100,150,0.80)" }}>
            <Heart ref={heartRef as React.Ref<SVGSVGElement>} className="w-4 h-4 flex-shrink-0"
                style={{ fill: liked ? "#EF4444" : "none", color: liked ? "#EF4444" : "rgba(80,100,150,0.80)" }} />
            {formatCount(count)}
        </button>
    );
}

function ActionBtn({ icon: Icon, count, onClick }: { icon: React.ElementType; count: number; onClick: () => void }) {
    const iconRef = useRef<SVGSVGElement>(null);
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button onClick={handleClick} className="nx-ripple-wrap nx-press flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ color: "rgba(80,100,150,0.80)" }}>
            <Icon ref={iconRef as React.Ref<SVGSVGElement>} className="w-4 h-4 flex-shrink-0" />
            {formatCount(count)}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton kartochka (H-4)
// ─────────────────────────────────────────────────────────────────────────────
function PostSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden animate-pulse"
            style={{ background: "rgba(8,14,32,0.60)", border: "1px solid rgba(43,62,232,0.12)" }}>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="w-10 h-10 rounded-2xl" style={{ background: "rgba(43,62,232,0.15)" }} />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded" style={{ background: "rgba(43,62,232,0.15)", width: "40%" }} />
                    <div className="h-2 rounded" style={{ background: "rgba(43,62,232,0.10)", width: "25%" }} />
                </div>
            </div>
            <div className="px-4 pb-3 space-y-2">
                <div className="h-3 rounded" style={{ background: "rgba(43,62,232,0.12)" }} />
                <div className="h-3 rounded" style={{ background: "rgba(43,62,232,0.12)", width: "80%" }} />
                <div className="h-3 rounded" style={{ background: "rgba(43,62,232,0.12)", width: "60%" }} />
            </div>
            <div className="mx-4 mb-3 h-40 rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} />
            <div className="flex items-center gap-3 px-4 pb-3 pt-1">
                <div className="h-7 w-14 rounded-lg" style={{ background: "rgba(43,62,232,0.10)" }} />
                <div className="h-7 w-14 rounded-lg" style={{ background: "rgba(43,62,232,0.10)" }} />
                <div className="h-7 w-14 rounded-lg" style={{ background: "rgba(43,62,232,0.10)" }} />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bo'sh holat (H-5) — tab'ga qarab boshqa xabar
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ tab, profileMode }: { tab: "foryou" | "following" | "explore"; profileMode: boolean }) {
    if (profileMode) {
        return (
            <div className="text-center py-16 px-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(43,62,232,0.10)" }}>
                    <MessageCircle className="w-6 h-6" style={{ color: "rgba(140,160,210,0.75)" }} />
                </div>
                <p className="text-sm font-black text-white/85 mb-1">Hali post yo&apos;q</p>
                <p className="text-xs" style={{ color: "rgba(80,100,150,0.75)" }}>Bu foydalanuvchi hali post ulashmagan.</p>
            </div>
        );
    }
    if (tab === "following") {
        return (
            <div className="text-center py-14 px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.15),rgba(0,206,200,0.15))", border: "1px solid rgba(43,62,232,0.25)" }}>
                    <UserPlus className="w-7 h-7" style={{ color: "#00CEC8" }} />
                </div>
                <p className="text-base font-black text-white mb-2">Obunalar bo&apos;sh</p>
                <p className="text-xs mb-4" style={{ color: "rgba(140,160,210,0.85)" }}>
                    Kuzatgan odamlaringizdan hali post yo&apos;q. Qiziqarli mualliflarni Kashfiyot tabidan toping.
                </p>
                <a href="#" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent("nexus:open-explore")); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Compass className="w-3.5 h-3.5" /> Kashfiyotga o&apos;tish
                </a>
            </div>
        );
    }
    if (tab === "explore") {
        return (
            <div className="text-center py-14 px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(0,206,200,0.15))", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <Compass className="w-7 h-7" style={{ color: "#8B5CF6" }} />
                </div>
                <p className="text-base font-black text-white mb-2">Trending hali bo&apos;sh</p>
                <p className="text-xs" style={{ color: "rgba(140,160,210,0.85)" }}>
                    Bugun trending postlar hali to&apos;planmagan. Birinchi bo&apos;lib mavzu boshlang!
                </p>
            </div>
        );
    }
    return (
        <div className="text-center py-14 px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.15),rgba(0,206,200,0.15))", border: "1px solid rgba(43,62,232,0.25)" }}>
                <Sparkles className="w-7 h-7" style={{ color: "#00CEC8" }} />
            </div>
            <p className="text-base font-black text-white mb-2">Feed bo&apos;sh</p>
            <p className="text-xs" style={{ color: "rgba(140,160,210,0.85)" }}>
                Birinchi bo&apos;lib post ulashing yoki qiziqarli odamlarni kuzata boshlang.
            </p>
        </div>
    );
}

function SaveBtn({ saved, onClick }: { saved: boolean; onClick: () => void }) {
    const bookRef = useRef<SVGSVGElement>(null);
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (bookRef.current) {
            bookRef.current.classList.remove("nx-pop");
            void (bookRef.current as unknown as HTMLElement).offsetWidth;
            bookRef.current.classList.add("nx-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top = `${e.clientY - rect.top}px`;
        dot.style.background = "rgba(0,206,200,0.35)";
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button onClick={handleClick} className="nx-ripple-wrap nx-press w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ color: saved ? "#00CEC8" : "rgba(80,100,150,0.80)" }}>
            <Bookmark ref={bookRef as React.Ref<SVGSVGElement>} className="w-4 h-4"
                style={{ fill: saved ? "#00CEC8" : "none", color: saved ? "#00CEC8" : "rgba(80,100,150,0.80)" }} />
        </button>
    );
}
