"use client";

// Modul ichida (Belis wizard, BN checkout, Market savat) suzuvchi "AI'dan yordam" tugma.
// Bosilganda kichik chat oynasi ochiladi — kontexst uzatiladi (moduleOrigin).

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { Sparkles, X, Send, Loader2, MessageSquareMore } from "lucide-react";
import { Link } from "@/i18n/routing";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";

interface Props {
    module: ModuleKey;                // "belis" | "bn" | "market" | "pay" | ...
    /** Boshlang'ich savol (foydalanuvchi placeholder ko'radi) */
    initialPrompt?: string;
    /** Kontekst matn — AI'ga uzatiladi (hozirgi savat/booking holati) */
    contextText?: string;
    /** Suzuvchi tugma pozitsiyasi (default o'ng-past) */
    position?: "bottom-right" | "bottom-left";
}

interface Msg { id: string; role: "user" | "ai"; body: string }

export function AiQuickHelper({ module, initialPrompt, contextText, position = "bottom-right" }: Props) {
    const { status } = useSession();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [mounted, setMounted] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const T = moduleTheme(module);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    if (status !== "authenticated") return null;
    if (!mounted) return null;

    async function send(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput("");
        const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", body: text };
        setMessages(prev => [...prev, userMsg]);

        // Kontexst bilan xabar
        const contextPrefix = contextText ? `[Hozirgi holat: ${contextText.slice(0, 500)}]\n\n` : "";

        try {
            const r = await fetch("/api/ai/converse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: contextPrefix + text,
                    moduleOrigin: module,
                }),
            });
            const j = await r.json();
            if (r.ok && j.messages?.[1]) {
                setMessages(prev => [...prev, {
                    id: j.messages[1].id, role: "ai", body: j.messages[1].body,
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: `err-${Date.now()}`, role: "ai",
                    body: j?.message || "Xatolik. Keyinroq qayta urinib ko'ring.",
                }]);
            }
        } finally {
            setSending(false);
        }
    }

    const posClass = position === "bottom-right" ? "right-4" : "left-4";

    // Suzuvchi tugma
    if (!open) {
        return createPortal(
            <button onClick={() => setOpen(true)}
                title="AI yordam"
                className={`fixed bottom-24 ${posClass} z-[500] w-14 h-14 rounded-full grid place-items-center shadow-2xl hover:scale-105 transition-transform`}
                style={{ background: T.gradient, color: T.onPrimary, boxShadow: T.shadow }}>
                <Sparkles className="w-6 h-6" />
            </button>,
            document.body,
        );
    }

    // Ochiq mini chat oynasi
    return createPortal(
        <div className={`fixed bottom-24 ${posClass} z-[500] w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl`}
            style={{ background: "var(--background)", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.border }}>
                <span className="w-8 h-8 rounded-lg grid place-items-center"
                    style={{ background: T.gradient, color: T.onPrimary }}>
                    <Sparkles className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">AI yordam</p>
                    <p className="text-[10px] text-muted-foreground">{T.label}</p>
                </div>
                <Link href={"/ai/chat" as never}
                    onClick={() => setOpen(false)}
                    title="To'liq chat'ga o'tish"
                    className="w-7 h-7 rounded-lg grid place-items-center hover:brightness-95"
                    style={{ background: T.soft, color: T.primary }}>
                    <MessageSquareMore className="w-3.5 h-3.5" />
                </Link>
                <button onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg grid place-items-center hover:brightness-95">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Xabarlar */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-xs text-muted-foreground">
                            {initialPrompt || `${T.label} bo'yicha savol bering — AI yordam beradi`}
                        </p>
                    </div>
                )}
                {messages.map(m => {
                    const isUser = m.role === "user";
                    return (
                        <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[85%] px-3 py-2 text-[13px] whitespace-pre-wrap break-words"
                                style={{
                                    background: isUser ? T.gradient : "var(--card, rgba(0,0,0,0.04))",
                                    color: isUser ? T.onPrimary : "var(--foreground)",
                                    borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                }}>
                                {m.body}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="border-t p-2 flex gap-2" style={{ borderColor: T.border }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, 2000))}
                    placeholder={initialPrompt || "AI'ga savol yozing..."}
                    className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: T.border, ["--tw-ring-color" as string]: T.primary + "50" }}
                    disabled={sending}
                />
                <button type="submit" disabled={sending || !input.trim()}
                    className="w-9 h-9 rounded-lg grid place-items-center disabled:opacity-50"
                    style={{ background: T.gradient, color: T.onPrimary }}>
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
            </form>
        </div>,
        document.body,
    );
}
