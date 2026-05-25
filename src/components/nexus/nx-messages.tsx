"use client";

import { useState, useRef, useEffect } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Send, ArrowLeft, Search, Phone, Video,
    MoreHorizontal, Check, CheckCheck, Smile, Image as ImgIcon,
    Mic, Circle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface ChatItem {
    id: number; name: string; msg: string; time: string;
    unread: number; online: boolean; group?: boolean;
}

const CHATS: ChatItem[] = [
    { id: 1, name: "Sardor",        msg: "Ertaga uchrashamiz?",        time: "14:32", unread: 2, online: true  },
    { id: 2, name: "Madina",        msg: "Rahmat! Juda ajoyib",        time: "12:45", unread: 0, online: true  },
    { id: 3, name: "Dizayn Jamoa",  msg: "Fayl: mockup.fig yuklandi",  time: "11:20", unread: 5, online: false, group: true },
    { id: 4, name: "Islomjon",      msg: "Yangi loyiha haqida...",      time: "10:05", unread: 0, online: false },
    { id: 5, name: "Kamola",        msg: "Ha, yaxshi g'oya!",          time: "09:30", unread: 0, online: true  },
    { id: 6, name: "Do'stlar",      msg: "Sardor: Qayerdasiz?",        time: "Kecha", unread: 0, online: false, group: true },
    { id: 7, name: "Humo Support",  msg: "Muammoingiz hal qilindi",    time: "Kecha", unread: 0, online: true  },
    { id: 8, name: "Dev Guruh",     msg: "Bobur: PR merge qilindi",    time: "Dush",  unread: 3, online: false, group: true },
];

interface Msg { id: number; text: string; mine: boolean; time: string; read: boolean; }

const INIT_MSGS: Record<number, Msg[]> = {
    1: [
        { id: 1, text: "Salom! Qanday ahvollar?", mine: false, time: "14:25", read: true },
        { id: 2, text: "Yaxshi, rahmat! Senchi?",  mine: true,  time: "14:26", read: true },
        { id: 3, text: "Juda zo'r. Ertaga uchrashamiz?", mine: false, time: "14:32", read: true },
    ],
    2: [
        { id: 1, text: "Yangi videoni ko'rdim", mine: false, time: "12:40", read: true },
        { id: 2, text: "Rahmat! Juda ajoyib edi", mine: false, time: "12:41", read: true },
        { id: 3, text: "Davom eting!",           mine: false, time: "12:45", read: true },
    ],
    3: [
        { id: 1, text: "Fayl: mockup.fig yuklandi", mine: false, time: "11:20", read: true },
        { id: 2, text: "Rahmat, ko'rib chiqaman",   mine: true,  time: "11:22", read: true },
    ],
};

const AUTO_REPLIES = [
    "Ha, albatta!",
    "Tushunarli, rahmat",
    "Ajoyib g'oya!",
    "Ko'rib chiqaman",
    "Zo'r!",
    "Qachon bo'ladi?",
    "Yaxshi, kelishamiz",
    "Bir oz kuting...",
];

