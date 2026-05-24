"use client";

import { useState, useEffect, useRef } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Send, Smile, ChevronUp, Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock chat xabarlari
// ─────────────────────────────────────────────────────────────────────────────
interface LiveMsg {
    id: number; user: string; text: string;
    color: string; badge?: string;
}

const COLORS = ["#2B3EE8", "#00CEC8", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#F97316"];
const BADGE_COLORS: Record<string, string> = {
    "Moderator": "rgba(16,185,129,0.20)",
    "VIP": "rgba(245,158,11,0.20)",
    "Pro": "rgba(43,62,232,0.20)",
};

const SEED_MSGS: Omit<LiveMsg, "id">[] = [
    { user: "Sardor",    text: "Salom hammaga!",                color: COLORS[0] },
    { user: "Madina",    text: "Zo'r efir!",                    color: COLORS[1], badge: "VIP" },
    { user: "Islom",     text: "Sifat juda yaxshi",             color: COLORS[2] },
    { user: "Kamola",    text: "Ha, men ham tomosha qilyapman", color: COLORS[3] },
    { user: "Dilnoza",   text: "Davom eting!",                  color: COLORS[4], badge: "Pro" },
    { user: "Bobur",     text: "Qachon keyingi?",               color: COLORS[5] },
    { user: "Moderator", text: "Savollar uchun hashtag ishlatib yozing", color: COLORS[6], badge: "Moderator" },
    { user: "Jasur",     text: "Zo'r platforma bu Nexus!",      color: COLORS[0] },
    { user: "Zulfiya",   text: "Rahmat!",                       color: COLORS[1] },
    { user: "Sherzod",   text: "Juda yoqdi",                    color: COLORS[2] },
];

const EMOTES = ["PogChamp", "LUL", "KEKW", "Pog", "monkaS", "OMEGALUL", "5Head", "Kreygasm"];
const AUTO_MSGS: string[] = [
    "Zo'r!",
    "Davom et!",
    "Sifat juda yuqori",
    "Ha to'g'ri!",
    "Qoyilmaqom!",
    "Rahmat!",
    "Yaxshi tushuntiryapsan",
    "Keyingisi qachon?",
    "Juda foydali",
    "Tavsiya qilaman hammaga",
];

// ─────────────────────────────────────────────────────────────────────────────
// NxLiveChat
// ─────────────────────────────────────────────────────────────────────────────
export function NxLiveChat() {
    const { liveChatOpen, setLiveChatOpen } = useNxPlayer();
    const [msgs, setMsgs]     = useState<LiveMsg[]>(
        SEED_MSGS.map((m, i) => ({ ...m, id: i + 1 }))
    );
    const [input, setInput]   = useState("");
    const [viewers]           = useState(Math.floor(5000 + Math.random() * 20000));
    const [collapsed, setCollapsed] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef(SEED_MSGS.length + 1);

    // Auto-scroll
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs]);

    // Auto-generate chat messages
    useEffect(() => {
        if (!liveChatOpen) return;
        const interval = setInterval(() => {
            const seedUser = SEED_MSGS[Math.floor(Math.random() * SEED_MSGS.length)];
            const autoMsg: LiveMsg = {
                id: counterRef.current++,
                user:  seedUser.user,
                text:  AUTO_MSGS[Math.floor(Math.random() * AUTO_MSGS.length)],
                color: seedUser.color,
                badge: seedUser.badge,
            };
            setMsgs(prev => [...prev.slice(-80), autoMsg]);
        }, 1800 + Math.random() * 2200);
        return () => clearInterval(interval);
    }, [liveChatOpen]);

    if (!liveChatOpen) return null;

    const send = () => {
        if (!input.trim()) return;
        const msg: LiveMsg = {
            id: counterRef.current++,
            user: "Siz", text: input.trim(),
            color: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
            badge: "Pro",
        };
        setMsgs(prev => [...prev.slice(-80), msg]);
        setInput("");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[65]"
                style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(6px)" }}
                onClick={() => setLiveChatOpen(false)}
            />

            {/* Panel — right side */}
            <div
                className="fixed bottom-20 right-4 z-[65] flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                    background: "rgba(8,12,32,0.97)",
                    border:     "1px solid rgba(239,68,68,0.30)",
                    boxShadow:  "0 16px 48px rgba(0,0,0,0.70)",
                    width:      "300px",
                    height:     collapsed ? "44px" : "480px",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                    style={{ borderBottom: collapsed ? "none" : "1px solid rgba(239,68,68,0.18)" }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
                    <span className="text-xs font-black text-white flex-1">Jonli Chat</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
                        <Users className="w-2.5 h-2.5" />
                        {formatViewers(viewers)}
                    </span>
                    <button onClick={() => setCollapsed(p => !p)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <ChevronUp className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
                    </button>
                    <button onClick={() => setLiveChatOpen(false)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>

                {!collapsed && (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: "none" }}>
                            {msgs.map(m => (
                                <div key={m.id} className="flex items-start gap-1.5 mb-1.5">
                                    {m.badge && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black mt-0.5"
                                            style={{ background: BADGE_COLORS[m.badge] ?? "rgba(43,62,232,0.15)", color: "#fff" }}>
                                            {m.badge}
                                        </span>
                                    )}
                                    <span className="text-[11px] font-bold flex-shrink-0"
                                        style={{ color: m.color.startsWith("linear") ? "#00CEC8" : m.color }}>
                                        {m.user}:
                                    </span>
                                    <span className="text-[11px] leading-relaxed" style={{ color: "rgba(200,215,245,0.85)" }}>
                                        {m.text}
                                    </span>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>

                        {/* Emotes bar */}
                        <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto flex-shrink-0"
                            style={{ scrollbarWidth: "none", borderTop: "1px solid rgba(43,62,232,0.10)" }}>
                            {EMOTES.map(e => (
                                <button key={e}
                                    onClick={() => setInput(prev => prev + ` ${e}`)}
                                    className="flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all duration-150 active:scale-95"
                                    style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.80)" }}>
                                    {e}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                            style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                                style={{ background: "rgba(43,62,232,0.08)" }}>
                                <Smile className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.60)" }} />
                            </button>
                            <input
                                type="text" value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && send()}
                                placeholder="Chat..."
                                className="flex-1 h-7 rounded-lg px-2.5 text-xs text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }}
                            />
                            <button onClick={send}
                                className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150 active:scale-95"
                                style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                <Send className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function formatViewers(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}
