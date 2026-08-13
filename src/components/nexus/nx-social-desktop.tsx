"use client";

// Nexus Ijtimoiy — PC (lg+) uchun 3-ustunli Telegram uslubidagi layout.
// Chap: chatlar ro'yxati (+ papkalar tab). O'rta: tanlangan suhbat.
// O'ng: peer haqida ma'lumot (info paneli).
// Mobile'da bu komponent ishlatilmaydi — SocialView eski tabsni ko'rsatadi.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Send, Bot as BotIcon, Search, MessageSquare, Phone, Video, MoreVertical, BadgeCheck, X, Hash, Users, Megaphone, Paperclip, Wallet, MapPin, Mic, Smile, Trash2, Camera, BarChart2, Copy, Reply, Check, CheckCheck, Edit3, ChevronLeft, ChevronRight, Languages, FileIcon, Download, Forward, Pin, PinOff, Archive, ArchiveRestore, BellOff, Bell, Inbox, CheckSquare, Square, ChevronDown } from "lucide-react";
import { NxChannelRoom } from "./nx-channels";
import { NxVideoCircleRecorder } from "./nx-video-circle-recorder";
import { NxPollCreate } from "./nx-poll-create";
import { NxVoicePlayer } from "./nx-voice-player";
import { useNxPlayer } from "./nx-player-ctx";
import { usePresence } from "@/lib/presence";
import { useSession } from "next-auth/react";
import { formatMoney } from "@/lib/money";

interface Conv {
    conversationId: string;
    other: { id?: string; name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    lastMessageText: string | null;
    lastMessageAt: string;
    lastMine: boolean;
    unread: boolean;
    pinned?: boolean;
    muted?: boolean;
    archived?: boolean;
}

interface Msg {
    id: string; text: string; mine: boolean; createdAt: string;
    mediaUrl?: string | null; mediaType?: string | null;
    mediaName?: string | null; mediaSize?: number | null;
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
    replyTo?: { id: string; text: string; senderName: string | null; mine: boolean } | null;
    editedAt?: string | null;
    reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
    durationMs?: number | null;
    pinnedAt?: string | null;
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
    const { startCall } = useNxPlayer();
    const { onTyping, sendTyping, isOnline } = usePresence();
    const { data: session } = useSession();
    const [myProfileId, setMyProfileId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string | null>(null);
    const [peerTyping, setPeerTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    // Mening profileId (typing event ichida ishlatiladi)
    useEffect(() => {
        if (!session?.user?.email) return;
        fetch("/api/user/profile").then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.profile) { setMyProfileId(d.profile.id); setMyName(d.profile.name); } })
            .catch(() => {});
    }, [session?.user?.email]);