// ─────────────────────────────────────────────────────────────────────────────
// NxMessages
// ─────────────────────────────────────────────────────────────────────────────
export function NxMessages() {
    const { messagesOpen, setMessagesOpen, setCallsOpen, setMeetingOpen } = useNxPlayer();
    const [selected,   setSelected]   = useState<ChatItem | null>(null);
    const [msgs,       setMsgs]       = useState<Record<number, Msg[]>>(INIT_MSGS);
    const [input,      setInput]      = useState("");
    const [query,      setQuery]      = useState("");
    const [typing,     setTyping]     = useState(false);
    const [showEmoji,  setShowEmoji]  = useState(false);
    const [infoOpen,   setInfoOpen]   = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const EMOJI_LIST = ["😊","👍","❤️","😂","🔥","✅","🎉","👏","😍","🤝","💯","🚀"];

    const insertEmoji = (e: string) => { setInput(p => p + e); setShowEmoji(false); };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs, selected]);

    if (!messagesOpen) return null;

    const sendMsg = () => {
        if (!selected || !input.trim()) return;
        const newMsg: Msg = { id: Date.now(), text: input.trim(), mine: true, time: now(), read: false };
        setMsgs(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), newMsg] }));
        setInput("");
        // Auto javob
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            const reply: Msg = {
                id: Date.now() + 1,
                text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
                mine: false, time: now(), read: true,
            };
            setMsgs(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), reply] }));
        }, 1400 + Math.random() * 1000);
    };

    const filteredChats = CHATS.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
    );

    const conversation = selected ? (msgs[selected.id] ?? []) : [];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }}
                onClick={() => setMessagesOpen(false)}
            />

            {/* Panel */}
            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-16 md:right-4 md:bottom-auto
                           md:w-[520px] md:max-h-[calc(100vh-80px)] md:rounded-2xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border:     "1px solid rgba(43,62,232,0.22)",
                    boxShadow:  "0 24px 64px rgba(0,0,0,0.70)",
                    height:     "85vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Inbox panel ── */}
                <div
                    className="flex flex-col border-r transition-all duration-300"
                    style={{
                        borderColor: "rgba(43,62,232,0.14)",
                        width: selected ? "0" : "100%",
                        minWidth: selected ? "0" : "100%",
                        overflow: "hidden",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                        <h3 className="text-base font-black text-white flex-1">Xabarlar</h3>
                        <button onClick={() => setMessagesOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    {/* Search */}
                    <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(43,62,232,0.50)" }} />
                            <input
                                type="text" value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Suhbat qidirish..."
                                className="w-full h-9 rounded-xl pl-9 pr-3 text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }}
                            />
                        </div>
                    </div>
                    {/* Chat list */}
                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {filteredChats.map(c => (
                            <button key={c.id} onClick={() => setSelected(c)}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150"
                                style={{ borderBottom: "1px solid rgba(43,62,232,0.07)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden"
                                        style={{ border: "2px solid rgba(43,62,232,0.22)" }}>
                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.name}`} alt={c.name}
                                            className="w-full h-full object-cover bg-white" />
                                    </div>
                                    {c.online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                            style={{ background: "#10B981", borderColor: "#050818" }} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-bold text-white">{c.name}</span>
                                        <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{c.time}</span>
                                    </div>
                                    <p className="text-xs truncate" style={{ color: "rgba(100,120,170,0.75)" }}>{c.msg}</p>
                                </div>
                                {c.unread > 0 && (
                                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        {c.unread}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Suhbat paneli ── */}
                {selected && (
                    <div className="flex flex-col" style={{ width: "100%", minWidth: "100%" }}>
                        {/* Chat header */}
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <button onClick={() => setSelected(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl"
                                style={{ background: "rgba(43,62,232,0.10)" }}>
                                <ArrowLeft className="w-4 h-4 text-white" />
                            </button>
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-xl overflow-hidden">
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${selected.name}`}
                                        alt={selected.name} className="w-full h-full object-cover bg-white" />
                                </div>
                                {selected.online && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                        style={{ background: "#10B981", borderColor: "#050818" }} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{selected.name}</p>
                                <p className="text-[10px]" style={{ color: selected.online ? "#10B981" : "rgba(80,100,150,0.75)" }}>
                                    {selected.online ? "Online" : "Offline"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setMessagesOpen(false); setCallsOpen(true); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                    style={{ background: "rgba(43,62,232,0.08)" }}>
                                    <Phone className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.75)" }} />
                                </button>
                                <button
                                    onClick={() => { setMessagesOpen(false); setMeetingOpen(true); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                    style={{ background: "rgba(43,62,232,0.08)" }}>
                                    <Video className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.75)" }} />
                                </button>
                                <button
                                    onClick={() => setInfoOpen(p => !p)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                    style={{ background: infoOpen ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)" }}>
                                    <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.75)" }} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
                            {conversation.map(m => (
                                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                                    {!m.mine && (
                                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
                                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${selected.name}`}
                                                alt="" className="w-full h-full object-cover bg-white" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-0.5 max-w-[72%]">
                                        <div
                                            className="px-3.5 py-2.5 rounded-2xl text-sm"
                                            style={m.mine ? {
                                                background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)",
                                                color: "#fff",
                                                borderBottomRightRadius: "4px",
                                            } : {
                                                background: "rgba(43,62,232,0.12)",
                                                border: "1px solid rgba(43,62,232,0.20)",
                                                color: "rgba(220,230,255,0.90)",
                                                borderBottomLeftRadius: "4px",
                                            }}
                                        >
                                            {m.text}
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] px-1 ${m.mine ? "justify-end" : "justify-start"}`}
                                            style={{ color: "rgba(80,100,150,0.70)" }}>
                                            {m.time}
                                            {m.mine && (m.read
                                                ? <CheckCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                                : <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {typing && (
                                <div className="flex justify-start">
                                    <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${selected.name}`}
                                            alt="" className="w-full h-full object-cover bg-white" />
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl flex items-center gap-1"
                                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                        {[0,1,2].map(i => (
                                            <div key={i} className="w-1.5 h-1.5 rounded-full"
                                                style={{
                                                    background: "rgba(140,160,210,0.60)",
                                                    animation: `nx-typing 1.2s ease-in-out ${i * 0.2}s infinite`,
                                                }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* Contact info panel */}
                        {infoOpen && selected && (
                            <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
                                style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(43,62,232,0.05)" }}>
                                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                                    style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${selected.name}`}
                                        alt="" className="w-full h-full object-cover bg-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{selected.name}</p>
                                    <p className="text-[10px]" style={{ color: selected.online ? "#10B981" : "rgba(80,100,150,0.70)" }}>
                                        {selected.online ? "● Online" : "○ Offline"} {selected.group ? "· Guruh" : "· Shaxsiy"}
                                    </p>
                                </div>
                                <button onClick={() => setInfoOpen(false)}
                                    className="text-[10px] px-2.5 py-1 rounded-lg"
                                    style={{ background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.70)" }}>
                                    Yopish
                                </button>
                            </div>
                        )}

                        {/* Emoji picker */}
                        {showEmoji && (
                            <div className="flex-shrink-0 px-4 py-2 flex flex-wrap gap-2"
                                style={{ borderTop: "1px solid rgba(43,62,232,0.10)" }}>
                                {EMOJI_LIST.map(e => (
                                    <button key={e} onClick={() => insertEmoji(e)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all duration-100 active:scale-90"
                                        style={{ background: "rgba(43,62,232,0.10)" }}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-2"
                            style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            <button
                                onClick={() => setShowEmoji(p => !p)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150 active:scale-90"
                                style={{ background: showEmoji ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)" }}>
                                <Smile className="w-4 h-4" style={{ color: showEmoji ? "#00CEC8" : "rgba(140,160,210,0.60)" }} />
                            </button>
                            <button
                                onClick={() => insertEmoji("🖼️")}
                                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150 active:scale-90"
                                style={{ background: "rgba(43,62,232,0.08)" }}>
                                <ImgIcon className="w-4 h-4" style={{ color: "rgba(140,160,210,0.60)" }} />
                            </button>
                            <input
                                type="text" value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && sendMsg()}
                                placeholder="Xabar yozing..."
                                className="flex-1 h-9 rounded-xl px-3.5 text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }}
                            />
                            <button
                                onClick={sendMsg}
                                className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150 active:scale-95"
                                style={input.trim()
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 14px rgba(43,62,232,0.40)" }
                                    : { background: "rgba(43,62,232,0.08)" }
                                }
                            >
                                {input.trim()
                                    ? <Send className="w-4 h-4 text-white" />
                                    : <Mic className="w-4 h-4" style={{ color: "rgba(140,160,210,0.60)" }} />
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes nx-typing {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
                    40%           { transform: scale(1.0); opacity: 1.0; }
                }
            `}</style>
        </>
    );
}

// Yordamchi
function now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
