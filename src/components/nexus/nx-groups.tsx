"use client";

import { useState, useRef, useEffect } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Search, Hash, Users, Plus, Send, ChevronLeft,
    Settings, Bell, BellOff, Pin, Star, Lock, Globe,
    MessageSquare, Radio,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
interface Group {
    id: string; name: string; handle: string;
    type: "channel" | "group" | "supergroup";
    members: number; online?: number;
    pinned?: boolean; muted?: boolean;
    lastMsg: string; lastTime: string; unread?: number;
    verified?: boolean;
}

interface GMsg { id: number; author: string; text: string; time: string; mine?: boolean; }

const GROUPS: Group[] = [
    { id: "g1", name: "Humo Nexus Official", handle: "@nexus_official", type: "channel", members: 284500, pinned: true, verified: true, lastMsg: "Nexus 2.0 chiqdi! Yangi xususiyatlar bilan tanishing.", lastTime: "12:04", unread: 1 },
    { id: "g2", name: "Tech UZ Community",   handle: "@tech_uz",         type: "supergroup", members: 18200, online: 4200, lastMsg: "React 19 haqida kim biror narsa biladi?", lastTime: "11:52", unread: 47 },
    { id: "g3", name: "O'zbek Devlar",       handle: "@uzbek_devs",      type: "supergroup", members: 31400, online: 8100, lastMsg: "Yangi loyiha top. GitHub linkni qo'shing.", lastTime: "11:40", unread: 12 },
    { id: "g4", name: "Musiqa Dunyo",        handle: "@musiqa_uz",       type: "supergroup", members: 9800, online: 1200, muted: true, lastMsg: "Madina yangi qo'shig'ini chiqardi!", lastTime: "11:15" },
    { id: "g5", name: "AI & Machine Learning UZ", handle: "@ai_uz",     type: "channel", members: 56000, verified: true, lastMsg: "GPT-6 chiqdi. Tahlil maqolasi qo'yildi.", lastTime: "10:58", unread: 3 },
    { id: "g6", name: "Startup UZ",          handle: "@startup_uz",      type: "supergroup", members: 14300, online: 2800, lastMsg: "Pitching uchun bo'sh slot bormi?", lastTime: "10:30" },
    { id: "g7", name: "Design Community UZ", handle: "@design_uz",       type: "group", members: 5200, online: 890, lastMsg: "Figma 2026 yangiliklari juda yaxshi!", lastTime: "09:45", unread: 8 },
    { id: "g8", name: "Gaming UZ",           handle: "@gaming_uz",       type: "supergroup", members: 22100, online: 6700, lastMsg: "Kechagi turnir resultatlar:", lastTime: "09:12" },
];

const MOCK_MSGS: Record<string, GMsg[]> = {
    g1: [
        { id: 1, author: "Humo Official", text: "Nexus 1.5 yangilanishi chiqdi. Ko'plab xatolar tuzatildi va performance yaxshilandi.", time: "10:00" },
        { id: 2, author: "Humo Official", text: "Endi real musiqa ijrosi qo'llab-quvvatlanadi. Lossless sifatda tinglang.", time: "10:05" },
        { id: 3, author: "Humo Official", text: "Stories va Shorts uchun to'liq ko'rinish qo'shildi. Barcha qurilmalarda ishlaydi.", time: "11:30" },
        { id: 4, author: "Humo Official", text: "Nexus 2.0 chiqdi! Yangi xususiyatlar bilan tanishing.", time: "12:04" },
    ],
    g2: [
        { id: 1, author: "Sardor K",       text: "React 19 da Server Actions haqida bilgan bormi?", time: "11:30" },
        { id: 2, author: "Nilufar Dev",    text: "Ha, men ishlatdim. Juda qulay ekan! Hujjatlarni o'qing.", time: "11:34" },
        { id: 3, author: "Bobur M",        text: "Next.js 15 bilan qo'shib ishlatish yanada yaxshi.", time: "11:40" },
        { id: 4, author: "Sardor K",       text: "React 19 haqida kim biror narsa biladi?", time: "11:52" },
    ],
    g3: [
        { id: 1, author: "Islom Dev",      text: "Yangi loyiha top. GitHub linkni qo'shing.", time: "11:40" },
    ],
};

const TYPE_BADGE: Record<Group["type"], string> = {
    channel:    "Kanal",
    group:      "Guruh",
    supergroup: "Supergroup",
};

