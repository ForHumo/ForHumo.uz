"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Send, ArrowLeft, Search, BadgeCheck, Loader2, PenSquare, Phone, Video } from "lucide-react";

interface Other { id?: string; name: string | null; username: string | null; image: string | null; verified: boolean }
interface Conv { conversationId: string; other: Other | null; lastMessageText: string | null; lastMessageAt: string; lastMine: boolean; unread: boolean }
interface Msg { id: string; text: string; mine: boolean; createdAt: string }
interface SUser { name: string | null; username: string | null; image: string | null; verified: boolean; isMe: boolean }

function avatarOf(o: Other | SUser | null) {
    return o?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(o?.username || o?.name || "user")}`;
}
function timeShort(d: string) {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString())
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

export function NxMessages({ openWithUsername }: { openWithUsername?: string | null } = {}) {
    const { messagesOpen, setMessagesOpen, startCall } = useNxPlayer();
    const [conversations, setConversations] = useState<Conv[]>([]);
    const [selected, setSelected] = useState<{ conversationId: string; other: Other | null } | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");
    const [sending, setSending] = useState(false);
    const [newOpen, setNewOpen] = useState(false);
    const [newQuery, setNewQuery] = useState("");
    const [newResults, setNewResults] = useState<SUser[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const consumedRef = useRef<string | null>(null);

    const loadConvs = useCallback(() => {
        fetch("/api/nexus/messages").then(r => r.json()).then(d => setConversations(d.conversations ?? [])).catch(() => { });
    }, []);
    const loadThread = useCallback((cid: string) => {
        fetch(`/api/nexus/messages/${cid}`).then(r => r.json()).then(d => setMessages(d.messages ?? [])).catch(() => { });
    }, []);

    // Ochilganda
    useEffect(() => {
        if (!messagesOpen) { setSelected(null); setNewOpen(false); setQuery(""); return; }
        loadConvs();
        if (openWithUsername && consumedRef.current !== openWithUsername) {
            consumedRef.current = openWithUsername;
            fetch("/api/nexus/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: openWithUsername }) })
                .then(r => r.json()).then(d => { if (d.conversationId) setSelected({ conversationId: d.conversationId, other: d.other ?? null }); }).catch(() => { });
        }
    }, [messagesOpen, openWithUsername, loadConvs]);

    // Ro'yxat polling
    useEffect(() => {
        if (!messagesOpen || selected || newOpen) return;
        const t = setInterval(loadConvs, 6000);
        return () => clearInterval(t);
    }, [messagesOpen, selected, newOpen, loadConvs]);

    // Thread yuklash + polling
    useEffect(() => {
        if (!selected) return;
        loadThread(selected.conversationId);
        const t = setInterval(() => loadThread(selected.conversationId), 4000);
        return () => clearInterval(t);
    }, [selected, loadThread]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selected]);

    // Yangi xabar — foydalanuvchi qidirish
    useEffect(() => {
        if (!newOpen) return;
        const q = newQuery.trim();
        if (!q) { setNewResults([]); return; }
        const t = setTimeout(async () => {
            const d = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({}));
            setNewResults((d.users ?? []).filter((u: SUser) => !u.isMe && u.username));
        }, 300);
        return () => clearTimeout(t);
    }, [newOpen, newQuery]);

    if (!messagesOpen) return null;

    async function send() {
        if (!selected || !input.trim() || sending) return;
        const text = input.trim(); setInput(""); setSending(true);
        const temp: Msg = { id: "tmp-" + Date.now(), text, mine: true, createdAt: new Date().toISOString() };
        setMessages(m => [...m, temp]);
        try {
            const res = await fetch(`/api/nexus/messages/${selected.conversationId}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
            });
            if (res.ok) { const d = await res.json(); setMessages(m => m.map(x => x.id === temp.id ? d.message : x)); loadConvs(); }
        } finally { setSending(false); }
    }

    async function openWith(u: SUser) {
        if (!u.username) return;
        const res = await fetch("/api/nexus/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u.username }) });
        if (res.ok) { const d = await res.json(); setSelected({ conversationId: d.conversationId, other: d.other ?? null }); setNewOpen(false); setNewQuery(""); loadConvs(); }
    }

    const close = () => setMessagesOpen(false);
    const filteredConvs = conversations.filter(c => {
        const q = query.trim().toLowerCase();
        return !q || (c.other?.name || "").toLowerCase().includes(q) || (c.other?.username || "").toLowerCase().includes(q);
    });

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }} onClick={close} />

            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-16 md:right-4 md:bottom-auto
                           md:w-[420px] md:max-h-[calc(100vh-80px)] md:rounded-2xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)", height: "85vh" }}
                onClick={e => e.stopPropagation()}>

                {selected ? (
                    /* ── Thread ── */
                    <>
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <ArrowLeft className="w-4 h-4 text-white" />
                            </button>
                            <Link href={selected.other?.username ? `/nexus/u/${selected.other.username}` : "/nexus"} onClick={close} className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src={avatarOf(selected.other)} alt="" className="w-full h-full object-cover bg-white" />
                                </div>
                                <div className="min-w-0 flex items-center gap-1">
                                    <span className="text-sm font-bold text-white truncate">{selected.other?.name || selected.other?.username || "Foydalanuvchi"}</span>
                                    {selected.other?.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                </div>
                            </Link>
                            {selected.other?.id && (
                                <>
                                    <button onClick={() => selected.other?.id && startCall(selected.other.id, "AUDIO")}
                                        title="Ovozli chaqiruv"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)" }}>
                                        <Phone className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={() => selected.other?.id && startCall(selected.other.id, "VIDEO")}
                                        title="Video chaqiruv"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)" }}>
                                        <Video className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            )}
                            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
                            {messages.length === 0 && (
                                <p className="text-center text-xs py-8" style={{ color: "rgba(120,140,185,0.6)" }}>Suhbat boshlang</p>
                            )}
                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                                    <div className="flex flex-col gap-0.5 max-w-[75%]">
                                        <div className="px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                                            style={m.mine
                                                ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff", borderBottomRightRadius: "4px" }
                                                : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)", borderBottomLeftRadius: "4px" }}>
                                            {m.text}
                                        </div>
                                        <span className={`text-[10px] px-1 ${m.mine ? "text-right" : "text-left"}`} style={{ color: "rgba(80,100,150,0.7)" }}>{timeShort(m.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>

                        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                                placeholder="Xabar yozing..." maxLength={2000}
                                className="flex-1 h-10 rounded-xl px-3.5 text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                            <button onClick={send} disabled={!input.trim() || sending}
                                className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                            </button>
                        </div>
                    </>
                ) : newOpen ? (
                    /* ── Yangi xabar ── */
                    <>
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <button onClick={() => { setNewOpen(false); setNewQuery(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <ArrowLeft className="w-4 h-4 text-white" />
                            </button>
                            <h3 className="text-base font-black text-white flex-1">Yangi xabar</h3>
                        </div>
                        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(43,62,232,0.50)" }} />
                                <input value={newQuery} onChange={e => setNewQuery(e.target.value)} autoFocus placeholder="Foydalanuvchi qidirish..."
                                    className="w-full h-9 rounded-xl pl-9 pr-3 text-sm text-white outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: "none" }}>
                            {newResults.map((u, i) => (
                                <button key={i} onClick={() => openWith(u)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left"
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                    <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-white truncate">{u.name || u.username}</span>
                                            {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        </div>
                                        {u.username && <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{u.username}</span>}
                                    </div>
                                </button>
                            ))}
                            {newQuery.trim() && newResults.length === 0 && (
                                <p className="text-center text-xs py-8" style={{ color: "rgba(120,140,185,0.6)" }}>Topilmadi</p>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── Suhbatlar ro'yxati ── */
                    <>
                        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <h3 className="text-base font-black text-white flex-1">Xabarlar</h3>
                            <button onClick={() => setNewOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.12)" }} title="Yangi xabar">
                                <PenSquare className="w-4 h-4" style={{ color: "#00CEC8" }} />
                            </button>
                            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(43,62,232,0.50)" }} />
                                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Suhbat qidirish..."
                                    className="w-full h-9 rounded-xl pl-9 pr-3 text-sm text-white outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                            {filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                        <PenSquare className="w-6 h-6" style={{ color: "rgba(43,62,232,0.40)" }} />
                                    </div>
                                    <p className="text-sm font-bold text-white">Hali suhbat yo&apos;q</p>
                                    <button onClick={() => setNewOpen(true)} className="px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Yangi xabar boshlang</button>
                                </div>
                            ) : filteredConvs.map(c => (
                                <button key={c.conversationId} onClick={() => setSelected({ conversationId: c.conversationId, other: c.other })}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left" style={{ borderBottom: "1px solid rgba(43,62,232,0.07)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0" style={{ border: "2px solid rgba(43,62,232,0.22)" }}>
                                        <img src={avatarOf(c.other)} alt="" className="w-full h-full object-cover bg-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5 gap-2">
                                            <span className="text-sm font-bold text-white truncate flex items-center gap-1">
                                                {c.other?.name || c.other?.username || "Foydalanuvchi"}
                                                {c.other?.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                            </span>
                                            <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(80,100,150,0.8)" }}>{timeShort(c.lastMessageAt)}</span>
                                        </div>
                                        <p className="text-xs truncate" style={{ color: c.unread ? "rgba(200,215,245,0.95)" : "rgba(100,120,170,0.75)", fontWeight: c.unread ? 700 : 400 }}>
                                            {c.lastMine ? "Siz: " : ""}{c.lastMessageText || "..."}
                                        </p>
                                    </div>
                                    {c.unread && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }} />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
