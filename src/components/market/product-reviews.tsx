"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Star, MessageSquare, Loader2, Send, CheckCircle2,
    AlertCircle, Lock, ThumbsUp, Reply as ReplyIcon, Store,
} from "lucide-react";
import { MediaUploader, isVideoUrl } from "./media-uploader";

interface Author { name: string | null; username: string | null; image: string | null }
interface ReplyT {
    id: string; parentId: string | null; text: string | null; media: string[];
    createdAt: string; author: Author | null; isMine: boolean; isAuthor?: boolean;
}
interface Review {
    id: string; rating: number; text: string | null; media: string[]; createdAt: string;
    author: Author | null; likeCount: number; likedByMe: boolean; isMine: boolean; replies: ReplyT[];
}

// ── Media ko'rsatish ──────────────────────────────────────────────────────────
function MediaGrid({ media }: { media: string[] }) {
    if (!media?.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {media.map((url, i) => (
                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05]">
                    {isVideoUrl(url)
                        ? <video src={url} controls className="w-full h-full object-cover" />
                        : <Image src={url} alt="" width={80} height={80} className="w-full h-full object-cover" />}
                </div>
            ))}
        </div>
    );
}

function Avatar({ author, size = 36 }: { author: Author | null; size?: number }) {
    return (
        <div className="rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0"
            style={{ width: size, height: size }}>
            {author?.image
                ? <Image src={author.image} alt="" width={size} height={size} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white font-bold"
                    style={{ fontSize: size * 0.4 }}>{(author?.name ?? "U")[0].toUpperCase()}</div>}
        </div>
    );
}

function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq.`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

// ── Javob formi ───────────────────────────────────────────────────────────────
function ReplyForm({ reviewId, parentId, onDone }: { reviewId: string; parentId: string | null; onDone: (r: ReplyT) => void }) {
    const [text, setText] = useState("");
    const [media, setMedia] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    async function submit() {
        if (!text.trim() && !media.length) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/market/reviews/${reviewId}/replies`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId, text, media }),
            });
            const d = await res.json();
            if (res.ok) { onDone(d.reply); setText(""); setMedia([]); }
        } finally { setBusy(false); }
    }

    return (
        <div className="mt-2 pl-2 border-l-2 border-green-200 dark:border-green-800/30">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={500}
                placeholder="Javob yozing..."
                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                    focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-3 py-2 text-sm
                    text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition resize-none mb-2" />
            <MediaUploader kind="reply" media={media} onChange={setMedia} max={3} />
            <button onClick={submit} disabled={busy}
                className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white font-semibold text-xs disabled:opacity-40 transition">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Yuborish
            </button>
        </div>
    );
}

