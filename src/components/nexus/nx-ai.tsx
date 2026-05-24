"use client";

import { useState, useRef, useEffect } from "react";
import { X, Bot, Send, Sparkles, RefreshCw, Copy, Check, Mic, Image } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
interface AiMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    time: string;
}

// Tavsiya etilgan savollar
const SUGGESTIONS = [
    "Bugun trending qanday kontentlar bor?",
    "Menga yangi musiqa tavsiya qil",
    "Nexus Pro afzalliklari nimalar?",
    "Kanalimni qanday rivojlantiraman?",
    "Eng yaxshi Uzbek podkastlar",
    "Videom uchun sarlavha yoz",
];

// Mock AI javoblari — keyword-based
const AI_RESPONSES: [string, string][] = [
    ["trending", "Bugun Nexus trendlarida #HumoNexus, #UzbekistanMusic va #AIKelajak eng yuqori. Texnologiya va musiqa sohalari eng faol!"],
    ["musiqa", "Sizga Sardor Mamadaliev, Shaxriyor va Dilnoza Yusupova kabi artistlarni tavsiya qilaman. Nexus Music bo'limida ularning to'liq diskografiyasini tinglashingiz mumkin."],
    ["pro", "Nexus Pro bilan: reklama yo'q, lossless sifatda musiqa, 4K video, 10 TB bulut xotira, eksklyuziv kontent va ko'proq. 7 kunlik bepul sinov!"],
    ["kanal", "Kanaliz rivojlantirish uchun: 1) Doimiy jadval tuzing 2) Trending hashtaglar ishlating 3) Tomoshabinlar bilan faol muloqot qiling 4) Analitika bo'limidan foydalaning"],
    ["podkast", "Top Uzbek podkastlar: 'Startup UZ' (biznes), 'AI va Texnologiya' (tech), 'Kitob Tavsiyalari' (ta'lim), 'Sog'liq Siri' (sog'liq)"],
    ["sarlavha", "Kuchli video sarlavhalar uchun: raqamlar ishlating (Top 10...), savol qo'ying (Qanday qilib...), foyda ko'rsating (Shu usul bilan...). Qaysi mavzuda?"],
];

function getMockResponse(input: string): string {
    const lower = input.toLowerCase();
    for (const [key, resp] of AI_RESPONSES) {
        if (lower.includes(key)) return resp;
    }
    return `Sizning savolingizni tushundim: "${input}". Nexus AI hozircha beta rejimida ishlayapti. Tez orada to'liq javob bera olaman! Shu orada Explore bo'limidan qidirishingiz mumkin.`;
}

