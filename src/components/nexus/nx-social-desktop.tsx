"use client";

// Nexus Ijtimoiy — PC (lg+) uchun 3-ustunli Telegram uslubidagi layout.
// Chap: chatlar ro'yxati (+ papkalar tab). O'rta: tanlangan suhbat.
// O'ng: peer haqida ma'lumot (info paneli).
// Mobile'da bu komponent ishlatilmaydi — SocialView eski tabsni ko'rsatadi.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Send, Bot as BotIcon, Search, MessageSquare, Phone, Video, MoreVertical, BadgeCheck, X } from "lucide-react";

interface Conv {
    conversationId: string;
    other: { id?: string; name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    lastMessageText: string | null;
    lastMessageAt: string;
    lastMine: boolean;
    unread: boolean;
}

interface Msg {
    id: string; text: string; mine: boolean; createdAt: string;
    mediaUrl?: string | null; mediaType?: string | null;
    agentKind?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentPayload?: any;
}

interface PeerInfo {
    id?: string;
    name: string | null;
    username: string | null;
    image: string | null;
    humoId?: string | null;
    verified: boolean;
    bio?: string | null;
    isAgent?: boolean;
}

export function NxSocialDesktop() {
    const [convs, setConvs] = useState<Conv[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [peer, setPeer] = useState<PeerInfo | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [showInfo, setShowInfo] = useState(true);
    const [filter, setFilter] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Suhbatlar ro'yxati
    const loadConvs = useCallback(async () => {
        try {
            const r = await fetch("/api/nexus/messages", { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setConvs(d.conversations ?? []);
            }
        } finally { setLoadingConvs(false); }
    }, []);
    useEffect(() => { loadConvs(); }, [loadConvs]);

    // Har 6 sekundda ro'yxatni yangilash (unread badge)
    useEffect(() => {
        const t = setInterval(loadConvs, 6000);
        return () => clearInterval(t);
    }, [loadConvs]);

    // Tanlangan suhbat xabarlari
    const loadMsgs = useCallback(async (convId: string) => {
        setLoadingMsgs(true);
        try {
            const r = await fetch(`/api/nexus/messages/${convId}`, { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setMessages(d.messages ?? []);
                if (d.other) {
                    setPeer({
                        id: d.other.id, name: d.other.name, username: d.other.username,
                        image: d.other.image, verified: d.other.verified,
                        humoId: d.other.humoId ?? null,
                        bio: d.other.bio ?? null,
                        isAgent: (d.other.username ?? "").toLowerCase().endsWith("_agent"),
                    });
                }
            }
        } finally { setLoadingMsgs(false); }
    }, []);
    useEffect(() => {
        if (!selectedId) { setMessages([]); setPeer(null); return; }
        loadMsgs(selectedId);
        // Poll xabarlar (thread ochiq bo'lsa)
        const t = setInterval(() => loadMsgs(selectedId), 4000);
        return () => clearInterval(t);
    }, [selectedId, loadMsgs]);

    // Yangi xabar kelganda pastga scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send() {
        if (!selectedId || !input.trim() || sending) return;
        setSending(true);
        const text = input.trim();
        setInput("");
        try {
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                loadConvs();
            }
        } finally { setSending(false); }
    }

    const filteredConvs = filter.trim()
        ? convs.filter(c => {
            const q = filter.toLowerCase();
            return (c.other?.name ?? "").toLowerCase().includes(q)
                || (c.other?.username ?? "").toLowerCase().includes(q)
                || (c.lastMessageText ?? "").toLowerCase().includes(q);
        })
        : convs;

    return (
        <div className="flex h-full min-h-0 pb-[88px]" style={{ background: "#050818" }}>
            {/* ── COL 1: Chat list ─────────────────────────────────────── */}
            <div className="w-[320px] flex-shrink-0 flex flex-col border-r"
                style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.55)" }}>
                <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: "rgba(140,160,210,0.50)" }} />
                        <input
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Qidirish..."
                            className="w-full h-9 pl-9 pr-3 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.20)" }}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConvs && convs.length === 0 ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="text-center py-10 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                            Suhbatlar yo&apos;q
                        </div>
                    ) : filteredConvs.map(c => (
                        <button
                            key={c.conversationId}
                            onClick={() => setSelectedId(c.conversationId)}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b"
                            style={{
                                borderColor: "rgba(43,62,232,0.06)",
                                background: selectedId === c.conversationId ? "rgba(43,62,232,0.18)" : "transparent",
                            }}>
                            <ConvAvatar other={c.other} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-white truncate">
                                        {c.other?.name ?? (c.other?.username ? `@${c.other.username}` : "Ismsiz")}
                                    </p>
                                    {c.other?.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                </div>
                                <p className="text-[11px] truncate" style={{ color: c.unread ? "#FFFFFF" : "rgba(140,160,210,0.70)" }}>
                                    {c.lastMine ? "Siz: " : ""}{c.lastMessageText ?? ""}
                                </p>
                            </div>
                            {c.unread && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: "#00CEC8", boxShadow: "0 0 6px rgba(0,206,200,0.7)" }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── COL 2: Selected chat ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0"
                style={{ background: "rgba(11,18,40,0.35)" }}>
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <MessageSquare className="w-9 h-9" style={{ color: "rgba(43,62,232,0.55)" }} />
                        </div>
                        <div>
                            <p className="text-base font-black text-white mb-1">Suhbatni tanlang</p>
                            <p className="text-xs" style={{ color: "rgba(120,140,185,0.75)" }}>
                                Chapdagi ro&apos;yxatdan chat oching
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.14)", background: "rgba(8,12,32,0.55)" }}>
                            <ConvAvatar other={peer} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-white truncate">
                                        {peer?.name ?? (peer?.username ? `@${peer.username}` : "")}
                                    </p>
                                    {peer?.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                    {peer?.isAgent && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                                            style={{ background: "rgba(0,206,200,0.18)", color: "#00CEC8" }}>AGENT</span>
                                    )}
                                </div>
                                <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                    {peer?.username ? `@${peer.username}` : ""}
                                </p>
                            </div>
                            {!peer?.isAgent && (
                                <>
                                    <IconBtn icon={Phone} title="Ovozli chaqiruv" />
                                    <IconBtn icon={Video} title="Video chaqiruv" />
                                </>
                            )}
                            <IconBtn icon={MoreVertical} title="Ko'proq" />
                            <IconBtn
                                icon={showInfo ? X : MessageSquare}
                                title={showInfo ? "Info panelni yopish" : "Info panel"}
                                onClick={() => setShowInfo(v => !v)}
                            />
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                </div>
                            ) : messages.map(m => (
                                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                                    <div className="max-w-[70%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words"
                                        style={m.mine
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff", borderBottomRightRadius: "6px" }
                                            : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)", borderBottomLeftRadius: "6px" }
                                        }>
                                        {m.mediaType === "agent" && m.agentPayload && (
                                            <div className="mb-2 p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.25)" }}>
                                                {m.agentPayload.image && (
                                                    <img src={m.agentPayload.image} alt="" className="w-full max-w-[240px] rounded-md mb-1.5" />
                                                )}
                                                <p className="text-xs font-black">{m.agentPayload.title}</p>
                                                {m.agentPayload.body && (
                                                    <p className="text-[11px] mt-1 opacity-80">{m.agentPayload.body}</p>
                                                )}
                                            </div>
                                        )}
                                        {m.mediaType === "image" && m.mediaUrl && (
                                            <img src={m.mediaUrl} alt="" className="max-w-full max-h-80 rounded-md mb-1" />
                                        )}
                                        {m.mediaType === "video" && m.mediaUrl && (
                                            <video src={m.mediaUrl} controls playsInline className="max-w-full max-h-80 rounded-md mb-1" />
                                        )}
                                        {m.mediaType === "audio" && m.mediaUrl && (
                                            <audio src={m.mediaUrl} controls className="w-full max-w-[240px] mb-1" style={{ height: 34 }} />
                                        )}
                                        {m.mediaType === "video-circle" && m.mediaUrl && (
                                            <video src={m.mediaUrl} controls playsInline
                                                className="rounded-full mb-1"
                                                style={{ width: 200, height: 200, objectFit: "cover" }} />
                                        )}
                                        {m.mediaType === "file" && m.mediaUrl && (
                                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-xs"
                                                style={{ background: "rgba(255,255,255,0.10)" }}>
                                                📎 Fayl yuklab olish
                                            </a>
                                        )}
                                        {m.text && <div>{m.text}</div>}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Composer */}
                        <div className="p-3 flex items-center gap-2 flex-shrink-0"
                            style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(8,12,32,0.55)" }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && send()}
                                placeholder="Xabar yozing..."
                                className="flex-1 h-10 px-4 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
                            />
                            <button
                                onClick={send}
                                disabled={sending || !input.trim()}
                                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ── COL 3: Peer info (chat info) ─────────────────────────── */}
            {selectedId && showInfo && (
                <div className="w-[320px] flex-shrink-0 flex flex-col border-l overflow-y-auto"
                    style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.65)" }}>
                    <div className="p-5 text-center border-b" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                        <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-3 flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {peer?.image ? (
                                <Image src={peer.image} alt="" width={96} height={96} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-black text-white">
                                    {(peer?.name ?? peer?.username ?? "?")[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                            <h3 className="text-base font-black text-white">{peer?.name ?? peer?.username}</h3>
                            {peer?.verified && <BadgeCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                        </div>
                        {peer?.username && (
                            <p className="text-xs mt-1" style={{ color: "rgba(140,160,210,0.75)" }}>@{peer.username}</p>
                        )}
                        {peer?.isAgent && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                                style={{ background: "rgba(0,206,200,0.15)" }}>
                                <BotIcon className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                <span className="text-[10px] font-black" style={{ color: "#00CEC8" }}>Rasmiy agent</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 space-y-1">
                        {peer?.humoId && (
                            <InfoRow label="Humo ID" value={peer.humoId} />
                        )}
                        {peer?.bio && (
                            <InfoRow label="Bio" value={peer.bio} />
                        )}
                    </div>

                    {/* Umumiy media (suhbatdagi barcha rasmlar) */}
                    <SharedMediaSection messages={messages} />

                    {peer?.username && (
                        <div className="p-4 border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <Link href={`/nexus/u/${peer.username}`}
                                className="w-full py-2.5 rounded-xl text-xs font-black text-center block"
                                style={{ background: "rgba(43,62,232,0.15)", color: "rgba(220,230,255,0.95)" }}>
                                Profilni ochish
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Umumiy media — suhbatdagi barcha rasmlar (grid 3x)
function SharedMediaSection({ messages }: { messages: Msg[] }) {
    const images = messages
        .filter(m => m.mediaType === "image" && m.mediaUrl)
        .slice(-9)
        .reverse();
    if (images.length === 0) return null;
    return (
        <div className="p-4 border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(140,160,210,0.55)" }}>
                Umumiy media
            </p>
            <div className="grid grid-cols-3 gap-1">
                {images.map(m => (
                    <a key={m.id} href={m.mediaUrl!} target="_blank" rel="noopener noreferrer"
                        className="aspect-square rounded-md overflow-hidden bg-white/[0.05]">
                        <img src={m.mediaUrl!} alt="" className="w-full h-full object-cover" />
                    </a>
                ))}
            </div>
        </div>
    );
}

function ConvAvatar({ other }: { other: { name: string | null; username: string | null; image: string | null } | null }) {
    return (
        <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
            {other?.image ? (
                <Image src={other.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
            ) : (
                <span className="text-sm font-black text-white">
                    {(other?.name ?? other?.username ?? "?")[0]?.toUpperCase()}
                </span>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-2 py-2 rounded-lg hover:bg-white/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.55)" }}>{label}</p>
            <p className="text-sm text-white mt-0.5 break-words">{value}</p>
        </div>
    );
}

function IconBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} title={title}
            className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "rgba(43,62,232,0.10)" }}>
            <Icon className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
        </button>
    );
}
