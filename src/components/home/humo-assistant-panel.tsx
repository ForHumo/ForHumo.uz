"use client";

// Humo universal AI assistant paneli — suzuvchi tugma va chat oynasi.
// Foydalanuvchi bir joydan barcha modul haqida savol bera oladi.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Send, Loader2, Mic, MicOff, Bot, User } from "lucide-react";

interface Msg { id: string; role: "user" | "ai"; text: string; at: number }
interface AiResp {
    ok: boolean;
    type?: "answer" | "help" | "empty" | "unknown";
    reply?: string;
    error?: string;
    intents?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SpeechRecognitionCtor { new(): any }
type WindowWithSpeech = typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
};

const SUGGESTIONS = [
    "Balansim qancha?",
    "BN buyurtmalarim qanday?",
    "Bu oy qancha sarfladim?",
    "Nexus'da yangi nima bor?",
    "Belis rezervlarim qaysi holatda?",
];

const STORAGE_KEY = "humo-assistant-chat-v1";

export function HumoAssistantPanel({ initialOpen = false }: { initialOpen?: boolean }) {
    const [open, setOpen] = useState(initialOpen);
    const [mounted, setMounted] = useState(false);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [listening, setListening] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        // Suhbat tarixini localStorage'dan olamiz
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Msg[];
                if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
            }
        } catch { /* skip */ }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* skip */ }
        }
    }, [messages]);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async (customText?: string) => {
        const q = (customText ?? text).trim();
        if (!q || busy) return;
        if (customText) setText("");
        else setText("");

        const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text: q, at: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setBusy(true);
        try {
            const r = await fetch("/api/user/humo-assistant", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: q }),
            });
            const j: AiResp = await r.json();
            const reply = j.reply || j.error || "Xatolik yuz berdi.";
            setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "ai", text: reply, at: Date.now() }]);
        } catch {
            setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: "ai", text: "Tarmoq xatosi.", at: Date.now() }]);
        } finally {
            setBusy(false);
        }
    };

    const clearHistory = () => {
        setMessages([]);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* skip */ }
    };

    const toggleVoice = () => {
        const w = window as WindowWithSpeech;
        const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SR) {
            alert("Brauzeringiz ovoz kirishni qo'llamaydi");
            return;
        }
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }
        const rec = new SR();
        rec.lang = "uz-UZ";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            const transcript = e.results[0]?.[0]?.transcript;
            if (transcript) {
                setText(transcript);
                setListening(false);
                // Avto-yuborish
                send(transcript);
            }
        };
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
    };

    if (!mounted) return null;

    if (!open) {
        return createPortal(
            <button onClick={() => setOpen(true)}
                title="Humo AI — savol bering"
                className="fixed bottom-6 right-6 z-[500] h-14 pl-4 pr-5 rounded-full inline-flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform text-white"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 60%, #ec4899 100%)" }}>
                <Sparkles className="w-5 h-5" />
                <span className="text-[14px] font-black">Humo AI</span>
            </button>,
            document.body,
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-md h-[85vh] sm:h-[85vh] max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" }}>
                    <span className="w-9 h-9 rounded-xl grid place-items-center bg-white/20 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-white">Humo AI</p>
                        <p className="text-[11px] text-white/85">Barcha modul haqida savol bering</p>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={clearHistory} title="Suhbatni tozalash"
                            className="text-[11px] font-bold text-white/80 hover:text-white px-2 h-8 rounded-lg hover:bg-white/10">
                            Tozalash
                        </button>
                    )}
                    <button onClick={() => setOpen(false)}
                        className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/10 text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Xabarlar */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-50 dark:bg-neutral-950/50">
                    {messages.length === 0 && (
                        <div className="pt-2 pb-4 text-center">
                            <span className="w-14 h-14 rounded-2xl mx-auto mb-3 grid place-items-center"
                                style={{ background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)" }}>
                                <Bot className="w-6 h-6 text-white" />
                            </span>
                            <p className="text-[13.5px] font-black text-neutral-900 dark:text-neutral-100">
                                Salom! Men Humo AI.
                            </p>
                            <p className="text-[12px] text-neutral-500 mt-1 mb-3">
                                Savol bering — men barcha modul bo'yicha javob beraman
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {SUGGESTIONS.slice(0, 4).map(s => (
                                    <button key={s} onClick={() => send(s)}
                                        className="mx-auto h-8 px-3 rounded-lg text-[12px] font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-purple-400 dark:hover:border-purple-500 text-neutral-700 dark:text-neutral-300">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(m => {
                        const isUser = m.role === "user";
                        return (
                            <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                                {!isUser && (
                                    <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 mt-0.5"
                                        style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </span>
                                )}
                                <div className="max-w-[80%] px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words"
                                    style={{
                                        background: isUser ? "linear-gradient(135deg, #6366f1, #a855f7)" : "white",
                                        color: isUser ? "white" : "#111",
                                        borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                        border: isUser ? "none" : "1px solid #e5e5e5",
                                    }}>
                                    {m.text}
                                </div>
                                {isUser && (
                                    <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 mt-0.5 bg-neutral-200 dark:bg-neutral-700">
                                        <User className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {busy && (
                        <div className="flex gap-2 justify-start">
                            <span className="w-7 h-7 rounded-lg grid place-items-center mt-0.5"
                                style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </span>
                            <div className="px-3 py-2 bg-white border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 rounded-2xl">
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "0.15s" }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={e => { e.preventDefault(); send(); }}
                    className="border-t border-neutral-200 dark:border-neutral-800 p-2 flex items-center gap-2 bg-white dark:bg-neutral-900">
                    <button type="button" onClick={toggleVoice} disabled={busy}
                        title={listening ? "Ovozni to'xtatish" : "Ovoz kiritish"}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:brightness-95 disabled:opacity-40"
                        style={{
                            background: listening ? "#ef4444" : "#e5e5e5",
                            color: listening ? "#fff" : "#525252",
                        }}>
                        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <input ref={inputRef}
                        value={text} onChange={e => setText(e.target.value)}
                        placeholder="Savol yozing..."
                        disabled={busy} maxLength={500}
                        className="flex-1 h-10 px-3 rounded-xl text-[13.5px] bg-neutral-100 dark:bg-neutral-800 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 text-neutral-900 dark:text-neutral-100" />
                    <button type="submit" disabled={busy || !text.trim()}
                        className="h-10 w-10 rounded-xl grid place-items-center disabled:opacity-40 hover:brightness-95 text-white"
                        style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>,
        document.body,
    );
}