function nowTime(): string {
    return new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// NxAI
// ─────────────────────────────────────────────────────────────────────────────
export function NxAI() {
    const { aiOpen, setAiOpen } = useNxPlayer();
    const [messages, setMessages] = useState<AiMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            text: "Salom! Men Nexus AI — sizning shaxsiy yordamchingiz. Kontentlar, musiqa, kanallar haqida so'rashingiz yoki tavsiya so'rashingiz mumkin.",
            time: nowTime(),
        }
    ]);
    const [input,     setInput]     = useState("");
    const [loading,   setLoading]   = useState(false);
    const [copiedId,  setCopiedId]  = useState<string | null>(null);
    const bottomRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (aiOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [aiOpen]);

    if (!aiOpen) return null;

    const send = (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: AiMessage = { id: `u${Date.now()}`, role: "user", text: text.trim(), time: nowTime() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        setTimeout(() => {
            const reply: AiMessage = {
                id: `a${Date.now()}`,
                role: "assistant",
                text: getMockResponse(text),
                time: nowTime(),
            };
            setMessages(prev => [...prev, reply]);
            setLoading(false);
        }, 900 + Math.random() * 600);
    };

    const copyText = (id: string, text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const reset = () => {
        setMessages([{
            id: "welcome",
            role: "assistant",
            text: "Salom! Men Nexus AI. Qaytadan boshlaylik — nima yordam kerak?",
            time: nowTime(),
        }]);
        setInput("");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setAiOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(139,92,246,0.30)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70), 0 0 60px rgba(139,92,246,0.08)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center relative"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                            <Bot className="w-4 h-4 text-white" />
                            {/* Live indicator */}
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                                style={{ borderColor: "rgba(8,12,32,0.98)" }} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white leading-tight flex items-center gap-1">
                                Nexus AI
                                <Sparkles className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                            </h2>
                            <p className="text-[9px]" style={{ color: "rgba(139,92,246,0.70)" }}>Beta · Har doim tayyor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={reset}
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
                            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)" }}
                        >
                            <RefreshCw className="w-3.5 h-3.5" style={{ color: "rgba(139,92,246,0.80)" }} />
                        </button>
                        <button
                            onClick={() => setAiOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
                    {messages.map(msg => (
                        <div key={msg.id}
                            className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div
                                className="max-w-[85%] px-4 py-3 rounded-2xl relative group"
                                style={msg.role === "user" ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                    borderBottomRightRadius: "6px",
                                } : {
                                    background: "rgba(139,92,246,0.10)",
                                    border: "1px solid rgba(139,92,246,0.22)",
                                    borderBottomLeftRadius: "6px",
                                }}
                            >
                                {msg.role === "assistant" && (
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Bot className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                                        <span className="text-[9px] font-black" style={{ color: "#8B5CF6" }}>Nexus AI</span>
                                    </div>
                                )}
                                <p className="text-sm text-white leading-relaxed">{msg.text}</p>

                                {/* Copy button */}
                                {msg.role === "assistant" && (
                                    <button
                                        onClick={() => copyText(msg.id, msg.text)}
                                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                        style={{ background: "rgba(139,92,246,0.20)" }}
                                    >
                                        {copiedId === msg.id
                                            ? <Check className="w-3 h-3" style={{ color: "#10B981" }} />
                                            : <Copy className="w-3 h-3" style={{ color: "rgba(139,92,246,0.80)" }} />
                                        }
                                    </button>
                                )}
                            </div>
                            <span className="text-[9px] px-1" style={{ color: "rgba(80,100,150,0.60)" }}>{msg.time}</span>
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex items-start gap-2">
                            <div className="px-4 py-3 rounded-2xl"
                                style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.22)", borderBottomLeftRadius: "6px" }}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Bot className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                                    <span className="text-[9px] font-black" style={{ color: "#8B5CF6" }}>Nexus AI</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                background: "#8B5CF6",
                                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                                            }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Suggestions (show only when 1 message) */}
                    {messages.length === 1 && !loading && (
                        <div className="flex flex-col gap-2 mt-2">
                            <p className="text-[10px] font-bold px-1" style={{ color: "rgba(139,92,246,0.60)" }}>
                                Tavsiya etilgan savollar
                            </p>
                            {SUGGESTIONS.map(s => (
                                <button key={s}
                                    onClick={() => send(s)}
                                    className="text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", color: "rgba(200,190,255,0.90)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.40)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.18)"}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <div className="px-4 pb-4 pt-2 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)" }}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ background: "rgba(139,92,246,0.12)" }}>
                            <Image className="w-3.5 h-3.5" style={{ color: "rgba(139,92,246,0.70)" }} />
                        </button>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                            placeholder="Nexus AI bilan suhbatlashing..."
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                        />
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ background: "rgba(139,92,246,0.12)" }}>
                            <Mic className="w-3.5 h-3.5" style={{ color: "rgba(139,92,246,0.70)" }} />
                        </button>
                        <button
                            onClick={() => send(input)}
                            disabled={!input.trim() || loading}
                            className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150 active:scale-90"
                            style={{
                                background: input.trim() && !loading
                                    ? "linear-gradient(135deg,#8B5CF6,#EC4899)"
                                    : "rgba(43,62,232,0.12)",
                                opacity: input.trim() && !loading ? 1 : 0.5,
                            }}
                        >
                            <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                    <p className="text-center text-[9px] mt-2" style={{ color: "rgba(80,100,150,0.50)" }}>
                        Nexus AI · Beta · Javoblar aniq bo&apos;lmasligi mumkin
                    </p>
                </div>
            </div>
        </>
    );
}