// ── Recursiv javob tuguni ─────────────────────────────────────────────────────
function ReplyNode({ reply, reviewId, childrenOf, onNewReply }: {
    reply: ReplyT; reviewId: string;
    childrenOf: (parentId: string) => ReplyT[];
    onNewReply: (r: ReplyT) => void;
}) {
    const [open, setOpen] = useState(false);
    const kids = childrenOf(reply.id);
    return (
        <div className="mt-3">
            <div className="flex gap-2.5">
                <Avatar author={reply.author} size={28} />
                <div className="flex-1 min-w-0">
                    <div className={`rounded-2xl px-3 py-2 ${reply.isAuthor
                        ? "bg-green-50 dark:bg-green-900/15 border border-green-200/60 dark:border-green-800/30"
                        : "bg-gray-50 dark:bg-white/[0.04]"}`}>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            {reply.author?.name ?? reply.author?.username ?? "Foydalanuvchi"}
                            {reply.isAuthor && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold">
                                    <Store size={9} /> Sotuvchi
                                </span>
                            )}
                            <span className="text-gray-300 dark:text-white/20 font-normal">{timeAgo(reply.createdAt)}</span>
                        </p>
                        {reply.text && <p className="text-sm text-gray-600 dark:text-white/60 mt-0.5">{reply.text}</p>}
                        <MediaGrid media={reply.media} />
                    </div>
                    <button onClick={() => setOpen(v => !v)}
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-green-600 dark:hover:text-green-400 mt-1 ml-1 transition">
                        <ReplyIcon size={11} /> Javob berish
                    </button>
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <ReplyForm reviewId={reviewId} parentId={reply.id} onDone={(r) => { onNewReply(r); setOpen(false); }} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Ichki javoblar (cheksiz) */}
                    {kids.map(k => (
                        <ReplyNode key={k.id} reply={k} reviewId={reviewId} childrenOf={childrenOf} onNewReply={onNewReply} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Asosiy ────────────────────────────────────────────────────────────────────
export function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews]   = useState<Review[]>([]);
    const [canReview, setCanReview] = useState(false);
    const [alreadyReviewed, setAlready] = useState(false);
    const [loading, setLoading]   = useState(true);
    const [rating, setRating]     = useState(5);
    const [hover, setHover]       = useState(0);
    const [text, setText]         = useState("");
    const [media, setMedia]       = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]       = useState("");
    const [showForm, setShowForm] = useState(false);
    const [replyOpen, setReplyOpen] = useState<string | null>(null);

    function load() {
        fetch(`/api/market/reviews?productId=${productId}`).then(r => r.json())
            .then(d => { setReviews(d.reviews ?? []); setCanReview(d.canReview ?? false); setAlready(d.alreadyReviewed ?? false); })
            .finally(() => setLoading(false));
    }
    useEffect(load, [productId]);

    async function toggleLike(r: Review) {
        if (r.isMine) return;
        setReviews(prev => prev.map(x => x.id === r.id ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) } : x));
        try {
            const res = await fetch(`/api/market/reviews/${r.id}/like`, { method: "POST" });
            if (res.ok) { const d = await res.json(); setReviews(prev => prev.map(x => x.id === r.id ? { ...x, likedByMe: d.liked, likeCount: d.count } : x)); }
        } catch { /* keyingi load tiklaydi */ }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError(""); setSubmitting(true);
        try {
            const res = await fetch("/api/market/reviews", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, rating, text, media }),
            });
            const d = await res.json();
            if (!res.ok) setError(d.error);
            else { setShowForm(false); setText(""); setRating(5); setMedia([]); load(); }
        } catch { setError("Xatolik"); } finally { setSubmitting(false); }
    }

    // Yangi javobni mahalliy holatga qo'shish
    function addReply(reviewId: string, reply: ReplyT) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replies: [...r.replies, reply] } : r));
    }

    return (
        <section className="mb-14">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-green-500" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Sharhlar {!loading && `(${reviews.length})`}</h2>
                </div>
                {canReview && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="px-4 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-500/20 transition-all">
                        Sharh yozish
                    </button>
                )}
            </div>

            {!loading && !canReview && !alreadyReviewed && (
                <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3 mb-5">
                    <Lock size={14} className="text-gray-400 dark:text-white/25" />
                    <p className="text-xs text-gray-500 dark:text-white/35">Sharh qoldirish uchun avval mahsulotni harid qiling</p>
                </div>
            )}

            {/* Sharh formi */}
            <AnimatePresence>
                {showForm && (
                    <motion.form onSubmit={submit} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                        <div className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center gap-1 mb-3">
                                {[1,2,3,4,5].map(s => (
                                    <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}>
                                        <Star size={26} className={s <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-white/10"} />
                                    </button>
                                ))}
                            </div>
                            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={500}
                                placeholder="Mahsulot haqida fikringiz..."
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition resize-none mb-3" />
                            <p className="text-xs text-gray-400 dark:text-white/30 mb-2">Rasm yoki video qo'shing:</p>
                            <MediaUploader kind="review" media={media} onChange={setMedia} max={4} />
                            {error && <p className="text-red-500 text-xs flex items-center gap-1.5 my-2"><AlertCircle size={12} />{error}</p>}
                            <div className="flex gap-2 mt-3">
                                <button type="submit" disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm disabled:opacity-40 transition-all">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Yuborish
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 transition-colors">Bekor</button>
                            </div>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Sharhlar ro'yxati */}
            {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-green-500/50" /></div>
            ) : !reviews.length ? (
                <p className="text-sm text-gray-400 dark:text-white/25 py-6 text-center">Hali sharhlar yo'q</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map((r, i) => {
                        const childrenOf = (pid: string) => r.replies.filter(x => x.parentId === pid);
                        const topReplies = r.replies.filter(x => x.parentId === null);
                        return (
                            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Avatar author={r.author} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.author?.name ?? r.author?.username ?? "Foydalanuvchi"}</p>
                                        <div className="flex items-center gap-0.5">
                                            {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-white/10"} />)}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-300 dark:text-white/20">{timeAgo(r.createdAt)}</span>
                                </div>
                                {r.text && <p className="text-sm text-gray-600 dark:text-white/50 leading-relaxed">{r.text}</p>}
                                <MediaGrid media={r.media} />

                                {/* Like + javob */}
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => toggleLike(r)} disabled={r.isMine}
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-all
                                            ${r.likedByMe ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/35 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}
                                            ${r.isMine ? "opacity-50 cursor-default" : ""}`}>
                                        <ThumbsUp size={12} className={r.likedByMe ? "fill-current" : ""} />
                                        Qo&apos;shilaman{r.likeCount > 0 ? ` · ${r.likeCount}` : ""}
                                    </button>
                                    <button onClick={() => setReplyOpen(replyOpen === r.id ? null : r.id)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1
                                            bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/35 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition">
                                        <ReplyIcon size={12} /> Javob
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {replyOpen === r.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <ReplyForm reviewId={r.id} parentId={null} onDone={(rep) => { addReply(r.id, rep); setReplyOpen(null); }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Javoblar daraxti */}
                                {topReplies.length > 0 && (
                                    <div className="mt-1 pl-2">
                                        {topReplies.map(rep => (
                                            <ReplyNode key={rep.id} reply={rep} reviewId={r.id} childrenOf={childrenOf} onNewReply={(nr) => addReply(r.id, nr)} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