    const [listTab, setListTab] = useState<ListTab>("dm");
    const [convs, setConvs] = useState<Conv[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
    const [peer, setPeer] = useState<PeerInfo | null>(null);

    // Typing event'larini eshitish (faqat hozirgi peer bilan)
    useEffect(() => {
        const off = onTyping((e) => {
            if (!peer?.id || !myProfileId) return;
            if (e.fromId !== peer.id) return;
            if (e.toId !== myProfileId) return;
            setPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
        });
        return () => { off(); };
    }, [onTyping, myProfileId, peer?.id]);

    useEffect(() => { setPeerTyping(false); }, [peer?.id]);
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
    const [replyTo, setReplyTo] = useState<Msg | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
    const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
    const galleryImages = messages.filter(m => m.mediaType === "image" && m.mediaUrl);
    const [translated, setTranslated] = useState<Record<string, string>>({});
    const [translating, setTranslating] = useState<Record<string, boolean>>({});
    const [translatePickerFor, setTranslatePickerFor] = useState<string | null>(null);
    // URL preview: URL → { title, image, description, siteName } (yoki null = topilmadi)
    const [linkPreview, setLinkPreview] = useState<Record<string, { title: string | null; image: string | null; description: string | null; siteName: string | null; url: string } | null>>({});
    // Forward: qaysi xabar forward qilinmoqda va uni qaysi suhbatga jo'natish
    const [forwardMsg, setForwardMsg] = useState<Msg | null>(null);
    const [forwarding, setForwarding] = useState(false);
    // Ommaviy forward rejimi (bir necha xabar birga)
    const [bulkForwardOpen, setBulkForwardOpen] = useState(false);
    // Reaksiya bergan foydalanuvchilar modali
    const [reactionUsers, setReactionUsers] = useState<{ messageId: string; emoji: string; users: Array<{ name: string | null; username: string | null; image: string | null; mine: boolean }> | null } | null>(null);
    // Ko'p tanlash rejimi
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // "Pastga scroll" tugmasi + yangi xabar hisoblagichi
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [unreadInView, setUnreadInView] = useState(0);
    const msgsContainerRef = useRef<HTMLDivElement>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!moreOpen) return;
        function h(e: MouseEvent) { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); }
        setTimeout(() => document.addEventListener("mousedown", h), 0);
        return () => document.removeEventListener("mousedown", h);
    }, [moreOpen]);

    // Ko'p tanlash rejimi — xabarni toggle qilish
    function toggleSelectMsg(id: string) {
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }
    function exitSelectMode() {
        setSelectMode(false);
        setSelectedIds(new Set());
    }
    // Ommaviy o'chirish (faqat mening xabarlarim)
    async function bulkDelete() {
        if (!selectedId || selectedIds.size === 0) return;
        const mineIds = messages.filter(m => selectedIds.has(m.id) && m.mine).map(m => m.id);
        if (mineIds.length === 0) { alert("Faqat o'z xabaringizni o'chirasiz"); return; }
        if (!confirm(`${mineIds.length} ta xabar o'chirilsinmi?`)) return;
        await Promise.all(mineIds.map(id =>
            fetch(`/api/nexus/messages/${selectedId}?messageId=${id}`, { method: "DELETE" })
                .catch(() => null)
        ));
        setMessages(prev => prev.filter(m => !mineIds.includes(m.id)));
        exitSelectMode();
        loadConvs();
    }
    // Ommaviy forward — bir necha xabarni bitta suhbatga jo'natish
    async function bulkForwardToConv(targetConvId: string) {
        if (selectedIds.size === 0) return;
        const items = messages.filter(m => selectedIds.has(m.id));
        // Xabar tartibida (yuqoridan pastga)
        for (const src of items) {
            const body: Record<string, unknown> = {};
            const prefix = "↪ Yuborilgan xabar\n";
            body.text = src.text ? prefix + src.text : prefix;
            if (src.mediaUrl && src.mediaType && ["image", "video", "audio", "file", "video-circle"].includes(src.mediaType)) {
                body.mediaUrl = src.mediaUrl;
                body.mediaType = src.mediaType;
                if (src.mediaName) body.mediaName = src.mediaName;
                if (typeof src.mediaSize === "number") body.mediaSize = src.mediaSize;
                if (typeof src.durationMs === "number") body.durationMs = src.durationMs;
            }
            await fetch(`/api/nexus/messages/${targetConvId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }).catch(() => null);
        }
        setForwardMsg(null);
        exitSelectMode();
        if (targetConvId === selectedId) loadMsgs(targetConvId);
        loadConvs();
    }

    async function deleteMessage(messageId: string) {
        if (!selectedId) return;
        if (!confirm("Xabarni o'chirilsinmi?")) return;
        const r = await fetch(`/api/nexus/messages/${selectedId}?messageId=${messageId}`, { method: "DELETE" });
        if (r.ok) {
            setMessages(m => m.filter(x => x.id !== messageId));
            loadConvs();
        } else {
            alert("O'chirib bo'lmadi");
        }
    }

    function copyMessage(text: string) {
        navigator.clipboard.writeText(text).catch(() => {});
    }

    async function saveEdit() {
        if (!selectedId || !editingId) return;
        const text = editingText.trim();
        if (text.length < 1) { setEditingId(null); return; }
        const r = await fetch(`/api/nexus/messages/${selectedId}/edit`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: editingId, text }),
        });
        if (r.ok) {
            setMessages(m => m.map(x => x.id === editingId ? { ...x, text, editedAt: new Date().toISOString() } : x));
            setEditingId(null);
            setEditingText("");
        }
    }

    async function translateMessage(messageId: string, text: string, target: "uz" | "ru" | "en" = "uz") {
        setTranslatePickerFor(null);
        setTranslating(prev => ({ ...prev, [messageId]: true }));
        try {
            const r = await fetch("/api/ai/translate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, target }),
            });
            if (r.ok) {
                const d = await r.json();
                setTranslated(prev => ({ ...prev, [messageId]: d.translated }));
            } else {
                alert("Tarjima qilib bo'lmadi");
            }
        } finally {
            setTranslating(prev => { const n = { ...prev }; delete n[messageId]; return n; });
        }
    }
    function hideTranslation(messageId: string) {
        setTranslated(prev => { const n = { ...prev }; delete n[messageId]; return n; });
    }

    async function toggleMessagePin(m: Msg) {
        if (!selectedId) return;
        const isPinned = !!m.pinnedAt;
        const url = `/api/nexus/messages/${selectedId}/pin${isPinned ? `?messageId=${m.id}` : ""}`;
        const opts: RequestInit = isPinned
            ? { method: "DELETE" }
            : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id }) };
        const r = await fetch(url, opts);
        if (r.ok) {
            const nowIso = new Date().toISOString();
            setMessages(prev => prev.map(x =>
                x.id === m.id ? { ...x, pinnedAt: isPinned ? null : nowIso } : x
            ));
        } else {
            const d = await r.json().catch(() => ({}));
            alert(d?.error ?? "Bajarib bo'lmadi");
        }
    }

    async function toggleConvPin(convId: string, currentlyPinned: boolean) {
        const r = await fetch(`/api/nexus/messages/${convId}/pin-conv`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: !currentlyPinned }),
        });
        if (r.ok) loadConvs();
    }

    async function openReactionUsers(messageId: string, emoji: string) {
        if (!selectedId) return;
        setReactionUsers({ messageId, emoji, users: null });
        try {
            const r = await fetch(`/api/nexus/messages/${selectedId}/reactions?messageId=${messageId}&emoji=${encodeURIComponent(emoji)}`);
            if (r.ok) {
                const d = await r.json();
                setReactionUsers({ messageId, emoji, users: d.users ?? [] });
            } else {
                setReactionUsers({ messageId, emoji, users: [] });
            }
        } catch {
            setReactionUsers({ messageId, emoji, users: [] });
        }
    }

    async function forwardToConv(targetConvId: string) {
        if (!forwardMsg) return;
        setForwarding(true);
        try {
            const body: Record<string, unknown> = {};
            const src = forwardMsg;
            // Matn: original matn oldiga "→ Yuborilgan" belgisi
            const prefix = "↪ Yuborilgan xabar\n";
            if (src.text) body.text = prefix + src.text;
            else body.text = prefix;
            // Media (agent/transfer/poll/location'lar forward'ga tushmaydi — faqat oddiy media)
            if (src.mediaUrl && src.mediaType && ["image", "video", "audio", "file", "video-circle"].includes(src.mediaType)) {
                body.mediaUrl = src.mediaUrl;
                body.mediaType = src.mediaType;
                if (src.mediaName) body.mediaName = src.mediaName;
                if (typeof src.mediaSize === "number") body.mediaSize = src.mediaSize;
                if (typeof src.durationMs === "number") body.durationMs = src.durationMs;
            }
            const r = await fetch(`/api/nexus/messages/${targetConvId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (r.ok) {
                setForwardMsg(null);
                // Agar shu suhbatga forward qilingan bo'lsa — thread'ni yangilash
                if (targetConvId === selectedId) {
                    const d = await r.json();
                    if (d?.message) setMessages(m => [...m, d.message as Msg]);
                }
                loadConvs();
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Yuborib bo'lmadi");
            }
        } finally {
            setForwarding(false);
        }
    }

    async function toggleReaction(messageId: string, emoji: string) {
        if (!selectedId) return;
        const r = await fetch(`/api/nexus/messages/${selectedId}/react`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId, emoji }),
        });
        if (r.ok) {
            const d = await r.json();
            setMessages(m => m.map(x => x.id === messageId ? { ...x, reactions: d.reactions ?? [] } : x));
        }
        setReactPickerFor(null);
    }

    async function togglePeerAction(action: "block" | "mute") {
        if (!peer?.username) return;
        try {
            const r = await fetch(`/api/nexus/${action}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: peer.username }),
            });
            if (r.ok) {
                const d = await r.json().catch(() => ({}));
                alert(action === "block"
                    ? (d.blocked ? "Foydalanuvchi bloklandi" : "Blokdan chiqarildi")
                    : (d.muted ? "Ovozsizlantirildi" : "Ovoz qaytarildi")
                );
                setMoreOpen(false);
            }
        } catch { /* ignore */ }
    }

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

    // Arxiv rejimi (per-tab, session ichida)
    const [showArchived, setShowArchived] = useState(false);
    const [archivedCount, setArchivedCount] = useState(0);

    // Suhbatlar ro'yxati
    const loadConvs = useCallback(async () => {
        try {
            const url = showArchived ? "/api/nexus/messages?archived=1" : "/api/nexus/messages";
            const r = await fetch(url, { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setConvs(d.conversations ?? []);
                setArchivedCount(d.archivedCount ?? 0);
            }
        } finally { setLoadingConvs(false); }
    }, [showArchived]);
    useEffect(() => { loadConvs(); }, [loadConvs]);

    // Har 6 sekundda ro'yxatni yangilash (unread badge)
    useEffect(() => {
        const t = setInterval(loadConvs, 6000);
        return () => clearInterval(t);
    }, [loadConvs]);

    // Chatni arxiv/mute qilish (per-user, optimistic)
    const toggleConvArchive = useCallback(async (convId: string, currentlyArchived: boolean) => {
        // Ochilib turgan chat arxivga tushsa, uni yopamiz
        if (!currentlyArchived && convId === selectedId) setSelectedId(null);
        setConvs(prev => prev.filter(c => c.conversationId !== convId));
        setArchivedCount(n => currentlyArchived ? Math.max(0, n - 1) : n + 1);
        try {
            await fetch(`/api/nexus/messages/${convId}/archive-conv`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archive: !currentlyArchived }),
            });
        } finally { loadConvs(); }
    }, [selectedId, loadConvs]);

    const toggleConvMute = useCallback(async (convId: string, currentlyMuted: boolean) => {
        setConvs(prev => prev.map(c => c.conversationId === convId ? { ...c, muted: !currentlyMuted } : c));
        try {
            await fetch(`/api/nexus/messages/${convId}/mute-conv`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mute: !currentlyMuted }),
            });
        } finally { loadConvs(); }
    }, [loadConvs]);

    // Draft avto-saqlash — localStorage'da (per-chat)
    const draftKey = (convId: string) => `nexus:dm:draft:${convId}`;
    // Suhbat almashinuvida: joriyni saqlash + yangisidan qayta tiklash
    const prevSelectedRef = useRef<string | null>(null);
    useEffect(() => {
        // Oldingi chatning draft'ini yozib qo'yish
        const prev = prevSelectedRef.current;
        if (prev && prev !== selectedId) {
            try {
                if (input.trim()) localStorage.setItem(draftKey(prev), input);
                else localStorage.removeItem(draftKey(prev));
            } catch {}
        }
        // Yangi tanlangan chatning draft'ini olish
        if (selectedId && selectedId !== prev) {
            try {
                const d = localStorage.getItem(draftKey(selectedId));
                setInput(d ?? "");
            } catch { setInput(""); }
        }
        prevSelectedRef.current = selectedId;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);
    // Har o'zgarishda avto-saqlash (debounce 400ms)
    useEffect(() => {
        if (!selectedId) return;
        const t = setTimeout(() => {
            try {
                if (input.trim()) localStorage.setItem(draftKey(selectedId), input);
                else localStorage.removeItem(draftKey(selectedId));
            } catch {}
        }, 400);
        return () => clearTimeout(t);
    }, [input, selectedId]);

    // Tanlangan suhbat xabarlari
    const loadMsgs = useCallback(async (convId: string) => {
        setLoadingMsgs(true);
        try {
            const r = await fetch(`/api/nexus/messages/${convId}`, { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setMessages(d.messages ?? []);
                setPeerReadAt(d.peerReadAt ?? null);
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

    // Yangi xabar kelganda: pastga yaqin bo'lsa scroll, aks holda hisoblagichga qo'sh
    const prevMsgCountRef = useRef(0);
    useEffect(() => {
        const container = msgsContainerRef.current;
        const prevCount = prevMsgCountRef.current;
        const delta = messages.length - prevCount;
        prevMsgCountRef.current = messages.length;
        if (!container) return;
        const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
        if (nearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        } else if (delta > 0) {
            // Yangi xabarlar bor, foydalanuvchi yuqoriga qaragan — hisoblagich ko'paytir
            setUnreadInView(n => n + delta);
        }
    }, [messages]);

    // Suhbat almashinsa: scroll pastga, hisoblagich nolga
    useEffect(() => {
        setUnreadInView(0);
        setShowScrollDown(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);
    }, [selectedId]);

    // Scroll pozitsiyasini kuzatish — pastdan uzoq bo'lsa "scroll down" tugmasini ko'rsat
    useEffect(() => {
        const container = msgsContainerRef.current;
        if (!container) return;
        function onScroll() {
            if (!container) return;
            const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
            setShowScrollDown(!nearBottom);
            if (nearBottom) setUnreadInView(0);
        }
        container.addEventListener("scroll", onScroll, { passive: true });
        return () => container.removeEventListener("scroll", onScroll);
    }, [selectedId]);

    function scrollToBottom() {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setUnreadInView(0);
    }

    // URL preview: yangi xabarlar kelganda birinchi URL uchun preview olish
    useEffect(() => {
        const urlRe = /(https?:\/\/[^\s]+)/i;
        for (const m of messages) {
            if (!m.text) continue;
            const match = m.text.match(urlRe);
            if (!match) continue;
            const u = match[1].replace(/[.,;:!?)]+$/, ""); // trailing punctuation trim
            if (u in linkPreview) continue; // allaqachon olingan yoki so'ralgan
            setLinkPreview(prev => ({ ...prev, [u]: null })); // hozirlik uchun
            fetch(`/api/nexus/link-preview?url=${encodeURIComponent(u)}`, { cache: "force-cache" })
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    if (!d?.ok) return;
                    setLinkPreview(prev => ({ ...prev, [u]: { title: d.title, image: d.image, description: d.description, siteName: d.siteName, url: d.url } }));
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // Suhbatni eksport qilish (HTML/JSON)
    function exportChat(format: "html" | "json") {
        if (!selectedId) return;
        window.open(`/api/nexus/messages/${selectedId}/export?format=${format}`, "_blank");
        setMoreOpen(false);
    }

    // Xabar matnidagi birinchi URL (agar bor bo'lsa) — preview render uchun
    function firstUrlInText(text: string | null | undefined): string | null {
        if (!text) return null;
        const m = text.match(/(https?:\/\/[^\s]+)/i);
        return m ? m[1].replace(/[.,;:!?)]+$/, "") : null;
    }

    async function send() {
        if (!selectedId || !input.trim() || sending) return;
        setSending(true);
        const text = input.trim();
        const replyToIdSnap = replyTo?.id ?? null;
        setInput("");
        try { localStorage.removeItem(draftKey(selectedId)); } catch {}
        setReplyTo(null);
        try {
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, replyToId: replyToIdSnap }),
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

                {/* Arxiv toggle — faqat DM tab uchun */}
                {listTab === "dm" && (archivedCount > 0 || showArchived) && (
                    <button onClick={() => { setShowArchived(v => !v); setSelectedId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b transition hover:bg-white/[0.04]"
                        style={{
                            borderColor: "rgba(43,62,232,0.14)",
                            background: showArchived ? "rgba(0,206,200,0.06)" : "transparent",
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: showArchived ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.15)" }}>
                            {showArchived
                                ? <Inbox className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                : <Archive className="w-4 h-4" style={{ color: "rgba(180,195,235,0.85)" }} />
                            }
                        </div>
                        <p className="flex-1 text-left text-xs font-bold" style={{ color: "rgba(220,230,255,0.95)" }}>
                            {showArchived ? "← Faol suhbatlar" : "Arxiv"}
                        </p>
                        {!showArchived && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(43,62,232,0.20)", color: "rgba(180,195,235,0.85)" }}>
                                {archivedCount}
                            </span>
                        )}
                    </button>
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
                        <div key={c.conversationId} className="group relative">
                            <button
                                onClick={() => setSelectedId(c.conversationId)}
                                onContextMenu={(e) => { e.preventDefault(); toggleConvPin(c.conversationId, !!c.pinned); }}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b"
                                style={{
                                    borderColor: "rgba(43,62,232,0.06)",
                                    background: selectedId === c.conversationId
                                        ? "rgba(43,62,232,0.18)"
                                        : c.pinned ? "rgba(0,206,200,0.04)" : "transparent",
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
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1">
                                        {c.muted && <BellOff className="w-3 h-3" style={{ color: "rgba(140,160,210,0.65)" }} />}
                                        {c.pinned && <Pin className="w-3 h-3" style={{ color: "rgba(0,206,200,0.75)" }} />}
                                    </div>
                                    {c.unread && (
                                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{
                                                background: c.muted ? "rgba(140,160,210,0.60)" : "#00CEC8",
                                                boxShadow: c.muted ? "none" : "0 0 6px rgba(0,206,200,0.7)",
                                            }} />
                                    )}
                                </div>
                            </button>
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleConvPin(c.conversationId, !!c.pinned); }}
                                    title={c.pinned ? "Pindan olib tashlash" : "Pinga qo'yish"}
                                    className="w-6 h-6 rounded flex items-center justify-center"
                                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    {c.pinned
                                        ? <PinOff className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                        : <Pin className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    }
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleConvMute(c.conversationId, !!c.muted); }}
                                    title={c.muted ? "Ovozni qaytarish" : "Ovozsizlantirish"}
                                    className="w-6 h-6 rounded flex items-center justify-center"
                                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    {c.muted
                                        ? <Bell className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                        : <BellOff className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    }
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleConvArchive(c.conversationId, !!c.archived || showArchived); }}
                                    title={showArchived ? "Arxivdan chiqarish" : "Arxivga qo'yish"}
                                    className="w-6 h-6 rounded flex items-center justify-center"
                                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    {showArchived
                                        ? <ArchiveRestore className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                        : <Archive className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    }
                                </button>
                            </div>
                        </div>
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
                        {/* Chat header — select rejimda toolbar bilan almashadi */}
                        {selectMode ? (
                            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                                style={{ borderBottom: "1px solid rgba(0,206,200,0.30)", background: "rgba(0,206,200,0.06)" }}>
                                <IconBtn icon={X} title="Chiqish" onClick={exitSelectMode} />
                                <div className="flex-1">
                                    <p className="text-sm font-black" style={{ color: "#00CEC8" }}>
                                        {selectedIds.size} ta tanlandi
                                    </p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        Xabar tanlash rejimi
                                    </p>
                                </div>
                                <IconBtn icon={Forward} title="Ommaviy jo'natish"
                                    onClick={() => selectedIds.size > 0 && setBulkForwardOpen(true)} />
                                <IconBtn icon={Copy} title="Nusxa olish"
                                    onClick={() => {
                                        const items = messages.filter(m => selectedIds.has(m.id));
                                        const text = items.map(m => m.text || `[${m.mediaType ?? "media"}]`).join("\n");
                                        navigator.clipboard.writeText(text).catch(() => {});
                                        exitSelectMode();
                                    }} />
                                <button onClick={bulkDelete}
                                    disabled={selectedIds.size === 0}
                                    title="O'chirish"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40"
                                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                    <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                                </button>
                            </div>
                        ) : (
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
                                <p className="text-[11px]" style={{ color: peerTyping ? "#00CEC8" : "rgba(140,160,210,0.70)" }}>
                                    {peerTyping
                                        ? "yozmoqda..."
                                        : peer?.id && isOnline(peer.id) ? "onlayn"
                                        : peer?.username ? `@${peer.username}` : ""}
                                </p>
                            </div>
                            <IconBtn
                                icon={searchOpen ? X : Search}
                                title={searchOpen ? "Qidiruvni yopish" : "Suhbatda qidirish"}
                                onClick={() => { setSearchOpen(v => !v); setSearchQuery(""); }}
                            />
                            {!peer?.isAgent && peer?.id && (
                                <>
                                    <IconBtn icon={Phone} title="Ovozli chaqiruv"
                                        onClick={() => peer.id && startCall(peer.id, "AUDIO")} />
                                    <IconBtn icon={Video} title="Video chaqiruv"
                                        onClick={() => peer.id && startCall(peer.id, "VIDEO")} />
                                </>
                            )}
                            <div className="relative" ref={moreRef}>
                                <IconBtn icon={MoreVertical} title="Ko'proq" onClick={() => setMoreOpen(v => !v)} />
                                {moreOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-30"
                                        style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                        {peer?.username && (
                                            <a href={`/nexus/u/${peer.username}`} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05]"
                                                onClick={() => setMoreOpen(false)}>
                                                <BadgeCheck className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Profilni ochish
                                            </a>
                                        )}
                                        <button onClick={() => { setSelectMode(true); setMoreOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            <CheckSquare className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Xabarlarni tanlash
                                        </button>
                                        <button onClick={() => exportChat("html")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            <Download className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> HTML eksport
                                        </button>
                                        <button onClick={() => exportChat("json")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            <FileIcon className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> JSON eksport
                                        </button>
                                        {(() => {
                                            const cur = convs.find(x => x.conversationId === selectedId);
                                            const muted = !!cur?.muted;
                                            const archived = !!cur?.archived || showArchived;
                                            return (
                                                <>
                                                    <button onClick={() => { if (selectedId) toggleConvMute(selectedId, muted); setMoreOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        {muted
                                                            ? <><Bell className="w-4 h-4" style={{ color: "#00CEC8" }} /> Ovozni qaytarish</>
                                                            : <><BellOff className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Chatni ovozsizlantirish</>
                                                        }
                                                    </button>
                                                    <button onClick={() => { if (selectedId) toggleConvArchive(selectedId, archived); setMoreOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        {archived
                                                            ? <><ArchiveRestore className="w-4 h-4" style={{ color: "#00CEC8" }} /> Arxivdan chiqarish</>
                                                            : <><Archive className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Arxivga qo&apos;yish</>
                                                        }
                                                    </button>
                                                </>
                                            );
                                        })()}
                                        <button onClick={() => togglePeerAction("block")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-red-500/10 text-left"
                                            style={{ color: "#EF4444" }}>
                                            <X className="w-4 h-4" /> Bloklash
                                        </button>
                                    </div>
                                )}
                            </div>
                            <IconBtn
                                icon={showInfo ? X : MessageSquare}
                                title={showInfo ? "Info panelni yopish" : "Info panel"}
                                onClick={() => setShowInfo(v => !v)}
                            />
                        </div>
                        )}

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

                        {/* Pinlangan xabarlar banneri */}
                        {(() => {
                            const pinned = messages.filter(m => m.pinnedAt)
                                .sort((a, b) => new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime());
                            if (pinned.length === 0) return null;
                            const top = pinned[0];
                            return (
                                <button
                                    onClick={() => {
                                        const el = document.querySelector<HTMLElement>(`[data-msg-id="${top.id}"]`);
                                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                        el?.animate([
                                            { background: "rgba(0,206,200,0.15)" }, { background: "transparent" },
                                        ], { duration: 1400, iterations: 1 });
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 border-b transition hover:bg-white/[0.02] text-left"
                                    style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                                    <Pin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#00CEC8" }}>
                                            Pinlangan xabar {pinned.length > 1 && `(${pinned.length})`}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                            {top.text || (top.mediaType ? `[${top.mediaType}]` : "(media)")}
                                        </p>
                                    </div>
                                    <PinOff onClick={(e) => { e.stopPropagation(); toggleMessagePin(top); }}
                                        className="w-3.5 h-3.5 flex-shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                                        style={{ color: "rgba(160,176,224,0.85)" }} />
                                </button>
                            );
                        })()}

                        {/* Messages */}
                        <div ref={msgsContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                </div>
                            ) : (() => {
                                const list = searchOpen && searchQuery.trim()
                                    ? messages.filter(m => (m.text ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
                                    : messages;
                                return list.map((m, i) => {
                                    const prev = i > 0 ? list[i - 1] : null;
                                    const showDate = !prev || !isSameDay(prev.createdAt, m.createdAt);
                                    const dateLabel = showDate ? formatDateSeparator(m.createdAt) : null;
                                    return (
                                        <div key={m.id}>
                                            {dateLabel && (
                                                <div className="flex justify-center my-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                                                        style={{ background: "rgba(11,18,40,0.85)", color: "rgba(160,176,224,0.75)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                            )}
                                <div data-msg-id={m.id}
                                    onClick={() => { if (selectMode) toggleSelectMsg(m.id); }}
                                    className={`group flex items-center gap-1 ${m.mine ? "justify-end flex-row-reverse" : "justify-start"} ${selectMode ? "cursor-pointer" : ""} ${selectedIds.has(m.id) ? "rounded-lg py-1" : ""}`}
                                    style={selectedIds.has(m.id) ? { background: "rgba(0,206,200,0.10)" } : undefined}>
                                    {selectMode && (
                                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                                            {selectedIds.has(m.id)
                                                ? <CheckSquare className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                                : <Square className="w-4 h-4" style={{ color: "rgba(160,176,224,0.60)" }} />
                                            }
                                        </div>
                                    )}
                                    {/* Hover amallar: react + reply + edit + copy + delete */}
                                    <div className={`transition flex gap-1 flex-shrink-0 relative ${selectMode ? "hidden" : "opacity-0 group-hover:opacity-100"}`}>
                                        <button onClick={() => setReactPickerFor(m.id === reactPickerFor ? null : m.id)} title="Reaksiya"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                            <Smile className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                        </button>
                                        <button onClick={() => setReplyTo(m)} title="Javob berish"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                            <Reply className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                        </button>
                                        <button onClick={() => setForwardMsg(m)} title="Yuborish (forward)"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                            <Forward className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                        </button>
                                        <button onClick={() => toggleMessagePin(m)}
                                            title={m.pinnedAt ? "Pindan olib tashlash" : "Suhbatga pinlash"}
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{
                                                background: m.pinnedAt ? "rgba(0,206,200,0.18)" : "rgba(11,18,40,0.65)",
                                                border: `1px solid ${m.pinnedAt ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.25)"}`,
                                            }}>
                                            {m.pinnedAt
                                                ? <PinOff className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                                : <Pin className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            }
                                        </button>
                                        {m.mine && m.text && !m.mediaType && (
                                            <button onClick={() => { setEditingId(m.id); setEditingText(m.text); }} title="Tahrirlash"
                                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                                <Edit3 className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </button>
                                        )}
                                        {m.text && (
                                            <>
                                                <div className="relative">
                                                    <button onClick={() => translated[m.id]
                                                        ? hideTranslation(m.id)
                                                        : setTranslatePickerFor(translatePickerFor === m.id ? null : m.id)}
                                                        title="Tarjima qilish"
                                                        disabled={!!translating[m.id]}
                                                        className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-40"
                                                        style={{ background: translated[m.id] ? "rgba(0,206,200,0.20)" : "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                                        {translating[m.id]
                                                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#00CEC8" }} />
                                                            : <Languages className="w-3 h-3" style={{ color: translated[m.id] ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                                                        }
                                                    </button>
                                                    {translatePickerFor === m.id && (
                                                        <div className="absolute top-full mt-1 left-0 z-30 flex gap-1 p-1 rounded-lg"
                                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)" }}>
                                                            {(["uz", "ru", "en"] as const).map(lg => (
                                                                <button key={lg}
                                                                    onClick={() => translateMessage(m.id, m.text, lg)}
                                                                    className="text-[10px] font-black px-2 py-1 rounded hover:bg-white/[0.08]"
                                                                    style={{ color: "rgba(220,230,255,0.95)" }}>
                                                                    {lg === "uz" ? "UZ" : lg === "ru" ? "RU" : "EN"}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => copyMessage(m.text)} title="Nusxa olish"
                                                    className="w-7 h-7 rounded-md flex items-center justify-center"
                                                    style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                                    <Copy className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                </button>
                                            </>
                                        )}
                                        {m.mine && (
                                            <button onClick={() => deleteMessage(m.id)} title="O'chirish"
                                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                                <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                                            </button>
                                        )}
                                        {reactPickerFor === m.id && (
                                            <div className="absolute top-full mt-1 z-30 flex gap-1 p-1.5 rounded-lg"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                                {["❤️","👍","😂","😮","😢","🔥","🙏","👏"].map(e => (
                                                    <button key={e} onClick={() => toggleReaction(m.id, e)}
                                                        className="w-7 h-7 text-base rounded hover:bg-white/[0.08] active:scale-90">
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="max-w-[70%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words"
                                        style={m.mine
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff", borderBottomRightRadius: "6px" }
                                            : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)", borderBottomLeftRadius: "6px" }
                                        }>
                                        {m.replyTo && (
                                            <div className="mb-2 pl-2 pr-2 py-1.5 rounded-md text-xs"
                                                style={{
                                                    background: m.mine ? "rgba(0,0,0,0.20)" : "rgba(0,206,200,0.10)",
                                                    borderLeft: `3px solid ${m.mine ? "#fff" : "#00CEC8"}`,
                                                }}>
                                                <p className="font-bold text-[11px] mb-0.5"
                                                    style={{ color: m.mine ? "#fff" : "#00CEC8" }}>
                                                    {m.replyTo.mine ? "Siz" : (m.replyTo.senderName ?? "Foydalanuvchi")}
                                                </p>
                                                <p className="opacity-80 line-clamp-2">{m.replyTo.text || "(media)"}</p>
                                            </div>
                                        )}
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
                                            <div className="mb-1">
                                                <NxVoicePlayer src={m.mediaUrl} mine={m.mine} seed={m.id} initialDurationMs={m.durationMs} />
                                            </div>
                                        )}
                                        {m.mediaType === "video-circle" && m.mediaUrl && (
                                            <video src={m.mediaUrl} controls playsInline
                                                className="rounded-full mb-1"
                                                style={{ width: 200, height: 200, objectFit: "cover" }} />
                                        )}
                                        {m.mediaType === "file" && m.mediaUrl && (
                                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" download={m.mediaName ?? true}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 min-w-[240px]"
                                                style={{ background: m.mine ? "rgba(255,255,255,0.12)" : "rgba(0,206,200,0.10)", textDecoration: "none" }}>
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{ background: m.mine ? "rgba(255,255,255,0.18)" : "rgba(0,206,200,0.20)" }}>
                                                    <FileIcon className="w-5 h-5" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold truncate" style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                        {m.mediaName || "Fayl"}
                                                    </p>
                                                    <p className="text-[10px] opacity-70">
                                                        {typeof m.mediaSize === "number" ? formatBytes(m.mediaSize) : ""}
                                                    </p>
                                                </div>
                                                <Download className="w-4 h-4 flex-shrink-0 opacity-70" />
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
                                        {m.text && editingId !== m.id && (
                                            <div>
                                                {searchOpen && searchQuery.trim() ? highlightText(m.text, searchQuery) : m.text}
                                                {m.editedAt && (
                                                    <span className="ml-1.5 text-[10px] opacity-50 italic">(tahrirlangan)</span>
                                                )}
                                            </div>
                                        )}
                                        {translated[m.id] && (
                                            <div className="mt-1.5 pl-2 py-1 rounded text-xs italic"
                                                style={{ borderLeft: "2px solid #00CEC8", background: "rgba(0,206,200,0.08)" }}>
                                                <span className="text-[9px] font-bold uppercase tracking-wider mr-1.5" style={{ color: "#00CEC8" }}>Tarjima</span>
                                                {translated[m.id]}
                                            </div>
                                        )}
                                        {/* URL preview (birinchi URL) */}
                                        {(() => {
                                            const u = firstUrlInText(m.text);
                                            if (!u) return null;
                                            const p = linkPreview[u];
                                            if (!p || (!p.title && !p.image && !p.description)) return null;
                                            return (
                                                <a href={p.url} target="_blank" rel="noopener noreferrer"
                                                    className="mt-2 block rounded-lg overflow-hidden max-w-[320px]"
                                                    style={{
                                                        background: m.mine ? "rgba(255,255,255,0.10)" : "rgba(0,206,200,0.08)",
                                                        border: `1px solid ${m.mine ? "rgba(255,255,255,0.14)" : "rgba(0,206,200,0.20)"}`,
                                                    }}>
                                                    {p.image && (
                                                        <img src={p.image} alt="" className="w-full max-h-40 object-cover" />
                                                    )}
                                                    <div className="p-2">
                                                        {p.siteName && (
                                                            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                                                                style={{ color: m.mine ? "rgba(255,255,255,0.65)" : "#00CEC8" }}>
                                                                {p.siteName}
                                                            </p>
                                                        )}
                                                        {p.title && (
                                                            <p className="text-xs font-black line-clamp-2"
                                                                style={{ color: m.mine ? "#fff" : "rgba(220,230,255,0.95)" }}>
                                                                {p.title}
                                                            </p>
                                                        )}
                                                        {p.description && (
                                                            <p className="text-[11px] mt-0.5 line-clamp-2 opacity-75">
                                                                {p.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </a>
                                            );
                                        })()}
                                        {editingId === m.id && (
                                            <div className="flex flex-col gap-1.5">
                                                <textarea value={editingText} onChange={e => setEditingText(e.target.value)}
                                                    rows={2} autoFocus
                                                    className="bg-black/30 rounded p-1.5 text-sm focus:outline-none resize-none"
                                                    style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.20)" }} />
                                                <div className="flex gap-1.5 justify-end">
                                                    <button onClick={() => setEditingId(null)}
                                                        className="text-[11px] font-bold px-2 py-1 rounded"
                                                        style={{ background: "rgba(0,0,0,0.30)", color: "#fff" }}>Bekor</button>
                                                    <button onClick={saveEdit}
                                                        className="text-[11px] font-bold px-2 py-1 rounded"
                                                        style={{ background: "rgba(0,206,200,0.30)", color: "#fff" }}>Saqlash</button>
                                                </div>
                                            </div>
                                        )}
                                        {m.reactions && m.reactions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {m.reactions.map(r => (
                                                    <button key={r.emoji}
                                                        onClick={(e) => e.ctrlKey || e.metaKey ? toggleReaction(m.id, r.emoji) : openReactionUsers(m.id, r.emoji)}
                                                        onDoubleClick={() => toggleReaction(m.id, r.emoji)}
                                                        title="Bosish — kim reaksiya berganini ko'rish · Ctrl/Dbl — o'chirish"
                                                        className="px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-0.5 transition"
                                                        style={{
                                                            background: r.mine ? "rgba(0,206,200,0.25)" : "rgba(255,255,255,0.10)",
                                                            border: `1px solid ${r.mine ? "rgba(0,206,200,0.50)" : "rgba(255,255,255,0.15)"}`,
                                                        }}>
                                                        <span>{r.emoji}</span>
                                                        <span className="font-bold opacity-90">{r.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {/* Vaqt + o'qildi belgisi (faqat mening xabarlarim uchun 2 tick) */}
                                        <div className={`flex items-center gap-1 mt-0.5 ${m.mine ? "justify-end" : "justify-start"}`}>
                                            <span className="text-[9px] opacity-60">
                                                {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            {m.mine && (
                                                (() => {
                                                    const read = peerReadAt && new Date(m.createdAt) <= new Date(peerReadAt);
                                                    return read
                                                        ? <CheckCheck className="w-3 h-3" style={{ color: "#00CEC8" }} strokeWidth={2.5} />
                                                        : <Check className="w-3 h-3 opacity-70" strokeWidth={2.5} />;
                                                })()
                                            )}
                                        </div>
                                    </div>
                                </div>
                                        </div>
                                    );
                                });
                            })()}
                            <div ref={bottomRef} />
                            {showScrollDown && (
                                <button onClick={scrollToBottom}
                                    className="fixed bottom-28 right-[calc(320px+24px)] w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 z-30"
                                    style={{
                                        background: "rgba(11,18,40,0.95)",
                                        border: "1px solid rgba(43,62,232,0.40)",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.50)",
                                    }}>
                                    <ChevronDown className="w-5 h-5" style={{ color: "rgba(220,230,255,0.90)" }} />
                                    {unreadInView > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                                            style={{ background: "#00CEC8", color: "#0B1228" }}>
                                            {unreadInView > 99 ? "99+" : unreadInView}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Reply preview (composer ustida) */}
                        {replyTo && (
                            <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
                                style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(11,18,40,0.65)" }}>
                                <Reply className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <div className="flex-1 min-w-0 pl-2 border-l-2" style={{ borderColor: "#00CEC8" }}>
                                    <p className="text-[11px] font-bold" style={{ color: "#00CEC8" }}>
                                        Javob: {replyTo.mine ? "o'zingizga" : "@" + (peer?.username ?? "foydalanuvchi")}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: "rgba(220,230,255,0.80)" }}>
                                        {replyTo.text || "(media xabar)"}
                                    </p>
                                </div>
                                <button onClick={() => setReplyTo(null)} title="Bekor"
                                    className="w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: "rgba(43,62,232,0.10)" }}>
                                    <X className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                </button>
                            </div>
                        )}

                        {/* Composer — Telegram uslubi */}
                        <div className="p-3 flex items-center gap-2 flex-shrink-0 relative"
                            style={{ borderTop: replyTo ? "none" : "1px solid rgba(43,62,232,0.14)", background: "rgba(8,12,32,0.55)" }}>
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
                                        onChange={e => {
                                            setInput(e.target.value);
                                            // Typing signal — 2 sekundda bir marta
                                            const now = Date.now();
                                            if (peer?.id && myProfileId && now - lastTypingSentRef.current > 2000) {
                                                sendTyping(peer.id, myProfileId, myName);
                                                lastTypingSentRef.current = now;
                                            }
                                        }}
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

            {/* Media galereya modali (o'ng panel'dagi rasmni bosilsa) */}
            {galleryIdx !== null && galleryImages.length > 0 && (
                <MediaGallery
                    images={galleryImages}
                    startIndex={galleryIdx}
                    onClose={() => setGalleryIdx(null)}
                />
            )}

            {/* ── COL 3 (kanal/guruh): Info paneli ─────────────── */}
            {selectedChannel && showInfo && (
                <NxChannelInfoPanel id={selectedChannel} />
            )}

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
                    <SharedMediaSection messages={messages} onOpen={i => setGalleryIdx(i)} />

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

            {/* Forward modali — qaysi suhbatga jo'natish */}
            {(forwardMsg || bulkForwardOpen) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => !forwarding && (setForwardMsg(null), setBulkForwardOpen(false))}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "80vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <Forward className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>
                                    {bulkForwardOpen ? `${selectedIds.size} ta xabarni kimga yuborish` : "Kimga yuborish"}
                                </p>
                            </div>
                            <button onClick={() => !forwarding && (setForwardMsg(null), setBulkForwardOpen(false))}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="p-3 border-b text-xs italic line-clamp-2" style={{ borderColor: "rgba(43,62,232,0.20)", color: "rgba(160,176,224,0.75)" }}>
                            {bulkForwardOpen
                                ? `${selectedIds.size} ta tanlangan xabar birga jo'natiladi`
                                : (forwardMsg?.text || (forwardMsg?.mediaType ? `[${forwardMsg.mediaType}]` : "(bo'sh)"))
                            }
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {convs.filter(c => c.other).length === 0 ? (
                                <p className="text-xs text-center py-6" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Suhbat topilmadi
                                </p>
                            ) : (
                                convs.map(c => (
                                    <button key={c.conversationId}
                                        onClick={() => bulkForwardOpen
                                            ? bulkForwardToConv(c.conversationId)
                                            : forwardToConv(c.conversationId)}
                                        disabled={forwarding}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition disabled:opacity-40 text-left">
                                        {c.other?.image
                                            ? <Image src={c.other.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>
                                                <BotIcon className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </div>
                                        }
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate" style={{ color: "rgba(220,230,255,0.95)" }}>
                                                {c.other?.name ?? c.other?.username ?? "Foydalanuvchi"}
                                            </p>
                                            {c.other?.username && (
                                                <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.65)" }}>
                                                    @{c.other.username}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        {forwarding && (
                            <div className="p-3 border-t flex items-center justify-center gap-2" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00CEC8" }} />
                                <span className="text-xs" style={{ color: "rgba(160,176,224,0.85)" }}>Yuborilmoqda...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reaksiya bergan foydalanuvchilar */}
            {reactionUsers && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setReactionUsers(null)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "70vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{reactionUsers.emoji}</span>
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>
                                    Reaksiya berganlar
                                </p>
                            </div>
                            <button onClick={() => setReactionUsers(null)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {reactionUsers.users === null ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} />
                                </div>
                            ) : reactionUsers.users.length === 0 ? (
                                <p className="text-xs text-center py-6" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Reaksiya topilmadi
                                </p>
                            ) : (
                                reactionUsers.users.map((u, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                                        {u.image
                                            ? <Image src={u.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>
                                                <BotIcon className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </div>
                                        }
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate" style={{ color: "rgba(220,230,255,0.95)" }}>
                                                {u.name ?? u.username ?? "Foydalanuvchi"}
                                                {u.mine && <span className="ml-1.5 text-[9px] font-bold" style={{ color: "#00CEC8" }}>(Siz)</span>}
                                            </p>
                                            {u.username && (
                                                <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.65)" }}>
                                                    @{u.username}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Umumiy media — suhbatdagi barcha rasmlar (grid 3x)
function SharedMediaSection({ messages, onOpen }: { messages: Msg[]; onOpen: (index: number) => void }) {
    const images = messages
        .filter(m => m.mediaType === "image" && m.mediaUrl);
    if (images.length === 0) return null;
    const displayed = images.slice(-9).reverse();
    // Original indexlarini saqlash — galery to'liq images bilan
    return (
        <div className="p-4 border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(140,160,210,0.55)" }}>
                Umumiy media ({images.length})
            </p>
            <div className="grid grid-cols-3 gap-1">
                {displayed.map(m => {
                    const idx = images.findIndex(x => x.id === m.id);
                    return (
                        <button key={m.id} onClick={() => onOpen(idx)}
                            className="aspect-square rounded-md overflow-hidden bg-white/[0.05] active:scale-95 transition">
                            <img src={m.mediaUrl!} alt="" className="w-full h-full object-cover" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Kanal/Guruh info paneli (4-ustunli desktop layout uchun)
interface ChannelInfo {
    id: string;
    type: "CHANNEL" | "GROUP";
    name: string;
    handle: string | null;
    description: string | null;
    avatarUrl: string | null;
    memberCount: number;
    isOwner: boolean;
    isMember: boolean;
}
interface ChannelMember {
    profileId: string;
    role: string;
    name: string | null;
    username: string | null;
    image: string | null;
    verified?: boolean;
}
function NxChannelInfoPanel({ id }: { id: string }) {
    const [info, setInfo] = useState<ChannelInfo | null>(null);
    const [members, setMembers] = useState<ChannelMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let stop = false;
        setLoading(true);
        setInfo(null);
        setMembers([]);
        (async () => {
            try {
                const d = await fetch(`/api/nexus/channels/${id}`).then(r => r.json());
                if (stop || !d?.channel) return;
                setInfo(d.channel);
                if (d.channel.isMember) {
                    const mr = await fetch(`/api/nexus/channels/${id}/members`).then(r => r.ok ? r.json() : null).catch(() => null);
                    if (!stop && mr?.members) setMembers(mr.members);
                }
            } finally {
                if (!stop) setLoading(false);
            }
        })();
        return () => { stop = true; };
    }, [id]);

    if (loading) {
        return (
            <div className="w-[320px] flex-shrink-0 flex items-center justify-center border-l"
                style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.65)" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} />
            </div>
        );
    }
    if (!info) return null;

    const avatar = info.avatarUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(info.name)}`;
    const kindLabel = info.type === "CHANNEL" ? "Kanal" : "Guruh";
    const KindIcon = info.type === "CHANNEL" ? Megaphone : Users;

    return (
        <div className="w-[320px] flex-shrink-0 flex flex-col border-l overflow-y-auto"
            style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.65)" }}>
            <div className="p-5 text-center border-b" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                <img src={avatar} alt="" className="w-24 h-24 rounded-3xl object-cover mx-auto mb-3 bg-white" />
                <p className="text-base font-black text-white truncate">{info.name}</p>
                {info.handle && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>@{info.handle}</p>
                )}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(0,206,200,0.12)", color: "#00CEC8" }}>
                    <KindIcon className="w-3 h-3" />
                    {kindLabel} · {info.memberCount} a&apos;zo
                </div>
            </div>
            {info.description && (
                <div className="p-4 border-b" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(140,160,210,0.55)" }}>Tavsif</p>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: "rgba(220,230,255,0.90)" }}>{info.description}</p>
                </div>
            )}
            {members.length > 0 && (
                <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(140,160,210,0.55)" }}>
                        A&apos;zolar ({members.length})
                    </p>
                    <div className="space-y-1">
                        {members.slice(0, 20).map(m => (
                            <div key={m.profileId} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04]">
                                {m.image
                                    ? <Image src={m.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                    : <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: "rgba(43,62,232,0.20)" }}>
                                        <BotIcon className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </div>
                                }
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold truncate flex items-center gap-1" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {m.name ?? m.username ?? "Foydalanuvchi"}
                                        {m.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {m.role === "OWNER" ? "Ega" : m.role === "ADMIN" ? "Admin" : "A'zo"}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {members.length > 20 && (
                            <p className="text-[10px] text-center mt-2" style={{ color: "rgba(140,160,210,0.50)" }}>
                                +{members.length - 20} boshqa a&apos;zo
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Media galereya modali — o'q bilan next/prev
function MediaGallery({
    images, startIndex, onClose,
}: {
    images: Array<{ mediaUrl?: string | null }>;
    startIndex: number;
    onClose: () => void;
}) {
    const [idx, setIdx] = useState(startIndex);
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setIdx(i => Math.min(images.length - 1, i + 1));
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [images.length, onClose]);
    const cur = images[idx];
    if (!cur?.mediaUrl) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }} onClick={onClose}>
            <button onClick={e => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.10)" }}>
                <X className="w-5 h-5 text-white" />
            </button>
            <div className="absolute top-4 left-4 text-xs text-white/70">
                {idx + 1} / {images.length}
            </div>
            {idx > 0 && (
                <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                    className="absolute left-4 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.10)" }}>
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
            )}
            {idx < images.length - 1 && (
                <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
                    className="absolute right-4 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.10)" }}>
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            )}
            <img src={cur.mediaUrl} alt=""
                className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg"
                onClick={e => e.stopPropagation()} />
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

// Ikki sana bir kunda ekanini tekshirish (mahalliy vaqt bo'yicha)
function isSameDay(a: string | Date, b: string | Date): boolean {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear()
        && da.getMonth() === db.getMonth()
        && da.getDate() === db.getDate();
}
// Chat ichidagi sana ajratkichi uchun matn (Bugun/Kecha/13 avgust)
function formatDateSeparator(iso: string | Date): string {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (target.getTime() === today.getTime()) return "Bugun";
    if (target.getTime() === yest.getTime()) return "Kecha";
    // Agar shu yilgi bo'lsa yilni yashirish
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString("uz-UZ", {
        day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }),
    });
}

// Fayl hajmini o'qish uchun qulay formatga o'girish
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
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