function now() {
    return new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// NxGroups — guruhlar va kanallar
// ─────────────────────────────────────────────────────────────────────────────
export function NxGroups() {
    const { groupsOpen, setGroupsOpen } = useNxPlayer();
    const [selected, setSelected]       = useState<Group | null>(null);
    const [search,   setSearch]         = useState("");
    const [input,    setInput]          = useState("");
    const [msgs,     setMsgs]           = useState<Record<string, GMsg[]>>(MOCK_MSGS);
    const [filter,   setFilter]         = useState<"all" | "channels" | "groups">("all");
    const [muted,    setMuted]          = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs, selected]);

    if (!groupsOpen) return null;

    const filtered = GROUPS.filter(g => {
        if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === "channels") return g.type === "channel";
        if (filter === "groups")   return g.type !== "channel";
        return true;
    });

    const sendMsg = () => {
        if (!input.trim() || !selected) return;
        const newMsg: GMsg = { id: Date.now(), author: "Men", text: input.trim(), time: now(), mine: true };
        setMsgs(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), newMsg] }));
        setInput("");
    };

    const groupMsgs = selected ? (msgs[selected.id] ?? []) : [];
    const isMuted = (id: string) => muted.has(id);
    const toggleMute = (id: string) => setMuted(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    return (
        <>
            <div className="fixed inset-0 z-50" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={() => setGroupsOpen(false)} />
            <div
                className="fixed inset-0 z-50 flex flex-col md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[720px] md:h-[560px] md:rounded-3xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)" }}
                onClick={e => e.stopPropagation()}
            >
                {selected ? (
                    /* ── Guruh chat ── */
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                <ChevronLeft className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                            </button>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {selected.type === "channel" ? <Radio className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{selected.name}</p>
                                <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                    {selected.members.toLocaleString()} a'zo {selected.online ? `· ${selected.online.toLocaleString()} faol` : ""}
                                </p>
                            </div>
                            <button onClick={() => toggleMute(selected.id)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                {isMuted(selected.id) ? <BellOff className="w-4 h-4" style={{ color: "rgba(160,176,224,0.60)" }} /> : <Bell className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                <Settings className="w-4 h-4" style={{ color: "rgba(160,176,224,0.70)" }} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
                            {groupMsgs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <MessageSquare className="w-8 h-8" style={{ color: "rgba(43,62,232,0.30)" }} />
                                    <p className="text-xs" style={{ color: "rgba(100,120,170,0.60)" }}>Xabarlar yo'q</p>
                                </div>
                            )}
                            {groupMsgs.map(msg => (
                                <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${msg.mine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                                        style={{ background: msg.mine ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.12)", border: msg.mine ? "none" : "1px solid rgba(43,62,232,0.18)" }}>
                                        {!msg.mine && (
                                            <p className="text-[10px] font-bold mb-1" style={{ color: "#00CEC8" }}>{msg.author}</p>
                                        )}
                                        <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                                        <p className={`text-[9px] mt-1 text-right ${msg.mine ? "text-white/70" : ""}`} style={msg.mine ? {} : { color: "rgba(80,100,150,0.70)" }}>{msg.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text" value={input} onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && sendMsg()}
                                    placeholder={`${selected.name} ga xabar yozing...`}
                                    className="flex-1 h-10 rounded-2xl px-4 text-sm text-white outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }}
                                />
                                <button onClick={sendMsg} className="w-10 h-10 flex items-center justify-center rounded-2xl flex-shrink-0 transition-all duration-150 active:scale-90"
                                    style={{ background: input.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.12)" }}>
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Guruhlar ro'yxati ── */
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Hash className="w-4 h-4 text-white" />
                                </div>
                                <h2 className="text-sm font-black text-white">Guruhlar va Kanallar</h2>
                            </div>
                            <div className="flex gap-2">
                                <button className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                    <Plus className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                </button>
                                <button onClick={() => setGroupsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                    <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                </button>
                            </div>
                        </div>

                        {/* Search + filters */}
                        <div className="px-4 pt-3 pb-2 flex-shrink-0 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(43,62,232,0.50)" }} />
                                <input
                                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Guruh yoki kanal qidiring..."
                                    className="w-full h-9 rounded-xl pl-9 pr-4 text-sm text-white outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }}
                                />
                            </div>
                            <div className="flex gap-2">
                                {(["all", "channels", "groups"] as const).map(f => (
                                    <button key={f} onClick={() => setFilter(f)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150"
                                        style={filter === f ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.85)" }}>
                                        {f === "all" ? "Barchasi" : f === "channels" ? "Kanallar" : "Guruhlar"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                            {filtered.map(g => (
                                <button key={g.id} onClick={() => setSelected(g)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 group"
                                    style={{ borderBottom: "1px solid rgba(43,62,232,0.07)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.06)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                >
                                    {/* Icon */}
                                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                                        style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.35),rgba(0,206,200,0.20))", border: "1px solid rgba(43,62,232,0.25)" }}>
                                        {g.type === "channel"
                                            ? <Radio className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                            : <Users className="w-5 h-5" style={{ color: "#2B3EE8" }} />}
                                        {g.type !== "channel" && g.type === "supergroup" && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                <Globe className="w-2 h-2 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            {g.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />}
                                            <span className="text-sm font-bold text-white truncate">{g.name}</span>
                                            {g.verified && <Star className="w-3 h-3 flex-shrink-0 fill-current" style={{ color: "#00CEC8" }} />}
                                            {isMuted(g.id) && <BellOff className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(100,120,170,0.50)" }} />}
                                        </div>
                                        <p className="text-[11px] truncate" style={{ color: "rgba(100,120,170,0.75)" }}>{g.lastMsg}</p>
                                    </div>

                                    {/* Right meta */}
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>{g.lastTime}</span>
                                        {g.unread ? (
                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white min-w-[18px] text-center"
                                                style={{ background: isMuted(g.id) ? "rgba(80,100,150,0.40)" : "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                {g.unread > 99 ? "99+" : g.unread}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-lg"
                                                style={{ background: "rgba(43,62,232,0.10)", color: "rgba(80,100,150,0.70)" }}>
                                                {TYPE_BADGE[g.type]}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
