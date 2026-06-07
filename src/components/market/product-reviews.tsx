"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Star, MessageSquare, Loader2, Send, CheckCircle2,
    AlertCircle, Lock, ThumbsUp,
} from "lucide-react";

interface Review {
    id: string; rating: number; text: string | null; createdAt: string;
    author: { name: string | null; username: string | null; image: string | null } | null;
    likeCount: number; likedByMe: boolean; isMine: boolean;
}

export function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews]   = useState<Review[]>([]);
    const [canReview, setCanReview] = useState(false);
    const [alreadyReviewed, setAlready] = useState(false);
    const [loading, setLoading]   = useState(true);

    // Form
    const [rating, setRating]     = useState(5);
    const [hover, setHover]       = useState(0);
    const [text, setText]         = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]       = useState("");
    const [showForm, setShowForm] = useState(false);

    function load() {
        fetch(`/api/market/reviews?productId=${productId}`)
            .then(r => r.json())
            .then(d => {
                setReviews(d.reviews ?? []);
                setCanReview(d.canReview ?? false);
                setAlready(d.alreadyReviewed ?? false);
            })
            .finally(() => setLoading(false));
    }
    useEffect(load, [productId]);

    // "Qo'shilaman" — optimistik toggle
    async function toggleLike(r: Review) {
        if (r.isMine) return; // o'z sharhiga like bosolmaydi
        setReviews(prev => prev.map(x => x.id === r.id
            ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
            : x));
        try {
            const res = await fetch(`/api/market/reviews/${r.id}/like`, { method: "POST" });
            if (res.ok) { const d = await res.json(); setReviews(prev => prev.map(x => x.id === r.id ? { ...x, likedByMe: d.liked, likeCount: d.count } : x)); }
        } catch { /* revert keyingi load'da */ }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/market/reviews", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, rating, text }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { setShowForm(false); setText(""); setRating(5); load(); }
        } catch { setError("Xatolik"); } finally { setSubmitting(false); }
    }

    return (
        <section className="mb-14">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-green-500" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                        Sharhlar {!loading && `(${reviews.length})`}
                    </h2>
                </div>
                {canReview && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="px-4 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400
                            font-semibold text-sm hover:bg-green-500/20 transition-all">
                        Sharh yozish
                    </button>
                )}
            </div>

            {/* Holatga qarab xabar */}
            {!loading && !canReview && !alreadyReviewed && (
                <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-white/[0.03]
                    border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3 mb-5">
                    <Lock size={14} className="text-gray-400 dark:text-white/25" />
                    <p className="text-xs text-gray-500 dark:text-white/35">
                        Sharh qoldirish uchun avval mahsulotni harid qiling
                    </p>
                </div>
            )}
            {alreadyReviewed && (
                <div className="flex items-center gap-2 bg-green-50/80 dark:bg-green-900/10
                    border border-green-200/60 dark:border-green-800/20 rounded-2xl px-4 py-3 mb-5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <p className="text-xs text-green-700 dark:text-green-400">Siz bu mahsulotga sharh qoldirgansiz</p>
                </div>
            )}

            {/* Sharh formi */}
            <AnimatePresence>
                {showForm && (
                    <motion.form onSubmit={submit}
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6">
                        <div className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                            rounded-2xl p-5">
                            {/* Yulduzlar */}
                            <div className="flex items-center gap-1 mb-3">
                                {[1,2,3,4,5].map(s => (
                                    <button key={s} type="button"
                                        onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(s)}>
                                        <Star size={26}
                                            className={s <= (hover || rating)
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-gray-200 dark:text-white/10"} />
                                    </button>
                                ))}
                            </div>
                            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={500}
                                placeholder="Mahsulot haqida fikringiz..."
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-4 py-3 text-sm
                                    text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/15
                                    outline-none transition resize-none mb-3" />
                            {error && <p className="text-red-500 text-xs flex items-center gap-1.5 mb-3"><AlertCircle size={12} />{error}</p>}
                            <div className="flex gap-2">
                                <button type="submit" disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500
                                        text-white font-bold text-sm disabled:opacity-40 transition-all">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Yuborish
                                </button>
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="px-5 py-2.5 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 transition-colors">
                                    Bekor
                                </button>
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
                <div className="space-y-3">
                    {reviews.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]
                                rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                    {r.author?.image ? (
                                        <Image src={r.author.image} alt="" width={36} height={36} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                                            {(r.author?.name ?? "U")[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {r.author?.name ?? r.author?.username ?? "Foydalanuvchi"}
                                    </p>
                                    <div className="flex items-center gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={11}
                                                className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-white/10"} />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-300 dark:text-white/20">
                                    {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                                </span>
                            </div>
                            {r.text && <p className="text-sm text-gray-600 dark:text-white/50 leading-relaxed mb-2">{r.text}</p>}
                            {/* "Qo'shilaman" — necha kishi rozi */}
                            <button onClick={() => toggleLike(r)} disabled={r.isMine}
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-all
                                    ${r.likedByMe
                                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                        : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/35 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}
                                    ${r.isMine ? "opacity-50 cursor-default" : ""}`}>
                                <ThumbsUp size={12} className={r.likedByMe ? "fill-current" : ""} />
                                Qo&apos;shilaman{r.likeCount > 0 ? ` · ${r.likeCount}` : ""}
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
}
