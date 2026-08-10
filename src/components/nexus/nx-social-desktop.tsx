"use client";

// Nexus Ijtimoiy — PC (lg+) uchun 3-ustunli Telegram uslubidagi layout.
// Chap: chatlar ro'yxati (+ papkalar tab). O'rta: tanlangan suhbat.
// O'ng: peer haqida ma'lumot (info paneli).
// Mobile'da bu komponent ishlatilmaydi — SocialView eski tabsni ko'rsatadi.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Send, Bot as BotIcon, Search, MessageSquare, Phone, Video, MoreVertical, BadgeCheck, X, Hash, Users, Megaphone, Paperclip, Wallet, MapPin, Mic, Smile, Trash2, Camera, BarChart2 } from "lucide-react";
import { NxChannelRoom } from "./nx-channels";
import { NxVideoCircleRecorder } from "./nx-video-circle-recorder";
import { NxPollCreate } from "./nx-poll-create";
import { formatMoney } from "@/lib/money";

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
    transferAmount?: number | null;
    transferCurrency?: string | null;
    transferNote?: string | null;
    pollQuestion?: string | null;
    pollOptions?: string[];
    pollVoteCounts?: number[] | null;
    pollMyVotes?: number[] | null;
    pollTotal?: number | null;
    locLat?: number | null;
    locLng?: number | null;
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

interface ChannelItem {
    id: string; type: "CHANNEL" | "GROUP";
    name: string; handle: string | null; avatarUrl: string | null;
    description: string | null; memberCount: number;
}

type ListTab = "dm" | "groups" | "channels";

