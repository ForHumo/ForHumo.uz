"use client";

// Nexus Ijtimoiy — PC (lg+) uchun 3-ustunli Telegram uslubidagi layout.
// Chap: chatlar ro'yxati (+ papkalar tab). O'rta: tanlangan suhbat.
// O'ng: peer haqida ma'lumot (info paneli).
// Mobile'da bu komponent ishlatilmaydi — SocialView eski tabsni ko'rsatadi.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Send, Bot as BotIcon, Search, MessageSquare, Phone, Video, MoreVertical, BadgeCheck, X, Hash, Users, Megaphone, Paperclip, Wallet, MapPin, Mic, Smile, Trash2, Camera, BarChart2, Copy, Reply, Check, CheckCheck, Edit3, ChevronLeft, ChevronRight, Languages, FileIcon, Download, Forward, Pin, PinOff, Archive, ArchiveRestore, BellOff, Bell, Inbox, CheckSquare, Square, ChevronDown, Timer, Flame, Clock, Plus, Shield, ShieldOff, Volume2, VolumeX, Palette, Bookmark, BookmarkCheck, FileText, History } from "lucide-react";
import { NxChannelRoom } from "./nx-channels";
import { NxChannelCreateModal } from "./nx-channel-create-modal";
import { NxGroupCreateModal } from "./nx-group-create-modal";
import { isFounderProfile } from "@/lib/founders";
import { NxStatusModal } from "./nx-status-modal";
import { searchShortcodes } from "./nx-emoji-shortcodes";
import { NxMarkdown } from "./nx-markdown";
import { addWatermarkToImage } from "./nx-image-watermark";
import { pushSupported, getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";
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
    locUpdatedAt?: string | null;
    locExpiresAt?: string | null;
    replyTo?: { id: string; text: string; senderName: string | null; mine: boolean } | null;
    editedAt?: string | null;
    reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
    durationMs?: number | null;
    pinnedAt?: string | null;
    expiresAt?: string | null;
    scheduledFor?: string | null;
    bookmarked?: boolean;
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
    statusEmoji?: string | null;
    statusText?: string | null;
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
    const [channelsBump, setChannelsBump] = useState(0);

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
    const [searchResults, setSearchResults] = useState<Array<{ id: string; text: string; mine: boolean; createdAt: string; mediaType: string | null; mediaUrl: string | null }> | null>(null);
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchBusy, setSearchBusy] = useState(false);
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
    // Undo-send: 5 sekundlik grace period
    const [pendingSend, setPendingSend] = useState<{ text: string; replyToId: string | null; convId: string; ttl: number | null } | null>(null);
    const [undoTick, setUndoTick] = useState(5);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Self-destruct: keyingi xabar necha sekunddan keyin o'chsin (null = doimiy)
    const [nextTtl, setNextTtl] = useState<number | null>(null);
    const [ttlPickerOpen, setTtlPickerOpen] = useState(false);
    // Xabar jadvalga qo'yish
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleDateTime, setScheduleDateTime] = useState<string>("");
    // Yangi kanal/guruh yaratish modali
    const [createChannelOpen, setCreateChannelOpen] = useState<"CHANNEL" | "GROUP" | null>(null);
    // Push notif state
    const [pushState, setPushState] = useState<PushState>("unsupported");
    useEffect(() => {
        if (!pushSupported()) return;
        getPushState().then(setPushState).catch(() => {});
    }, []);
    async function togglePush() {
        if (pushState === "subscribed") {
            setPushState(await unsubscribePush());
        } else if (pushState === "denied") {
            alert("Bildirishnomalar bloklangan. Brauzer sozlamalaridan ruxsat berishingiz kerak.");
        } else {
            setPushState(await subscribePush());
        }
    }

    // Watermark toggle (rasm yuklashda avto qo'llaniladi)
    const [watermarkOn, setWatermarkOn] = useState<boolean>(false);
    useEffect(() => {
        try { setWatermarkOn(localStorage.getItem("nexus:dm:watermark") === "on"); } catch {}
    }, []);
    function toggleWatermark() {
        setWatermarkOn(v => {
            const nv = !v;
            try { localStorage.setItem("nexus:dm:watermark", nv ? "on" : "off"); } catch {}
            return nv;
        });
    }
    // Mening statusim modali + hozirgi status (session start'da yuklab olish)
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [myStatus, setMyStatus] = useState<{ emoji: string | null; text: string | null }>({ emoji: null, text: null });
    // Emoji shortcode autocomplete — composer'da :word yozganda popover
    const [emojiCode, setEmojiCode] = useState<string | null>(null);
    const [emojiCodeSuggestions, setEmojiCodeSuggestions] = useState<Array<{ code: string; emoji: string }>>([]);
    const [emojiCodeIdx, setEmojiCodeIdx] = useState(0);
    useEffect(() => {
        const el = composerInputRef.current;
        if (!el) return;
        const pos = el.selectionStart ?? input.length;
        const before = input.slice(0, pos);
        // Oxirgi bo'shliqdan boshlab :word (word ichida a-z, 0-9, _, +, -)
        const m = before.match(/(?:^|\s):([a-z0-9_+\-]{1,20})$/i);
        if (!m) { setEmojiCode(null); return; }
        setEmojiCode(m[1]);
        setEmojiCodeIdx(0);
    }, [input]);
    useEffect(() => {
        if (emojiCode === null) { setEmojiCodeSuggestions([]); return; }
        setEmojiCodeSuggestions(searchShortcodes(emojiCode, 8));
    }, [emojiCode]);
    function insertEmojiShortcode(emoji: string) {
        const el = composerInputRef.current;
        const pos = el?.selectionStart ?? input.length;
        const before = input.slice(0, pos);
        const after = input.slice(pos);
        const replaced = before.replace(/(?:^|\s):([a-z0-9_+\-]{1,20})$/i, (mm) => {
            const leading = mm.startsWith(" ") || mm.startsWith("\n") ? mm[0] : "";
            return `${leading}${emoji}`;
        });
        setInput(replaced + after);
        setEmojiCode(null);
        setTimeout(() => {
            const newPos = replaced.length;
            el?.focus();
            el?.setSelectionRange(newPos, newPos);
        }, 0);
    }

    // @mention autocomplete — composer'da @ yozganda popover
    interface MentionSuggestion { username: string; name: string | null; image: string | null }
    const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = yopiq
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
    const [mentionIdx, setMentionIdx] = useState(0);
    // Composer input o'zgarganda @ ni topish
    useEffect(() => {
        // Oxirgi bo'shliqdan boshlab "@" bilan boshlanadigan token
        const el = composerInputRef.current;
        if (!el) return;
        const pos = el.selectionStart ?? input.length;
        const before = input.slice(0, pos);
        const m = before.match(/(?:^|\s)@([a-z0-9_]{0,20})$/i);
        if (!m) { setMentionQuery(null); return; }
        setMentionQuery(m[1]);
        setMentionIdx(0);
    }, [input]);
    // Suggestion source: (1) hozirgi peer, (2) yaqin convs peerlari, (3) API qidiruv
    useEffect(() => {
        if (mentionQuery === null) { setMentionSuggestions([]); return; }
        const q = mentionQuery.toLowerCase();
        const local: MentionSuggestion[] = [];
        // Peer
        if (peer?.username && peer.username.toLowerCase().includes(q)) {
            local.push({ username: peer.username, name: peer.name, image: peer.image });
        }
        // Convs peerlari
        for (const c of convs) {
            if (!c.other?.username) continue;
            if (local.find(x => x.username === c.other!.username)) continue;
            if (c.other.username.toLowerCase().includes(q)) {
                local.push({ username: c.other.username, name: c.other.name, image: c.other.image });
            }
        }
        setMentionSuggestions(local.slice(0, 5));
        // Agar mahalliy natijalar oz bo'lsa API dan qo'shimcha izlash (2+ belgi)
        if (q.length >= 2 && local.length < 5) {
            const t = setTimeout(async () => {
                try {
                    const r = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}&type=users`, { cache: "no-store" });
                    if (!r.ok) return;
                    const d = await r.json();
                    const users = Array.isArray(d?.users) ? d.users : [];
                    setMentionSuggestions(prev => {
                        const merged = [...prev];
                        for (const u of users) {
                            if (!u.username || merged.find(x => x.username === u.username)) continue;
                            merged.push({ username: u.username, name: u.name ?? null, image: u.image ?? null });
                            if (merged.length >= 8) break;
                        }
                        return merged;
                    });
                } catch {}
            }, 250);
            return () => clearTimeout(t);
        }
    }, [mentionQuery, peer, convs]);

    function insertMention(username: string) {
        const el = composerInputRef.current;
        const pos = el?.selectionStart ?? input.length;
        const before = input.slice(0, pos);
        const after = input.slice(pos);
        const replaced = before.replace(/(?:^|\s)@[a-z0-9_]{0,20}$/i, (m) => {
            // @token bilan almashtiramiz
            const leading = m.startsWith(" ") || m.startsWith("\n") ? m[0] : "";
            return `${leading}@${username} `;
        });
        setInput(replaced + after);
        setMentionQuery(null);
        setTimeout(() => {
            const newPos = replaced.length;
            el?.focus();
            el?.setSelectionRange(newPos, newPos);
        }, 0);
    }

    // Klaviatura yorliqlari uchun ref'lar (composer va chat-list qidiruvga fokus qo'yish)
    const filterInputRef = useRef<HTMLInputElement | null>(null);
    const composerInputRef = useRef<HTMLInputElement | null>(null);
    const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
    // NOTE: useEffect'i return oldida (barcha state e'lonlaridan keyin) — TDZ oldini olish uchun

    // Chat statistika
    interface ChatStats {
        total: number; mineCount: number; peerCount: number;
        mediaCounts: Record<string, number>;
        reactionCount: number;
        firstDate: string | null;
        days: number; avgPerDay: number;
        topDay: { date: string; count: number } | null;
    }
    const [chatStats, setChatStats] = useState<ChatStats | null>(null);
    useEffect(() => {
        if (!selectedId || !showInfo) { setChatStats(null); return; }
        fetch(`/api/nexus/messages/${selectedId}/stats`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setChatStats(d); })
            .catch(() => {});
    }, [selectedId, showInfo]);

    // Chat mavzu (per-chat) — localStorage'da theme id saqlanadi
    const [chatTheme, setChatTheme] = useState<string>("default");
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const themeKey = (convId: string) => `nexus:dm:theme:${convId}`;
    // Chat almashinsa mavzuni tiklash
    useEffect(() => {
        if (!selectedId) return;
        try { setChatTheme(localStorage.getItem(themeKey(selectedId)) || "default"); }
        catch { setChatTheme("default"); }
    }, [selectedId]);
    function pickTheme(id: string) {
        if (!selectedId) return;
        setChatTheme(id);
        try {
            if (id === "default") localStorage.removeItem(themeKey(selectedId));
            else localStorage.setItem(themeKey(selectedId), id);
        } catch {}
        setThemePickerOpen(false);
    }
    useEffect(() => {
        if (!session?.user?.email) return;
        fetch("/api/user/profile").then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && (d.statusEmoji || d.statusText)) {
                    // Muddati tugagan bo'lsa ko'rsatmaymiz
                    const active = !d.statusExpiresAt || new Date(d.statusExpiresAt) > new Date();
                    setMyStatus({
                        emoji: active ? (d.statusEmoji ?? null) : null,
                        text: active ? (d.statusText ?? null) : null,
                    });
                }
            }).catch(() => {});
    }, [session?.user?.email]);
    // Xabar countdown taymer'i uchun soniyalar (har 1s'da yangilanadi)
    const [tickSec, setTickSec] = useState(0);
    useEffect(() => {
        const iv = setInterval(() => setTickSec(s => s + 1), 1000);
        return () => clearInterval(iv);
    }, []);
    // Forward: qaysi xabar forward qilinmoqda va uni qaysi suhbatga jo'natish
    const [forwardMsg, setForwardMsg] = useState<Msg | null>(null);
    const [forwarding, setForwarding] = useState(false);
    // Ommaviy forward rejimi (bir necha xabar birga)
    const [bulkForwardOpen, setBulkForwardOpen] = useState(false);
    // Reaksiya bergan foydalanuvchilar modali
    const [reactionUsers, setReactionUsers] = useState<{ messageId: string; emoji: string; users: Array<{ name: string | null; username: string | null; image: string | null; mine: boolean }> | null } | null>(null);
    // Tahrirlash tarixi modali
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyItems, setHistoryItems] = useState<Array<{ id: string; previousText: string; editedAt: string }>>([]);

    async function openHistory(msgId: string) {
        setHistoryModalOpen(true);
        setHistoryLoading(true);
        setHistoryItems([]);
        try {
            const r = await fetch(`/api/nexus/messages/${msgId}/history`);
            if (r.ok) {
                const d = await r.json();
                setHistoryItems(d.edits ?? []);
            }
        } finally {
            setHistoryLoading(false);
        }
    }
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

    // Yangi xabar tovushi — WebAudio API bilan (fayl yo'q — tozan sintez)
    const [soundOn, setSoundOn] = useState<boolean>(true);
    useEffect(() => {
        try { setSoundOn(localStorage.getItem("nexus:dm:sound") !== "off"); } catch {}
    }, []);
    function toggleSound() {
        setSoundOn(v => {
            const nv = !v;
            try { localStorage.setItem("nexus:dm:sound", nv ? "on" : "off"); } catch {}
            return nv;
        });
    }
    // Qisqa "tin" tovushi (500Hz sine, 100ms fade)
    function playNotifSound() {
        if (!soundOn) return;
        try {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.22);
            setTimeout(() => ctx.close().catch(() => {}), 300);
        } catch {}
    }
    // Suhbat ro'yxatidan yangi peer xabari kelganda tovush chalinishi.
    // convs.totalUnread yoki peer's lastMine=false + lastMessageAt o'zgarganda.
    const lastConvSigRef = useRef<string>("");
    useEffect(() => {
        // Signature: peer xabari (lastMine=false + hozirgi vaqtdan yaqin) va tab yashirin bo'lmasa
        const peerNew = convs.filter(c => !c.lastMine && !c.pinned);
        // Faqat 'lastMessageAt' vaqti bo'yicha eng yangi 5 tasi
        const sig = peerNew.slice(0, 5)
            .map(c => `${c.conversationId}:${c.lastMessageAt}`)
            .sort().join("|");
        if (lastConvSigRef.current && sig !== lastConvSigRef.current) {
            // Yangi xabar sezildi
            if (!document.hidden) playNotifSound();
        }
        lastConvSigRef.current = sig;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [convs]);

    // Xabar bookmark toggle
    async function toggleBookmark(m: Msg) {
        if (!selectedId) return;
        const now = !m.bookmarked;
        // Optimistic
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, bookmarked: now } : x));
        const url = `/api/nexus/messages/${selectedId}/bookmark${now ? "" : `?messageId=${m.id}`}`;
        const opts: RequestInit = now
            ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id }) }
            : { method: "DELETE" };
        const r = await fetch(url, opts);
        if (!r.ok) {
            // Rollback
            setMessages(prev => prev.map(x => x.id === m.id ? { ...x, bookmarked: !now } : x));
        }
    }

    // Saqlangan xabarlar paneli (DM + kanal)
    interface BookmarkItem {
        id: string;
        kind: "dm" | "channel";
        messageId: string;
        conversationId?: string;
        channelId?: string;
        note: string | null;
        createdAt: string;
        message: { text: string | null; mine: boolean; createdAt: string; mediaType: string | null; mediaUrl: string | null };
        peer?: { name: string | null; username: string | null; image: string | null } | null;
        channel?: { name: string; type: "CHANNEL" | "GROUP"; handle: string | null; image: string | null } | null;
    }
    const [bookmarksOpen, setBookmarksOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [bookmarksLoading, setBookmarksLoading] = useState(false);
    async function loadBookmarks() {
        setBookmarksLoading(true);
        try {
            const r = await fetch("/api/nexus/bookmarks", { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setBookmarks(d.bookmarks ?? []);
            }
        } finally { setBookmarksLoading(false); }
    }
    useEffect(() => { if (bookmarksOpen) loadBookmarks(); }, [bookmarksOpen]);

    // Draftlar paneli — barcha chatlardagi mavjud draftlar (localStorage aggregate)
    interface DraftItem {
        kind: "dm" | "channel";
        id: string;                  // convId yoki channelId
        text: string;
        peer?: { name: string | null; username: string | null; image: string | null } | null;
        channel?: { id: string; name?: string } | null;
    }
    const [draftsOpen, setDraftsOpen] = useState(false);
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const DRAFT_PREFIX = "nexus:dm:draft:";
    const CH_DRAFT_PREFIX = "nexus:ch:draft:";
    function loadDrafts() {
        try {
            const items: DraftItem[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (k.startsWith(DRAFT_PREFIX)) {
                    const convId = k.slice(DRAFT_PREFIX.length);
                    const text = localStorage.getItem(k)?.trim();
                    if (!text) continue;
                    const c = convs.find(x => x.conversationId === convId);
                    items.push({
                        kind: "dm", id: convId, text,
                        peer: c?.other ? { name: c.other.name, username: c.other.username, image: c.other.image } : null,
                    });
                } else if (k.startsWith(CH_DRAFT_PREFIX)) {
                    const chId = k.slice(CH_DRAFT_PREFIX.length);
                    const text = localStorage.getItem(k)?.trim();
                    if (!text) continue;
                    const c = channels.find(x => x.id === chId);
                    items.push({
                        kind: "channel", id: chId, text,
                        channel: c ? { id: chId, name: c.name } : { id: chId },
                    });
                }
            }
            setDrafts(items);
        } catch {
            setDrafts([]);
        }
    }
    useEffect(() => { if (draftsOpen) loadDrafts(); }, [draftsOpen, convs]);
    // Draft'ni o'chirish (DM yoki kanal)
    function deleteDraft(d: DraftItem) {
        try {
            if (d.kind === "dm") {
                localStorage.removeItem(DRAFT_PREFIX + d.id);
                if (d.id === selectedId) setInput("");
            } else {
                localStorage.removeItem(CH_DRAFT_PREFIX + d.id);
            }
        } catch {}
        setDrafts(prev => prev.filter(x => x.id !== d.id || x.kind !== d.kind));
    }
    // Jami draft soni (chat list badge uchun) — DM + kanal
    const [draftCount, setDraftCount] = useState(0);
    useEffect(() => {
        try {
            let n = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                if ((k.startsWith(DRAFT_PREFIX) || k.startsWith(CH_DRAFT_PREFIX))
                    && localStorage.getItem(k)?.trim()) n++;
            }
            setDraftCount(n);
        } catch {}
    }, [input, selectedId, draftsOpen]);

    // TTS: xabar matnini ovoz bilan eshittirish (Web Speech API — brauzer o'zi)
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    function speakMessage(messageId: string, text: string) {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            alert("Sizning brauzeringiz ovozli eshittirishni qo'llab-quvvatlamaydi");
            return;
        }
        // Agar shu xabar o'qilayotgan bo'lsa — to'xtatish
        if (speakingId === messageId) {
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }
        // Boshqa xabar ochiq bo'lsa — birinchi to'xtatish
        window.speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(text);
        // Til taxmini: kirill harflar → ruscha, cheks/lotin ko'proq bo'lsa uz/en
        const cyr = /[а-яё]/i.test(text);
        u.lang = cyr ? "ru-RU" : "en-US"; // O'zbekcha TTS Chrome'da yo'q — inglizcha fonetikada
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onend = () => setSpeakingId(null);
        u.onerror = () => setSpeakingId(null);
        setSpeakingId(messageId);
        window.speechSynthesis.speak(u);
    }
    // Sahifa tark etilsa — o'qishni to'xtatish
    useEffect(() => () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

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
        // Watermark: yoqilgan va rasm bo'lsa (session'da o'z username bilan)
        if (watermarkOn && file.type.startsWith("image/") && myProfileId) {
            try {
                // Username'ni session'dan olamiz — availableProfile ehtimoli bo'lmasa @user
                const wmText = `@${session?.user?.email?.split("@")[0] ?? "user"} · ForHumo.uz`;
                file = await addWatermarkToImage(file, wmText);
            } catch { /* watermark fail — original bilan davom */ }
        }
        setUploading(true);
        setUploadInfo({ name: file.name, size: file.size, progress: 0 });
        try {
            // Katta faylni Vercel Blob orqali (client upload)
            const { upload } = await import("@vercel/blob/client");
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nx-dm/${selectedId}/${Date.now()}-${safeName}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: (e) => {
                    // e.percentage: 0..100 (Vercel blob client-side hodisasi)
                    setUploadInfo(prev => prev ? { ...prev, progress: Math.round(e.percentage) } : prev);
                },
            });
            const kind = overrideKind ?? (file.type.startsWith("image/") ? "image"
                : file.type.startsWith("video/") ? "video"
                : file.type.startsWith("audio/") ? "audio"
                : "file");
            // Reply rejim ochiq bo'lsa — media xabarga replyToId biriktiriladi
            const replyToIdSnap = replyTo?.id ?? null;
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: "", mediaUrl: blob.url, mediaType: kind, mediaMime: file.type,
                    mediaName: file.name, mediaSize: file.size,
                    ...(replyToIdSnap ? { replyToId: replyToIdSnap } : {}),
                }),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                if (replyToIdSnap) setReplyTo(null); // yuborilgach reply preview yopiladi
                loadConvs();
            }
        } catch (e) {
            alert("Yuklab bo'lmadi: " + (e instanceof Error ? e.message : "xato"));
        } finally { setUploading(false); setUploadInfo(null); }
    }
    const [uploadInfo, setUploadInfo] = useState<{ name: string; size: number; progress: number } | null>(null);

    async function sendLocation(liveMinutes?: number) {
        if (!selectedId || locBusy) return;
        setLocBusy(true);
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
            );
            const body: Record<string, unknown> = {
                text: "", mediaType: "location",
                locLat: pos.coords.latitude, locLng: pos.coords.longitude,
            };
            if (liveMinutes && liveMinutes > 0) {
                body.locExpiresAt = new Date(Date.now() + liveMinutes * 60 * 1000).toISOString();
            }
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                loadConvs();
            }
        } catch {
            alert("Joylashuvni olib bo'lmadi");
        } finally { setLocBusy(false); setLocationPickerOpen(false); }
    }

    // Jonli joylashuv — muddat tugagunicha har 30 sekundda pozitsiyani yangilash
    const liveLocationTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
    useEffect(() => {
        // O'zim jo'natgan va hali muddati o'tmagan barcha jonli joylashuvlar uchun
        const now = Date.now();
        for (const m of messages) {
            if (!m.mine || m.mediaType !== "location" || !m.locExpiresAt) continue;
            const expMs = new Date(m.locExpiresAt).getTime();
            if (expMs <= now) continue;
            if (liveLocationTimersRef.current.has(m.id)) continue;
            const iv = setInterval(async () => {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
                    );
                    if (!selectedId) return;
                    await fetch(`/api/nexus/messages/${selectedId}/live-location`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ messageId: m.id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    });
                } catch { /* muvaffaqiyatsiz — keyingi urinishga */ }
            }, 30_000);
            liveLocationTimersRef.current.set(m.id, iv);
            // Muddati tugaganda taymer'ni to'xtatish
            const delay = Math.max(0, expMs - now);
            setTimeout(() => {
                const t = liveLocationTimersRef.current.get(m.id);
                if (t) { clearInterval(t); liveLocationTimersRef.current.delete(m.id); }
            }, delay);
        }
        // Suhbat almashinsa — barcha taymerlarni to'xtatish
        return () => {
            // Muhim: cleanup faqat komponent unmount'da chaqirilishi kerak,
            // messages o'zgarishida emas — shuning uchun to'liq cleanup pastdagi effektda
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, selectedId]);
    useEffect(() => () => {
        const timers = liveLocationTimersRef.current;
        for (const t of timers.values()) clearInterval(t);
        timers.clear();
    }, []);

    // Jonli joylashuvni to'xtatish (o'z xabari)
    async function stopLiveLocation(messageId: string) {
        if (!selectedId) return;
        if (!confirm("Jonli joylashuvni to'xtatasizmi?")) return;
        const r = await fetch(`/api/nexus/messages/${selectedId}/live-location?messageId=${messageId}`, { method: "DELETE" });
        if (r.ok) {
            const iv = liveLocationTimersRef.current.get(messageId);
            if (iv) { clearInterval(iv); liveLocationTimersRef.current.delete(messageId); }
            // Optimistik: locExpiresAt = now
            setMessages(prev => prev.map(x => x.id === messageId ? { ...x, locExpiresAt: new Date().toISOString() } : x));
        }
    }

    const [locationPickerOpen, setLocationPickerOpen] = useState(false);

    // Group/Channel listni yuklash
    useEffect(() => {
        if (listTab === "dm") return;
        const type = listTab === "groups" ? "GROUP" : "CHANNEL";
        setLoadingChannels(true);
        fetch(`/api/nexus/channels?scope=mine&type=${type}`)
            .then(r => r.ok ? r.json() : { channels: [] })
            .then(d => setChannels(d.channels ?? []))
            .finally(() => setLoadingChannels(false));
    }, [listTab, channelsBump]);

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
                        statusEmoji: d.other.statusEmoji ?? null,
                        statusText: d.other.statusText ?? null,
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

    // Server-side qidiruv (debounced 300ms)
    useEffect(() => {
        if (!searchOpen || !selectedId) { setSearchResults(null); setSearchTotal(0); return; }
        const q = searchQuery.trim();
        if (q.length < 2) { setSearchResults(null); setSearchTotal(0); return; }
        setSearchBusy(true);
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/nexus/messages/${selectedId}/search?q=${encodeURIComponent(q)}&limit=50`, { cache: "no-store" });
                if (r.ok) {
                    const d = await r.json();
                    setSearchResults(d.results ?? []);
                    setSearchTotal(d.total ?? 0);
                }
            } finally { setSearchBusy(false); }
        }, 300);
        return () => { clearTimeout(t); };
    }, [searchQuery, searchOpen, selectedId]);

    function jumpToMessage(messageId: string) {
        const el = document.querySelector<HTMLElement>(`[data-msg-id="${messageId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.animate([
                { background: "rgba(0,206,200,0.20)" }, { background: "transparent" },
            ], { duration: 1400, iterations: 1 });
        } else {
            // Xabar joriy 100'da yo'q — thread'ni qayta yuklab, keyin izlab topamiz
            alert("Bu xabar hozirgi ko'rinishda emas — biroz yuqoriga aylantirib ko'ring");
        }
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

    // Jadvalga qo'yish (kelajakdagi vaqt) — undo-send bypass qilinadi
    async function scheduleSend() {
        if (!selectedId || !input.trim()) return;
        if (!scheduleDateTime) { alert("Sana/vaqtni tanlang"); return; }
        const iso = new Date(scheduleDateTime).toISOString();
        const text = input.trim();
        const replyToIdSnap = replyTo?.id ?? null;
        try {
            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, replyToId: replyToIdSnap, scheduledFor: iso }),
            });
            if (r.ok) {
                const d = await r.json();
                setMessages(m => [...m, d.message]);
                setInput("");
                try { localStorage.removeItem(draftKey(selectedId)); } catch {}
                setReplyTo(null);
                setScheduleOpen(false);
                setScheduleDateTime("");
                loadConvs();
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Jadvalga qo'yib bo'lmadi");
            }
        } catch {
            alert("Xato — qayta urinib ko'ring");
        }
    }

    // Jadvalga qo'yilgan xabarni bekor qilish (o'chirish)
    async function cancelScheduled(m: Msg) {
        if (!selectedId) return;
        if (!confirm("Jadvalga qo'yilgan xabarni bekor qilasizmi?")) return;
        const r = await fetch(`/api/nexus/messages/${selectedId}?messageId=${m.id}`, { method: "DELETE" });
        if (r.ok) setMessages(prev => prev.filter(x => x.id !== m.id));
    }

    // Bosishga 5s'lik "undo" bufferini boshlaydi. Aslida POST 5s'dan keyin ketadi.
    function send() {
        if (!selectedId || !input.trim() || sending || pendingSend) return;
        const text = input.trim();
        const replyToIdSnap = replyTo?.id ?? null;
        setInput("");
        try { localStorage.removeItem(draftKey(selectedId)); } catch {}
        setReplyTo(null);
        setPendingSend({ text, replyToId: replyToIdSnap, convId: selectedId, ttl: nextTtl });
        setUndoTick(5);
        // Har sekundda hisoblagichni yangilash
        undoIntervalRef.current = setInterval(() => setUndoTick(t => Math.max(0, t - 1)), 1000);
        // 5s'dan keyin yuborish
        undoTimerRef.current = setTimeout(() => flushPending(), 5000);
    }
    async function flushPending() {
        const p = pendingSend;
        if (undoIntervalRef.current) { clearInterval(undoIntervalRef.current); undoIntervalRef.current = null; }
        if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
        setPendingSend(null);
        if (!p) return;
        setSending(true);
        setNextTtl(null);
        try {
            const body: Record<string, unknown> = { text: p.text };
            if (p.replyToId) body.replyToId = p.replyToId;
            if (p.ttl) body.selfDestructSeconds = p.ttl;
            const r = await fetch(`/api/nexus/messages/${p.convId}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            if (r.ok) {
                const d = await r.json();
                // Faqat shu suhbat ochilgan bo'lsa xabarni ko'rsatamiz
                if (p.convId === selectedId) setMessages(m => [...m, d.message]);
                loadConvs();
            }
        } finally { setSending(false); }
    }
    function cancelPending() {
        if (undoIntervalRef.current) { clearInterval(undoIntervalRef.current); undoIntervalRef.current = null; }
        if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
        // Matnni kompozitorga qaytarish
        if (pendingSend) setInput(pendingSend.text);
        setPendingSend(null);
    }
    // Enter yoki send ustidan yangi xabar kelsa: darhol jo'natish (yig'ilib qolmasin)
    useEffect(() => () => {
        if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }, []);

    // Klaviatura yorliqlari (barcha state e'lonlaridan keyin — TDZ oldini olish)
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const inField = !!target && (
                target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
            );

            // Esc: modallar/panellar yopilishi
            if (e.key === "Escape") {
                if (historyModalOpen) { setHistoryModalOpen(false); return; }
                if (statusModalOpen) { setStatusModalOpen(false); return; }
                if (themePickerOpen) { setThemePickerOpen(false); return; }
                if (createChannelOpen) { setCreateChannelOpen(null); return; }
                if (shortcutsHelpOpen) { setShortcutsHelpOpen(false); return; }
                if (galleryIdx !== null) { setGalleryIdx(null); return; }
                if (forwardMsg || bulkForwardOpen) { setForwardMsg(null); setBulkForwardOpen(false); return; }
                if (reactionUsers) { setReactionUsers(null); return; }
                if (selectMode) { exitSelectMode(); return; }
                if (searchOpen) { setSearchOpen(false); setSearchQuery(""); return; }
                if (replyTo) { setReplyTo(null); return; }
                if (editingId) { setEditingId(null); return; }
            }

            const mod = e.ctrlKey || e.metaKey;

            if (mod && (e.key === "k" || e.key === "K")) {
                e.preventDefault();
                filterInputRef.current?.focus();
                filterInputRef.current?.select();
                return;
            }
            if (mod && (e.key === "f" || e.key === "F") && selectedId) {
                e.preventDefault();
                setSearchOpen(true);
                return;
            }
            if (mod && e.key === "/") {
                e.preventDefault();
                setShortcutsHelpOpen(v => !v);
                return;
            }
            // ArrowUp: oxirgi o'z matn xabarini tahrirlash (composer bo'sh yoki input tashqarisida)
            if (!inField || (target === composerInputRef.current && !input)) {
                if (e.key === "ArrowUp" && selectedId && !editingId) {
                    const last = [...messages].reverse().find(m => m.mine && m.text && !m.mediaType);
                    if (last) {
                        e.preventDefault();
                        setEditingId(last.id);
                        setEditingText(last.text);
                    }
                }
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [
        selectedId, searchOpen, replyTo, editingId, selectMode, forwardMsg, bulkForwardOpen,
        reactionUsers, historyModalOpen, galleryIdx, statusModalOpen, themePickerOpen, createChannelOpen,
        shortcutsHelpOpen, messages, input,
    ]);

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
                {/* Tab bar: DM | Groups | Channels + Plus (new) */}
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
                    {listTab !== "dm" && (
                        <button
                            onClick={() => setCreateChannelOpen(listTab === "groups" ? "GROUP" : "CHANNEL")}
                            title={`Yangi ${listTab === "groups" ? "guruh" : "kanal"}`}
                            className="w-9 flex-shrink-0 flex items-center justify-center rounded-lg transition"
                            style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.30)" }}>
                            <Plus className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        </button>
                    )}
                    {(() => {
                        const su = session?.user as { username?: string | null; humoId?: string | null } | undefined;
                        return isFounderProfile({ username: su?.username ?? null, humoId: su?.humoId ?? null });
                    })() && (
                        <Link href="/nexus/admin"
                            title="Nexus admin"
                            className="w-9 flex-shrink-0 flex items-center justify-center rounded-lg transition"
                            style={{ background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.35)" }}>
                            <Shield className="w-4 h-4" style={{ color: "#F59E0B" }} />
                        </Link>
                    )}
                </div>

                {listTab === "dm" && (
                    <div className="p-3 flex-shrink-0 space-y-2" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: "rgba(140,160,210,0.50)" }} />
                            <input
                                ref={filterInputRef}
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Qidirish... (Ctrl+K)"
                                className="w-full h-9 pl-9 pr-3 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
                            />
                        </div>
                        {/* Mening statusim */}
                        <button onClick={() => setStatusModalOpen(true)}
                            className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg transition hover:bg-white/[0.04] text-left"
                            style={{
                                background: myStatus.emoji || myStatus.text ? "rgba(0,206,200,0.08)" : "rgba(43,62,232,0.06)",
                                border: `1px solid ${myStatus.emoji || myStatus.text ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                            }}>
                            <span className="text-base flex-shrink-0">{myStatus.emoji || "✨"}</span>
                            <span className="text-[11px] truncate flex-1" style={{ color: myStatus.text ? "#00CEC8" : "rgba(140,160,210,0.75)" }}>
                                {myStatus.text || "Maxsus status qo'shish"}
                            </span>
                        </button>
                        {/* Bookmark + Drafts + Sound toggle */}
                        <div className="flex gap-1">
                            <button onClick={() => setBookmarksOpen(v => !v)}
                                className="flex-1 flex items-center gap-1.5 h-8 px-2 rounded-lg transition hover:bg-white/[0.04]"
                                style={{
                                    background: bookmarksOpen ? "rgba(245,158,11,0.10)" : "rgba(43,62,232,0.06)",
                                    border: `1px solid ${bookmarksOpen ? "rgba(245,158,11,0.30)" : "rgba(43,62,232,0.15)"}`,
                                }}
                                title="Saqlangan xabarlar">
                                <BookmarkCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: bookmarksOpen ? "#F59E0B" : "rgba(160,176,224,0.85)" }} />
                                <span className="text-[10px] font-bold" style={{ color: bookmarksOpen ? "#F59E0B" : "rgba(220,230,255,0.85)" }}>Saqlangan</span>
                            </button>
                            <button onClick={() => setDraftsOpen(v => !v)}
                                className="flex-1 flex items-center gap-1.5 h-8 px-2 rounded-lg transition hover:bg-white/[0.04]"
                                style={{
                                    background: draftsOpen ? "rgba(0,206,200,0.10)" : "rgba(43,62,232,0.06)",
                                    border: `1px solid ${draftsOpen ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                                }}
                                title="Draftlar">
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: draftsOpen ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                                <span className="text-[10px] font-bold" style={{ color: draftsOpen ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>
                                    Draft{draftCount > 0 ? ` (${draftCount})` : ""}
                                </span>
                            </button>
                            <button onClick={toggleSound}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:bg-white/[0.04]"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.15)" }}
                                title={soundOn ? "Tovushni o'chirish" : "Tovushni yoqish"}>
                                {soundOn
                                    ? <Volume2 className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    : <VolumeX className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                                }
                            </button>
                            <button onClick={toggleWatermark}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:bg-white/[0.04]"
                                style={{
                                    background: watermarkOn ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.06)",
                                    border: `1px solid ${watermarkOn ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                                }}
                                title={watermarkOn ? "Watermark yoqilgan — rasmga @username qo'shiladi" : "Watermark o'chirilgan"}>
                                <span className="text-[9px] font-black" style={{ color: watermarkOn ? "#00CEC8" : "rgba(160,176,224,0.85)" }}>WM</span>
                            </button>
                            {pushState !== "unsupported" && (
                                <button onClick={togglePush}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:bg-white/[0.04]"
                                    style={{
                                        background: pushState === "subscribed" ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.06)",
                                        border: `1px solid ${pushState === "subscribed" ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                                    }}
                                    title={pushState === "subscribed" ? "Push bildirishnoma yoqilgan" : pushState === "denied" ? "Push bloklangan" : "Push bildirishnomani yoqish"}>
                                    {pushState === "subscribed"
                                        ? <Bell className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                        : <BellOff className="w-3.5 h-3.5" style={{ color: pushState === "denied" ? "#EF4444" : "rgba(160,176,224,0.85)" }} />
                                    }
                                </button>
                            )}
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
                style={{ background: (selectedId && !selectedChannel) ? (CHAT_THEMES[chatTheme] ?? CHAT_THEMES.default).bg : "rgba(11,18,40,0.35)" }}>
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
                                <p className="text-[11px] flex items-center gap-1" style={{ color: peerTyping ? "#00CEC8" : "rgba(140,160,210,0.70)" }}>
                                    {peerTyping
                                        ? "yozmoqda..."
                                        : (peer?.statusEmoji || peer?.statusText)
                                            ? <><span>{peer.statusEmoji}</span><span className="truncate">{peer.statusText}</span></>
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
                                        <button onClick={() => { setThemePickerOpen(true); setMoreOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            <Palette className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Chat mavzu
                                        </button>
                                        <button onClick={() => { setShortcutsHelpOpen(true); setMoreOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            <span className="w-4 h-4 flex items-center justify-center text-[9px] font-black rounded" style={{ background: "rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.85)" }}>?</span>
                                            Yorliqlar (Ctrl+/)
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
                                        <button onClick={async () => {
                                            if (!selectedId) return;
                                            if (!confirm("Chatni tozalasizmi? Sizga xabarlar ko'rinmaydi (u kishida qoladi)")) return;
                                            const r = await fetch(`/api/nexus/messages/${selectedId}/clear`, { method: "POST" });
                                            if (r.ok) { setMessages([]); loadConvs(); setMoreOpen(false); }
                                        }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/[0.05] text-left"
                                            style={{ color: "rgba(220,230,255,0.90)" }}>
                                            <Trash2 className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Chatni tozalash
                                        </button>
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
                            <div className="flex-shrink-0"
                                style={{ borderBottom: "1px solid rgba(43,62,232,0.14)", background: "rgba(11,18,40,0.55)" }}>
                                <div className="px-4 py-2 flex items-center gap-2">
                                    <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.60)" }} />
                                    <input
                                        autoFocus
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Suhbatda qidirish (kamida 2 belgi)..."
                                        className="flex-1 h-8 bg-transparent text-white text-sm focus:outline-none"
                                    />
                                    {searchBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00CEC8" }} />}
                                    {searchQuery.trim().length >= 2 && !searchBusy && (
                                        <span className="text-[11px] font-bold" style={{ color: "rgba(140,160,210,0.85)" }}>
                                            {searchTotal} natija
                                        </span>
                                    )}
                                </div>
                                {/* Natijalar ro'yxati (server-side, 50 tagacha) */}
                                {searchResults && searchResults.length > 0 && (
                                    <div className="max-h-64 overflow-y-auto border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                                        {searchResults.map(r => (
                                            <button key={r.id} onClick={() => jumpToMessage(r.id)}
                                                className="w-full text-left px-4 py-2 border-b hover:bg-white/[0.04] transition"
                                                style={{ borderColor: "rgba(43,62,232,0.08)" }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                                        style={{ background: r.mine ? "rgba(43,62,232,0.20)" : "rgba(0,206,200,0.15)", color: r.mine ? "rgba(180,195,235,0.90)" : "#00CEC8" }}>
                                                        {r.mine ? "Siz" : "Peer"}
                                                    </span>
                                                    <span className="text-[10px] tabular-nums" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                        {new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-1 line-clamp-2" style={{ color: "rgba(220,230,255,0.90)" }}>
                                                    {highlightText(r.text ?? (r.mediaType ? `[${r.mediaType}]` : ""), searchQuery)}
                                                </p>
                                            </button>
                                        ))}
                                        {searchTotal > searchResults.length && (
                                            <p className="text-[10px] text-center py-2" style={{ color: "rgba(140,160,210,0.55)" }}>
                                                +{searchTotal - searchResults.length} boshqa natija — aniqroq qidiruv yozing
                                            </p>
                                        )}
                                    </div>
                                )}
                                {searchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !searchBusy && (
                                    <p className="px-4 py-3 text-xs text-center" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        Hech narsa topilmadi
                                    </p>
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
                                    const next = i < list.length - 1 ? list[i + 1] : null;
                                    const showDate = !prev || !isSameDay(prev.createdAt, m.createdAt);
                                    const dateLabel = showDate ? formatDateSeparator(m.createdAt) : null;
                                    // Xabar guruhlash: bir muallif + 5 daqiqa ichida
                                    const GROUP_MS = 5 * 60 * 1000;
                                    const groupWithPrev = !!prev && prev.mine === m.mine
                                        && !dateLabel
                                        && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS);
                                    const groupWithNext = !!next && next.mine === m.mine
                                        && isSameDay(m.createdAt, next.createdAt)
                                        && (new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() < GROUP_MS);
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
                                    style={{
                                        ...(selectedIds.has(m.id) ? { background: "rgba(0,206,200,0.10)" } : {}),
                                        // Guruh ichida yuqori marginni kamaytiramiz (bir-biriga yaqin)
                                        marginTop: groupWithPrev ? -6 : undefined,
                                    }}>
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
                                        <button onClick={() => toggleBookmark(m)}
                                            title={m.bookmarked ? "Saqlashdan olib tashlash" : "Saqlash"}
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{
                                                background: m.bookmarked ? "rgba(245,158,11,0.18)" : "rgba(11,18,40,0.65)",
                                                border: `1px solid ${m.bookmarked ? "rgba(245,158,11,0.40)" : "rgba(43,62,232,0.25)"}`,
                                            }}>
                                            {m.bookmarked
                                                ? <BookmarkCheck className="w-3 h-3" style={{ color: "#F59E0B" }} />
                                                : <Bookmark className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
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
                                                <button onClick={() => speakMessage(m.id, m.text)}
                                                    title={speakingId === m.id ? "To'xtatish" : "Eshittirish"}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center"
                                                    style={{
                                                        background: speakingId === m.id ? "rgba(0,206,200,0.20)" : "rgba(11,18,40,0.65)",
                                                        border: `1px solid ${speakingId === m.id ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.25)"}`,
                                                    }}>
                                                    {speakingId === m.id
                                                        ? <VolumeX className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                                        : <Volume2 className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                    }
                                                </button>
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
                                    <div className="max-w-[70%] px-3.5 py-2 text-sm whitespace-pre-wrap break-words"
                                        style={{
                                            ...(m.mine
                                                ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff" }
                                                : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)" }
                                            ),
                                            // Guruhlash: yuqori/pastki burchak radius'i mos ravishda yumshoq
                                            borderTopLeftRadius:  m.mine ? 16 : (groupWithPrev ? 4 : 16),
                                            borderTopRightRadius: m.mine ? (groupWithPrev ? 4 : 16) : 16,
                                            borderBottomLeftRadius:  m.mine ? 16 : (groupWithNext ? 4 : 6),
                                            borderBottomRightRadius: m.mine ? (groupWithNext ? 4 : 6) : 16,
                                        }}>
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
                                                <NxVoicePlayer src={m.mediaUrl} mine={m.mine} seed={m.id} initialDurationMs={m.durationMs} enableTranscribe />
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
                                        {m.mediaType === "location" && typeof m.locLat === "number" && typeof m.locLng === "number" && (() => {
                                            void tickSec; // sekundlik re-render
                                            const isLive = !!m.locExpiresAt;
                                            const expMs = m.locExpiresAt ? new Date(m.locExpiresAt).getTime() : 0;
                                            const active = isLive && expMs > Date.now();
                                            const leftSec = active ? Math.floor((expMs - Date.now()) / 1000) : 0;
                                            const leftLabel = leftSec >= 60 ? `${Math.floor(leftSec / 60)} daq` : `${leftSec}s`;
                                            const updated = m.locUpdatedAt ? Math.floor((Date.now() - new Date(m.locUpdatedAt).getTime()) / 1000) : 0;
                                            const updatedLabel = updated < 60 ? `${updated}s oldin` : updated < 3600 ? `${Math.floor(updated / 60)} daq oldin` : `${Math.floor(updated / 3600)} soat oldin`;
                                            return (
                                                <div className="mb-1 rounded-lg overflow-hidden"
                                                    style={{
                                                        background: m.mine ? "rgba(255,255,255,0.10)" : "rgba(0,206,200,0.08)",
                                                        border: active ? `1px solid ${m.mine ? "rgba(255,255,255,0.25)" : "rgba(0,206,200,0.40)"}` : undefined,
                                                    }}>
                                                    <a href={`https://www.google.com/maps?q=${m.locLat},${m.locLng}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-3"
                                                        style={{ textDecoration: "none" }}>
                                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                                                            style={{ background: m.mine ? "rgba(255,255,255,0.15)" : "rgba(0,206,200,0.20)" }}>
                                                            <MapPin className="w-4 h-4" style={{ color: m.mine ? "#fff" : "#00CEC8" }} />
                                                            {active && (
                                                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
                                                                    style={{ background: "#00CEC8", boxShadow: "0 0 6px #00CEC8" }} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold flex items-center gap-1.5">
                                                                {active ? "Jonli joylashuv" : isLive ? "Jonli — tugagan" : "Joylashuv"}
                                                                {active && (
                                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                                        style={{ background: m.mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.25)", color: m.mine ? "#fff" : "#00CEC8" }}>
                                                                        {leftLabel}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] opacity-75">
                                                                {active && m.locUpdatedAt
                                                                    ? `Yangilangan: ${updatedLabel}`
                                                                    : "Google Maps'da ochish"}
                                                            </p>
                                                        </div>
                                                    </a>
                                                    {active && m.mine && (
                                                        <button onClick={() => stopLiveLocation(m.id)}
                                                            className="w-full py-1.5 text-[10px] font-black uppercase tracking-wider border-t"
                                                            style={{
                                                                background: "rgba(239,68,68,0.10)",
                                                                borderColor: m.mine ? "rgba(255,255,255,0.15)" : "rgba(0,206,200,0.15)",
                                                                color: "#EF4444",
                                                            }}>
                                                            To&apos;xtatish
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
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
                                                {searchOpen && searchQuery.trim()
                                                    ? highlightText(m.text, searchQuery)
                                                    : <NxMarkdown text={m.text} />}
                                                {m.editedAt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openHistory(m.id)}
                                                        className="ml-1.5 text-[10px] opacity-60 hover:opacity-100 hover:underline italic cursor-pointer inline-flex items-center gap-0.5 transition"
                                                        style={{ color: "#00CEC8" }}
                                                        title="Tahrirlash tarixini ko'rish"
                                                    >
                                                        (tahrirlangan)
                                                    </button>
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
                                        {/* Jadvalda turgan xabar belgi (faqat egasiga ko'rinadi) */}
                                        {m.scheduledFor && (
                                            <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md"
                                                style={{ background: "rgba(43,62,232,0.20)", border: "1px dashed rgba(0,206,200,0.40)" }}>
                                                <Clock className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                                <span className="text-[10px] font-black" style={{ color: "#00CEC8" }}>
                                                    Jadvalda: {new Date(m.scheduledFor).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                <button onClick={(e) => { e.stopPropagation(); cancelScheduled(m); }}
                                                    className="ml-1 text-[10px] font-bold px-1.5 rounded hover:bg-white/[0.06]"
                                                    style={{ color: "#EF4444" }}>
                                                    Bekor
                                                </button>
                                            </div>
                                        )}
                                        {/* Vaqt + o'qildi belgisi — faqat guruhning oxirgi xabarida to'liq ko'rsatiladi */}
                                        <div className={`flex items-center gap-1 mt-0.5 ${m.mine ? "justify-end" : "justify-start"}`}
                                            style={groupWithNext ? { opacity: 0, height: 0, overflow: "hidden", margin: 0 } : undefined}>
                                            {m.bookmarked && (
                                                <BookmarkCheck className="w-3 h-3" style={{ color: "#F59E0B" }} />
                                            )}
                                            {m.expiresAt && (() => {
                                                // tickSec — har 1s'da yangilanadi, shu erda re-render tetiklaydi
                                                void tickSec;
                                                const left = Math.max(0, Math.floor((new Date(m.expiresAt).getTime() - Date.now()) / 1000));
                                                if (left === 0) return null;
                                                const label = left >= 3600 ? `${Math.floor(left / 3600)}s`
                                                    : left >= 60 ? `${Math.floor(left / 60)}daq`
                                                    : `${left}s`;
                                                return (
                                                    <span className="text-[9px] flex items-center gap-0.5 font-bold" title="Bu xabar avtomatik o'chadi"
                                                        style={{ color: "#F97316" }}>
                                                        <Flame className="w-2.5 h-2.5" />
                                                        {label}
                                                    </span>
                                                );
                                            })()}
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

                        {/* Emoji shortcode popover (:smile → 😊) */}
                        {emojiCode !== null && emojiCodeSuggestions.length > 0 && (
                            <div className="mx-3 mb-1 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 -4px 16px rgba(0,0,0,0.30)" }}>
                                <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b"
                                    style={{ color: "#F59E0B", borderColor: "rgba(43,62,232,0.20)" }}>
                                    :{emojiCode} · ↑↓ · Enter/Tab — kiritish · Esc — bekor
                                </p>
                                <div className="max-h-48 overflow-y-auto">
                                    {emojiCodeSuggestions.map((s, i) => (
                                        <button key={s.code}
                                            onClick={() => insertEmojiShortcode(s.emoji)}
                                            onMouseEnter={() => setEmojiCodeIdx(i)}
                                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition"
                                            style={{ background: i === emojiCodeIdx ? "rgba(245,158,11,0.10)" : "transparent" }}>
                                            <span className="text-xl flex-shrink-0">{s.emoji}</span>
                                            <span className="text-xs font-bold" style={{ color: "rgba(220,230,255,0.90)" }}>:{s.code}:</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* @mention autocomplete popover */}
                        {mentionQuery !== null && mentionSuggestions.length > 0 && (
                            <div className="mx-3 mb-1 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 -4px 16px rgba(0,0,0,0.30)" }}>
                                <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b"
                                    style={{ color: "#00CEC8", borderColor: "rgba(43,62,232,0.20)" }}>
                                    @{mentionQuery || "..."} · ↑↓ · Enter — tanlash · Esc — bekor
                                </p>
                                {mentionSuggestions.map((s, i) => (
                                    <button key={s.username}
                                        onClick={() => insertMention(s.username)}
                                        onMouseEnter={() => setMentionIdx(i)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition"
                                        style={{ background: i === mentionIdx ? "rgba(0,206,200,0.10)" : "transparent" }}>
                                        {s.image
                                            ? <Image src={s.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>
                                                <BotIcon className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </div>
                                        }
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate" style={{ color: "rgba(220,230,255,0.95)" }}>
                                                {s.name ?? s.username}
                                            </p>
                                            <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.75)" }}>@{s.username}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Fayl yuklash progress bar */}
                        {uploadInfo && (
                            <div className="px-3 py-2 flex-shrink-0"
                                style={{ borderTop: "1px solid rgba(43,62,232,0.20)", background: "rgba(11,18,40,0.85)" }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <p className="text-xs font-bold truncate flex-1" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {uploadInfo.name}
                                    </p>
                                    <span className="text-[10px] tabular-nums font-black" style={{ color: "#00CEC8" }}>
                                        {uploadInfo.progress}%
                                    </span>
                                    <span className="text-[10px] tabular-nums opacity-70" style={{ color: "rgba(220,230,255,0.75)" }}>
                                        {formatBytes(uploadInfo.size)}
                                    </span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                    <div className="h-full transition-all duration-200 rounded-full"
                                        style={{
                                            width: `${uploadInfo.progress}%`,
                                            background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                        }} />
                                </div>
                            </div>
                        )}

                        {/* Undo-send bar (5s grace period) */}
                        {pendingSend && (
                            <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
                                style={{ borderTop: "1px solid rgba(0,206,200,0.30)", background: "rgba(0,206,200,0.10)" }}>
                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate" style={{ color: "#00CEC8" }}>
                                        Yuborilmoqda... {undoTick}s
                                    </p>
                                    <p className="text-[10px] truncate opacity-75" style={{ color: "rgba(220,230,255,0.85)" }}>
                                        {pendingSend.text.slice(0, 80)}
                                    </p>
                                </div>
                                <button onClick={cancelPending}
                                    className="text-[11px] font-black px-3 py-1.5 rounded-md"
                                    style={{ background: "rgba(11,18,40,0.85)", color: "#fff", border: "1px solid rgba(43,62,232,0.30)" }}>
                                    BEKOR
                                </button>
                                <button onClick={flushPending}
                                    className="text-[11px] font-black px-3 py-1.5 rounded-md"
                                    style={{ background: "rgba(0,206,200,0.30)", color: "#fff", border: "1px solid rgba(0,206,200,0.50)" }}>
                                    DARHOL
                                </button>
                            </div>
                        )}

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
                                    <div className="relative">
                                        <ComposerBtn icon={MapPin} title="Joylashuv"
                                            onClick={() => setLocationPickerOpen(v => !v)}
                                            loading={locBusy}
                                            accent={locationPickerOpen} />
                                        {locationPickerOpen && (
                                            <div className="absolute bottom-full mb-2 left-0 z-30 rounded-lg overflow-hidden"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 180 }}>
                                                <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b"
                                                    style={{ color: "#00CEC8", borderColor: "rgba(43,62,232,0.20)" }}>
                                                    Joylashuv turi
                                                </p>
                                                <button onClick={() => sendLocation()}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                    <MapPin className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                    Statik joylashuv
                                                </button>
                                                {[15, 60, 480].map(mins => (
                                                    <button key={mins} onClick={() => sendLocation(mins)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                        <MapPin className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                                        Jonli — {mins < 60 ? `${mins} daq` : `${mins / 60} soat`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <ComposerBtn icon={BarChart2} title="So'rovnoma" onClick={() => setPollOpen(true)} />
                                    <ComposerBtn icon={Camera} title="Video-circle" onClick={() => setCircleOpen(true)} />
                                    <ComposerBtn icon={Wallet} title="Pul yuborish" onClick={() => setTransferOpen(true)} accent />
                                    <div className="relative">
                                        <ComposerBtn
                                            icon={Clock}
                                            title="Jadvalga qo'yish (keyinroq yuborish)"
                                            onClick={() => {
                                                // Default: 1 soat keyin
                                                if (!scheduleDateTime) {
                                                    const d = new Date(Date.now() + 3600 * 1000);
                                                    // datetime-local formati: YYYY-MM-DDTHH:MM
                                                    const pad = (n: number) => String(n).padStart(2, "0");
                                                    setScheduleDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                                                }
                                                setScheduleOpen(v => !v);
                                            }}
                                            accent={scheduleOpen}
                                        />
                                        {scheduleOpen && (
                                            <div className="absolute bottom-full mb-2 right-0 z-30 rounded-lg overflow-hidden p-3"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 240 }}>
                                                <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "#00CEC8" }}>Qachon jo&apos;natilsin</p>
                                                <input type="datetime-local" value={scheduleDateTime}
                                                    onChange={e => setScheduleDateTime(e.target.value)}
                                                    className="w-full h-9 px-2 rounded text-xs text-white bg-transparent focus:outline-none mb-2"
                                                    style={{ border: "1px solid rgba(43,62,232,0.30)", colorScheme: "dark" }} />
                                                <div className="flex gap-1.5 mb-2">
                                                    {[
                                                        { s: 3600, label: "1 soat" },
                                                        { s: 3 * 3600, label: "3 soat" },
                                                        { s: 86400, label: "Ertaga" },
                                                    ].map(o => (
                                                        <button key={o.label}
                                                            onClick={() => {
                                                                const d = new Date(Date.now() + o.s * 1000);
                                                                const pad = (n: number) => String(n).padStart(2, "0");
                                                                setScheduleDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                                                            }}
                                                            className="flex-1 text-[10px] font-bold py-1 rounded hover:bg-white/[0.08]"
                                                            style={{ color: "rgba(220,230,255,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                                            {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button onClick={scheduleSend}
                                                    disabled={!input.trim() || !scheduleDateTime}
                                                    className="w-full h-9 rounded text-xs font-black text-white disabled:opacity-40"
                                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                    Jadvalga qo&apos;yish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <ComposerBtn
                                            icon={nextTtl ? Flame : Timer}
                                            title={nextTtl ? `${nextTtl}s'dan keyin o'chadi — o'zgartirish` : "O'zini o'chiruvchi xabar"}
                                            onClick={() => setTtlPickerOpen(v => !v)}
                                            accent={!!nextTtl || ttlPickerOpen}
                                        />
                                        {ttlPickerOpen && (
                                            <div className="absolute bottom-full mb-2 right-0 z-30 rounded-lg overflow-hidden"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 140 }}>
                                                {[
                                                    { s: null, label: "Doimiy" },
                                                    { s: 10, label: "10 sekund" },
                                                    { s: 60, label: "1 daqiqa" },
                                                    { s: 300, label: "5 daqiqa" },
                                                    { s: 3600, label: "1 soat" },
                                                    { s: 86400, label: "24 soat" },
                                                ].map(o => (
                                                    <button key={o.label}
                                                        onClick={() => { setNextTtl(o.s); setTtlPickerOpen(false); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left"
                                                        style={nextTtl === o.s ? { background: "rgba(0,206,200,0.14)", color: "#00CEC8" } : undefined}>
                                                        {o.s === null
                                                            ? <Timer className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.75)" }} />
                                                            : <Flame className="w-3.5 h-3.5" style={{ color: "#F97316" }} />
                                                        }
                                                        {o.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={composerInputRef}
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
                                        onKeyDown={e => {
                                            // Emoji shortcode popover navigatsiyasi
                                            if (emojiCode !== null && emojiCodeSuggestions.length > 0) {
                                                if (e.key === "ArrowDown") { e.preventDefault(); setEmojiCodeIdx(i => (i + 1) % emojiCodeSuggestions.length); return; }
                                                if (e.key === "ArrowUp") { e.preventDefault(); setEmojiCodeIdx(i => (i - 1 + emojiCodeSuggestions.length) % emojiCodeSuggestions.length); return; }
                                                if (e.key === "Enter" || e.key === "Tab") {
                                                    e.preventDefault();
                                                    const pick = emojiCodeSuggestions[emojiCodeIdx];
                                                    if (pick) insertEmojiShortcode(pick.emoji);
                                                    return;
                                                }
                                                if (e.key === "Escape") { e.preventDefault(); setEmojiCode(null); return; }
                                            }
                                            // Mention popover navigatsiyasi
                                            if (mentionQuery !== null && mentionSuggestions.length > 0) {
                                                if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionSuggestions.length); return; }
                                                if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); return; }
                                                if (e.key === "Enter" || e.key === "Tab") {
                                                    e.preventDefault();
                                                    const pick = mentionSuggestions[mentionIdx];
                                                    if (pick) insertMention(pick.username);
                                                    return;
                                                }
                                                if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
                                            }
                                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                                        }}
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
                    {/* Chat statistikasi */}
                    {chatStats && chatStats.total > 0 && (
                        <div className="p-4 border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(140,160,210,0.55)" }}>
                                Statistika
                            </p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <StatCard label="Jami xabar" value={chatStats.total.toLocaleString("uz-UZ")} />
                                <StatCard label="Kunlik o'rt." value={chatStats.avgPerDay.toString()} />
                                <StatCard label="Siz" value={chatStats.mineCount.toString()} accent />
                                <StatCard label="U kishi" value={chatStats.peerCount.toString()} />
                                <StatCard label="Reaksiyalar" value={chatStats.reactionCount.toString()} />
                                <StatCard label="Kunlar" value={chatStats.days.toString()} />
                            </div>
                            {/* Media taqsimoti */}
                            {Object.keys(chatStats.mediaCounts).length > 0 && (
                                <div className="space-y-1 mt-2">
                                    {Object.entries(chatStats.mediaCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                                        <div key={type} className="flex items-center justify-between text-[11px]">
                                            <span style={{ color: "rgba(180,195,235,0.85)" }}>
                                                {type === "image" ? "🖼 Rasm" : type === "video" ? "🎥 Video" :
                                                 type === "audio" ? "🎙 Ovoz" : type === "file" ? "📎 Fayl" :
                                                 type === "video-circle" ? "⭕ Dumaloq video" : type === "poll" ? "📊 So'rovnoma" :
                                                 type === "location" ? "📍 Joylashuv" : type === "transfer" ? "💰 O'tkazma" :
                                                 type === "agent" ? "🤖 Agent" : type}
                                            </span>
                                            <span className="font-bold" style={{ color: "#00CEC8" }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Boshlangan sana + eng ko'p yozgan kun */}
                            {chatStats.firstDate && (
                                <p className="text-[10px] mt-3 pt-2 border-t" style={{ color: "rgba(140,160,210,0.60)", borderColor: "rgba(43,62,232,0.10)" }}>
                                    Boshlangan: {new Date(chatStats.firstDate).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            )}
                            {chatStats.topDay && (
                                <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Rekord: {new Date(chatStats.topDay.date).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                    — <span className="font-bold" style={{ color: "#00CEC8" }}>{chatStats.topDay.count}</span> xabar
                                </p>
                            )}
                        </div>
                    )}
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
            {/* Saqlangan xabarlar paneli */}
            {bookmarksOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setBookmarksOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "80vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <BookmarkCheck className="w-4 h-4" style={{ color: "#F59E0B" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Saqlangan xabarlar</p>
                                {bookmarks.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>{bookmarks.length}</span>
                                )}
                            </div>
                            <button onClick={() => setBookmarksOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {bookmarksLoading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} />
                                </div>
                            ) : bookmarks.length === 0 ? (
                                <p className="text-xs text-center py-10" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Hozirgacha saqlangan xabar yo&apos;q
                                </p>
                            ) : (
                                bookmarks.map(b => (
                                    <button key={b.id} onClick={() => {
                                        if (b.kind === "dm" && b.conversationId) {
                                            setSelectedId(b.conversationId);
                                            setBookmarksOpen(false);
                                            setTimeout(() => jumpToMessage(b.messageId), 500);
                                        } else if (b.kind === "channel" && b.channelId) {
                                            setListTab(b.channel?.type === "GROUP" ? "groups" : "channels");
                                            setSelectedChannel(b.channelId);
                                            setBookmarksOpen(false);
                                        }
                                    }}
                                        className="w-full text-left px-4 py-3 border-b hover:bg-white/[0.04] transition"
                                        style={{ borderColor: "rgba(43,62,232,0.10)" }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {b.kind === "dm" ? (
                                                b.peer?.image
                                                    ? <Image src={b.peer.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                                    : <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "rgba(43,62,232,0.20)" }} />
                                            ) : (
                                                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.20)" }}>
                                                    {b.channel?.type === "GROUP"
                                                        ? <Users className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                        : <Megaphone className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                    }
                                                </div>
                                            )}
                                            <span className="text-[10px] font-black truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                                {b.kind === "dm"
                                                    ? (b.peer?.name ?? b.peer?.username ?? "Foydalanuvchi")
                                                    : (b.channel?.name ?? "Kanal")}
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ background: b.kind === "channel" ? "rgba(0,206,200,0.15)" : (b.message.mine ? "rgba(43,62,232,0.20)" : "rgba(0,206,200,0.15)"), color: b.kind === "channel" ? "#00CEC8" : (b.message.mine ? "rgba(180,195,235,0.90)" : "#00CEC8") }}>
                                                {b.kind === "channel" ? (b.channel?.type === "GROUP" ? "Guruh" : "Kanal") : (b.message.mine ? "Siz" : "U")}
                                            </span>
                                            <span className="ml-auto text-[10px] tabular-nums" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                {new Date(b.message.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                            </span>
                                        </div>
                                        <p className="text-xs line-clamp-2" style={{ color: "rgba(220,230,255,0.90)" }}>
                                            {b.message.text || (b.message.mediaType ? `[${b.message.mediaType}]` : "(media)")}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Draftlar paneli */}
            {draftsOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setDraftsOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "80vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Yakunlanmagan draftlar</p>
                                {drafts.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(0,206,200,0.15)", color: "#00CEC8" }}>{drafts.length}</span>
                                )}
                            </div>
                            <button onClick={() => setDraftsOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {drafts.length === 0 ? (
                                <p className="text-xs text-center py-10" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Draft yo&apos;q — barcha xabarlaringiz yuborilgan
                                </p>
                            ) : (
                                drafts.map(d => (
                                    <div key={`${d.kind}:${d.id}`}
                                        className="flex items-center gap-3 px-4 py-3 border-b hover:bg-white/[0.04] transition"
                                        style={{ borderColor: "rgba(43,62,232,0.10)" }}>
                                        {d.kind === "dm" ? (
                                            d.peer?.image
                                                ? <Image src={d.peer.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                                : <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ background: "rgba(43,62,232,0.20)" }}>
                                                    <BotIcon className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>
                                                <Megaphone className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </div>
                                        )}
                                        <button onClick={() => {
                                            if (d.kind === "dm") setSelectedId(d.id);
                                            else setSelectedChannel(d.id);
                                            setDraftsOpen(false);
                                        }}
                                            className="min-w-0 flex-1 text-left">
                                            <p className="text-xs font-bold truncate" style={{ color: "rgba(220,230,255,0.95)" }}>
                                                {d.kind === "dm"
                                                    ? (d.peer?.name ?? d.peer?.username ?? "Foydalanuvchi")
                                                    : (d.channel?.name ?? "Kanal")}
                                            </p>
                                            <p className="text-[11px] italic line-clamp-1" style={{ color: "rgba(140,160,210,0.85)" }}>
                                                {d.text}
                                            </p>
                                        </button>
                                        <button onClick={() => deleteDraft(d)}
                                            title="Draft'ni o'chirish"
                                            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                            <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Klaviatura yorliqlari yordami */}
            {shortcutsHelpOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setShortcutsHelpOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl overflow-hidden"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Klaviatura yorliqlari</p>
                            <button onClick={() => setShortcutsHelpOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {[
                                { keys: ["Ctrl", "K"], label: "Chatlarda qidirish" },
                                { keys: ["Ctrl", "F"], label: "Shu chatda qidirish" },
                                { keys: ["Ctrl", "/"], label: "Yorliqlar ro'yxati" },
                                { keys: ["Enter"], label: "Xabar yuborish" },
                                { keys: ["Shift", "Enter"], label: "Yangi qatorga o'tish" },
                                { keys: ["↑"], label: "Oxirgi xabaringizni tahrirlash" },
                                { keys: ["Esc"], label: "Yopish / bekor qilish" },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5">
                                    <span className="text-xs" style={{ color: "rgba(220,230,255,0.85)" }}>{s.label}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((k, j) => (
                                            <span key={j}>
                                                {j > 0 && <span className="mx-0.5 text-[10px] opacity-50">+</span>}
                                                <kbd className="text-[10px] font-black px-2 py-0.5 rounded"
                                                    style={{ background: "rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.95)", border: "1px solid rgba(43,62,232,0.35)" }}>
                                                    {k}
                                                </kbd>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Chat mavzu tanlash modali */}
            {themePickerOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setThemePickerOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl overflow-hidden"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Chat mavzu</p>
                            </div>
                            <button onClick={() => setThemePickerOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-2">
                            {Object.entries(CHAT_THEMES).map(([id, t]) => (
                                <button key={id} onClick={() => pickTheme(id)}
                                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition"
                                    style={{
                                        background: chatTheme === id ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                                        border: `1px solid ${chatTheme === id ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                                    }}>
                                    <div className="w-14 h-14 rounded-lg"
                                        style={{ background: t.swatch, border: "1px solid rgba(255,255,255,0.10)" }} />
                                    <span className="text-[10px] font-bold" style={{ color: chatTheme === id ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <p className="px-4 pb-4 text-[10px] text-center" style={{ color: "rgba(140,160,210,0.55)" }}>
                            Mavzu faqat sizga ko'rinadi — brauzeringizda saqlanadi
                        </p>
                    </div>
                </div>
            )}

            {/* Mening statusim modali */}
            {statusModalOpen && (
                <NxStatusModal
                    initialEmoji={myStatus.emoji}
                    initialText={myStatus.text}
                    onClose={() => setStatusModalOpen(false)}
                    onSaved={(e, t) => setMyStatus({ emoji: e, text: t })}
                />
            )}
            {/* Yangi kanal yaratish modali (public/handle bilan) */}
            {createChannelOpen === "CHANNEL" && (
                <NxChannelCreateModal
                    initialType="CHANNEL"
                    onClose={() => setCreateChannelOpen(null)}
                    onCreated={(id) => {
                        setSelectedChannel(id);
                        setChannelsBump(n => n + 1);
                    }}
                />
            )}
            {/* Yangi guruh yaratish modali (do'stlar tanlash oqimi) */}
            {createChannelOpen === "GROUP" && (
                <NxGroupCreateModal
                    onClose={() => setCreateChannelOpen(null)}
                    onCreated={(id) => {
                        setSelectedChannel(id);
                        setChannelsBump(n => n + 1);
                    }}
                />
            )}
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
            {/* Tahrirlash tarixi modali */}
            {historyModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setHistoryModalOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "75vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>
                                    Tahrirlash tarixi
                                </p>
                            </div>
                            <button onClick={() => setHistoryModalOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {historyLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} />
                                </div>
                            ) : historyItems.length === 0 ? (
                                <p className="text-xs text-center py-6" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Oldingi versiyalar topilmadi
                                </p>
                            ) : (
                                historyItems.map((item, idx) => (
                                    <div key={item.id || idx} className="p-3 rounded-xl space-y-1.5"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                        <div className="flex items-center justify-between text-[10px]" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.editedAt).toLocaleString("uz-UZ", {
                                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                                })}
                                            </span>
                                            <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded"
                                                style={{ background: "rgba(0,206,200,0.10)", color: "#00CEC8" }}>
                                                Versiya {historyItems.length - idx}
                                            </span>
                                        </div>
                                        <div className="text-xs whitespace-pre-wrap break-words rounded-lg p-2"
                                            style={{ background: "rgba(0,0,0,0.30)", color: "rgba(220,230,255,0.90)" }}>
                                            {item.previousText || "(Bo'sh matn)"}
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

// Kichik statistika kartasi
function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="p-2 rounded-lg"
            style={{
                background: accent ? "rgba(0,206,200,0.08)" : "rgba(43,62,232,0.06)",
                border: `1px solid ${accent ? "rgba(0,206,200,0.25)" : "rgba(43,62,232,0.14)"}`,
            }}>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>{label}</p>
            <p className="text-sm font-black" style={{ color: accent ? "#00CEC8" : "rgba(220,230,255,0.95)" }}>{value}</p>
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
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [memberMenuFor, setMemberMenuFor] = useState<string | null>(null);
    const [actionBusy, setActionBusy] = useState<string | null>(null);

    const reloadMembers = useCallback(async () => {
        const mr = await fetch(`/api/nexus/channels/${id}/members`).then(r => r.ok ? r.json() : null).catch(() => null);
        if (mr?.members) {
            setMembers(mr.members);
            setCanManage(!!mr.canManage);
        }
    }, [id]);

    useEffect(() => {
        let stop = false;
        setLoading(true);
        setInfo(null);
        setMembers([]);
        setCanManage(false);
        (async () => {
            try {
                const d = await fetch(`/api/nexus/channels/${id}`).then(r => r.json());
                if (stop || !d?.channel) return;
                setInfo(d.channel);
                if (d.channel.isMember) await reloadMembers();
            } finally {
                if (!stop) setLoading(false);
            }
        })();
        return () => { stop = true; };
    }, [id, reloadMembers]);

    async function changeRole(profileId: string, role: "ADMIN" | "MEMBER") {
        setActionBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/members`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId, role }),
            });
            if (r.ok) {
                setMembers(prev => prev.map(m => m.profileId === profileId ? { ...m, role } : m));
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Bajarib bo'lmadi");
            }
        } finally {
            setActionBusy(null);
            setMemberMenuFor(null);
        }
    }
    async function kickMember(profileId: string, displayName: string) {
        if (!confirm(`${displayName}ni chiqarasizmi?`)) return;
        setActionBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/members?profileId=${profileId}`, { method: "DELETE" });
            if (r.ok) {
                setMembers(prev => prev.filter(m => m.profileId !== profileId));
                setInfo(prev => prev ? { ...prev, memberCount: Math.max(0, prev.memberCount - 1) } : prev);
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Chiqarib bo'lmadi");
            }
        } finally {
            setActionBusy(null);
            setMemberMenuFor(null);
        }
    }

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
                        {members.slice(0, 20).map(m => {
                            const displayName = m.name ?? m.username ?? "Foydalanuvchi";
                            const showMenu = canManage && m.role !== "OWNER";
                            return (
                            <div key={m.profileId} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] relative">
                                {m.image
                                    ? <Image src={m.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                    : <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: "rgba(43,62,232,0.20)" }}>
                                        <BotIcon className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </div>
                                }
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold truncate flex items-center gap-1" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {displayName}
                                        {m.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {m.role === "OWNER" ? "Ega" : m.role === "ADMIN" ? "Admin" : "A'zo"}
                                    </p>
                                </div>
                                {showMenu && (
                                    <button onClick={() => setMemberMenuFor(memberMenuFor === m.profileId ? null : m.profileId)}
                                        disabled={actionBusy === m.profileId}
                                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.08] disabled:opacity-40">
                                        {actionBusy === m.profileId
                                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#00CEC8" }} />
                                            : <MoreVertical className="w-3 h-3" style={{ color: "rgba(160,176,224,0.75)" }} />
                                        }
                                    </button>
                                )}
                                {memberMenuFor === m.profileId && (
                                    <div className="absolute right-2 top-full mt-1 z-30 rounded-lg overflow-hidden min-w-[140px]"
                                        style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)" }}>
                                        {m.role === "ADMIN" ? (
                                            <button onClick={() => changeRole(m.profileId, "MEMBER")}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                <ShieldOff className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                Adminlikdan olib tashlash
                                            </button>
                                        ) : (
                                            <button onClick={() => changeRole(m.profileId, "ADMIN")}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                <Shield className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                                Admin qilish
                                            </button>
                                        )}
                                        <button onClick={() => kickMember(m.profileId, displayName)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-500/10 text-left"
                                            style={{ color: "#EF4444" }}>
                                            <X className="w-3.5 h-3.5" />
                                            Chiqarish
                                        </button>
                                    </div>
                                )}
                            </div>
                            );
                        })}
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

// Chat mavzular — 6 ta preset. Fon = CSS background.
const CHAT_THEMES: Record<string, { label: string; bg: string; swatch: string }> = {
    default: { label: "Standart", bg: "rgba(11,18,40,0.35)", swatch: "linear-gradient(135deg,#0B1228,#1a2050)" },
    ocean:   { label: "Okean",    bg: "linear-gradient(135deg,#0a1a2e,#0d3a5c 60%,#1a5d7a)", swatch: "linear-gradient(135deg,#0d3a5c,#1a5d7a)" },
    sunset:  { label: "Quyosh botishi", bg: "linear-gradient(135deg,#2d1b3e,#5c1a3a 60%,#7a2d1a)", swatch: "linear-gradient(135deg,#5c1a3a,#c04a2d)" },
    forest:  { label: "O'rmon",   bg: "linear-gradient(135deg,#0f2818,#1a4028 60%,#2d5c3a)", swatch: "linear-gradient(135deg,#1a4028,#3a8250)" },
    mono:    { label: "Grafit",   bg: "linear-gradient(135deg,#1a1a1a,#2d2d2d)", swatch: "linear-gradient(135deg,#2d2d2d,#4a4a4a)" },
    lavender:{ label: "Lavanda",  bg: "linear-gradient(135deg,#1a1a3a,#2a1a4a 60%,#4a2a6a)", swatch: "linear-gradient(135deg,#2a1a4a,#7a4aaa)" },
};

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
