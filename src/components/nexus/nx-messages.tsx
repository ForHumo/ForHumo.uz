"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Send, ArrowLeft, Search, Loader2, PenSquare, Phone, Video, Users, MessageSquare, Check, CheckCheck, Paperclip, FileIcon, Download, Music, Mic, Trash2, Camera, MapPin, Navigation, StopCircle, BadgeCheck, BarChart2 } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";
import { usePresence } from "@/lib/presence";
import { upload } from "@vercel/blob/client";
import { NxVideoCircleRecorder } from "./nx-video-circle-recorder";
import { NxBanModal, type BanInfo } from "./nx-ban-modal";
import { NxPollCreate } from "./nx-poll-create";

interface Other { id?: string; name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface Conv { conversationId: string; other: Other | null; lastMessageText: string | null; lastMessageAt: string; lastMine: boolean; unread: boolean }
interface Msg {
    id: string; text: string; mine: boolean; createdAt: string;
    mediaUrl?: string | null; mediaType?: string | null; mediaMime?: string | null;
    mediaName?: string | null; mediaSize?: number | null; durationMs?: number | null;
    locLat?: number | null; locLng?: number | null;
    locUpdatedAt?: string | null; locExpiresAt?: string | null;
    pollQuestion?: string | null; pollOptions?: string[]; pollExpiresAt?: string | null; pollMulti?: boolean;
    pollVoteCounts?: number[] | null; pollMyVotes?: number[] | null; pollTotal?: number | null;
}
interface SUser { name: string | null; username: string | null; image: string | null; verified: boolean; isMe: boolean }

// Media turini MIME'dan aniqlash
function detectMediaType(mime: string): "image" | "video" | "audio" | "file" {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "file";
}
function fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function fmtDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
}

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
    const { messagesOpen, setMessagesOpen, startCall, openGroupCall } = useNxPlayer();
    const { data: session } = useSession();
    const { isOnline, sendTyping, onTyping } = usePresence();
    // @ts-ignore — session.user.profileId (auth.ts JWT ichida)
    const myProfileId: string | null = (session?.user as { profileId?: string })?.profileId ?? null;
    const myName = session?.user?.name ?? null;
    const [peerTyping, setPeerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    // DM'dan darrov guruh chaqiruv boshlash: create → invite → open
    const startGroupCall = useCallback(async (peerId: string, peerName: string | null) => {
        try {
            const c = await fetch("/api/nexus/group-calls", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: peerName ? `${peerName} bilan` : null }),
            }).then(x => x.json());
            if (!c?.call?.id) { alert(c?.error || "Yaratib bo'lmadi"); return; }
            await fetch(`/api/nexus/group-calls/${c.call.id}/invite`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileIds: [peerId] }),
            }).catch(() => { });
            openGroupCall(c.call.id);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Xato");
        }
    }, [openGroupCall]);
    const [conversations, setConversations] = useState<Conv[]>([]);
    const [selected, setSelected] = useState<{ conversationId: string; other: Other | null } | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");
    const [sending, setSending] = useState(false);
    const [newOpen, setNewOpen] = useState(false);

    // "yozmoqda..." event'larini eshitish — faqat hozirgi selected peer'dan
    useEffect(() => {
        const off = onTyping((e) => {
            if (!selected?.other?.id || !myProfileId) return;
            if (e.fromId !== selected.other.id) return;
            if (e.toId !== myProfileId) return;
            setPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
        });
        return () => { off(); };
    }, [onTyping, selected?.other?.id, myProfileId]);

    useEffect(() => { setPeerTyping(false); }, [selected?.other?.id]);
    const [newQuery, setNewQuery] = useState("");
    const [newResults, setNewResults] = useState<SUser[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const consumedRef = useRef<string | null>(null);

    const loadConvs = useCallback(() => {
        fetch("/api/nexus/messages").then(r => r.json()).then(d => setConversations(d.conversations ?? [])).catch(() => { });
    }, []);
    const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
    const loadThread = useCallback((cid: string) => {
        fetch(`/api/nexus/messages/${cid}`).then(r => r.json()).then(d => {
            setMessages(d.messages ?? []);
            setPeerReadAt(d.peerReadAt ?? null);
        }).catch(() => { });
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
            if (res.ok) {
                const d = await res.json();
                setMessages(m => m.map(x => x.id === temp.id ? d.message : x));
                loadConvs();
            } else {
                setMessages(m => m.filter(x => x.id !== temp.id));
                const wasBanned = await handleMaybeBan(res);
                if (!wasBanned) {
                    const e = await res.json().catch(() => ({}));
                    alert(e.error || "Jo'natib bo'lmadi");
                }
            }
        } finally { setSending(false); }
    }

    // Fayl attach — rasm/video/audio/fayl
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);

    // Ovozli xabar (MediaRecorder)
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recStreamRef = useRef<MediaStream | null>(null);
    const recChunksRef = useRef<Blob[]>([]);
    const recStartRef = useRef<number>(0);
    const [recording, setRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recCancelRef = useRef<boolean>(false);

    async function startVoice() {
        if (recording || uploading) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recStreamRef.current = stream;
            recChunksRef.current = [];
            recCancelRef.current = false;
            // Brauzerlarda eng keng qo'llab-quvvatlanuvchi: audio/webm (opus)
            const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
                : "";
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) recChunksRef.current.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                recStreamRef.current = null;
                if (recCancelRef.current) return;
                const finalMime = rec.mimeType || "audio/webm";
                const blob = new Blob(recChunksRef.current, { type: finalMime });
                const ext = finalMime.includes("mp4") ? "m4a" : "webm";
                const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: finalMime });
                sendMedia(file);
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
    function stopVoice(cancel: boolean = false) {
        if (!recording) return;
        recCancelRef.current = cancel;
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        setRecording(false);
        try { recorderRef.current?.stop(); } catch { }
        recorderRef.current = null;
    }
    // Component unmount bo'lsa mikrofonni ozod qilish
    useEffect(() => {
        return () => {
            if (recTimerRef.current) clearInterval(recTimerRef.current);
            try { recorderRef.current?.stop(); } catch { }
            recStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    async function sendMedia(file: File, overrideType?: "image" | "video" | "audio" | "file" | "video-circle", knownDurationMs?: number) {
        if (!selected || uploading) return;
        setUploading(true); setUploadPct(0);
        const kind = overrideType ?? detectMediaType(file.type || "");
        // Optimistic temp message (URL bo'lmagunicha loading)
        const temp: Msg = {
            id: "tmp-" + Date.now(), text: "", mine: true, createdAt: new Date().toISOString(),
            mediaType: kind, mediaMime: file.type || null, mediaName: file.name, mediaSize: file.size,
        };
        setMessages(m => [...m, temp]);
        try {
            // Vercel Blob'ga to'g'ridan-to'g'ri client upload (4.5MB serverless limitini chetlab o'tadi)
            const safeName = file.name.replace(/[^\w.-]/g, "_");
            const blob = await upload(`nx-dm/${selected.conversationId}/${Date.now()}-${safeName}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: (p) => setUploadPct(Math.round((p.percentage ?? 0))),
            });
            // Audio/video davomiyligini olish (agar oldindan berilmagan bo'lsa)
            let durationMs: number | undefined = knownDurationMs;
            if (!durationMs && (kind === "audio" || kind === "video" || kind === "video-circle")) {
                try {
                    durationMs = await new Promise<number>((resolve) => {
                        const el = kind === "audio" ? new Audio() : document.createElement("video");
                        el.preload = "metadata";
                        el.onloadedmetadata = () => resolve(Math.round((el.duration || 0) * 1000));
                        el.onerror = () => resolve(0);
                        el.src = blob.url;
                        setTimeout(() => resolve(0), 5000);
                    });
                } catch { /* ignore */ }
            }
            const res = await fetch(`/api/nexus/messages/${selected.conversationId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: "",
                    mediaUrl: blob.url, mediaType: kind, mediaMime: file.type,
                    mediaName: file.name, mediaSize: file.size, durationMs,
                }),
            });
            if (res.ok) {
                const d = await res.json();
                setMessages(m => m.map(x => x.id === temp.id ? d.message : x));
                loadConvs();
            } else {
                setMessages(m => m.filter(x => x.id !== temp.id));
                const wasBanned = await handleMaybeBan(res);
                if (!wasBanned) {
                    const e = await res.json().catch(() => ({}));
                    alert(e.error || "Jo'natib bo'lmadi");
                }
            }
        } catch (e) {
            setMessages(m => m.filter(x => x.id !== temp.id));
            alert(e instanceof Error ? e.message : "Yuklashda xato");
        } finally {
            setUploading(false); setUploadPct(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    // Video circle recorder state
    const [circleOpen, setCircleOpen] = useState(false);

    // Ban modal — foydalanuvchi bloklanganida
    const [ban, setBan] = useState<BanInfo | null>(null);

    // Poll create modal
    const [pollOpen, setPollOpen] = useState(false);

    async function sendPoll(poll: { question: string; options: string[]; expiresAt: string | null; multi: boolean }) {
        if (!selected) return;
        const res = await fetch(`/api/nexus/messages/${selected.conversationId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "", mediaType: "poll",
                pollQuestion: poll.question, pollOptions: poll.options,
                pollExpiresAt: poll.expiresAt, pollMulti: poll.multi,
            }),
        });
        if (res.ok) {
            const d = await res.json();
            setMessages(m => [...m, d.message]);
            loadConvs();
            setPollOpen(false);
        } else {
            const wasBanned = await handleMaybeBan(res);
            if (!wasBanned) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || "Jo'natib bo'lmadi");
            }
        }
    }

    async function votePoll(messageId: string, optionIndex: number) {
        const res = await fetch(`/api/nexus/messages/${messageId}/poll-vote`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionIndex }),
        });
        if (res.ok) {
            const d = await res.json();
            setMessages(m => m.map(x => x.id === messageId
                ? { ...x, pollVoteCounts: d.counts, pollMyVotes: d.myVotes, pollTotal: d.total }
                : x
            ));
        } else {
            const e = await res.json().catch(() => ({}));
            alert(e.error || "Ovoz berib bo'lmadi");
        }
    }

    // API 403 + code:"USER_BANNED" bo'lsa ban ma'lumotini extract qiladi
    async function handleMaybeBan(res: Response): Promise<boolean> {
        if (res.status !== 403) return false;
        try {
            const d = await res.clone().json();
            if (d?.code === "USER_BANNED" && d.banId) {
                setBan({
                    banId: d.banId,
                    reason: d.error?.match(/Sabab:\s*([^\.]+)/)?.[1]?.trim() || "other",
                    level: 0,   // real ma'lumot GET /api/user/ban-appeal orqali olinishi mumkin
                    expiresAt: d.expiresAt ?? null,
                });
                return true;
            }
        } catch { /* ignore */ }
        return false;
    }

    // Location — statik + jonli
    const [locSheetOpen, setLocSheetOpen] = useState(false);
    const [locBusy, setLocBusy] = useState(false);
    const liveLocWatchRef = useRef<Set<string>>(new Set());   // ish faoli bo'lgan msg ID'lari
    const liveLocIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function getPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("Brauzer joylashuvni qo'llab-quvvatlamaydi"));
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 5000,
            });
        });
    }
    async function sendLocation(durationMinutes: number | null) {
        if (!selected || locBusy) return;
        setLocSheetOpen(false); setLocBusy(true);
        try {
            const pos = await getPosition();
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60_000).toISOString() : null;
            const res = await fetch(`/api/nexus/messages/${selected.conversationId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: "", mediaType: "location", locLat: lat, locLng: lng, locExpiresAt: expiresAt }),
            });
            if (res.ok) {
                const d = await res.json();
                setMessages(m => [...m, d.message]);
                loadConvs();
            } else {
                const e = await res.json().catch(() => ({}));
                alert(e.error || "Jo'natib bo'lmadi");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "Joylashuvni olib bo'lmadi");
        } finally { setLocBusy(false); }
    }
    async function stopLiveLocation(msgId: string) {
        await fetch(`/api/nexus/messages/${msgId}/location`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stop: true }),
        }).catch(() => { });
        liveLocWatchRef.current.delete(msgId);
        if (selected) loadThread(selected.conversationId);
    }

    // Fon'da jonli joylashuv yangilagichi (o'zim jo'natgan aktiv jonli xabarlar uchun)
    useEffect(() => {
        // Har 15 sekundda o'z aktiv jonli joylashuv xabarlarini yangilash
        const tick = async () => {
            const active = messages.filter(m =>
                m.mine && m.mediaType === "location" && m.locExpiresAt && new Date(m.locExpiresAt) > new Date()
            );
            if (active.length === 0) return;
            let pos: GeolocationPosition | null = null;
            try { pos = await getPosition(); } catch { return; }
            for (const m of active) {
                fetch(`/api/nexus/messages/${m.id}/location`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                }).catch(() => { });
            }
        };
        if (liveLocIntervalRef.current) clearInterval(liveLocIntervalRef.current);
        liveLocIntervalRef.current = setInterval(tick, 15000);
        return () => {
            if (liveLocIntervalRef.current) clearInterval(liveLocIntervalRef.current);
        };
    }, [messages]);

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

    // Yordamchi flaglar
    const showLeft = !selected;      // mobile: chap ustun faqat thread ochilmagan bo'lsa
    const showRight = !!selected;    // mobile: o'ng ustun faqat thread ochilgan bo'lsa

    /* ── Chap ustun: Suhbatlar ro'yxati YOKI Yangi xabar qidiruv ── */
    const leftPanel = newOpen ? (
        <>
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <button onClick={() => { setNewOpen(false); setNewQuery(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <h3 className="text-base font-black text-white flex-1">Yangi xabar</h3>
                <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} title="Yopish">
                    <X className="w-4 h-4 text-white" />
                </button>
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
                                {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}{/* search API hali verifiedCategory qaytarmaydi — kelasi migration */}
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
        <>
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <h3 className="text-base font-black text-white flex-1">Xabarlar</h3>
                <button onClick={() => setNewOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.12)" }} title="Yangi xabar">
                    <PenSquare className="w-4 h-4" style={{ color: "#00CEC8" }} />
                </button>
                <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} title="Yopish">
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
                ) : filteredConvs.map(c => {
                    const isActive = selected?.conversationId === c.conversationId;
                    return (
                        <button key={c.conversationId} onClick={() => setSelected({ conversationId: c.conversationId, other: c.other })}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.07)", background: isActive ? "rgba(43,62,232,0.14)" : "transparent" }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <div className="relative w-11 h-11 flex-shrink-0">
                                <div className="w-11 h-11 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(43,62,232,0.22)" }}>
                                    <img src={avatarOf(c.other)} alt="" className="w-full h-full object-cover bg-white" />
                                </div>
                                {c.other?.id && isOnline(c.other.id) && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                        style={{ background: "#10B981", borderColor: "#050818" }} title="Onlayn" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5 gap-2">
                                    <span className="text-sm font-bold text-white truncate flex items-center gap-1">
                                        {c.other?.name || c.other?.username || "Foydalanuvchi"}
                                        {c.other?.verified && <NxVerifiedBadge category={c.other?.verifiedCategory} size={12} />}
                                    </span>
                                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(80,100,150,0.8)" }}>{timeShort(c.lastMessageAt)}</span>
                                </div>
                                <p className="text-xs truncate" style={{ color: c.unread ? "rgba(200,215,245,0.95)" : "rgba(100,120,170,0.75)", fontWeight: c.unread ? 700 : 400 }}>
                                    {c.lastMine ? "Siz: " : ""}{c.lastMessageText || "..."}
                                </p>
                            </div>
                            {c.unread && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }} />}
                        </button>
                    );
                })}
            </div>
        </>
    );

    /* ── O'ng ustun: Thread YOKI bo'sh holat (faqat lg+) ── */
    const rightPanel = selected ? (
        <>
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <button onClick={() => setSelected(null)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} title="Ortga">
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <Link href={selected.other?.username ? `/nexus/u/${selected.other.username}` : "/nexus"} onClick={close} className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={avatarOf(selected.other)} alt="" className="w-full h-full object-cover bg-white" />
                        {selected.other?.id && isOnline(selected.other.id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                style={{ background: "#10B981", borderColor: "#050818" }} title="Onlayn" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-white truncate">{selected.other?.name || selected.other?.username || "Foydalanuvchi"}</span>
                            {selected.other?.verified && <NxVerifiedBadge category={selected.other?.verifiedCategory} size={14} />}
                        </div>
                        {peerTyping ? (
                            <p className="text-[10px] font-bold" style={{ color: "#00CEC8" }}>yozmoqda...</p>
                        ) : selected.other?.id && isOnline(selected.other.id) ? (
                            <p className="text-[10px]" style={{ color: "rgba(16,185,129,0.85)" }}>onlayn</p>
                        ) : null}
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
                        <button onClick={() => selected.other?.id && startGroupCall(selected.other.id, selected.other?.name || null)}
                            title="Guruh chaqiruv"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95"
                            style={{ background: "rgba(0,206,200,0.15)" }}>
                            <Users className="w-4 h-4 text-white" />
                        </button>
                    </>
                )}
                {/* Yopish tugmasi faqat mobil'da — lg'da chap ustunda ham bor */}
                <button onClick={close} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 min-h-0" style={{ scrollbarWidth: "none" }}>
                {messages.length === 0 && (
                    <p className="text-center text-xs py-8" style={{ color: "rgba(120,140,185,0.6)" }}>Suhbat boshlang</p>
                )}
                {messages.map(m => {
                    const isRead = m.mine && !m.id.startsWith("tmp-") && peerReadAt && new Date(m.createdAt) <= new Date(peerReadAt);
                    const isTemp = m.id.startsWith("tmp-");
                    const hasMedia = !!m.mediaType && (m.mediaUrl || isTemp);
                    return (
                        <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                            <div className="flex flex-col gap-0.5 max-w-[75%] lg:max-w-[60%]">
                                {/* Media qism (agar mavjud bo'lsa) */}
                                {hasMedia && (
                                    <div className="rounded-2xl overflow-hidden mb-0.5" style={m.mine
                                        ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)" }
                                        : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                        {m.mediaType === "image" && m.mediaUrl && (
                                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={m.mediaUrl} alt="" className="max-w-full max-h-80 object-contain" />
                                            </a>
                                        )}
                                        {m.mediaType === "video" && m.mediaUrl && (
                                            <video src={m.mediaUrl} controls playsInline className="max-w-full max-h-80" />
                                        )}
                                        {m.mediaType === "video-circle" && m.mediaUrl && (
                                            <div className="p-2">
                                                <div className="relative rounded-full overflow-hidden bg-black"
                                                    style={{ width: 200, height: 200, border: "2px solid rgba(255,255,255,0.15)" }}>
                                                    <video src={m.mediaUrl} controls playsInline className="w-full h-full object-cover" />
                                                </div>
                                                {typeof m.durationMs === "number" && m.durationMs > 0 && (
                                                    <p className="text-[10px] mt-1 text-center tabular-nums"
                                                        style={{ color: m.mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.75)" }}>
                                                        {fmtDuration(m.durationMs)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {m.mediaType === "audio" && m.mediaUrl && (
                                            <div className="px-3 py-2.5 flex items-center gap-2.5 min-w-[240px]">
                                                <Music className="w-4 h-4 flex-shrink-0" style={{ color: m.mine ? "rgba(255,255,255,0.9)" : "#00CEC8" }} />
                                                <audio src={m.mediaUrl} controls className="flex-1 h-8" style={{ maxWidth: 200 }} />
                                                {typeof m.durationMs === "number" && m.durationMs > 0 && (
                                                    <span className="text-[10px] tabular-nums" style={{ color: m.mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.75)" }}>{fmtDuration(m.durationMs)}</span>
                                                )}
                                            </div>
                                        )}
                                        {m.mediaType === "poll" && m.pollQuestion && Array.isArray(m.pollOptions) && (
                                            (() => {
                                                const counts = m.pollVoteCounts ?? m.pollOptions.map(() => 0);
                                                const total = m.pollTotal ?? 0;
                                                const myVotes = m.pollMyVotes ?? [];
                                                const expired = m.pollExpiresAt && new Date(m.pollExpiresAt) < new Date();
                                                const showResults = myVotes.length > 0 || expired;
                                                return (
                                                    <div className="p-3.5 space-y-2.5" style={{ minWidth: 260 }}>
                                                        <div className="flex items-start gap-2 mb-1">
                                                            <BarChart2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: m.mine ? "rgba(255,255,255,0.90)" : "#00CEC8" }} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-black" style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                                    {m.pollQuestion}
                                                                </p>
                                                                <p className="text-[10px] mt-0.5" style={{ color: m.mine ? "rgba(255,255,255,0.70)" : "rgba(140,160,210,0.75)" }}>
                                                                    {m.pollMulti ? "Bir necha variant" : "Bitta variant"} · {total} ovoz
                                                                    {expired && " · Yakunlangan"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {m.pollOptions.map((opt, i) => {
                                                            const cnt = counts[i] ?? 0;
                                                            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                                                            const isMyVote = myVotes.includes(i);
                                                            return (
                                                                <button key={i}
                                                                    onClick={() => !expired && votePoll(m.id, i)}
                                                                    disabled={!!expired}
                                                                    className="w-full text-left rounded-lg overflow-hidden relative transition active:scale-[0.98] disabled:opacity-70"
                                                                    style={{ background: m.mine ? "rgba(255,255,255,0.10)" : "rgba(43,62,232,0.10)" }}>
                                                                    {showResults && (
                                                                        <div className="absolute inset-y-0 left-0 rounded-lg transition-all"
                                                                            style={{
                                                                                width: `${pct}%`,
                                                                                background: isMyVote
                                                                                    ? (m.mine ? "rgba(255,255,255,0.28)" : "rgba(0,206,200,0.30)")
                                                                                    : (m.mine ? "rgba(255,255,255,0.14)" : "rgba(43,62,232,0.25)"),
                                                                            }} />
                                                                    )}
                                                                    <div className="relative flex items-center gap-2 px-3 py-2">
                                                                        {showResults && (
                                                                            <span className="text-[10px] font-black tabular-nums w-9 flex-shrink-0"
                                                                                style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>{pct}%</span>
                                                                        )}
                                                                        <span className="text-xs flex-1"
                                                                            style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)", fontWeight: isMyVote ? 700 : 500 }}>
                                                                            {opt}
                                                                        </span>
                                                                        {isMyVote && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: m.mine ? "#fff" : "#00CEC8" }} strokeWidth={3} />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                        {!showResults && (
                                                            <p className="text-[10px] italic mt-1" style={{ color: m.mine ? "rgba(255,255,255,0.65)" : "rgba(140,160,210,0.70)" }}>
                                                                Natijalarni ko'rish uchun ovoz bering
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        )}
                                        {m.mediaType === "location" && typeof m.locLat === "number" && typeof m.locLng === "number" && (
                                            (() => {
                                                const isLive = m.locExpiresAt && new Date(m.locExpiresAt) > new Date();
                                                const lat = m.locLat, lng = m.locLng;
                                                const delta = 0.005;
                                                const bbox = `${lng - delta},${lat - delta * 0.6},${lng + delta},${lat + delta * 0.6}`;
                                                const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
                                                const yandexUrl = `https://yandex.uz/maps/?ll=${lng},${lat}&z=16&pt=${lng},${lat}`;
                                                const googleUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                                return (
                                                    <div style={{ width: 280 }}>
                                                        <iframe src={mapSrc} width="100%" height={160} style={{ border: 0, display: "block" }} loading="lazy" title="Xarita" />
                                                        <div className="px-3 py-2.5 flex items-center gap-2.5">
                                                            {isLive
                                                                ? <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#EF4444" }} />
                                                                : <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: m.mine ? "rgba(255,255,255,0.9)" : "#00CEC8" }} />}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[11px] font-bold" style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                                    {isLive ? "Jonli joylashuv" : "Joylashuv"}
                                                                </p>
                                                                <p className="text-[10px]" style={{ color: m.mine ? "rgba(255,255,255,0.70)" : "rgba(140,160,210,0.75)" }}>
                                                                    {isLive
                                                                        ? `${new Date(m.locExpiresAt!).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} gacha`
                                                                        : `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 px-3 pb-3">
                                                            <a href={yandexUrl} target="_blank" rel="noopener noreferrer"
                                                                className="flex-1 text-center text-[10px] font-bold px-2 py-1.5 rounded-lg"
                                                                style={{ background: m.mine ? "rgba(255,255,255,0.15)" : "rgba(43,62,232,0.20)", color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                                Yandex
                                                            </a>
                                                            <a href={googleUrl} target="_blank" rel="noopener noreferrer"
                                                                className="flex-1 text-center text-[10px] font-bold px-2 py-1.5 rounded-lg"
                                                                style={{ background: m.mine ? "rgba(255,255,255,0.15)" : "rgba(43,62,232,0.20)", color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                                Google
                                                            </a>
                                                            {m.mine && isLive && (
                                                                <button onClick={() => stopLiveLocation(m.id)}
                                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg"
                                                                    style={{ background: "rgba(239,68,68,0.20)", color: "#EF4444" }}>
                                                                    <StopCircle className="w-3 h-3" />To'xtatish
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        )}
                                        {m.mediaType === "file" && (
                                            <a href={m.mediaUrl || "#"} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-3 px-3.5 py-3 min-w-[220px]" style={{ textDecoration: "none" }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ background: m.mine ? "rgba(255,255,255,0.15)" : "rgba(43,62,232,0.25)" }}>
                                                    <FileIcon className="w-5 h-5" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold truncate" style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>{m.mediaName || "Fayl"}</p>
                                                    <p className="text-[10px]" style={{ color: m.mine ? "rgba(255,255,255,0.70)" : "rgba(140,160,210,0.75)" }}>
                                                        {typeof m.mediaSize === "number" ? fmtSize(m.mediaSize) : ""}
                                                    </p>
                                                </div>
                                                {m.mediaUrl && <Download className="w-4 h-4 flex-shrink-0" style={{ color: m.mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.75)" }} />}
                                            </a>
                                        )}
                                        {/* Yuklanish holati (temp) */}
                                        {isTemp && !m.mediaUrl && (
                                            <div className="px-3.5 py-3 flex items-center gap-2" style={{ minWidth: 220 }}>
                                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                <span className="text-[11px]" style={{ color: m.mine ? "rgba(255,255,255,0.85)" : "rgba(220,230,255,0.85)" }}>
                                                    Yuklanmoqda... {uploadPct > 0 ? `${uploadPct}%` : ""}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Matn qism (agar bo'lsa) */}
                                {m.text && (
                                    <div className="px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                                        style={m.mine
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff", borderBottomRightRadius: "4px" }
                                            : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)", borderBottomLeftRadius: "4px" }}>
                                        {m.text}
                                    </div>
                                )}
                                <div className={`flex items-center gap-1 px-1 ${m.mine ? "justify-end" : "justify-start"}`}>
                                    <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.7)" }}>{timeShort(m.createdAt)}</span>
                                    {m.mine && (
                                        isRead
                                            ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} strokeWidth={2.5} />
                                            : <Check className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.65)" }} strokeWidth={2.5} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <div className="flex-shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                <input ref={fileInputRef} type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                    onChange={e => { const f = e.target.files?.[0]; if (f) sendMedia(f); }}
                    className="hidden" />
                {recording ? (
                    /* ── Ovoz yozish rejimi: bekor + timer + jo'natish ── */
                    <>
                        <button onClick={() => stopVoice(true)} title="Bekor qilish"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
                            style={{ background: "rgba(239,68,68,0.15)" }}>
                            <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                        </button>
                        <div className="flex-1 h-10 rounded-xl px-3.5 flex items-center gap-3"
                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#EF4444" }} />
                            <span className="text-xs font-bold text-white flex-1">Ovoz yozilmoqda</span>
                            <span className="text-xs tabular-nums font-bold" style={{ color: "#EF4444" }}>{fmtDuration(recSeconds * 1000)}</span>
                        </div>
                        <button onClick={() => stopVoice(false)} title="Jo'natish"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </>
                ) : (
                    /* ── Oddiy rejim: attach + input + mic/send ── */
                    <>
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            title="Fayl biriktirish"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Paperclip className="w-4 h-4 text-white" />}
                        </button>
                        <button onClick={() => setLocSheetOpen(true)} disabled={locBusy}
                            title="Joylashuv"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform hidden sm:flex"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            {locBusy ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <MapPin className="w-4 h-4 text-white" />}
                        </button>
                        <button onClick={() => setPollOpen(true)}
                            title="So'rovnoma"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 hover:scale-105 active:scale-95 transition-transform hidden sm:flex"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            <BarChart2 className="w-4 h-4 text-white" />
                        </button>
                        <input value={input} onChange={e => {
                                setInput(e.target.value);
                                const now = Date.now();
                                if (selected?.other?.id && myProfileId && now - lastTypingSentRef.current > 2000) {
                                    sendTyping(selected.other.id, myProfileId, myName);
                                    lastTypingSentRef.current = now;
                                }
                            }} onKeyDown={e => e.key === "Enter" && send()}
                            placeholder={uploading ? `Yuklanmoqda ${uploadPct}%...` : "Xabar yozing..."}
                            maxLength={2000} disabled={uploading}
                            className="flex-1 h-10 rounded-xl px-3.5 text-sm text-white outline-none disabled:opacity-60"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                        {/* Matn bo'sh bo'lsa: dumaloq video + mic; aks holda jo'natish */}
                        {input.trim() ? (
                            <button onClick={send} disabled={sending}
                                className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setCircleOpen(true)} disabled={uploading}
                                    title="Dumaloq video xabar"
                                    className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
                                    style={{ background: "rgba(43,62,232,0.10)" }}>
                                    <Camera className="w-4 h-4 text-white" />
                                </button>
                                <button onClick={startVoice} disabled={uploading}
                                    title="Ovozli xabar yozish"
                                    className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Mic className="w-4 h-4 text-white" />
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Dumaloq video recorder modali */}
            <NxVideoCircleRecorder open={circleOpen}
                onClose={() => setCircleOpen(false)}
                onRecorded={(file, dur) => sendMedia(file, "video-circle", dur)} />

            {/* AI moderation ban modali */}
            <NxBanModal ban={ban} onClose={() => setBan(null)} />

            {/* Poll create modal */}
            <NxPollCreate open={pollOpen} onClose={() => setPollOpen(false)} onCreated={sendPoll} />

            {/* Joylashuv sheet — statik yoki jonli muddat tanlash */}
            {locSheetOpen && (
                <>
                    <div className="fixed inset-0 z-[70]" style={{ background: "rgba(5,8,24,0.60)" }} onClick={() => setLocSheetOpen(false)} />
                    <div className="fixed z-[70] left-1/2 bottom-6 -translate-x-1/2 w-[92%] max-w-md rounded-2xl overflow-hidden"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)" }}>
                        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <h3 className="text-sm font-black text-white">Joylashuv jo'natish</h3>
                            <p className="text-[11px] mt-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>Statik yoki jonli muddat bilan</p>
                        </div>
                        <div className="p-3 space-y-1.5">
                            <button onClick={() => sendLocation(null)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.98] transition"
                                style={{ background: "rgba(43,62,232,0.10)" }}>
                                <MapPin className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-white">Hozirgi joylashuv</p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.75)" }}>Bir marta, keyin yangilanmaydi</p>
                                </div>
                            </button>
                            {[
                                { min: 15, label: "15 daqiqa" },
                                { min: 60, label: "1 soat" },
                                { min: 480, label: "8 soat" },
                            ].map(x => (
                                <button key={x.min} onClick={() => sendLocation(x.min)}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.98] transition"
                                    style={{ background: "rgba(43,62,232,0.10)" }}>
                                    <Navigation className="w-4 h-4" style={{ color: "#EF4444" }} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white">Jonli — {x.label}</p>
                                        <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.75)" }}>Har 15 sekundda avtomatik yangilanadi</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setLocSheetOpen(false)}
                            className="w-full px-5 py-3 text-xs font-bold text-white"
                            style={{ background: "rgba(43,62,232,0.05)", borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            Bekor qilish
                        </button>
                    </div>
                </>
            )}
        </>
    ) : (
        /* Bo'sh holat — faqat lg+ ekranda ko'rinadi */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                <MessageSquare className="w-9 h-9" style={{ color: "rgba(43,62,232,0.55)" }} />
            </div>
            <div>
                <p className="text-base font-black text-white mb-1">Xabarlaringiz</p>
                <p className="text-xs" style={{ color: "rgba(120,140,185,0.75)" }}>Suhbat tanlang yoki yangisini boshlang</p>
            </div>
            <button onClick={() => setNewOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white active:scale-95 transition"
                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                Yangi xabar boshlang
            </button>
        </div>
    );

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }} onClick={close} />

            <div className="fixed z-[60] flex flex-col overflow-hidden
                           inset-x-0 bottom-0 h-[85vh] rounded-t-3xl
                           md:inset-y-auto md:top-16 md:right-4 md:bottom-auto md:inset-x-auto md:w-[420px] md:h-auto md:max-h-[calc(100vh-80px)] md:rounded-2xl
                           lg:top-1/2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:-translate-y-1/2
                           lg:w-[min(1100px,95vw)] lg:h-[min(85vh,820px)] lg:max-h-none lg:rounded-3xl
                           lg:flex-row"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)" }}
                onClick={e => e.stopPropagation()}>

                {/* LEFT — suhbatlar ro'yxati / yangi xabar */}
                <div className={`flex-col min-h-0 lg:w-[360px] lg:flex-shrink-0 lg:h-full lg:border-r ${showLeft ? "flex flex-1" : "hidden lg:flex"}`}
                    style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                    {leftPanel}
                </div>

                {/* RIGHT — thread yoki bo'sh holat */}
                <div className={`flex-col min-h-0 min-w-0 lg:flex-1 lg:h-full ${showRight ? "flex flex-1" : "hidden lg:flex"}`}>
                    {rightPanel}
                </div>
            </div>
        </>
    );
}