export function NxSocialDesktop() {
    const [listTab, setListTab] = useState<ListTab>("dm");
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

    // Channel/Group state
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

    // Composer state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [locBusy, setLocBusy] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [circleOpen, setCircleOpen] = useState(false);
    const [pollOpen, setPollOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Ovoz yozish
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recStreamRef = useRef<MediaStream | null>(null);
    const recChunksRef = useRef<Blob[]>([]);
    const recStartRef = useRef<number>(0);
    const recCancelRef = useRef<boolean>(false);
    const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [recording, setRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);

    async function startVoice() {
        if (recording || uploading || !selectedId) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recStreamRef.current = stream;
            recChunksRef.current = [];
            recCancelRef.current = false;
            const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
                : "";
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            rec.ondataavailable = e => { if (e.data && e.data.size > 0) recChunksRef.current.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                recStreamRef.current = null;
                if (recCancelRef.current) return;
                const finalMime = rec.mimeType || "audio/webm";
                const blob = new Blob(recChunksRef.current, { type: finalMime });
                const ext = finalMime.includes("mp4") ? "m4a" : "webm";
                const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: finalMime });
                uploadFile(file);
            };
            recorderRef.current = rec;
            recStartRef.current = Date.now();
            rec.start(100);
            setRecording(true);
            setRecSeconds(0);
            recTimerRef.current = setInterval(() => {
                setRecSeconds(Math.floor((Date.now() - recStartRef.current) / 1000));
            }, 200);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Mikrofonga ruxsat berilmadi");
        }
    }
    function stopVoice(cancel = false) {
        if (!recording) return;
        recCancelRef.current = cancel;
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        setRecording(false);
        try { recorderRef.current?.stop(); } catch { /* ignore */ }
        recorderRef.current = null;
    }
    useEffect(() => () => {
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        try { recorderRef.current?.stop(); } catch { /* ignore */ }
        recStreamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    async function uploadFile(file: File, overrideKind?: "image" | "video" | "audio" | "file" | "video-circle") {
        if (!selectedId || uploading) return;
        setUploading(true);
        try {
            // Katta faylni Vercel Blob orqali (client upload)
            const { upload } = await import("@vercel/blob/client");
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nx-dm/${selectedId}/${Date.now()}-${safeName}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
            });
            const kind = overrideKind ?? (file.type.startsWith("image/") ? "image"
                : file.type.startsWith("video/") ? "video"
                : file.type.startsWith("audio/") ? "audio"
                : "file");
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: "", mediaUrl: blob.url, mediaType: kind, mediaMime: file.type,
                    mediaName: file.name, mediaSize: file.size,
                }),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                loadConvs();
            }
        } catch (e) {
            alert("Yuklab bo'lmadi: " + (e instanceof Error ? e.message : "xato"));
        } finally { setUploading(false); }
    }

    async function sendLocation() {
        if (!selectedId || locBusy) return;
        setLocBusy(true);
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
            );
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: "", mediaType: "location", locLat: pos.coords.latitude, locLng: pos.coords.longitude }),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                loadConvs();
            }
        } catch {
            alert("Joylashuvni olib bo'lmadi");
        } finally { setLocBusy(false); }
    }

    // Group/Channel listni yuklash
    useEffect(() => {
        if (listTab === "dm") return;
        const type = listTab === "groups" ? "GROUP" : "CHANNEL";
        setLoadingChannels(true);
        fetch(`/api/nexus/channels?scope=mine&type=${type}`)
            .then(r => r.ok ? r.json() : { channels: [] })
            .then(d => setChannels(d.channels ?? []))
            .finally(() => setLoadingChannels(false));
    }, [listTab]);

    // Tab o'zgarganda tanlangan chat/channel'ni tozalash
    useEffect(() => {
        setSelectedId(null);
        setSelectedChannel(null);
    }, [listTab]);

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
        <div className="flex w-full h-full min-h-0 pb-[88px]" style={{ background: "#050818" }}>
            {/* ── COL 1: Chat list ─────────────────────────────────────── */}
            <div className="w-[320px] flex-shrink-0 flex flex-col border-r"
                style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.55)" }}>
                {/* Tab bar: DM | Groups | Channels */}
                <div className="p-2 flex gap-1 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    {([
                        { id: "dm" as const,       icon: MessageSquare, label: "DM" },
                        { id: "groups" as const,   icon: Users,         label: "Groups" },
                        { id: "channels" as const, icon: Hash,          label: "Channels" },
                    ]).map(t => (
                        <button key={t.id}
                            onClick={() => setListTab(t.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition"
                            style={listTab === t.id ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "#fff",
                            } : {
                                background: "rgba(43,62,232,0.06)",
                                color: "rgba(140,160,210,0.80)",
                            }}>
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    ))}
                </div>

                {listTab === "dm" && (
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
                )}

                <div className="flex-1 overflow-y-auto">
                    {listTab !== "dm" ? (
                        // Groups/Channels ro'yxati
                        loadingChannels ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                            </div>
                        ) : channels.length === 0 ? (
                            <div className="text-center py-10 px-4 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                                {listTab === "groups" ? "Guruhlar yo'q" : "Kanallar yo'q"}
                            </div>
                        ) : channels.map(c => (
                            <button key={c.id}
                                onClick={() => setSelectedChannel(c.id)}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b"
                                style={{
                                    borderColor: "rgba(43,62,232,0.06)",
                                    background: selectedChannel === c.id ? "rgba(43,62,232,0.18)" : "transparent",
                                }}>
                                <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                                    style={{ background: "rgba(43,62,232,0.15)" }}>
                                    {c.avatarUrl
                                        ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        : (c.type === "CHANNEL" ? <Megaphone className="w-5 h-5 text-white/50" /> : <Users className="w-5 h-5 text-white/50" />)
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                    <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {c.handle ? `@${c.handle} · ` : ""}{c.memberCount} a&apos;zo
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : loadingConvs && convs.length === 0 ? (
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

            {/* ── COL 2: Selected chat/channel ─────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0"
                style={{ background: "rgba(11,18,40,0.35)" }}>
                {selectedChannel ? (
                    // Channel/Group xonasi — mavjud NxChannelRoom embed
                    <NxChannelRoom id={selectedChannel} onBack={() => setSelectedChannel(null)} />
                ) : !selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <MessageSquare className="w-9 h-9" style={{ color: "rgba(43,62,232,0.55)" }} />
                        </div>
                        <div>
                            <p className="text-base font-black text-white mb-1">
                                {listTab === "dm" ? "Suhbatni tanlang" : listTab === "groups" ? "Guruhni tanlang" : "Kanalni tanlang"}
                            </p>
                            <p className="text-xs" style={{ color: "rgba(120,140,185,0.75)" }}>
                                Chapdagi ro&apos;yxatdan oching
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
                            <IconBtn
                                icon={searchOpen ? X : Search}
                                title={searchOpen ? "Qidiruvni yopish" : "Suhbatda qidirish"}
                                onClick={() => { setSearchOpen(v => !v); setSearchQuery(""); }}
                            />
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

                        {/* Qidiruv paneli (Search tugmasi bosilsa) */}
                        {searchOpen && (
                            <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
                                style={{ borderBottom: "1px solid rgba(43,62,232,0.14)", background: "rgba(11,18,40,0.55)" }}>
                                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.60)" }} />
                                <input
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Suhbatda qidirish..."
                                    className="flex-1 h-8 bg-transparent text-white text-sm focus:outline-none"
                                />
                                {searchQuery && (
                                    <span className="text-[11px]" style={{ color: "rgba(140,160,210,0.75)" }}>
                                        {(() => {
                                            const q = searchQuery.toLowerCase();
                                            const count = messages.filter(m => (m.text ?? "").toLowerCase().includes(q)).length;
                                            return `${count} ta natija`;
                                        })()}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                </div>
                            ) : (searchOpen && searchQuery.trim()
                                ? messages.filter(m => (m.text ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
                                : messages
                            ).map(m => (
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
                                                <Paperclip className="w-3 h-3" /> Fayl yuklab olish
                                            </a>
                                        )}
                                        {m.mediaType === "poll" && m.pollQuestion && m.pollOptions && (
                                            <div className="mb-1 rounded-lg overflow-hidden p-3"
                                                style={{ background: m.mine ? "rgba(255,255,255,0.10)" : "rgba(0,206,200,0.08)" }}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <BarChart2 className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.85)" }}>
                                                        So&apos;rovnoma
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold mb-2">{m.pollQuestion}</p>
                                                <div className="space-y-1.5">
                                                    {m.pollOptions.map((opt, i) => {
                                                        const count = m.pollVoteCounts?.[i] ?? 0;
                                                        const total = m.pollTotal ?? 0;
                                                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                        return (
                                                            <div key={i} className="relative rounded-md overflow-hidden"
                                                                style={{ background: "rgba(0,0,0,0.30)" }}>
                                                                <div className="absolute inset-y-0 left-0 transition-all"
                                                                    style={{ width: `${pct}%`, background: "rgba(0,206,200,0.20)" }} />
                                                                <div className="relative flex items-center justify-between px-2.5 py-1.5">
                                                                    <span className="text-xs">{opt}</span>
                                                                    <span className="text-[10px] font-bold" style={{ color: "rgba(140,160,210,0.85)" }}>{pct}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[10px] mt-2" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                    {(m.pollTotal ?? 0)} ovoz
                                                </p>
                                            </div>
                                        )}
                                        {m.mediaType === "location" && typeof m.locLat === "number" && typeof m.locLng === "number" && (
                                            <a href={`https://www.google.com/maps?q=${m.locLat},${m.locLng}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="mb-1 block rounded-lg overflow-hidden p-3"
                                                style={{ background: m.mine ? "rgba(255,255,255,0.10)" : "rgba(0,206,200,0.08)" }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                        style={{ background: m.mine ? "rgba(255,255,255,0.15)" : "rgba(0,206,200,0.20)" }}>
                                                        <MapPin className="w-4 h-4" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold">Joylashuv</p>
                                                        <p className="text-[10px] opacity-75">Google Maps'da ochish</p>
                                                    </div>
                                                </div>
                                            </a>
                                        )}
                                        {m.mediaType === "transfer" && m.transferAmount && m.transferCurrency && (
                                            <div className="mb-1 rounded-lg overflow-hidden"
                                                style={{ background: m.mine ? "rgba(255,255,255,0.12)" : "rgba(0,206,200,0.10)" }}>
                                                <div className="flex items-center gap-2.5 p-2.5">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                        style={{ background: m.mine ? "rgba(255,255,255,0.18)" : "rgba(0,206,200,0.20)" }}>
                                                        <Wallet className="w-4 h-4" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-medium uppercase tracking-wider"
                                                            style={{ color: m.mine ? "rgba(255,255,255,0.70)" : "rgba(140,160,210,0.75)" }}>
                                                            {m.mine ? "Yuborildi" : "Qabul qilindi"} • For Pay
                                                        </p>
                                                        <p className="text-base font-black" style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                            {formatMoney(m.transferAmount, m.transferCurrency as "UZS" | "USD")}
                                                        </p>
                                                    </div>
                                                </div>
                                                {m.transferNote && (
                                                    <div className="px-2.5 pb-2 text-[11px]"
                                                        style={{ color: m.mine ? "rgba(255,255,255,0.85)" : "rgba(220,230,255,0.85)" }}>
                                                        {m.transferNote}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {m.text && (
                                            <div>{searchOpen && searchQuery.trim() ? highlightText(m.text, searchQuery) : m.text}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Composer — Telegram uslubi */}
                        <div className="p-3 flex items-center gap-2 flex-shrink-0 relative"
                            style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(8,12,32,0.55)" }}>
                            <input ref={fileInputRef} type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
                                className="hidden" />

                            {recording ? (
                                <>
                                    <ComposerBtn icon={Trash2} title="Bekor qilish" onClick={() => stopVoice(true)} accent={false} />
                                    <div className="flex-1 flex items-center gap-3 px-4 h-10 rounded-xl"
                                        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
                                        <span className="text-xs font-bold text-white flex-1">Ovoz yozilmoqda</span>
                                        <span className="text-xs font-black tabular-nums" style={{ color: "#EF4444" }}>
                                            {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:
                                            {String(recSeconds % 60).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <button onClick={() => stopVoice(false)} title="Jo'natish"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Send className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <ComposerBtn icon={Paperclip} title="Fayl/rasm/video" onClick={() => fileInputRef.current?.click()} loading={uploading} />
                                    <ComposerBtn icon={MapPin} title="Joylashuv" onClick={() => sendLocation()} loading={locBusy} />
                                    <ComposerBtn icon={BarChart2} title="So'rovnoma" onClick={() => setPollOpen(true)} />
                                    <ComposerBtn icon={Camera} title="Video-circle" onClick={() => setCircleOpen(true)} />
                                    <ComposerBtn icon={Wallet} title="Pul yuborish" onClick={() => setTransferOpen(true)} accent />
                                    <input
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && send()}
                                        placeholder="Xabar yozing..."
                                        className="flex-1 min-w-0 h-10 px-4 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                                        style={{ border: "1px solid rgba(43,62,232,0.20)" }}
                                    />
                                    <ComposerBtn icon={Smile} title="Emoji" onClick={() => setEmojiOpen(v => !v)} accent={emojiOpen} />
                                    {input.trim() ? (
                                        <button onClick={send} disabled={sending}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                                        </button>
                                    ) : (
                                        <ComposerBtn icon={Mic} title="Ovozli xabar (bosib turing)" onClick={startVoice} />
                                    )}
                                </>
                            )}

                            {/* Emoji picker (composer ustidagi popover) */}
                            {emojiOpen && (
                                <EmojiPicker
                                    onPick={(emoji) => { setInput(prev => prev + emoji); }}
                                    onClose={() => setEmojiOpen(false)}
                                />
                            )}
                        </div>

                        {/* Transfer modali */}
                        {transferOpen && (
                            <TransferSheet
                                convId={selectedId}
                                peerUsername={peer?.username ?? undefined}
                                onClose={() => setTransferOpen(false)}
                                onSent={msg => { setMessages(m => [...m, msg]); loadConvs(); setTransferOpen(false); }}
                            />
                        )}

                        {/* Video-circle recorder */}
                        <NxVideoCircleRecorder
                            open={circleOpen}
                            onClose={() => setCircleOpen(false)}
                            onRecorded={(file) => { setCircleOpen(false); uploadFile(file, "video-circle"); }}
                        />

                        {/* Poll create */}
                        <NxPollCreate
                            open={pollOpen}
                            onClose={() => setPollOpen(false)}
                            onCreated={async (poll) => {
                                if (!selectedId) return;
                                const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        text: "", mediaType: "poll",
                                        pollQuestion: poll.question, pollOptions: poll.options,
                                        pollExpiresAt: poll.expiresAt, pollMulti: poll.multi,
                                    }),
                                });
                                if (r.ok) {
                                    const d = await r.json();
                                    setMessages(m => [...m, d.message]);
                                    loadConvs();
                                    setPollOpen(false);
                                }
                            }}
                        />
                    </>
                )}
            </div>

            {/* ── COL 3: Peer info (chat info) — faqat DM tanlangan bo'lsa ── */}
            {selectedId && !selectedChannel && showInfo && (
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

function ComposerBtn({ icon: Icon, title, onClick, loading, accent }: {
    icon: React.ElementType; title: string; onClick?: () => void;
    loading?: boolean; accent?: boolean;
}) {
    return (
        <button onClick={onClick} disabled={loading} title={title}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition disabled:opacity-40 active:scale-95"
            style={accent
                ? { background: "linear-gradient(135deg,rgba(0,206,200,0.20),rgba(43,62,232,0.20))" }
                : { background: "rgba(43,62,232,0.08)" }
            }>
            {loading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Icon className="w-4 h-4" style={{ color: accent ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
            }
        </button>
    );
}

// Pul yuborish yon paneli — nx-messages.tsx dagi modal bilan bir xil endpoint
function TransferSheet({
    convId, peerUsername, onClose, onSent,
}: {
    convId: string | null;
    peerUsername?: string;
    onClose: () => void;
    onSent: (msg: Msg) => void;
}) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (!convId) return;
        const amt = Number(amount.replace(/[^\d.,]/g, "").replace(",", "."));
        if (!amt || amt <= 0) { setErr("Miqdorni kiriting"); return; }
        setErr(null); setBusy(true);
        try {
            const r = await fetch(`/api/nexus/messages/${convId}/transfer`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amt, note: note.trim() || undefined }),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d.error ?? "Yuborib bo'lmadi"); return; }
            onSent(d.message);
        } finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.70)" }} onClick={() => !busy && onClose()} />
            <div className="fixed z-[80] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)" }}>
                <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,rgba(0,206,200,0.20),rgba(43,62,232,0.20))" }}>
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-white">Pul yuborish</h3>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(140,160,210,0.75)" }}>
                            For Pay orqali {peerUsername ? `@${peerUsername}` : "foydalanuvchiga"}
                        </p>
                    </div>
                </div>
                <div className="p-5 space-y-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.75)" }}>Miqdor</label>
                        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10 000" inputMode="decimal" autoFocus
                            className="w-full mt-1.5 px-3 py-3 rounded-xl text-lg font-black text-white bg-transparent focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.75)" }}>Izoh (ixtiyoriy)</label>
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nima uchun" maxLength={120}
                            className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm text-white bg-transparent focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.20)" }} />
                    </div>
                    {err && <p className="text-xs" style={{ color: "#EF4444" }}>{err}</p>}
                </div>
                <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <button onClick={() => !busy && onClose()} disabled={busy}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: "rgba(43,62,232,0.10)" }}>Bekor</button>
                    <button onClick={submit} disabled={busy || !amount.trim()}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        Yuborish
                    </button>
                </div>
            </div>
        </>
    );
}

// Matn ichida qidiruv so'zini <mark> bilan belgilash
function highlightText(text: string, query: string): React.ReactNode {
    const q = query.trim();
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase()
            ? <mark key={i} style={{ background: "rgba(255,220,0,0.35)", color: "inherit", padding: "0 2px", borderRadius: 3 }}>{part}</mark>
            : <span key={i}>{part}</span>
    );
}

// Oddiy emoji picker (native emoji, 8 kategoriya)
const EMOJI_CATEGORIES: Array<{ name: string; emojis: string[] }> = [
    { name: "Yuz",     emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷"] },
    { name: "Qo'l",    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏"] },
    { name: "Yurak",   emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"] },
    { name: "Uy",      emojis: ["🏠","🏡","🏘️","🏢","🏬","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏛️","💒","⛪","🕌","🕍","🛕","🏛"] },
    { name: "Ovqat",   emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥯","🍞","🥐","🥖","🫓","🥨","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕"] },
    { name: "Sport",   emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤾","🏌️","🏇","🧘"] },
    { name: "Belgi",   emojis: ["✅","❌","⭕","🚫","💯","🔥","💥","💫","⭐","🌟","✨","💦","💤","💨","🎉","🎊","🎁","🎀","🏆","🥇","🥈","🥉","🏅","🎖️"] },
    { name: "Boshqa",  emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛺","✈️","🛫","🛬","🛩️","🚁","🛸","🚀","🛰️","🚢","⛵","🛶","🚤"] },
];

function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
    const [cat, setCat] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
        setTimeout(() => document.addEventListener("mousedown", h), 0);
        return () => document.removeEventListener("mousedown", h);
    }, [onClose]);
    return (
        <div ref={ref}
            className="absolute bottom-full right-2 mb-2 w-[340px] rounded-2xl overflow-hidden z-40"
            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
            <div className="flex gap-1 p-2 border-b overflow-x-auto scrollbar-hide"
                style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                {EMOJI_CATEGORIES.map((c, i) => (
                    <button key={c.name}
                        onClick={() => setCat(i)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0"
                        style={cat === i
                            ? { background: "rgba(43,62,232,0.25)", color: "#fff" }
                            : { color: "rgba(140,160,210,0.70)" }
                        }>
                        {c.name}
                    </button>
                ))}
            </div>
            <div className="p-2 max-h-[280px] overflow-y-auto grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[cat].emojis.map(e => (
                    <button key={e}
                        onClick={() => { onPick(e); /* pickerni ochiq qoldiramiz — bir necha marta tanlash mumkin */ }}
                        className="w-9 h-9 text-lg rounded-lg hover:bg-white/[0.06] active:scale-90 transition">
                        {e}
                    </button>
                ))}
            </div>
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
