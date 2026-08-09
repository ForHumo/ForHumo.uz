"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Send, Loader2, ChevronRight, Mic, Camera } from "lucide-react";
import { ProductCard } from "./product-card";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean;
    stock?: number; brand: { name: string; slug: string; verified: boolean };
}
interface Msg { role: "user" | "assistant"; content: string; products?: Product[] }

const GREETING = "Salom! Men Humo Market yordamchisiman. Nima qidiryapsiz? Masalan: \"onamga tug'ilgan kun sovg'asi\" yoki \"500 minggacha telefon\".";
const SUGGESTIONS = ["Onamga sovg'a top", "Arzon quloqchin kerak", "Sovuqqa kiyim tavsiya qil"];

export function MarketAssistant() {
    const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

    // Ovozli qidiruv (browser SpeechRecognition — server round-trip yo'q)
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    function toggleVoice() {
        if (typeof window === "undefined") return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { alert("Brauzer ovozli qidiruvni qo'llab-quvvatlamaydi"); return; }
        if (listening) { recognitionRef.current?.stop(); return; }
        const r = new SR();
        r.lang = "uz-UZ";
        r.interimResults = false;
        r.maxAlternatives = 1;
        r.onresult = (e: any) => {
            const t = e.results?.[0]?.[0]?.transcript ?? "";
            if (t) { setInput(t); setTimeout(() => send(t), 100); }
        };
        r.onend = () => setListening(false);
        r.onerror = () => setListening(false);
        recognitionRef.current = r;
        setListening(true);
        r.start();
    }

    // Rasmli qidiruv (blob upload → base64 → chat message)
    const imgInputRef = useRef<HTMLInputElement>(null);
    async function sendImage(file: File) {
        if (loading) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const up = await fetch("/api/market/upload", { method: "POST", body: fd });
            if (!up.ok) { alert("Rasm yuklab bo'lmadi"); setLoading(false); return; }
            const { url } = await up.json();
            const userMsg: Msg = { role: "user", content: `[Rasm]\n${url}` };
            const next = [...messages, userMsg];
            setMessages(next);
            const res = await fetch("/api/ai/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: next.map(m => ({ role: m.role, content: m.content })),
                    imageUrl: url,
                }),
            });
            const d = await res.json();
            if (!res.ok) setMessages(m => [...m, { role: "assistant", content: d.error || "Rasm tahlil qilinmadi" }]);
            else setMessages(m => [...m, { role: "assistant", content: d.reply, products: d.products ?? [] }]);
        } catch { setMessages(m => [...m, { role: "assistant", content: "Xatolik" }]); }
        finally { setLoading(false); }
    }

    async function send(text?: string) {
        const content = (text ?? input).trim();
        if (!content || loading) return;
        const userMsg: Msg = { role: "user", content };
        const next = [...messages, userMsg];
        setMessages(next); setInput(""); setLoading(true);
        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
            });
            const d = await res.json();
            if (!res.ok) setMessages(m => [...m, { role: "assistant", content: d.error || "Kechirasiz, xatolik yuz berdi." }]);
            else setMessages(m => [...m, { role: "assistant", content: d.reply, products: d.products ?? [] }]);
        } catch {
            setMessages(m => [...m, { role: "assistant", content: "Internet xatosi, qayta urinib ko'ring." }]);
        } finally { setLoading(false); }
    }

    return (
        <div className="container mx-auto px-4 max-w-3xl py-8 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">AI yordamchi</span>
            </nav>

            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-white flex items-center justify-center ring-1 ring-gray-200 dark:ring-white/10">
                    <Image src="/logos/humo-ai-icon-black.png" alt="Humo AI" width={32} height={32}
                        className="w-8 h-8 object-contain" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Humo AI</h1>
                    <p className="text-xs text-gray-400 dark:text-white/30 leading-tight">Sizga mos mahsulotni topib beraman</p>
                </div>
            </div>

            {/* Suhbat */}
            <div className="flex-1 space-y-4 mb-4">
                {messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div className={m.role === "user" ? "max-w-[80%]" : "max-w-[92%] w-full"}>
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user"
                                ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white"
                                : "bg-white/70 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-800 dark:text-white/80"}`}>
                                {m.content}
                            </div>
                            {/* Tavsiya qilingan mahsulotlar */}
                            {m.products && m.products.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                    {m.products.map((p, k) => <ProductCard key={p.id} product={p} index={k} compact />)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl px-4 py-3 bg-white/70 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
                            <Loader2 size={16} className="animate-spin text-violet-500" />
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Takliflar (faqat boshda) */}
            {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => send(s)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition">
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Kirish: rasm + ovoz + matn + jo'natish */}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }} />
            <div className="flex gap-2 sticky bottom-4">
                <button onClick={() => imgInputRef.current?.click()} disabled={loading}
                    title="Rasm bilan qidirish"
                    className="w-11 h-11 shrink-0 rounded-2xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                        text-gray-500 hover:text-green-600 hover:border-green-400 dark:hover:border-green-500/50 flex items-center justify-center transition disabled:opacity-40">
                    <Camera size={18} />
                </button>
                <button onClick={toggleVoice} disabled={loading}
                    title="Ovoz bilan qidirish"
                    className={`w-11 h-11 shrink-0 rounded-2xl border flex items-center justify-center transition disabled:opacity-40 ${
                        listening
                            ? "bg-red-500 text-white border-red-500 animate-pulse"
                            : "bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08] text-gray-500 hover:text-green-600 hover:border-green-400 dark:hover:border-green-500/50"
                    }`}>
                    <Mic size={18} />
                </button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Xabar yozing..." disabled={loading}
                    className="flex-1 min-w-0 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                        focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-sm
                        text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition" />
                <button onClick={() => send()} disabled={loading || !input.trim()}
                    className="px-5 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold
                        disabled:opacity-40 flex items-center transition-all">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
}
