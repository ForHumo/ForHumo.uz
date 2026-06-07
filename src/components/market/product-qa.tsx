"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { HelpCircle, Loader2, Send, Store, MessageCircle, Lock } from "lucide-react";

interface Author { name: string | null; username: string | null; image: string | null }
interface AnswerT { id: string; text: string; createdAt: string; author: Author | null; isMine: boolean; isAuthor: boolean }
interface QuestionT { id: string; text: string; createdAt: string; author: Author | null; isMine: boolean; answers: AnswerT[] }

function Avatar({ author, size = 32 }: { author: Author | null; size?: number }) {
    return (
        <div className="rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0" style={{ width: size, height: size }}>
            {author?.image
                ? <Image src={author.image} alt="" width={size} height={size} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white font-bold" style={{ fontSize: size * 0.4 }}>{(author?.name ?? "U")[0].toUpperCase()}</div>}
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

function AnswerForm({ questionId, onDone }: { questionId: string; onDone: (a: AnswerT) => void }) {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit() {
        if (!text.trim()) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/market/questions/${questionId}/answers`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const d = await res.json();
            if (res.ok) { onDone(d.answer); setText(""); }
        } finally { setBusy(false); }
    }
    return (
        <div className="mt-2 pl-2 border-l-2 border-green-200 dark:border-green-800/30">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={500}
                placeholder="Javob yozing..."
                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                    focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-3 py-2 text-sm
                    text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition resize-none mb-2" />
            <button onClick={submit} disabled={busy}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white font-semibold text-xs disabled:opacity-40 transition">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Yuborish
            </button>
        </div>
    );
}

export function ProductQA({ productId }: { productId: string }) {
    const [questions, setQuestions] = useState<QuestionT[]>([]);
    const [canAsk, setCanAsk] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [answerOpen, setAnswerOpen] = useState<string | null>(null);

    function load() {
        fetch(`/api/market/questions?productId=${productId}`).then(r => r.json())
            .then(d => { setQuestions(d.questions ?? []); setCanAsk(d.canAsk ?? false); })
            .finally(() => setLoading(false));
    }
    useEffect(load, [productId]);

    async function ask() {
        if (!text.trim()) return;
        setBusy(true);
        try {
            const res = await fetch("/api/market/questions", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, text }),
            });
            const d = await res.json();
            if (res.ok) { setQuestions(prev => [d.question, ...prev]); setText(""); setShowForm(false); }
        } finally { setBusy(false); }
    }

    function addAnswer(questionId: string, answer: AnswerT) {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, answers: [...q.answers, answer] } : q));
    }

    return (
        <section className="mb-14">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <HelpCircle size={18} className="text-green-500" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Savol-javob {!loading && `(${questions.length})`}</h2>
                </div>
                {canAsk && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="px-4 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-500/20 transition-all">
                        Savol berish
                    </button>
                )}
            </div>

            {!loading && !canAsk && (
                <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3 mb-5">
                    <Lock size={14} className="text-gray-400 dark:text-white/25" />
                    <p className="text-xs text-gray-500 dark:text-white/35">Savol berish uchun tizimga kiring</p>
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                        <div className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-5">
                            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={500}
                                placeholder="Mahsulot haqida savolingiz..."
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition resize-none mb-3" />
                            <div className="flex gap-2">
                                <button onClick={ask} disabled={busy}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm disabled:opacity-40 transition-all">
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Yuborish
                                </button>
                                <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 transition-colors">Bekor</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-green-500/50" /></div>
            ) : !questions.length ? (
                <p className="text-sm text-gray-400 dark:text-white/25 py-6 text-center">Hali savollar yo&apos;q. Birinchi bo&apos;lib so&apos;rang!</p>
            ) : (
                <div className="space-y-4">
                    {questions.map((q, i) => (
                        <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl p-4">
                            {/* Savol */}
                            <div className="flex gap-3">
                                <Avatar author={q.author} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        {q.author?.name ?? q.author?.username ?? "Foydalanuvchi"}
                                        <span className="text-gray-300 dark:text-white/20 font-normal text-xs">{timeAgo(q.createdAt)}</span>
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-white/70 mt-0.5 font-medium">{q.text}</p>

                                    {/* Javoblar */}
                                    {q.answers.map(a => (
                                        <div key={a.id} className="flex gap-2.5 mt-3">
                                            <Avatar author={a.author} size={26} />
                                            <div className={`flex-1 min-w-0 rounded-2xl px-3 py-2 ${a.isAuthor
                                                ? "bg-green-50 dark:bg-green-900/15 border border-green-200/60 dark:border-green-800/30"
                                                : "bg-gray-50 dark:bg-white/[0.04]"}`}>
                                                <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                    {a.author?.name ?? a.author?.username ?? "Foydalanuvchi"}
                                                    {a.isAuthor && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold">
                                                            <Store size={9} /> Sotuvchi
                                                        </span>
                                                    )}
                                                    <span className="text-gray-300 dark:text-white/20 font-normal">{timeAgo(a.createdAt)}</span>
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-white/60 mt-0.5">{a.text}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {canAsk && (
                                        <button onClick={() => setAnswerOpen(answerOpen === q.id ? null : q.id)}
                                            className="flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-green-600 dark:hover:text-green-400 mt-2 transition">
                                            <MessageCircle size={11} /> Javob berish
                                        </button>
                                    )}
                                    <AnimatePresence>
                                        {answerOpen === q.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <AnswerForm questionId={q.id} onDone={(a) => { addAnswer(q.id, a); setAnswerOpen(null); }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
}
