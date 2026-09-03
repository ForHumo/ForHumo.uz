"use client";

// Belis AI chatbot — mijoz Humo AI bilan gaplashadi.
// Marosim, sana, byudjet haqida yozadi → AI mos komplekt tavsiya qiladi.

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Package, Sparkles, ChevronRight } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Msg { role: "user" | "assistant"; text: string; recommendedSlug?: string | null }

const WELCOME: Msg = {
    role: "assistant",
    text: "Assalomu alaykum! Men Humo AI — Belis'ning yordamchisi.\n\nMarosim turi (Fotiha yoki Beshik to'y) va sanasi haqida ayting — sizga mos sarpo komplektni tavsiya qilaman.",
    recommendedSlug: null,
};

export function BelisAiChat() {
    const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs.length]);

    async function send() {
        const t = text.trim();
        if (!t || busy) return;
        const userMsg: Msg = { role: "user", text: t };
        const next = [...msgs, userMsg];
        setMsgs(next);
        setText("");
        setBusy(true); setErr(null);
        try {
            const payload = next.map(m => ({ role: m.role, text: m.text }));
            const r = await fetch("/api/belis/ai/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages: payload }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d?.error === "ai_unavailable" ? "AI hozircha ishlamayapti" : "Tarmoq xatosi");
                return;
            }
            setMsgs(m => [...m, {
                role: "assistant",
                text: String(d.reply ?? ""),
                recommendedSlug: d.recommendedSlug ?? null,
            }]);
        } catch {
            setErr("Tarmoq xatosi");
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
            {/* Hero */}
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                style={{ background: BELIS_GOLD_GRADIENT }}>
                <span className="w-11 h-11 rounded-xl bg-white/25 grid place-items-center flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/humo-ai-black.png" alt="" className="h-6 w-auto object-contain" />
                </span>
                <div>
                    <p className="text-[15px] font-black" style={{ color: BELIS.onGold }}>Humo AI · Belis yordamchi</p>
                    <p className="text-[11.5px] opacity-80" style={{ color: BELIS.onGold }}>
                        Mos sarpo komplektni tavsiya qiladi
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 p-4 rounded-2xl mb-3"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                {msgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%]">
                            <div className="px-4 py-2.5 rounded-2xl"
                                style={{
                                    background: m.role === "user" ? BELIS_GOLD_GRADIENT : BELIS.bg,
                                    color: m.role === "user" ? BELIS.onGold : BELIS.text,
                                    border: m.role === "user" ? "none" : `1px solid ${BELIS.borderSoft}`,
                                }}>
                                <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed">{m.text}</p>
                            </div>
                            {m.recommendedSlug && (
                                <BelisLink href={`/belis/k/${m.recommendedSlug}` as never}
                                    className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black"
                                    style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                    <Package className="w-3.5 h-3.5" /> Komplektni ko&apos;rish <ChevronRight className="w-3.5 h-3.5" />
                                </BelisLink>
                            )}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2"
                            style={{ background: BELIS.bg, border: `1px solid ${BELIS.borderSoft}`, color: BELIS.text3 }}>
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: BELIS.gold }} />
                            <span className="text-[13px]">Humo AI o&apos;ylayapti…</span>
                        </div>
                    </div>
                )}
                {err && (
                    <div className="text-center py-2">
                        <p className="text-[12.5px] inline-block px-3 py-1.5 rounded-lg"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>{err}</p>
                    </div>
                )}
            </div>

            {/* Composer */}
            <div className="flex items-end gap-2">
                <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value.slice(0, 500))}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Marosim turi, sanasi, byudjet…"
                    rows={1}
                    className="flex-1 min-h-[50px] max-h-32 p-3 rounded-xl text-[14px] resize-none focus:outline-none"
                    style={{ background: BELIS.surface, color: BELIS.text, border: `1px solid ${BELIS.border}` }} />
                <button onClick={send} disabled={busy || !text.trim()}
                    className="w-12 h-12 rounded-xl grid place-items-center flex-shrink-0 disabled:opacity-60"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </div>

            {/* Quick chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                    "Fotihaga 15-sentyabr kerak",
                    "Beshik to'y bo'yicha",
                    "Byudjetim 1M so'm",
                    "Qutilar sonini bilmoqchiman",
                ].map(q => (
                    <button key={q} onClick={() => setText(q)}
                        className="h-8 px-3 rounded-full text-[11.5px] font-bold"
                        style={{ background: BELIS.surface, color: BELIS.text2, border: `1px solid ${BELIS.border}` }}>
                        <Sparkles className="w-3 h-3 inline mr-1" style={{ color: BELIS.gold }} />
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
}
