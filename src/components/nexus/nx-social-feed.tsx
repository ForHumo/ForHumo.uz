"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { Link } from "@/i18n/routing";
import {
    Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
    BadgeCheck, Image as ImgIcon, Loader2, Trash2, Send, X,
    ShoppingBag, Search,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Tiplar (real API)
// ─────────────────────────────────────────────────────────────────────────────
interface Author { name: string | null; username: string | null; image: string | null; verified: boolean }
interface AttachedProduct { slug: string; name: string; image: string | null; price: string; oldPrice: string | null }
interface PickedProduct { id: string; slug: string; name: string; image: string | null; price: string }
interface Post {
    id: string; text: string | null; media: string[]; hashtags: string[];
    marketProductId: string | null; product?: AttachedProduct | null; shareCount: number; createdAt: string;
    author: Author | null; likes: number; comments: number;
    liked: boolean; saved: boolean; isMine: boolean;
}
function fz(v: string | number) { return Number(v).toLocaleString(); }

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
export function NxSocialFeed() {
    const { openShareSheet } = useNxPlayer();
    const { data: session } = useSession();
    const PAGE = 15;

    const [posts, setPosts] = useState<Post[]>([]);
    const [tab, setTab] = useState<"following" | "explore">("explore");
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [postText, setPostText] = useState("");
    const [media, setMedia] = useState<string[]>([]);
    const [attached, setAttached] = useState<PickedProduct | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadFirst = useCallback(async () => {
        setLoading(true);
        const data = await fetch(`/api/nexus/posts?tab=${tab}&limit=${PAGE}&offset=0`).then(r => r.json());
        const list: Post[] = data.posts ?? [];
        setPosts(list); setOffset(list.length); setHasMore(data.hasMore ?? false);
        setLoading(false);
    }, [tab]);

    useEffect(() => { loadFirst(); }, [loadFirst]);

    async function loadMore() {
        setLoadingMore(true);
        const data = await fetch(`/api/nexus/posts?tab=${tab}&limit=${PAGE}&offset=${offset}`).then(r => r.json());
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
        if (!postText.trim() && !media.length && !attached) return;
        setSending(true);
        try {
            const res = await fetch("/api/nexus/posts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: postText, media, marketProductId: attached?.id ?? null }),
            });
            const d = await res.json();
            if (res.ok) { setPosts(prev => [d.post, ...prev]); setPostText(""); setMedia([]); setAttached(null); }
        } finally { setSending(false); }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* ── Tab ── */}
            <div className="flex gap-0 mx-4 mt-4 mb-3 rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
                {(["following", "explore"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="flex-1 py-2.5 text-xs font-black transition-all duration-200"
                        style={tab === t ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { color: "rgba(140,160,210,0.75)" }}
                    >
                        {t === "following" ? "Obunalar" : "Kashfiyot"}
                    </button>
                ))}
            </div>

            {/* ── Post yaratish ── */}
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

                {/* Biriktirilgan mahsulot */}
                {attached && (
                    <div className="mt-3 ml-12 flex items-center gap-2.5 rounded-xl p-2" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                            {attached.image && <img src={attached.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{attached.name}</p>
                            <p className="text-[11px] font-black" style={{ color: "#00CEC8" }}>{fz(attached.price)} Ƶ</p>
                        </div>
                        <button onClick={() => setAttached(null)} className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0">
                            <X className="w-3 h-3 text-white" />
                        </button>
                    </div>
                )}

                <div className="mt-3 flex items-center justify-between pl-12">
                    <div className="flex items-center gap-2">
                        <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Rasm/video"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150" style={{ background: "rgba(43,62,232,0.08)" }}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00CEC8" }} /> : <ImgIcon className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.60)" }} />}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={e => pickFiles(e.target.files)} className="hidden" />
                        <button onClick={() => setPickerOpen(true)} title="Mahsulot biriktirish"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150" style={{ background: "rgba(43,62,232,0.08)" }}>
                            <ShoppingBag className="w-3.5 h-3.5" style={{ color: attached ? "#00CEC8" : "rgba(140,160,210,0.60)" }} />
                        </button>
                    </div>
                    <button onClick={submitPost} disabled={sending || uploading || (!postText.trim() && !media.length && !attached)}
                        className="px-4 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 active:scale-95 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {sending ? "Yuborilmoqda..." : "Ulashish"}
                    </button>
                </div>

                {pickerOpen && <ProductPicker onPick={(p) => { setAttached(p); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
            </div>

            {/* ── Postlar ── */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 px-4">
                    <p className="text-sm font-bold text-white/70 mb-1">{tab === "following" ? "Obunalaringizdan post yo'q" : "Hali post yo'q"}</p>
                    <p className="text-xs" style={{ color: "rgba(80,100,150,0.75)" }}>
                        {tab === "following" ? "Odamlarni kuzating yoki Kashfiyotga o'ting" : "Birinchi bo'lib post ulashing!"}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 px-4 pb-4">
                    {posts.map(p => (
                        <PostCard key={p.id} post={p}
                            onLike={() => toggleLike(p)} onSave={() => toggleSave(p)}
                            onDelete={() => deletePost(p.id)}
                            onShare={() => openShareSheet((p.text ?? "").slice(0, 60))}
                            onBump={() => patch(p.id, x => ({ ...x, comments: x.comments + 1 }))}
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
function PostCard({ post: p, onLike, onSave, onDelete, onShare, onBump }: {
    post: Post; onLike: () => void; onSave: () => void; onDelete: () => void; onShare: () => void; onBump: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [following, setFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);

    async function toggleFollow() {
        if (!p.author?.username) return;
        setFollowing(f => !f);
        await fetch("/api/nexus/follow", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: p.author.username }),
        }).catch(() => {});
    }

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                        <img src={avatarOf(p.author)} alt="" className="w-full h-full object-cover bg-white" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{p.author?.name ?? p.author?.username ?? "Foydalanuvchi"}</span>
                        {p.author?.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>
                        {p.author?.username && <span>@{p.author.username}</span>}
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
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
                    {p.isMine && (
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="w-7 h-7 flex items-center justify-center rounded-lg"
                                style={{ background: menuOpen ? "rgba(43,62,232,0.12)" : "transparent" }}>
                                <MoreHorizontal className="w-4 h-4" style={{ color: "rgba(80,100,150,0.70)" }} />
                            </button>
                            {menuOpen && (
                                <button onClick={() => { setMenuOpen(false); onDelete(); }}
                                    className="absolute right-0 top-8 z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                                    style={{ background: "rgba(8,14,32,0.98)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                                    <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Matn */}
            {p.text && (
                <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(200,215,245,0.90)" }}>{p.text}</p>
                    {p.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {p.hashtags.map(h => <span key={h} className="text-xs font-bold" style={{ color: "#2B3EE8" }}>#{h}</span>)}
                        </div>
                    )}
                </div>
            )}

            {/* Media */}
            {p.media.length > 0 && (
                <div className={`mx-4 mb-3 grid gap-1.5 ${p.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {p.media.map((url, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden" style={{ background: "rgba(43,62,232,0.10)" }}>
                            {isVid(url)
                                ? <video src={url} controls className="w-full max-h-[420px] object-cover" />
                                : <img src={url} alt="" className="w-full max-h-[420px] object-cover" />}
                        </div>
                    ))}
                </div>
            )}

            {/* Biriktirilgan mahsulot — Sotib olish (Nexus × Market) */}
            {p.product && (
                <Link href={`/market/product/${p.product.slug}`}
                    className="mx-4 mb-3 flex items-center gap-3 rounded-xl p-2.5 transition-all active:scale-[.99]"
                    style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)" }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        {p.product.image && <img src={p.product.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{p.product.name}</p>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black" style={{ color: "#00CEC8" }}>{fz(p.product.price)} Ƶ</span>
                            {p.product.oldPrice && <span className="text-[10px] line-through" style={{ color: "rgba(80,100,150,0.7)" }}>{fz(p.product.oldPrice)} Ƶ</span>}
                        </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-[11px] font-black text-white flex items-center gap-1 flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <ShoppingBag className="w-3 h-3" /> Sotib olish
                    </span>
                </Link>
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
                                    {c.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.7)" }}>{timeAgo(c.createdAt)}</span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(200,215,245,0.85)" }}>{c.text}</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// Mahsulot tanlash (Nexus × Market)
// ─────────────────────────────────────────────────────────────────────────────
function ProductPicker({ onPick, onClose }: { onPick: (p: PickedProduct) => void; onClose: () => void }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState<PickedProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancel = false;
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const data = await fetch(`/api/market/products?q=${encodeURIComponent(q)}&limit=12`).then(r => r.json());
                if (cancel) return;
                const list: PickedProduct[] = (data.products ?? []).map((p: { id: string; slug: string; name: string; images: string[]; price: string | number }) => ({
                    id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] ?? null, price: String(p.price),
                }));
                setResults(list);
            } finally { if (!cancel) setLoading(false); }
        }, 300);
        return () => { cancel = true; clearTimeout(t); };
    }, [q]);

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,14,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", maxHeight: "80vh" }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                    <h3 className="text-sm font-black text-white">Mahsulot biriktirish</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-3.5 h-3.5 text-white/60" />
                    </button>
                </div>
                <div className="p-3">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(140,160,210,0.6)" }} />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Mahsulot qidirish..." autoComplete="off"
                            className="w-full text-sm text-white outline-none rounded-xl pl-9 pr-3 py-2.5" style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.18)" }} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : results.length === 0 ? (
                        <p className="text-xs text-center py-8" style={{ color: "rgba(80,100,150,0.7)" }}>Mahsulot topilmadi</p>
                    ) : results.map(p => (
                        <button key={p.id} onClick={() => onPick(p)} className="w-full flex items-center gap-3 rounded-xl p-2 text-left transition-all active:scale-[.99]" style={{ background: "rgba(43,62,232,0.06)" }}>
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">{p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                <p className="text-[11px] font-black" style={{ color: "#00CEC8" }}>{fz(p.price)} Ƶ</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
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
