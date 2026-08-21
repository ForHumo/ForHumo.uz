"use client";

// Nexus Ijtimoiy — PC (lg+) uchun 3-ustunli Telegram uslubidagi layout.
// Chap: chatlar ro'yxati (+ papkalar tab). O'rta: tanlangan suhbat.
// O'ng: peer haqida ma'lumot (info paneli).
// Mobile'da bu komponent ishlatilmaydi — SocialView eski tabsni ko'rsatadi.

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Send, Bot as BotIcon, Search, MessageSquare, Phone, Video, MoreVertical, BadgeCheck, X, Hash, Users, Megaphone, Paperclip, Wallet, MapPin, Mic, Smile, Trash2, Camera, BarChart2, Copy, Reply, Check, CheckCheck, Edit3, ChevronLeft, ChevronRight, Languages, FileIcon, Download, Forward, Pin, PinOff, Archive, ArchiveRestore, BellOff, Bell, Inbox, CheckSquare, Square, ChevronDown, Timer, Flame, Clock, Plus, Shield, ShieldOff, Volume2, VolumeX, Palette, Bookmark, BookmarkCheck, FileText, History, Lock, Unlock, Sparkles, Settings, PenSquare, Sticker, Film, ExternalLink, EyeOff, Eye, AlertTriangle, Play, Pause, RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { NxChannelRoom } from "./nx-channels";
import { NxChannelCreateModal } from "./nx-channel-create-modal";
import { NxGroupCreateModal } from "./nx-group-create-modal";
import { isFounderProfile } from "@/lib/founders";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { NxStatusModal, statusIconForKey, statusColorForKey } from "./nx-status-modal";
import { Emoji } from "@/lib/twemoji";
import { NxHumoMediaPicker } from "./nx-humo-media-picker";
import { useTabBadge } from "@/lib/tab-badge";
import { NxInlinePopover } from "./nx-inline-popover";
import { NxE2eBanner } from "./nx-e2e-banner";
import { encryptForRecipient, decryptFromSender } from "@/lib/e2e-crypto";
import { getMyIdentity } from "@/lib/e2e-storage";
import { searchShortcodes } from "./nx-emoji-shortcodes";
import { NxMarkdown } from "./nx-markdown";
import { addWatermarkToImage } from "./nx-image-watermark";
import { pushSupported, getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";
import { NxVideoCircleRecorder } from "./nx-video-circle-recorder";
import { NxPollCreate } from "./nx-poll-create";
import { NxVoicePlayer } from "./nx-voice-player";
import { useNxPlayer } from "./nx-player-ctx";
import { usePresence } from "@/lib/presence";
import { subscribeUserChannel } from "@/lib/pusher-client";
import { formatLastSeen } from "@/lib/last-seen";
import { isLocked, isUnlockedNow, lockNow } from "@/lib/chat-lock";
import { NxChatLockModal } from "./nx-chat-lock-modal";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { formatMoney } from "@/lib/money";

// Tab labels per locale (uz/ru/en). Sidebar tab bar'da ishlatiladi.
const TAB_LABELS: Record<string, Record<string, string>> = {
    uz: { all: "Barchasi", unread: "O'qilmagan", private: "Shaxsiy", groups: "Guruh", channels: "Kanal", agents: "Agent" },
    ru: { all: "Все",      unread: "Непроч.",    private: "Личные",  groups: "Группа", channels: "Канал", agents: "Агент" },
    en: { all: "All",      unread: "Unread",     private: "Private", groups: "Group",  channels: "Channel", agents: "Agent" },
};

interface Conv {
    conversationId: string;
    isSelf?: boolean;
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
    mediaMime?: string | null;
    forwardedFromId?: string | null;
    forwardedFromName?: string | null;
    deliveredAt?: string | null;
    senderId?: string;
    deletedForEveryoneAt?: string | null;
    buttons?: Array<Array<{ text: string; callbackData?: string; url?: string }>> | null;
    invoice?: { amount: number; currency: "UZS" | "USD"; description: string; payload?: string } | null;
    invoicePaidAt?: string | null;
    e2ePayload?: { ephemeralPub: string; iv: string; ciphertext: string; v: number } | null;
    // Client tomon in-memory deshifrlangan matn (UI'da text o'rniga ko'rsatiladi)
    e2eDecrypted?: string | null;
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
    lastSeenAt?: string | null;
}

interface ChannelItem {
    id: string; type: "CHANNEL" | "GROUP";
    name: string; handle: string | null; avatarUrl: string | null;
    description: string | null; memberCount: number;
    isSystem?: boolean;
}

type ListTab = "all" | "unread" | "private" | "groups" | "channels" | "agents";
interface AgentItem {
    id: string; profileId: string;
    username: string | null; name: string | null; image: string | null; humoId: string | null;
    module: string; isSystem: boolean; createdAt: string;
}

export function NxSocialDesktop() {
    const { startCall } = useNxPlayer();
    const { onTyping, sendTyping, isOnline } = usePresence();
    const { data: session } = useSession();
    const locale = useLocale();
    const [myProfileId, setMyProfileId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string | null>(null);
    const [peerTyping, setPeerTyping] = useState(false);
    // Kim yozayapti — barcha suhbatlar bo'yicha (chat list preview'da "yozmoqda..." uchun)
    const [typingByPeerId, setTypingByPeerId] = useState<Set<string>>(new Set());
    const typingClearTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    // Mening profileId (typing event ichida ishlatiladi)
    useEffect(() => {
        if (!session?.user?.email) return;
        fetch("/api/user/profile").then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.profile) { setMyProfileId(d.profile.id); setMyName(d.profile.name); } })
            .catch(() => {});
    }, [session?.user?.email]);

    const [listTab, setListTab] = useState<ListTab>("all");
    // DM-list ko'rinishida qaysi tab: All, Unread, Private uchun DM ro'yxati ko'rsatiladi
    const isDmListTab = listTab === "all" || listTab === "unread" || listTab === "private";
    const [convs, setConvs] = useState<Conv[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
    const [peer, setPeer] = useState<PeerInfo | null>(null);
    // Tanlangan suhbat obyekti (isSelf, muted, pinned, arxiv holatlarini olish uchun)
    const selectedConv = convs.find(c => c.conversationId === selectedId) ?? null;

    // Refs — real-time event handler ichida so'nggi qiymatga ega bo'lish uchun
    const selectedIdRef = useRef<string | null>(null);
    const loadConvsRef = useRef<(() => void) | null>(null);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

    // Chat lock — modal state
    const [lockModal, setLockModal] = useState<{ convId: string; mode: "setup" | "unlock" | "remove" } | null>(null);
    const [lockTick, setLockTick] = useState(0); // re-render trigger localStorage o'zgargach
    const rerenderLocks = () => setLockTick(t => t + 1);

    // Bot commands autocomplete (peer agent bo'lsa /cmd list)
    const [agentCommands, setAgentCommands] = useState<Array<{ cmd: string; description: string }>>([]);
    const [cmdPopoverOpen, setCmdPopoverOpen] = useState(false);
    const [cmdFilter, setCmdFilter] = useState("");
    useEffect(() => {
        if (!peer?.isAgent || !peer.id) { setAgentCommands([]); return; }
        fetch(`/api/nexus/agents/by-profile/${peer.id}/commands`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.commands) setAgentCommands(d.commands); })
            .catch(() => {});
    }, [peer?.id, peer?.isAgent]);

    // Typing event'larini eshitish
    // 1) Hozirgi peer bilan — header'da "yozmoqda..." (peerTyping state)
    // 2) Har qanday peer'dan — chat list preview'da "yozmoqda..." (typingByPeerId set)
    useEffect(() => {
        const off = onTyping((e) => {
            if (!myProfileId) return;
            if (e.toId !== myProfileId) return; // faqat menga qaratilgan

            // 1) Chat list uchun barcha peerlar
            setTypingByPeerId(prev => {
                if (prev.has(e.fromId)) return prev;
                const next = new Set(prev);
                next.add(e.fromId);
                return next;
            });
            // 5s'da auto-clear (2s sender + kichik buffer)
            const oldTimer = typingClearTimersRef.current.get(e.fromId);
            if (oldTimer) clearTimeout(oldTimer);
            const nt = setTimeout(() => {
                setTypingByPeerId(prev => {
                    if (!prev.has(e.fromId)) return prev;
                    const next = new Set(prev);
                    next.delete(e.fromId);
                    return next;
                });
                typingClearTimersRef.current.delete(e.fromId);
            }, 5000);
            typingClearTimersRef.current.set(e.fromId, nt);

            // 2) Header uchun hozirgi peer
            if (peer?.id && e.fromId === peer.id) {
                setPeerTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 5000);
            }
        });
        return () => { off(); };
    }, [onTyping, myProfileId, peer?.id]);

    // Real-time DM push — mening private-user kanalimga subscribe
    // Xabar `nx:msg:new` event: agar hozirgi ochiq suhbatga tegishli bo'lsa darhol
    // append qilamiz, aks holda suhbatlar ro'yxatini bump qilib preview yangilaymiz.
    useEffect(() => {
        if (!myProfileId) return;
        const ch = subscribeUserChannel(myProfileId);
        if (!ch) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMsgNew = (data: { convId: string; message: any }) => {
            if (!data?.convId || !data?.message) return;

            // Hozirgi ochiq suhbatga tegishli bo'lsa xabarga append (agar dup emas)
            if (selectedIdRef.current === data.convId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message as Msg];
                });
            }

            // Suhbatlar ro'yxatini yangilash — lastMessage, tartib, unread
            setConvs(prev => {
                const idx = prev.findIndex(c => c.conversationId === data.convId);
                if (idx === -1) {
                    // Yangi suhbat — full reload
                    setTimeout(() => loadConvsRef.current?.(), 300);
                    return prev;
                }
                const updated = [...prev];
                const c = { ...updated[idx] };
                c.lastMessageText = data.message.text?.slice(0, 120)
                    || (data.message.mediaType ? `[${data.message.mediaType}]` : "");
                c.lastMessageAt = data.message.createdAt;
                c.lastMine = !!data.message.mine;
                if (selectedIdRef.current !== data.convId && !data.message.mine) {
                    c.unread = true;
                }
                updated.splice(idx, 1);
                updated.unshift(c);
                return updated;
            });
        };

        // Yetkazildi confirm — sender bo'lmagan xabarlar uchun serverga xabar berish
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMsgNewWithDeliver = (data: { convId: string; message: any }) => {
            onMsgNew(data);
            // Sender men emas bo'lsa — deliver confirm
            if (data?.message && !data.message.mine && data.message.id) {
                fetch("/api/nexus/messages/deliver", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messageIds: [data.message.id] }),
                }).catch(() => {});
            }
        };

        // Sender'ga: xabar yetkazildi (per-message tick)
        const onDelivered = (data: { messageIds: string[]; deliveredAt: string }) => {
            if (!data?.messageIds?.length) return;
            const set = new Set(data.messageIds);
            setMessages(prev => prev.map(m =>
                set.has(m.id) ? { ...m, deliveredAt: data.deliveredAt } : m
            ));
        };

        // Xabar hamma uchun o'chirilganda — tombstone yangilanadi
        const onDelete = (data: { convId: string; messageId: string; tombstone?: boolean; deletedAt: string }) => {
            if (!data?.messageId) return;
            if (selectedIdRef.current !== data.convId) return;
            setMessages(prev => prev.map(m =>
                m.id === data.messageId
                    ? { ...m, text: "", mediaUrl: null, mediaType: null, deletedForEveryoneAt: data.deletedAt }
                    : m
            ));
        };

        // Invoice to'landi — tugma yashiradi, "To'langan" ko'rsatadi
        const onInvoicePaid = (data: { convId: string; messageId: string; paidAt: string }) => {
            if (!data?.messageId) return;
            if (selectedIdRef.current !== data.convId) return;
            setMessages(prev => prev.map(m =>
                m.id === data.messageId ? { ...m, invoicePaidAt: data.paidAt } : m
            ));
        };

        ch.bind("nx:msg:new", onMsgNewWithDeliver);
        ch.bind("nx:msg:delivered", onDelivered);
        ch.bind("nx:msg:delete", onDelete);
        ch.bind("nx:msg:invoice-paid", onInvoicePaid);
        return () => {
            ch.unbind("nx:msg:new", onMsgNewWithDeliver);
            ch.unbind("nx:msg:delivered", onDelivered);
            ch.unbind("nx:msg:delete", onDelete);
            ch.unbind("nx:msg:invoice-paid", onInvoicePaid);
        };
    }, [myProfileId]);

    useEffect(() => { setPeerTyping(false); }, [peer?.id]);

    // E2E: peer aktiv public kaliti + mening identity (IndexedDB'dan)
    const [peerE2eKey, setPeerE2eKey] = useState<{ publicKey: string; fingerprint: string; keyId: string } | null>(null);
    const [myE2eIdentity, setMyE2eIdentity] = useState<{ privateJwk: JsonWebKey; fingerprint: string } | null>(null);
    useEffect(() => {
        let cancelled = false;
        setPeerE2eKey(null);
        if (!peer?.username) return;
        fetch(`/api/user/e2e/keys/by-username/${encodeURIComponent(peer.username)}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                if (d?.publicKey) setPeerE2eKey({ publicKey: d.publicKey, fingerprint: d.fingerprint, keyId: d.keyId });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [peer?.username]);
    useEffect(() => {
        getMyIdentity().then(id => { if (id) setMyE2eIdentity({ privateJwk: id.privateJwk, fingerprint: id.fingerprint }); }).catch(() => {});
    }, []);
    // Ikkalasi ham bor bo'lsa E2E mumkin
    const e2eAvailable = !!(peerE2eKey && myE2eIdentity);

    // Kelgan e2ePayload xabarlarni deshifrlash (client tomon, background)
    useEffect(() => {
        if (!myE2eIdentity) return;
        const toDecrypt = messages.filter(m => m.e2ePayload && m.e2eDecrypted == null);
        if (toDecrypt.length === 0) return;
        let cancelled = false;
        (async () => {
            for (const m of toDecrypt) {
                try {
                    const plain = await decryptFromSender(myE2eIdentity.privateJwk, m.e2ePayload!);
                    if (cancelled) return;
                    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, e2eDecrypted: plain } : x));
                } catch {
                    if (cancelled) return;
                    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, e2eDecrypted: "[Deshifrlab bo'lmadi]" } : x));
                }
            }
        })();
        return () => { cancelled = true; };
    }, [messages, myE2eIdentity]);

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [showInfo, setShowInfo] = useState(true);
    const [filter, setFilter] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Channel/Group state
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [agentsMax, setAgentsMax] = useState<number | null>(null);
    const [agentsUnlimited, setAgentsUnlimited] = useState(false);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [agentCreateOpen, setAgentCreateOpen] = useState(false);
    // Agents tabini ochganda yoki "All" bo'lsa yuklaymiz (All'da ham ko'rinishi kerak)
    useEffect(() => {
        if (listTab !== "agents" && listTab !== "all") return;
        setLoadingAgents(true);
        fetch("/api/nexus/agents", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { items: [], max: null, unlimited: false })
            .then(d => {
                setAgents(d.items ?? []);
                setAgentsMax(d.max ?? null);
                setAgentsUnlimited(!!d.unlimited);
            })
            .catch(() => {})
            .finally(() => setLoadingAgents(false));
    }, [listTab]);
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
    // Per-xabar 3-dot menyu (Telegram uslub — barcha kam ishlatiluvchi amallar shu yerda)
    const [msgMenuFor, setMsgMenuFor] = useState<string | null>(null);
    // Chat list per-item 3-dot menyu
    const [convMenuFor, setConvMenuFor] = useState<string | null>(null);
    // Chatni o'chirish modal — 3 varinat: o'zim uchun / ikkala tomon / vaqtinchalik yashirish
    const [deleteChatFor, setDeleteChatFor] = useState<string | null>(null);
    // Yashirin (vaqtinchalik o'chirilgan) chatlar bo'limi ochilganmi
    const [showHidden, setShowHidden] = useState(false);
    const [hiddenCount, setHiddenCount] = useState(0);
    // "Yangi suhbat" — Telegram uslub PenSquare tugma + user search dropdown
    const [newDmOpen, setNewDmOpen] = useState(false);
    const [newDmQuery, setNewDmQuery] = useState("");
    interface NewDmUser { name: string | null; username: string | null; image: string | null; verified: boolean; isMe: boolean }
    const [newDmResults, setNewDmResults] = useState<NewDmUser[]>([]);
    const [newDmBusy, setNewDmBusy] = useState(false);
    const newDmRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!newDmOpen) return;
        function onDown(e: MouseEvent) {
            if (newDmRef.current?.contains(e.target as Node)) return;
            setNewDmOpen(false); setNewDmQuery(""); setNewDmResults([]);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [newDmOpen]);
    useEffect(() => {
        if (!newDmOpen) return;
        const q = newDmQuery.trim();
        if (!q) { setNewDmResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const d = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}`).then(r => r.json());
                setNewDmResults((d.users ?? []).filter((u: NewDmUser) => !u.isMe && u.username));
            } catch { setNewDmResults([]); }
        }, 300);
        return () => clearTimeout(t);
    }, [newDmOpen, newDmQuery]);
    async function openNewConversation(u: NewDmUser) {
        if (!u.username || newDmBusy) return;
        setNewDmBusy(true);
        try {
            const r = await fetch("/api/nexus/messages", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
            if (r.ok) {
                const d = await r.json();
                setSelectedId(d.conversationId);
                setNewDmOpen(false); setNewDmQuery(""); setNewDmResults([]);
                loadConvs();
            }
        } finally { setNewDmBusy(false); }
    }
    // Info panel batafsil ko'rinishi (Photos/Videos/Voice/... alohida sahifa)
    const [infoView, setInfoView] = useState<string | null>(null);
    useEffect(() => { setInfoView(null); }, [selectedId]);
    // Umumiy guruh/kanallar (info panel'da ko'rsatiladi)
    interface CommonChannel { id: string; type: "CHANNEL" | "GROUP"; name: string; handle: string | null; avatarUrl: string | null; memberCount: number; isSystem: boolean }
    const [commonGroups, setCommonGroups] = useState<CommonChannel[]>([]);
    const [commonChannels, setCommonChannels] = useState<CommonChannel[]>([]);
    useEffect(() => {
        if (!peer?.id || peer.id === myProfileId) { setCommonGroups([]); setCommonChannels([]); return; }
        fetch(`/api/nexus/common-channels?peerId=${encodeURIComponent(peer.id)}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : { groups: [], channels: [] })
            .then(d => { setCommonGroups(d.groups ?? []); setCommonChannels(d.channels ?? []); })
            .catch(() => { setCommonGroups([]); setCommonChannels([]); });
    }, [peer?.id, myProfileId]);
    // Browser tab title + favicon badge — o'qilmagan xabarlar soni
    const totalUnread = convs.filter(c => c.unread && !c.muted && !c.isSelf).length;
    useTabBadge(totalUnread);
    // Global DM message search (sidebar 'filter' input'iga yozganda)
    interface GlobalSearchItem {
        messageId: string; conversationId: string; text: string;
        createdAt: string; mine: boolean; isSelf: boolean;
        peer: { id: string; name: string | null; username: string | null; image: string | null } | null;
    }
    const [globalMsgResults, setGlobalMsgResults] = useState<GlobalSearchItem[]>([]);
    const [globalMsgBusy, setGlobalMsgBusy] = useState(false);
    useEffect(() => {
        const q = filter.trim();
        if (q.length < 2) { setGlobalMsgResults([]); return; }
        const t = setTimeout(async () => {
            setGlobalMsgBusy(true);
            try {
                const r = await fetch(`/api/nexus/messages/search-all?q=${encodeURIComponent(q)}&limit=15`, { cache: "no-store" });
                if (r.ok) {
                    const d = await r.json();
                    setGlobalMsgResults(d.items ?? []);
                }
            } catch { /* ignore */ }
            finally { setGlobalMsgBusy(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [filter]);
    // GIF picker (Giphy)
    const [gifPickerOpen, setGifPickerOpen] = useState(false);
    // Sticker picker
    const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
    // Sana picker — sana separator bosilsa kalendar ochiladi va shu kunga jump qiladi
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
    // Sidebar Settings menyu (Telegram uslub — sound/watermark/push ichida)
    const [sidebarSettingsOpen, setSidebarSettingsOpen] = useState(false);
    const sidebarSettingsRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!sidebarSettingsOpen) return;
        function onDown(e: MouseEvent) {
            if (sidebarSettingsRef.current?.contains(e.target as Node)) return;
            setSidebarSettingsOpen(false);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [sidebarSettingsOpen]);
    useEffect(() => {
        if (!convMenuFor) return;
        function onDown(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (t.closest("[data-conv-menu]")) return;
            setConvMenuFor(null);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [convMenuFor]);
    useEffect(() => {
        if (!msgMenuFor) return;
        function onDown(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (t.closest("[data-msg-menu]")) return;
            setMsgMenuFor(null);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [msgMenuFor]);
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
    const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
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
    const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
    const themeKey = (convId: string) => `nexus:dm:theme:${convId}`;
    const wallpaperKey = (convId: string) => `nexus:dm:wallpaper:${convId}`;
    // Chat almashinsa mavzuni tiklash
    useEffect(() => {
        if (!selectedId) return;
        try {
            setChatTheme(localStorage.getItem(themeKey(selectedId)) || "default");
            setCustomWallpaperUrl(localStorage.getItem(wallpaperKey(selectedId)));
        } catch { setChatTheme("default"); setCustomWallpaperUrl(null); }
    }, [selectedId]);
    function pickTheme(id: string) {
        if (!selectedId) return;
        setChatTheme(id);
        setCustomWallpaperUrl(null);
        try {
            if (id === "default") localStorage.removeItem(themeKey(selectedId));
            else localStorage.setItem(themeKey(selectedId), id);
            localStorage.removeItem(wallpaperKey(selectedId));
        } catch {}
        setThemePickerOpen(false);
    }
    // Custom wallpaper — foydalanuvchi rasmni Vercel Blob'ga yuklaydi.
    async function uploadWallpaper(file: File) {
        if (!selectedId || !file.type.startsWith("image/")) return;
        setUploadingWallpaper(true);
        try {
            // Vercel Blob client upload — mavjud infrastruktura
            const { upload } = await import("@vercel/blob/client");
            const blob = await upload(`wallpapers/${Date.now()}-${file.name}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
            });
            setCustomWallpaperUrl(blob.url);
            setChatTheme("default");
            try {
                localStorage.setItem(wallpaperKey(selectedId), blob.url);
                localStorage.removeItem(themeKey(selectedId));
            } catch {}
            setThemePickerOpen(false);
        } finally { setUploadingWallpaper(false); }
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
        void copyToClipboard(text);
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
    // Har suhbat uchun draft matn (chat list'da 'Draft: ...' ko'rsatish uchun)
    const [draftsByConv, setDraftsByConv] = useState<Map<string, string>>(new Map());
    // Jami draft soni (chat list badge uchun) — DM + kanal
    const [draftCount, setDraftCount] = useState(0);
    useEffect(() => {
        try {
            let n = 0;
            const dm = new Map<string, string>();
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                if ((k.startsWith(DRAFT_PREFIX) || k.startsWith(CH_DRAFT_PREFIX))
                    && localStorage.getItem(k)?.trim()) n++;
                if (k.startsWith(DRAFT_PREFIX)) {
                    const val = localStorage.getItem(k)?.trim();
                    if (val) dm.set(k.slice(DRAFT_PREFIX.length), val);
                }
            }
            setDraftCount(n);
            setDraftsByConv(dm);
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
            // Forward indikator UI'da alohida ko'rsatiladi (badge), matn oldiga prefix qo'shmaymiz.
            if (src.text) body.text = src.text;
            // Media (agent/transfer/poll/location'lar forward'ga tushmaydi — faqat oddiy media)
            if (src.mediaUrl && src.mediaType && ["image", "video", "audio", "file", "video-circle"].includes(src.mediaType)) {
                body.mediaUrl = src.mediaUrl;
                body.mediaType = src.mediaType;
                body.mediaMime = src.mediaMime;
                if (src.mediaName) body.mediaName = src.mediaName;
                if (typeof src.mediaSize === "number") body.mediaSize = src.mediaSize;
                if (typeof src.durationMs === "number") body.durationMs = src.durationMs;
            }
            // Forward indikator — asl yozuvchi ID va nomini olib o'tamiz.
            // Agar src o'zi forwarded bo'lsa, asl manba saqlanadi (zanjirlanmaydi).
            const su = session?.user as { profileId?: string | null; name?: string | null } | undefined;
            const origName = src.forwardedFromName
                ?? (src.mine ? (su?.name ?? null) : (peer?.name ?? peer?.username ?? null));
            const origId = src.forwardedFromId
                ?? (src.mine ? (su?.profileId ?? null) : (peer?.id ?? null));
            if (origId) body.forwardedFromId = origId;
            if (origName) body.forwardedFromName = origName;
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
            // Emoji burst — xabar joyidan yuqoriga uchadigan animatsiya (Telegram uslub).
            // Faqat reaksiya qo'shilganda (olib tashlanganda emas) — mine flag'i true bo'lgan reaksiyalar orasida shu emoji bor bo'lsa yangi qo'shildi deb hisoblaymiz.
            const added = (d.reactions ?? []).some((rx: { emoji: string; mine: boolean }) => rx.emoji === emoji && rx.mine);
            if (added && typeof window !== "undefined") {
                const el = document.querySelector(`[data-msg-id="${messageId}"]`) as HTMLElement | null;
                const rect = el?.getBoundingClientRect();
                const x = rect ? rect.left + rect.width / 2 - 20 : window.innerWidth / 2;
                const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
                window.dispatchEvent(new CustomEvent("nx:reaction:burst", { detail: { emoji, x, y } }));
            }
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

    // Composer mode: Ovoz yoki Dumaloq video (Telegram tap-swap uslubi)
    const [composerMode, setComposerMode] = useState<"voice" | "video">("voice");
    useEffect(() => {
        try {
            const saved = localStorage.getItem("nexus:composer:mode");
            if (saved === "voice" || saved === "video") setComposerMode(saved);
        } catch { /* ignore */ }
    }, []);
    function toggleComposerMode() {
        setComposerMode(prev => {
            const next: "voice" | "video" = prev === "voice" ? "video" : "voice";
            try { localStorage.setItem("nexus:composer:mode", next); } catch { /* ignore */ }
            return next;
        });
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

    // Dumaloq video yozish (Telegram hold-to-record + 1-daq chain)
    const VIDEO_MAX_SEC = 60;
    const videoRecorderRef = useRef<MediaRecorder | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const videoStartRef = useRef<number>(0);
    const videoCancelRef = useRef<boolean>(false);
    const videoHoldRef = useRef<boolean>(false); // barmoq hali bosilib turibdimi
    const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    // Katta markazlashgan preview (video xabar yozish paytida)
    const videoBigPreviewRef = useRef<HTMLVideoElement | null>(null);
    const [videoRecording, setVideoRecording] = useState(false);
    const [videoSeconds, setVideoSeconds] = useState(0);

    async function startVideoRecording() {
        if (videoRecording || uploading || !selectedId) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 480, height: 480, facingMode: "user" },
                audio: true,
            });
            videoStreamRef.current = stream;
            videoHoldRef.current = true;
            setVideoRecording(true);
            beginVideoSegment(stream);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Kameraga ruxsat berilmadi");
            videoHoldRef.current = false;
        }
    }

    function beginVideoSegment(stream: MediaStream) {
        videoChunksRef.current = [];
        videoCancelRef.current = false;
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus"
            : MediaRecorder.isTypeSupported("video/webm") ? "video/webm"
            : "";
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = e => { if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data); };
        rec.onstop = () => {
            const cancelled = videoCancelRef.current;
            if (!cancelled && videoChunksRef.current.length > 0) {
                const finalMime = rec.mimeType || "video/webm";
                const blob = new Blob(videoChunksRef.current, { type: finalMime });
                const file = new File([blob], `video-circle-${Date.now()}.webm`, { type: finalMime });
                void uploadFile(file, "video-circle");
            }
            // Chain: 1 daqiqa to'lgan va hali barmoq bosilib turgan bo'lsa yangi segment
            if (videoHoldRef.current && !cancelled) {
                beginVideoSegment(stream);
                return;
            }
            // Yakuniy to'xtash
            stream.getTracks().forEach(t => t.stop());
            videoStreamRef.current = null;
            setVideoRecording(false);
            setVideoSeconds(0);
        };
        videoRecorderRef.current = rec;
        videoStartRef.current = Date.now();
        rec.start(100);
        setVideoSeconds(0);
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        videoTimerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - videoStartRef.current) / 1000);
            setVideoSeconds(s);
            if (s >= VIDEO_MAX_SEC) {
                // 60s to'ldi — segmentni to'xtatib yuboramiz; chain onstop'da
                if (videoTimerRef.current) { clearInterval(videoTimerRef.current); videoTimerRef.current = null; }
                try { rec.stop(); } catch { /* ignore */ }
            }
        }, 200);
    }

    function stopVideoRecording(cancel = false) {
        videoHoldRef.current = false;
        videoCancelRef.current = cancel;
        if (videoTimerRef.current) { clearInterval(videoTimerRef.current); videoTimerRef.current = null; }
        try { videoRecorderRef.current?.stop(); } catch { /* ignore */ }
        videoRecorderRef.current = null;
    }

    useEffect(() => () => {
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        try { videoRecorderRef.current?.stop(); } catch { /* ignore */ }
        videoStreamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    // Hold-to-record dispatcher: mode'ga qarab video/voice boshlaydi
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdActiveRef = useRef(false);
    function handleHoldStart() {
        if (recording || videoRecording) return;
        holdActiveRef.current = false;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        // 200ms bosib tursa → recording; aks holda tap → mode swap
        holdTimerRef.current = setTimeout(() => {
            holdActiveRef.current = true;
            if (composerMode === "video") void startVideoRecording();
            else void startVoice();
        }, 200);
    }
    function handleHoldEnd(cancel = false) {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
        if (!holdActiveRef.current) {
            // Tez tap — mode toggle
            toggleComposerMode();
            return;
        }
        holdActiveRef.current = false;
        if (composerMode === "video") stopVideoRecording(cancel);
        else stopVoice(cancel);
    }

    // Video stream preview element'ga ulash (kichik + katta ikkalasi ham)
    useEffect(() => {
        if (!videoRecording || !videoStreamRef.current) return;
        for (const el of [videoPreviewRef.current, videoBigPreviewRef.current]) {
            if (el) {
                el.srcObject = videoStreamRef.current;
                el.play().catch(() => { /* autoplay-block */ });
            }
        }
    }, [videoRecording]);

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
                uploadFile(file, "audio");
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
    // Telegram uslub — attach menu (+ tugma)
    const [attachOpen, setAttachOpen] = useState(false);
    const attachMenuRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!attachOpen) return;
        function onClick(e: MouseEvent) {
            if (!attachMenuRef.current) return;
            if (!attachMenuRef.current.contains(e.target as Node)) setAttachOpen(false);
        }
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, [attachOpen]);

    // Group/Channel listni yuklash — "all" tab'da ikkalasi ham yuklanadi (birlashtirilgan)
    useEffect(() => {
        if (listTab !== "groups" && listTab !== "channels" && listTab !== "all") return;
        setLoadingChannels(true);
        if (listTab === "all") {
            Promise.all([
                fetch(`/api/nexus/channels?scope=mine&type=GROUP`).then(r => r.ok ? r.json() : { channels: [] }),
                fetch(`/api/nexus/channels?scope=mine&type=CHANNEL`).then(r => r.ok ? r.json() : { channels: [] }),
            ])
                .then(([g, c]) => setChannels([...(g.channels ?? []), ...(c.channels ?? [])]))
                .finally(() => setLoadingChannels(false));
        } else {
            const type = listTab === "groups" ? "GROUP" : "CHANNEL";
            fetch(`/api/nexus/channels?scope=mine&type=${type}`)
                .then(r => r.ok ? r.json() : { channels: [] })
                .then(d => setChannels(d.channels ?? []))
                .finally(() => setLoadingChannels(false));
        }
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
            const url = showHidden
                ? "/api/nexus/messages?hidden=1"
                : showArchived ? "/api/nexus/messages?archived=1" : "/api/nexus/messages";
            const r = await fetch(url, { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setConvs(d.conversations ?? []);
                setArchivedCount(d.archivedCount ?? 0);
                setHiddenCount(d.hiddenCount ?? 0);
            }
        } finally { setLoadingConvs(false); }
    }, [showArchived, showHidden]);
    useEffect(() => { loadConvs(); loadConvsRef.current = loadConvs; }, [loadConvs]);

    // Real-time push yoqilgan bo'lsa 6s polling — long fallback 30s
    // (Pusher yo'q bo'lsa yoki disconnect'da qopqoq)
    useEffect(() => {
        const interval = myProfileId ? 30_000 : 6_000;
        const t = setInterval(loadConvs, interval);
        return () => clearInterval(t);
    }, [loadConvs, myProfileId]);

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
                        lastSeenAt: d.other.lastSeenAt ?? null,
                    });
                }
                // Undelivered xabarlarni deliver qilish (o'qish PATCH mavjud, delivered alohida)
                const undelivered = (d.messages ?? []).filter((m: Msg) => !m.mine && !m.deliveredAt).map((m: Msg) => m.id);
                if (undelivered.length > 0) {
                    fetch("/api/nexus/messages/deliver", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ messageIds: undelivered }),
                    }).catch(() => {});
                }
            }
        } finally { setLoadingMsgs(false); }
    }, []);
    useEffect(() => {
        if (!selectedId) { setMessages([]); setPeer(null); return; }
        loadMsgs(selectedId);
        // Pusher real-time bo'lsa 20s fallback (edit/delete uchun),
        // aks holda 4s polling (Pusher yo'q brauzerlar uchun).
        const interval = myProfileId ? 20_000 : 4_000;
        const t = setInterval(() => loadMsgs(selectedId), interval);
        return () => clearInterval(t);
    }, [selectedId, loadMsgs, myProfileId]);

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

    // Sana bo'yicha jump — kalendar picker'dan chaqiriladi
    function jumpToDate(target: Date) {
        const d0 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
        const d1 = d0 + 24 * 3600 * 1000;
        // O'sha kuni birinchi xabarni topish (yoki eng yaqin keyingi)
        const targetMsg = messages.find(m => {
            const t = new Date(m.createdAt).getTime();
            return t >= d0 && t < d1;
        }) ?? messages.find(m => new Date(m.createdAt).getTime() >= d0);
        setDatePickerOpen(false);
        if (targetMsg) {
            setTimeout(() => jumpToMessage(targetMsg.id), 100);
        } else {
            alert("Bu kunda xabar yo'q");
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
            const body: Record<string, unknown> = {};
            if (p.replyToId) body.replyToId = p.replyToId;
            if (p.ttl) body.selfDestructSeconds = p.ttl;
            // E2E: agar ikkala tomonda kalit bor bo'lsa — matnni shifrlab yuboramiz
            const canE2e = !!(peerE2eKey && myE2eIdentity);
            let localMirror: string | null = null;   // UI'da darhol ko'rsatish uchun
            if (canE2e && p.text) {
                try {
                    const payload = await encryptForRecipient(peerE2eKey!.publicKey, p.text);
                    body.e2ePayload = { ...payload, senderKeyId: undefined };
                    localMirror = p.text;
                } catch {
                    // Shifrlash muvaffaqiyatsiz bo'lsa fallback — plaintext
                    body.text = p.text;
                }
            } else {
                body.text = p.text;
            }
            const r = await fetch(`/api/nexus/messages/${p.convId}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            if (r.ok) {
                const d = await r.json();
                // E2E xabar bo'lsa — client tomon ko'rsatish uchun deshifrlangan variantni qo'shamiz
                const msgOut = localMirror ? { ...d.message, e2eDecrypted: localMirror } : d.message;
                if (p.convId === selectedId) setMessages(m => [...m, msgOut]);
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

    const baseConvs = listTab === "unread" ? convs.filter(c => c.unread) : convs;
    const filteredConvs = filter.trim()
        ? baseConvs.filter(c => {
            const q = filter.toLowerCase();
            return (c.other?.name ?? "").toLowerCase().includes(q)
                || (c.other?.username ?? "").toLowerCase().includes(q)
                || (c.lastMessageText ?? "").toLowerCase().includes(q);
        })
        : baseConvs;

    return (
        <div className="flex w-full h-full min-h-0 pb-[88px]" style={{ background: "#050818" }}>
            {/* ── COL 1: Chat list ─────────────────────────────────────── */}
            <div className="w-[380px] flex-shrink-0 flex flex-col border-r"
                style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.55)" }}>
                {/* Tab bar (6 majburiy tab: All/Unread/DM/Groups/Channels/Agents) — 6-ustunli grid, swipe kerak emas */}
                <div className="p-2 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="grid grid-cols-6 gap-1">
                    {(() => {
                        // Tab bo'yicha o'qilmagan hisoblash (muted chatlar sanamaydi)
                        const unreadDMs = convs.filter(c => c.unread && !c.muted && !c.isSelf).length;
                        // Locale'ga qarab tarjima (uz default). RU "Непрочитанные" juda uzun bo'lgani uchun qisqartirilgan.
                        const L = TAB_LABELS[locale] ?? TAB_LABELS.uz;
                        // 380px sidebar → 6 tab teng bo'linadi, hech qanday scroll shart emas (desktop-friendly)
                        return ([
                            { id: "all" as const,      icon: Inbox,         label: L.all,       badge: unreadDMs },
                            { id: "unread" as const,   icon: BellOff,       label: L.unread,    badge: unreadDMs },
                            { id: "private" as const,  icon: MessageSquare, label: L.private,   badge: unreadDMs },
                            { id: "groups" as const,   icon: Users,         label: L.groups,    badge: 0 },
                            { id: "channels" as const, icon: Hash,          label: L.channels,  badge: 0 },
                            { id: "agents" as const,   icon: BotIcon,       label: L.agents,    badge: 0 },
                        ]).map(t => (
                            <button key={t.id}
                                onClick={() => setListTab(t.id)}
                                title={t.label}
                                className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold transition relative"
                                style={listTab === t.id ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                    color: "#fff",
                                } : {
                                    background: "rgba(43,62,232,0.06)",
                                    color: "rgba(140,160,210,0.80)",
                                    border: "1px solid rgba(43,62,232,0.15)",
                                }}>
                                <t.icon className="w-3.5 h-3.5" />
                                <span className="leading-none">{t.label}</span>
                                {t.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                                        style={{
                                            background: listTab === t.id ? "#fff" : "#00CEC8",
                                            color: listTab === t.id ? "#2B3EE8" : "#0B1228",
                                        }}>
                                        {t.badge > 99 ? "99+" : t.badge}
                                    </span>
                                )}
                            </button>
                        ));
                    })()}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                    <div className="flex-1" />
                    {(listTab === "groups" || listTab === "channels") && (
                        <button
                            onClick={() => setCreateChannelOpen(listTab === "groups" ? "GROUP" : "CHANNEL")}
                            title={`Yangi ${listTab === "groups" ? "guruh" : "kanal"}`}
                            className="w-9 flex-shrink-0 flex items-center justify-center rounded-lg transition"
                            style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.30)" }}>
                            <Plus className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        </button>
                    )}
                    {listTab === "agents" && (
                        <button
                            onClick={() => setAgentCreateOpen(true)}
                            title="Yangi agent"
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
                    {/* Sidebar sozlamalari menyusi (Sound/Watermark/Push) — Telegram uslub */}
                    {isDmListTab && (
                        <div className="relative" ref={sidebarSettingsRef}>
                            <button
                                onClick={() => setSidebarSettingsOpen(v => !v)}
                                title="Sozlamalar"
                                className="w-9 h-9 flex items-center justify-center rounded-lg transition"
                                style={{
                                    background: sidebarSettingsOpen ? "rgba(0,206,200,0.14)" : "rgba(43,62,232,0.06)",
                                    border: `1px solid ${sidebarSettingsOpen ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                                }}>
                                <Settings className="w-4 h-4" style={{ color: sidebarSettingsOpen ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                            </button>
                            {sidebarSettingsOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-30"
                                    style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                    <button onClick={() => { toggleSound(); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                        {soundOn
                                            ? <Volume2 className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            : <VolumeX className="w-4 h-4" style={{ color: "#EF4444" }} />
                                        }
                                        <span className="flex-1">{soundOn ? "Tovush yoqilgan" : "Tovush o'chiq"}</span>
                                    </button>
                                    <button onClick={() => { toggleWatermark(); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                        <span className="w-4 h-4 flex items-center justify-center text-[9px] font-black rounded"
                                            style={{ background: watermarkOn ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.20)", color: watermarkOn ? "#00CEC8" : "rgba(160,176,224,0.85)" }}>WM</span>
                                        <span className="flex-1">{watermarkOn ? "Watermark yoqilgan" : "Watermark o'chiq"}</span>
                                    </button>
                                    {pushState !== "unsupported" && (
                                        <button onClick={() => { togglePush(); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                            {pushState === "subscribed"
                                                ? <Bell className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                                : <BellOff className="w-4 h-4" style={{ color: pushState === "denied" ? "#EF4444" : "rgba(160,176,224,0.85)" }} />
                                            }
                                            <span className="flex-1">
                                                {pushState === "subscribed" ? "Push bildirishnoma"
                                                    : pushState === "denied" ? "Push bloklangan"
                                                    : "Push yoqish"}
                                            </span>
                                        </button>
                                    )}
                                    {/* Yashirin chatlar (vaqtinchalik o'chirilganlar) — tekshiruv rejimidan chiqish */}
                                    <button
                                        onClick={() => { setShowHidden(v => !v); setShowArchived(false); setSidebarSettingsOpen(false); setSelectedId(null); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left border-t"
                                        style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                        {showHidden
                                            ? <Eye className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            : <EyeOff className="w-4 h-4" style={{ color: hiddenCount > 0 ? "#F59E0B" : "rgba(160,176,224,0.85)" }} />
                                        }
                                        <span className="flex-1">{showHidden ? "Oddiy ro'yxatga qaytish" : "Yashirin chatlar"}</span>
                                        {hiddenCount > 0 && !showHidden && (
                                            <span className="min-w-[18px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                                                style={{ background: "#F59E0B", color: "#0B1228" }}>{hiddenCount}</span>
                                        )}
                                    </button>
                                    <button onClick={() => { setShortcutsHelpOpen(true); setSidebarSettingsOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left border-t"
                                        style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                        <span className="w-4 h-4 flex items-center justify-center text-[9px] font-black rounded"
                                            style={{ background: "rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.85)" }}>?</span>
                                        <span className="flex-1">Klaviatura yorliqlari</span>
                                    </button>
                                    <div className="px-3 py-2 border-t text-[10px]"
                                        style={{ borderColor: "rgba(43,62,232,0.15)", color: "rgba(140,160,210,0.65)" }}>
                                        Rasm va videolar asl sifatida yuklanadi (siqilish yo&apos;q). Watermark faqat rasmga qo&apos;shiladi (yoqilgan bo&apos;lsa).
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                {isDmListTab && (
                    <div className="p-3 flex-shrink-0 space-y-2" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 min-w-0">
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
                            {/* Telegram uslub — "Yangi suhbat" (compose) tugma */}
                            <div className="relative" ref={newDmRef}>
                                <button
                                    onClick={() => setNewDmOpen(v => !v)}
                                    title="Yangi suhbat"
                                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition active:scale-95"
                                    style={{
                                        background: newDmOpen
                                            ? "linear-gradient(135deg,#2B3EE8,#00CEC8)"
                                            : "rgba(0,206,200,0.12)",
                                        border: `1px solid ${newDmOpen ? "transparent" : "rgba(0,206,200,0.30)"}`,
                                    }}>
                                    <PenSquare className="w-4 h-4" style={{ color: newDmOpen ? "#fff" : "#00CEC8" }} />
                                </button>
                                {newDmOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-30 flex flex-col"
                                        style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)", maxHeight: 360 }}>
                                        <div className="p-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                                            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.55)" }} />
                                            <input
                                                autoFocus
                                                value={newDmQuery}
                                                onChange={e => setNewDmQuery(e.target.value)}
                                                placeholder="Foydalanuvchi qidirish..."
                                                className="flex-1 h-8 bg-transparent text-white text-sm focus:outline-none"
                                            />
                                            <button onClick={() => { setNewDmOpen(false); setNewDmQuery(""); setNewDmResults([]); }}
                                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.08]">
                                                <X className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {newDmQuery.trim() === "" ? (
                                                <p className="px-4 py-6 text-center text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                    Ism yoki @username yozib qidiring
                                                </p>
                                            ) : newDmResults.length === 0 ? (
                                                <p className="px-4 py-6 text-center text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                    Hech kim topilmadi
                                                </p>
                                            ) : (
                                                newDmResults.map((u, i) => (
                                                    <button key={i} onClick={() => openNewConversation(u)}
                                                        disabled={newDmBusy}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] text-left disabled:opacity-60">
                                                        {u.image
                                                            ? <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-white" />
                                                            : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                                {(u.name || u.username || "?")[0]?.toUpperCase()}
                                                            </div>
                                                        }
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1">
                                                                <p className="text-sm font-bold text-white truncate">{u.name || u.username}</p>
                                                                {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                            </div>
                                                            {u.username && (
                                                                <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                                    @{u.username}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Mening statusim */}
                        <button onClick={() => setStatusModalOpen(true)}
                            className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg transition hover:bg-white/[0.04] text-left"
                            style={{
                                background: myStatus.emoji || myStatus.text ? "rgba(0,206,200,0.08)" : "rgba(43,62,232,0.06)",
                                border: `1px solid ${myStatus.emoji || myStatus.text ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.15)"}`,
                            }}>
                            {(() => {
                                const StatusIcon = statusIconForKey(myStatus.emoji);
                                const statusColor = statusColorForKey(myStatus.emoji);
                                if (StatusIcon) return <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: statusColor ?? "#00CEC8" }} />;
                                return <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: myStatus.text ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />;
                            })()}
                            <span className="text-[11px] truncate flex-1" style={{ color: myStatus.text ? "#00CEC8" : "rgba(140,160,210,0.75)" }}>
                                {myStatus.text || "Maxsus status qo'shish"}
                            </span>
                        </button>
                        {/* Faqat 2 ta panel-toggle: Saqlangan + Drafts (Sound/WM/Push Settings menyuga o'tdi) */}
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
                        </div>
                    </div>
                )}

                {/* Arxiv toggle — faqat DM-list tab'lari uchun */}
                {isDmListTab && !showHidden && (archivedCount > 0 || showArchived) && (
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
                {/* Yashirin chatlar banner — showHidden = true bo'lganda ko'rinadi */}
                {showHidden && (
                    <button onClick={() => { setShowHidden(false); setSelectedId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b transition hover:bg-white/[0.04]"
                        style={{
                            borderColor: "rgba(245,158,11,0.30)",
                            background: "rgba(245,158,11,0.08)",
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(245,158,11,0.20)" }}>
                            <EyeOff className="w-4 h-4" style={{ color: "#F59E0B" }} />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>
                                Yashirin chatlar
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(245,158,11,0.75)" }}>
                                ← Oddiy ro&apos;yxatga qaytish
                            </p>
                        </div>
                    </button>
                )}
                <div className="flex-1 overflow-y-auto nx-scrollbar">
                    {listTab === "agents" ? (
                        // Agents ro'yxati
                        loadingAgents ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                            </div>
                        ) : (
                            <>
                                <div className="px-3 py-2 border-b flex items-center justify-between gap-2"
                                    style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                                    <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.75)" }}>
                                        {agentsUnlimited
                                            ? `${agents.filter(a => !a.isSystem).length} ta agentingiz (limit yo'q)`
                                            : `${agents.filter(a => !a.isSystem).length} / ${agentsMax ?? 10} agent`}
                                    </p>
                                    <button onClick={() => setAgentCreateOpen(true)}
                                        className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                        <Plus className="w-3 h-3" /> Yaratish
                                    </button>
                                </div>
                                {agents.length === 0 ? (
                                    <div className="text-center py-10 px-4 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        Hali agent yo&apos;q — &quot;Yaratish&quot; tugmasini bosing
                                    </div>
                                ) : agents.map(a => (
                                    <button key={a.id}
                                        onClick={() => a.username && openNewConversation({ name: a.name, username: a.username, image: a.image, verified: false, isMe: false })}
                                        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b hover:bg-white/[0.04]"
                                        style={{ borderColor: "rgba(43,62,232,0.06)" }}>
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center relative"
                                            style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                            {a.image
                                                ? <img src={a.image} alt="" className="w-full h-full object-cover" />
                                                : <BotIcon className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                            }
                                            {a.isSystem && (
                                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ background: "#00CEC8" }}>
                                                    <Shield className="w-2.5 h-2.5" style={{ color: "#0B1228" }} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="text-sm font-bold text-white truncate">{a.name ?? a.username}</p>
                                                {a.isSystem && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                {a.isSystem && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                                                        style={{ background: "rgba(0,206,200,0.18)", color: "#00CEC8" }}>RASMIY</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                @{a.username}{a.module && a.module !== "CUSTOM" && a.module !== "MAIN" ? ` · ${a.module.toLowerCase()}` : ""}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )
                    ) : (listTab === "groups" || listTab === "channels") ? (
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
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                        {c.isSystem && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        {c.isSystem && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                                                style={{ background: "rgba(0,206,200,0.18)", color: "#00CEC8" }}>RASMIY</span>
                                        )}
                                    </div>
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
                    ) : filteredConvs.length === 0 && !(listTab === "all" && (agents.length > 0 || channels.length > 0)) ? (
                        <div className="text-center py-10 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                            Suhbatlar yo&apos;q
                        </div>
                    ) : filteredConvs.map(c => (
                        <div key={c.conversationId} className="group relative"
                            style={convMenuFor === c.conversationId ? { zIndex: 50 } : undefined}>
                            <button
                                onClick={() => {
                                    // Chat lock — qulflangan bo'lsa avval unlock so'raymiz
                                    if (isLocked(c.conversationId) && !isUnlockedNow(c.conversationId)) {
                                        setLockModal({ convId: c.conversationId, mode: "unlock" });
                                        return;
                                    }
                                    setSelectedId(c.conversationId);
                                }}
                                onContextMenu={(e) => { e.preventDefault(); toggleConvPin(c.conversationId, !!c.pinned); }}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b"
                                style={{
                                    borderColor: "rgba(43,62,232,0.06)",
                                    background: selectedId === c.conversationId
                                        ? "rgba(43,62,232,0.18)"
                                        : c.pinned ? "rgba(0,206,200,0.04)" : "transparent",
                                }}>
                                {(() => {
                                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                    lockTick; // force re-eval on localStorage o'zgargach
                                    const locked = isLocked(c.conversationId) && !isUnlockedNow(c.conversationId);
                                    return locked ? (
                                        <>
                                            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                                                style={{ background: "linear-gradient(135deg,#1a1a3a,#2a1a4a)" }}>
                                                <Lock className="w-5 h-5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">Yopiq suhbat</p>
                                                <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                    Ochish uchun ustiga bosing
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ConvAvatar other={c.other} online={!c.isSelf && !!c.other?.id && isOnline(c.other.id)} isSelf={c.isSelf} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-bold text-white truncate">
                                                        {c.isSelf ? "Saqlangan xabarlar" : (c.other?.name ?? (c.other?.username ? `@${c.other.username}` : "Ismsiz"))}
                                                    </p>
                                                    {c.isSelf && <Bookmark className="w-3 h-3" style={{ color: "#F59E0B" }} fill="#F59E0B" />}
                                                    {!c.isSelf && c.other?.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </div>
                                                {(() => {
                                                    const draft = draftsByConv.get(c.conversationId);
                                                    const isTyping = !!(c.other?.id && typingByPeerId.has(c.other.id));
                                                    // Prioritet: 1) typing, 2) draft, 3) oxirgi xabar
                                                    if (isTyping) {
                                                        return <p className="text-[11px] truncate" style={{ color: "#00CEC8" }}>yozmoqda...</p>;
                                                    }
                                                    if (draft && c.conversationId !== selectedId) {
                                                        return (
                                                            <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                                <span className="font-black" style={{ color: "#F59E0B" }}>Draft: </span>
                                                                <span>{draft}</span>
                                                            </p>
                                                        );
                                                    }
                                                    return (
                                                        <p className="text-[11px] truncate" style={{ color: c.unread ? "#FFFFFF" : "rgba(140,160,210,0.70)" }}>
                                                            {c.isSelf
                                                                ? (c.lastMessageText || "O'zingizga xabar yozing")
                                                                : `${c.lastMine ? "Siz: " : ""}${c.lastMessageText ?? ""}`}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    );
                                })()}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {/* Telegram uslub — vaqt tepada */}
                                    <span className="text-[10px] tabular-nums" style={{ color: c.unread ? "#00CEC8" : "rgba(140,160,210,0.65)" }}>
                                        {formatConvTime(c.lastMessageAt)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {isLocked(c.conversationId) && <Lock className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                        {c.muted && <BellOff className="w-3 h-3" style={{ color: "rgba(140,160,210,0.65)" }} />}
                                        {c.pinned && <Pin className="w-3 h-3" style={{ color: "rgba(0,206,200,0.75)" }} />}
                                        {c.unread && (
                                            <span className="w-2 h-2 rounded-full"
                                                style={{
                                                    background: c.muted ? "rgba(140,160,210,0.60)" : "#00CEC8",
                                                    boxShadow: c.muted ? "none" : "0 0 6px rgba(0,206,200,0.7)",
                                                }} />
                                        )}
                                    </div>
                                </div>
                            </button>
                            {/* Hover'da bitta 3-dot menyu — barcha amallar shu yerda.
                                Menu ochilganda opacity-100 ushlanadi (aks holda hover chiqishi bilan yopiladi) */}
                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 transition ${convMenuFor === c.conversationId ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} data-conv-menu>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setConvMenuFor(convMenuFor === c.conversationId ? null : c.conversationId); }}
                                    title="Amallar"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "rgba(11,18,40,0.92)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 2px 6px rgba(0,0,0,0.40)" }}>
                                    <MoreVertical className="w-3.5 h-3.5" style={{ color: "rgba(200,215,245,0.95)" }} />
                                </button>
                                {convMenuFor === c.conversationId && (
                                    <div className="absolute right-0 top-full mt-1 z-40 rounded-xl overflow-hidden min-w-[180px]"
                                        onClick={e => e.stopPropagation()}
                                        onMouseDown={e => e.stopPropagation()}
                                        style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                        <MsgMenuItem
                                            icon={c.pinned ? PinOff : Pin}
                                            label={c.pinned ? "Pindan olish" : "Pinga qo'yish"}
                                            accent={!!c.pinned}
                                            onClick={() => { toggleConvPin(c.conversationId, !!c.pinned); setConvMenuFor(null); }}
                                        />
                                        <MsgMenuItem
                                            icon={c.muted ? Bell : BellOff}
                                            label={c.muted ? "Ovozni qaytarish" : "Ovozsizlantirish"}
                                            accent={!!c.muted}
                                            onClick={() => { toggleConvMute(c.conversationId, !!c.muted); setConvMenuFor(null); }}
                                        />
                                        <MsgMenuItem
                                            icon={showArchived ? ArchiveRestore : Archive}
                                            label={showArchived ? "Arxivdan chiqarish" : "Arxivga qo'yish"}
                                            onClick={() => { toggleConvArchive(c.conversationId, !!c.archived || showArchived); setConvMenuFor(null); }}
                                        />
                                        <MsgMenuItem
                                            icon={isLocked(c.conversationId) ? Unlock : Lock}
                                            label={isLocked(c.conversationId)
                                                ? (isUnlockedNow(c.conversationId) ? "Chatni qayta yopish" : "Qulfni olib tashlash")
                                                : "Chatni qulflash"}
                                            accent={isLocked(c.conversationId)}
                                            onClick={() => {
                                                setConvMenuFor(null);
                                                const locked = isLocked(c.conversationId);
                                                if (!locked) {
                                                    setLockModal({ convId: c.conversationId, mode: "setup" });
                                                } else if (isUnlockedNow(c.conversationId)) {
                                                    lockNow(c.conversationId);
                                                    if (selectedIdRef.current === c.conversationId) setSelectedId(null);
                                                    rerenderLocks();
                                                } else {
                                                    setLockModal({ convId: c.conversationId, mode: "remove" });
                                                }
                                            }}
                                        />
                                        <div className="h-px" style={{ background: "rgba(43,62,232,0.14)" }} />
                                        {showHidden ? (
                                            /* Yashirin rejimda: qaytarish (unhide) — DELETE /hide */
                                            <button
                                                onClick={async () => {
                                                    setConvMenuFor(null);
                                                    const r = await fetch(`/api/nexus/messages/${c.conversationId}/hide`, { method: "DELETE" });
                                                    if (r.ok) loadConvs();
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/[0.05] text-left transition"
                                                style={{ color: "#00CEC8" }}>
                                                <Eye className="w-4 h-4" /> Qaytarish (yashirindan)
                                            </button>
                                        ) : (
                                            /* Oddiy rejimda: 3-varinatli o'chirish modali */
                                            <button
                                                onClick={() => { setConvMenuFor(null); setDeleteChatFor(c.conversationId); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-red-500/10 text-left transition"
                                                style={{ color: "#EF4444" }}>
                                                <Trash2 className="w-4 h-4" /> Chatni o&apos;chirish
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* "All" tab uchun qo'shimcha: Agentlar + Kanallar/Guruhlar
                        (DMlardan keyin ketma-ket ko'rinadi — hamma joydan foydalanuvchi topadi) */}
                    {listTab === "all" && (
                        <>
                            {agents.length > 0 && (
                                <>
                                    <div className="px-3 pt-3 pb-1 flex items-center gap-2 border-t"
                                         style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                                        <BotIcon className="w-3 h-3" style={{ color: "rgba(0,206,200,0.75)" }} />
                                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>
                                            Agentlar
                                        </p>
                                        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "rgba(140,160,210,0.45)" }}>{agents.length}</span>
                                    </div>
                                    {agents.map(a => (
                                        <button key={`ag-${a.id}`}
                                            onClick={() => a.username && openNewConversation({ name: a.name, username: a.username, image: a.image, verified: false, isMe: false })}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b hover:bg-white/[0.04]"
                                            style={{ borderColor: "rgba(43,62,232,0.06)" }}>
                                            <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center relative"
                                                style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                                {a.image
                                                    ? <img src={a.image} alt="" className="w-full h-full object-cover" />
                                                    : <BotIcon className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                                                {a.isSystem && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                                          style={{ background: "#00CEC8" }}>
                                                        <Shield className="w-2 h-2" style={{ color: "#0B1228" }} />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className="text-sm font-bold text-white truncate">{a.name ?? a.username}</p>
                                                    {a.isSystem && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                </div>
                                                <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                    @{a.username}{a.module && a.module !== "CUSTOM" && a.module !== "MAIN" ? ` · ${a.module.toLowerCase()}` : ""}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                            {channels.length > 0 && (
                                <>
                                    <div className="px-3 pt-3 pb-1 flex items-center gap-2 border-t"
                                         style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                                        <Hash className="w-3 h-3" style={{ color: "rgba(0,206,200,0.75)" }} />
                                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>
                                            Kanal &amp; Guruh
                                        </p>
                                        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "rgba(140,160,210,0.45)" }}>{channels.length}</span>
                                    </div>
                                    {channels.map(c => (
                                        <button key={`ch-${c.id}`}
                                            onClick={() => setSelectedChannel(c.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b hover:bg-white/[0.04]"
                                            style={{
                                                borderColor: "rgba(43,62,232,0.06)",
                                                background: selectedChannel === c.id ? "rgba(43,62,232,0.18)" : "transparent",
                                            }}>
                                            <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                                                style={{ background: "rgba(43,62,232,0.15)" }}>
                                                {c.avatarUrl
                                                    ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    : (c.type === "CHANNEL" ? <Megaphone className="w-4 h-4 text-white/50" /> : <Users className="w-4 h-4 text-white/50" />)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                                    {c.isSystem && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                </div>
                                                <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                    {c.type === "CHANNEL" ? "Kanal" : "Guruh"}{c.handle ? ` · @${c.handle}` : ""} · {c.memberCount} a&apos;zo
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                    {/* Global message search results — filter uzunligi 2+ va natija bor bo'lsa */}
                    {isDmListTab && filter.trim().length >= 2 && (
                        <div className="border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <div className="px-3 py-2 flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Xabarlar ichidan
                                </p>
                                {globalMsgBusy && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#00CEC8" }} />}
                            </div>
                            {!globalMsgBusy && globalMsgResults.length === 0 && (
                                <p className="px-3 py-2 text-[11px]" style={{ color: "rgba(140,160,210,0.55)" }}>
                                    Xabar topilmadi
                                </p>
                            )}
                            {globalMsgResults.map(r => (
                                <button key={r.messageId}
                                    onClick={() => {
                                        setSelectedId(r.conversationId);
                                        setTimeout(() => jumpToMessage(r.messageId), 400);
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04] border-b"
                                    style={{ borderColor: "rgba(43,62,232,0.06)" }}>
                                    {r.isSelf ? (
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)" }}>
                                            <Bookmark className="w-4 h-4 text-white" fill="#fff" />
                                        </div>
                                    ) : r.peer?.image ? (
                                        <img src={r.peer.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {(r.peer?.name || r.peer?.username || "?")[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-white truncate flex-1">
                                                {r.isSelf ? "Saqlangan" : (r.peer?.name ?? r.peer?.username ?? "?")}
                                            </p>
                                            <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(140,160,210,0.55)" }}>
                                                {new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "rgba(200,215,245,0.85)" }}>
                                            {r.mine ? "Siz: " : ""}{highlightText(r.text ?? "", filter)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── COL 2: Selected chat/channel ─────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0"
                style={{
                    background: (selectedId && !selectedChannel)
                        ? (customWallpaperUrl
                            ? `linear-gradient(rgba(5,8,20,0.55), rgba(5,8,20,0.55)), url("${customWallpaperUrl}") center/cover no-repeat`
                            : (CHAT_THEMES[chatTheme] ?? CHAT_THEMES.default).bg)
                        : "rgba(11,18,40,0.35)",
                }}>
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
                                {listTab === "groups" ? "Guruhni tanlang"
                                    : listTab === "channels" ? "Kanalni tanlang"
                                    : listTab === "agents" ? "Agentni tanlang"
                                    : listTab === "unread" ? "O'qilmagan xabar yo'q"
                                    : "Suhbatni tanlang"}
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
                                        void copyToClipboard(text);
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
                            {/* Telegram uslub — avatar+nom bosilsa info paneli ochiladi/yopiladi */}
                            <button
                                type="button"
                                onClick={() => setShowInfo(v => !v)}
                                title={showInfo ? "Info panelni yopish" : "Suhbat haqida"}
                                className="flex-1 min-w-0 flex items-center gap-3 -mx-1 px-1 py-0.5 rounded-lg hover:bg-white/[0.04] transition text-left"
                            >
                                <ConvAvatar other={peer} online={!selectedConv?.isSelf && !!peer?.id && isOnline(peer.id)} isSelf={selectedConv?.isSelf} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-bold text-white truncate">
                                            {selectedConv?.isSelf
                                                ? "Saqlangan xabarlar"
                                                : (peer?.name ?? (peer?.username ? `@${peer.username}` : ""))}
                                        </p>
                                        {!selectedConv?.isSelf && peer?.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                        {!selectedConv?.isSelf && peer?.isAgent && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                                                style={{ background: "rgba(0,206,200,0.18)", color: "#00CEC8" }}>AGENT</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] flex items-center gap-1" style={{ color: peerTyping ? "#00CEC8" : "rgba(140,160,210,0.70)" }}>
                                        {selectedConv?.isSelf
                                            ? "faqat siz ko'rasiz"
                                            : peerTyping
                                            ? <span className="flex items-center gap-1">yozmoqda<span className="inline-flex gap-0.5">
                                                <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "0ms" }} />
                                                <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "150ms" }} />
                                                <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "300ms" }} />
                                            </span></span>
                                            : (peer?.statusEmoji || peer?.statusText)
                                                ? (() => {
                                                    const StatusIcon = statusIconForKey(peer?.statusEmoji);
                                                    const statusColor = statusColorForKey(peer?.statusEmoji);
                                                    return (
                                                        <>
                                                            {StatusIcon && <StatusIcon className="w-3 h-3" style={{ color: statusColor ?? undefined }} />}
                                                            <span className="truncate">{peer?.statusText}</span>
                                                        </>
                                                    );
                                                })()
                                            : peer?.id && isOnline(peer.id) ? "onlayn"
                                            : peer?.lastSeenAt ? formatLastSeen(peer.lastSeenAt, false)
                                            : peer?.username ? `@${peer.username}` : ""}
                                    </p>
                                </div>
                            </button>
                            {/* Phone + Video header'da (self-chat'dan tashqari — agentga ham ko'rinadi:
                                agent chaqiruvni qabul qilmaydi lekin tugma ko'rinishi kutilgan Telegram UX'ga mos) */}
                            {!selectedConv?.isSelf && (
                                <>
                                    <IconBtn icon={Phone} title="Ovozli chaqiruv"
                                        onClick={() => peer?.id && startCall(peer.id, "AUDIO")} />
                                    <IconBtn icon={Video} title="Video chaqiruv"
                                        onClick={() => peer?.id && startCall(peer.id, "VIDEO")} />
                                </>
                            )}
                            <IconBtn
                                icon={searchOpen ? X : Search}
                                title={searchOpen ? "Qidiruvni yopish" : "Suhbatda qidirish"}
                                onClick={() => { setSearchOpen(v => !v); setSearchQuery(""); }}
                            />
                            <div className="relative" ref={moreRef}>
                                <IconBtn icon={MoreVertical} title="Ko'proq" onClick={() => setMoreOpen(v => !v)} />
                                {moreOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-30"
                                        style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                        {/* Telegram uslub — chaqiruv variantlari More ichida */}
                                        {!peer?.isAgent && peer?.id && (
                                            <>
                                                <button onClick={() => { if (peer.id) startCall(peer.id, "AUDIO"); setMoreOpen(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                    <Phone className="w-4 h-4" style={{ color: "#00CEC8" }} /> Ovozli chaqiruv
                                                </button>
                                                <button onClick={() => { if (peer.id) startCall(peer.id, "VIDEO"); setMoreOpen(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left border-b"
                                                    style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                                    <Video className="w-4 h-4" style={{ color: "#00CEC8" }} /> Video chaqiruv
                                                </button>
                                            </>
                                        )}
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

                        {/* E2E banner — ikkalasi ham kalit bor bo'lsa */}
                        {e2eAvailable && peerE2eKey && myE2eIdentity && (
                            <NxE2eBanner
                                peerName={peer?.name ?? peer?.username ?? "Peer"}
                                peerFingerprint={peerE2eKey.fingerprint}
                                myFingerprint={myE2eIdentity.fingerprint}
                            />
                        )}

                        {/* Messages */}
                        <div ref={msgsContainerRef} className="flex-1 overflow-y-auto nx-scrollbar p-4 space-y-2 relative">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                </div>
                            ) : messages.length === 0 && !loadingMsgs ? (
                                <NxEmptyChat
                                    peerName={peer?.name ?? peer?.username ?? "Foydalanuvchi"}
                                    isSelf={!!selectedConv?.isSelf}
                                    onQuick={(txt) => { setInput(txt); }}
                                />
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
                                                    <button
                                                        onClick={() => {
                                                            // Bosilgan sanadagi oyni ochamiz
                                                            const d = new Date(m.createdAt);
                                                            setPickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                                                            setDatePickerOpen(true);
                                                        }}
                                                        title="Sana bo'yicha o'tish"
                                                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition hover:brightness-125 active:scale-95"
                                                        style={{ background: "rgba(11,18,40,0.85)", color: "rgba(160,176,224,0.75)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                                        {dateLabel}
                                                    </button>
                                                </div>
                                            )}
                                <div data-msg-id={m.id}
                                    onClick={() => { if (selectMode) toggleSelectMsg(m.id); }}
                                    onContextMenu={(e) => {
                                        // Right-click -> 3-dot menu (Telegram Web uslub). Select mode'da bloklamaymiz.
                                        if (selectMode) return;
                                        e.preventDefault();
                                        setMsgMenuFor(msgMenuFor === m.id ? null : m.id);
                                    }}
                                    className={`group flex items-center gap-1 ${m.mine ? "flex-row justify-end" : "flex-row-reverse justify-end"} ${selectMode ? "cursor-pointer" : ""} ${selectedIds.has(m.id) ? "rounded-lg py-1" : ""}`}
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
                                    {/* Hover amallar (Telegram uslub) — faqat 3 ta: Reaksiya, Javob, 3-dot */}
                                    <div className={`transition flex gap-1 flex-shrink-0 relative ${
                                        selectMode ? "hidden"
                                        : (msgMenuFor === m.id || reactPickerFor === m.id || translatePickerFor === m.id)
                                            ? "opacity-100"
                                            : "opacity-0 group-hover:opacity-100"
                                    }`}>
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
                                        <div className="relative" data-msg-menu>
                                            <button onClick={() => setMsgMenuFor(msgMenuFor === m.id ? null : m.id)} title="Ko'proq"
                                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                                style={{ background: msgMenuFor === m.id ? "rgba(0,206,200,0.18)" : "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                                <MoreVertical className="w-3 h-3" style={{ color: msgMenuFor === m.id ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                                            </button>
                                            {msgMenuFor === m.id && (
                                                <div className="absolute top-full mt-1 right-0 z-40 rounded-xl overflow-hidden min-w-[180px]"
                                                    style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                                    <MsgMenuItem icon={Forward} label="Yuborish" onClick={() => { setForwardMsg(m); setMsgMenuFor(null); }} />
                                                    <MsgMenuItem
                                                        icon={m.pinnedAt ? PinOff : Pin}
                                                        label={m.pinnedAt ? "Pindan olish" : "Pinlash"}
                                                        accent={!!m.pinnedAt}
                                                        onClick={() => { toggleMessagePin(m); setMsgMenuFor(null); }}
                                                    />
                                                    <MsgMenuItem
                                                        icon={m.bookmarked ? BookmarkCheck : Bookmark}
                                                        label={m.bookmarked ? "Saqlashdan olish" : "Saqlash"}
                                                        accent={!!m.bookmarked}
                                                        onClick={() => { toggleBookmark(m); setMsgMenuFor(null); }}
                                                    />
                                                    {m.mine && m.text && !m.mediaType && (
                                                        <MsgMenuItem icon={Edit3} label="Tahrirlash"
                                                            onClick={() => { setEditingId(m.id); setEditingText(m.text); setMsgMenuFor(null); }} />
                                                    )}
                                                    {m.text && (
                                                        <MsgMenuItem icon={Copy} label="Nusxa olish"
                                                            onClick={() => { copyMessage(m.text); setMsgMenuFor(null); }} />
                                                    )}
                                                    {m.text && (
                                                        <MsgMenuItem
                                                            icon={Languages}
                                                            label={translated[m.id] ? "Tarjimani yashirish" : "Tarjima qilish"}
                                                            accent={!!translated[m.id]}
                                                            onClick={() => {
                                                                if (translated[m.id]) { hideTranslation(m.id); setMsgMenuFor(null); }
                                                                else { setTranslatePickerFor(m.id); setMsgMenuFor(null); }
                                                            }}
                                                        />
                                                    )}
                                                    {m.text && (
                                                        <MsgMenuItem
                                                            icon={speakingId === m.id ? VolumeX : Volume2}
                                                            label={speakingId === m.id ? "TTS to'xtatish" : "Ovoz bilan o'qish"}
                                                            accent={speakingId === m.id}
                                                            onClick={() => { speakMessage(m.id, m.text); setMsgMenuFor(null); }}
                                                        />
                                                    )}
                                                    {m.mine && (
                                                        <MsgMenuItem icon={Trash2} label="O'chirish" danger
                                                            onClick={() => { deleteMessage(m.id); setMsgMenuFor(null); }} />
                                                    )}
                                                </div>
                                            )}
                                            {/* Tarjima sub-picker (menudan chaqiriladi) */}
                                            {translatePickerFor === m.id && (
                                                <div className="absolute top-full mt-1 right-0 z-40 flex gap-1 p-1.5 rounded-lg"
                                                    style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)" }}>
                                                    {(["uz", "ru", "en"] as const).map(lg => (
                                                        <button key={lg}
                                                            onClick={() => translateMessage(m.id, m.text, lg)}
                                                            className="text-[10px] font-black px-2.5 py-1.5 rounded hover:bg-white/[0.08]"
                                                            style={{ color: "rgba(220,230,255,0.95)" }}>
                                                            {lg === "uz" ? "UZ" : lg === "ru" ? "RU" : "EN"}
                                                        </button>
                                                    ))}
                                                    <button onClick={() => setTranslatePickerFor(null)}
                                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.08]">
                                                        <X className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {reactPickerFor === m.id && (
                                            <div className="absolute top-full mt-1 z-30 flex gap-1 p-1.5 rounded-lg"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                                {["❤️","👍","😂","😮","😢","🔥","🙏","👏"].map(e => (
                                                    <button key={e} onClick={() => toggleReaction(m.id, e)}
                                                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] active:scale-90 transition-transform">
                                                        <Emoji char={e} size={22} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`max-w-[70%] ${(m.mediaType === "sticker" || m.mediaType === "video-circle") ? "p-0" : "px-3.5 py-2"} text-sm whitespace-pre-wrap break-words`}
                                        style={{
                                            // Sticker va video-circle uchun bubble transparent (Telegram uslub — doiraviy video xabar)
                                            ...((m.mediaType === "sticker" || m.mediaType === "video-circle")
                                                ? { background: "transparent", color: m.mine ? "#fff" : "rgba(220,230,255,0.92)" }
                                                : m.mine
                                                    ? { background: "linear-gradient(135deg,#2B3EE8,#1a6fcc)", color: "#fff" }
                                                    : { background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(220,230,255,0.92)" }
                                            ),
                                            // Guruhlash: yuqori/pastki burchak radius'i mos ravishda yumshoq (sticker/circle uchun ta'siri yo'q)
                                            borderTopLeftRadius:  (m.mediaType === "sticker" || m.mediaType === "video-circle") ? 0 : (m.mine ? 16 : (groupWithPrev ? 4 : 16)),
                                            borderTopRightRadius: (m.mediaType === "sticker" || m.mediaType === "video-circle") ? 0 : (m.mine ? (groupWithPrev ? 4 : 16) : 16),
                                            borderBottomLeftRadius:  (m.mediaType === "sticker" || m.mediaType === "video-circle") ? 0 : (m.mine ? 16 : (groupWithNext ? 4 : 6)),
                                            borderBottomRightRadius: (m.mediaType === "sticker" || m.mediaType === "video-circle") ? 0 : (m.mine ? (groupWithNext ? 4 : 6) : 16),
                                        }}>
                                        {m.forwardedFromName && (
                                            <div className="flex items-center gap-1 mb-1.5 text-[10px] opacity-70"
                                                style={{ color: m.mine ? "rgba(255,255,255,0.85)" : "rgba(180,192,224,0.85)" }}>
                                                <Forward className="w-3 h-3" />
                                                <span>Yuborildi: <strong>{m.forwardedFromName}</strong></span>
                                            </div>
                                        )}
                                        {m.replyTo && (
                                            <button type="button"
                                                onClick={(e) => { e.stopPropagation(); if (m.replyTo) jumpToMessage(m.replyTo.id); }}
                                                title="Asl xabarga o'tish"
                                                className="w-full mb-2 pl-2 pr-2 py-1.5 rounded-md text-xs text-left transition hover:brightness-125 active:scale-[0.98] block"
                                                style={{
                                                    background: m.mine ? "rgba(0,0,0,0.20)" : "rgba(0,206,200,0.10)",
                                                    borderLeft: `3px solid ${m.mine ? "#fff" : "#00CEC8"}`,
                                                }}>
                                                <p className="font-bold text-[11px] mb-0.5"
                                                    style={{ color: m.mine ? "#fff" : "#00CEC8" }}>
                                                    {m.replyTo.mine ? "Siz" : (m.replyTo.senderName ?? "Foydalanuvchi")}
                                                </p>
                                                <p className="opacity-80 line-clamp-2">{m.replyTo.text || "(media)"}</p>
                                            </button>
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
                                        {m.mediaType === "image" && m.mediaUrl && (() => {
                                            const idx = galleryImages.findIndex(x => x.id === m.id);
                                            return (
                                                <NxMediaImage src={m.mediaUrl}
                                                    onOpen={() => { if (idx >= 0) setGalleryIdx(idx); }} />
                                            );
                                        })()}
                                        {m.mediaType === "video" && m.mediaUrl && (
                                            <NxMediaVideo src={m.mediaUrl} durationMs={m.durationMs} />
                                        )}
                                        {m.mediaType === "gif" && m.mediaUrl && (
                                            <NxMediaGif src={m.mediaUrl} />
                                        )}
                                        {m.mediaType === "sticker" && m.mediaUrl && (
                                            <img src={m.mediaUrl} alt={m.text ?? "sticker"} draggable={false}
                                                className="mb-1" style={{ width: 120, height: 120 }} />
                                        )}
                                        {m.mediaType === "audio" && m.mediaUrl && (
                                            <div className="mb-1">
                                                <NxVoicePlayer src={m.mediaUrl} mine={m.mine} seed={m.id} initialDurationMs={m.durationMs} enableTranscribe />
                                            </div>
                                        )}
                                        {m.mediaType === "video-circle" && m.mediaUrl && (
                                            <NxCirclePlayer src={m.mediaUrl} durationMs={m.durationMs} />
                                        )}
                                        {m.mediaType === "file" && m.mediaUrl && (() => {
                                            const isAudio = !!m.mediaMime?.startsWith("audio/")
                                                || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(m.mediaName ?? m.mediaUrl);
                                            if (isAudio) {
                                                return (
                                                    <NxAudioCard
                                                        src={m.mediaUrl}
                                                        name={m.mediaName ?? "Audio"}
                                                        sizeBytes={typeof m.mediaSize === "number" ? m.mediaSize : null}
                                                        mine={!!m.mine}
                                                    />
                                                );
                                            }
                                            // Oddiy fayl — yuklab olish kartochkasi
                                            return (
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
                                            );
                                        })()}
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
                                        {/* E2E: e2ePayload bo'lsa deshifrlangan matn ko'rsatiladi; hali deshifrlanmagan bo'lsa placeholder */}
                                        {m.e2ePayload && (
                                            <div className="flex items-start gap-1.5">
                                                <Lock className="w-3 h-3 mt-1 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                                <div className="flex-1 min-w-0">
                                                    {m.e2eDecrypted != null
                                                        ? <NxMarkdown text={m.e2eDecrypted} />
                                                        : <span className="text-xs opacity-60 italic">Shifrlangan xabar deshifrlanmoqda...</span>}
                                                </div>
                                            </div>
                                        )}
                                        {m.text && !m.e2ePayload && (
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
                                        {/* Tahrirlash endi inline emas — composer'da (Telegram uslub, edit banner bilan) */}
                                        {editingId === m.id && (
                                            <div className="flex items-center gap-1.5 text-[10.5px] font-bold mt-1"
                                                style={{ color: "rgba(0,206,200,0.85)" }}>
                                                <Edit3 className="w-3 h-3" />
                                                <span>Composer'da tahrirlanmoqda...</span>
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
                                                        <Emoji char={r.emoji} size={14} />
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
                                                    // 3 holat WhatsApp uslubida:
                                                    //   ✓ (kulrang)  — server qabul qildi (yuborildi)
                                                    //   ✓✓ (kulrang) — qurilma yetkazdi (deliveredAt)
                                                    //   ✓✓ (moviy)   — o'qildi (peerReadAt > createdAt)
                                                    const read = peerReadAt && new Date(m.createdAt) <= new Date(peerReadAt);
                                                    const delivered = !!m.deliveredAt;
                                                    if (read) return <CheckCheck className="w-3 h-3" style={{ color: "#00CEC8" }} strokeWidth={2.5} />;
                                                    if (delivered) return <CheckCheck className="w-3 h-3 opacity-70" strokeWidth={2.5} />;
                                                    return <Check className="w-3 h-3 opacity-70" strokeWidth={2.5} />;
                                                })()
                                            )}
                                        </div>
                                        {/* Bot invoice — to'lov so'rovi (Telegram uslub) */}
                                        {m.invoice && (
                                            <div className="mt-2 p-3 rounded-lg"
                                                style={{
                                                    background: m.mine ? "rgba(0,0,0,0.20)" : "rgba(245,158,11,0.10)",
                                                    border: `1px solid ${m.mine ? "rgba(255,255,255,0.15)" : "rgba(245,158,11,0.30)"}`,
                                                }}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Wallet className="w-4 h-4" style={{ color: m.mine ? "rgba(255,255,255,0.85)" : "#F59E0B" }} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider"
                                                        style={{ color: m.mine ? "rgba(255,255,255,0.75)" : "#F59E0B" }}>
                                                        To&apos;lov so&apos;rovi
                                                    </span>
                                                </div>
                                                <p className="text-xs mb-2" style={{ color: m.mine ? "rgba(255,255,255,0.85)" : "rgba(220,230,255,0.90)" }}>
                                                    {m.invoice.description}
                                                </p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-base font-black" style={{ color: m.mine ? "#fff" : "#F59E0B" }}>
                                                        {new Intl.NumberFormat("uz-UZ").format(m.invoice.amount)} {m.invoice.currency === "USD" ? "$" : "so'm"}
                                                    </span>
                                                    {m.invoicePaidAt ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold"
                                                            style={{ color: "#22C55E" }}>
                                                            <Check className="w-3.5 h-3.5" /> To&apos;langan
                                                        </span>
                                                    ) : m.mine ? (
                                                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                                                            To&apos;lov kutilmoqda
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!selectedId) return;
                                                                if (!confirm(`${new Intl.NumberFormat("uz-UZ").format(m.invoice!.amount)} ${m.invoice!.currency === "USD" ? "$" : "so'm"} to'lansinmi?`)) return;
                                                                const r = await fetch(`/api/nexus/messages/${selectedId}/pay-invoice`, {
                                                                    method: "POST", headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ messageId: m.id }),
                                                                });
                                                                const d = await r.json().catch(() => ({}));
                                                                if (r.ok) {
                                                                    setMessages(prev => prev.map(x => x.id === m.id
                                                                        ? { ...x, invoicePaidAt: new Date().toISOString() } : x));
                                                                } else {
                                                                    alert(d?.error ?? "To'lov muvaffaqiyatsiz");
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-black text-white transition hover:brightness-110 active:scale-95"
                                                            style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                                                            To&apos;lash
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Inline tugmalar (agent xabari uchun) — Telegram uslub */}
                                        {Array.isArray(m.buttons) && m.buttons.length > 0 && (
                                            <div className="mt-2 flex flex-col gap-1">
                                                {m.buttons.map((row, ri) => (
                                                    <div key={ri} className="flex gap-1">
                                                        {row.map((btn, bi) => (
                                                            <button
                                                                key={bi}
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (btn.url) {
                                                                        window.open(btn.url, "_blank", "noopener");
                                                                        return;
                                                                    }
                                                                    if (!btn.callbackData || !selectedId) return;
                                                                    await fetch(`/api/nexus/messages/${selectedId}/callback`, {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ messageId: m.id, callbackData: btn.callbackData }),
                                                                    }).catch(() => {});
                                                                }}
                                                                className="flex-1 min-w-0 py-1.5 px-2 rounded-md text-[11px] font-bold text-white truncate transition hover:brightness-110 active:scale-95"
                                                                style={{
                                                                    background: m.mine ? "rgba(255,255,255,0.14)" : "rgba(0,206,200,0.18)",
                                                                    border: `1px solid ${m.mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.35)"}`,
                                                                }}
                                                            >
                                                                {btn.text}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                        </div>
                                    );
                                });
                            })()}
                            <div ref={bottomRef} />
                            {showScrollDown && (
                                <div className="sticky bottom-3 flex justify-end pointer-events-none z-20">
                                <button onClick={scrollToBottom}
                                    className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 relative"
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
                                </div>
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
                                            <Emoji char={s.emoji} size={20} className="flex-shrink-0" />
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

                        {/* Video xabar yozish — o'rtada katta preview (foydalanuvchi o'zini ko'rsin) */}
                        {videoRecording && (
                            <div className="absolute inset-0 z-[65] flex items-center justify-center pointer-events-none"
                                style={{ background: "rgba(3,5,15,0.75)", backdropFilter: "blur(8px)" }}>
                                <div className="relative pointer-events-auto"
                                    style={{
                                        width: 360, height: 360,
                                        borderRadius: 24,
                                        overflow: "hidden",
                                        border: "2px solid rgba(239,68,68,0.55)",
                                        boxShadow: "0 24px 60px rgba(0,0,0,0.75), 0 0 60px rgba(239,68,68,0.25)",
                                    }}>
                                    <video ref={videoBigPreviewRef} muted playsInline autoPlay
                                        className="w-full h-full object-cover bg-black" />
                                    {/* Recording indicator + vaqt */}
                                    <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
                                        style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(239,68,68,0.45)", backdropFilter: "blur(6px)" }}>
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
                                        <span className="text-[12px] font-black tabular-nums text-white">
                                            {`${String(Math.floor(videoSeconds / 60)).padStart(2, "0")}:${String(videoSeconds % 60).padStart(2, "0")} / 1:00`}
                                        </span>
                                    </div>
                                    {/* Progress bar pastda */}
                                    <div className="absolute left-0 right-0 bottom-0 h-1"
                                        style={{ background: "rgba(255,255,255,0.20)" }}>
                                        <div className="h-full transition-all"
                                            style={{ width: `${Math.min(100, (videoSeconds / 60) * 100)}%`, background: "linear-gradient(90deg,#EF4444,#F97316)" }} />
                                    </div>
                                    {/* Yordamchi matn — kompozitor'dagi tugmalar chalg'itmasligi uchun */}
                                    <div className="absolute inset-x-0 bottom-6 text-center text-[10.5px] font-black pointer-events-none"
                                        style={{ color: "rgba(255,255,255,0.85)" }}>
                                        Pastdan yuborish yoki bekor qilish
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Edit banner (composer ustida) — Telegram uslub */}
                        {editingId && (() => {
                            const original = messages.find(m => m.id === editingId);
                            const originalText = original?.text ?? "";
                            return (
                                <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
                                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(0,206,200,0.06)" }}>
                                    <Edit3 className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <div className="flex-1 min-w-0 pl-2 border-l-2" style={{ borderColor: "#00CEC8" }}>
                                        <p className="text-[11px] font-bold" style={{ color: "#00CEC8" }}>Tahrirlash</p>
                                        <p className="text-xs truncate" style={{ color: "rgba(220,230,255,0.80)" }}>
                                            {originalText || "(bo'sh)"}
                                        </p>
                                    </div>
                                    <button onClick={() => { setEditingId(null); setEditingText(""); }} title="Bekor (Esc)"
                                        className="w-7 h-7 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(43,62,232,0.10)" }}>
                                        <X className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </button>
                                </div>
                            );
                        })()}
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
                        <div className="p-3 flex items-end gap-2 flex-shrink-0 relative"
                            style={{ borderTop: (replyTo || editingId) ? "none" : "1px solid rgba(43,62,232,0.14)", background: "rgba(8,12,32,0.55)" }}>
                            <input ref={fileInputRef} type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                                onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                        // Attach orqali audio yuborilsa "file" sifatida ko'rsatiladi
                                        // (voice message emas — u alohida hold-mic bilan yoziladi)
                                        const kind = f.type.startsWith("image/") ? "image"
                                            : f.type.startsWith("video/") ? "video"
                                            : f.type.startsWith("audio/") ? "file"
                                            : "file";
                                        uploadFile(f, kind);
                                    }
                                    e.target.value = "";
                                }}
                                className="hidden" />

                            {recording || videoRecording ? (
                                <>
                                    <ComposerBtn
                                        icon={Trash2}
                                        title="Bekor qilish"
                                        onClick={() => videoRecording ? stopVideoRecording(true) : stopVoice(true)}
                                        accent={false}
                                    />
                                    {videoRecording && videoStreamRef.current && (
                                        <div className="flex-shrink-0 relative overflow-hidden"
                                            style={{
                                                width: 40, height: 40,
                                                borderRadius: "44%",
                                                border: "2px solid rgba(0,206,200,0.60)",
                                            }}>
                                            <video ref={videoPreviewRef} muted playsInline autoPlay
                                                className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 flex items-center gap-3 px-4 h-10 rounded-xl"
                                        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
                                        <span className="text-xs font-bold text-white flex-1">
                                            {videoRecording ? "Video xabar yozilmoqda" : "Ovozli xabar yozilmoqda"}
                                        </span>
                                        <span className="text-xs font-black tabular-nums" style={{ color: "#EF4444" }}>
                                            {(() => {
                                                const s = videoRecording ? videoSeconds : recSeconds;
                                                return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
                                            })()}
                                            {videoRecording && <span className="opacity-70"> / 1:00</span>}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => videoRecording ? stopVideoRecording(false) : stopVoice(false)}
                                        title="Jo'natish"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Send className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Telegram uslub — bitta "+" tugma, ichida barcha ilovalar */}
                                    <div className="relative" ref={attachMenuRef}>
                                        <ComposerBtn icon={Plus} title="Ilova qo'shish" onClick={() => setAttachOpen(v => !v)} accent={attachOpen} loading={uploading || locBusy} />
                                        {attachOpen && (
                                            <div className="absolute bottom-full mb-2 left-0 z-30 rounded-2xl overflow-hidden p-2"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)", minWidth: 260 }}>
                                                <div className="grid grid-cols-3 gap-1">
                                                    <AttachMenuItem icon={Paperclip} label="Fayl" onClick={() => { setAttachOpen(false); fileInputRef.current?.click(); }} />
                                                    {/* GIF va Sticker olib tashlandi — emoji picker'ning 3-tabli qismida (Emoji/Sticker/GIF) mavjud */}
                                                    <AttachMenuItem icon={MapPin} label="Joylashuv" onClick={() => { setAttachOpen(false); setLocationPickerOpen(true); }} />
                                                    <AttachMenuItem icon={BarChart2} label="So'rovnoma" onClick={() => { setAttachOpen(false); setPollOpen(true); }} />
                                                    <AttachMenuItem icon={Wallet} label="Pul" onClick={() => { setAttachOpen(false); setTransferOpen(true); }} accent />
                                                    <AttachMenuItem
                                                        icon={Clock}
                                                        label="Jadval"
                                                        onClick={() => {
                                                            setAttachOpen(false);
                                                            if (!scheduleDateTime) {
                                                                const d = new Date(Date.now() + 3600 * 1000);
                                                                const pad = (n: number) => String(n).padStart(2, "0");
                                                                setScheduleDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                                                            }
                                                            setScheduleOpen(true);
                                                        }}
                                                    />
                                                    <AttachMenuItem
                                                        icon={nextTtl ? Flame : Timer}
                                                        label={nextTtl ? "Taymer" : "O'chuvchi"}
                                                        onClick={() => { setAttachOpen(false); setTtlPickerOpen(true); }}
                                                        accent={!!nextTtl}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location sub-picker (attach menu'dan chaqiriladi) */}
                                    {locationPickerOpen && (
                                        <div className="absolute bottom-full mb-2 left-3 z-30 rounded-lg overflow-hidden"
                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 200 }}>
                                            <div className="px-3 py-1.5 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>Joylashuv turi</p>
                                                <button onClick={() => setLocationPickerOpen(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08]">
                                                    <X className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                </button>
                                            </div>
                                            <button onClick={() => { sendLocation(); setLocationPickerOpen(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                <MapPin className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                Statik joylashuv
                                            </button>
                                            {[15, 60, 480].map(mins => (
                                                <button key={mins} onClick={() => { sendLocation(mins); setLocationPickerOpen(false); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/[0.06] text-left">
                                                    <MapPin className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                                    Jonli — {mins < 60 ? `${mins} daq` : `${mins / 60} soat`}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Schedule sub-picker */}
                                    {scheduleOpen && (
                                        <div className="absolute bottom-full mb-2 left-3 z-30 rounded-lg overflow-hidden p-3"
                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 260 }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>Qachon jo&apos;natilsin</p>
                                                <button onClick={() => setScheduleOpen(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08]">
                                                    <X className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                </button>
                                            </div>
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

                                    {/* TTL sub-picker */}
                                    {ttlPickerOpen && (
                                        <div className="absolute bottom-full mb-2 left-3 z-30 rounded-lg overflow-hidden"
                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)", minWidth: 160 }}>
                                            <div className="px-3 py-1.5 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>Taymer</p>
                                                <button onClick={() => setTtlPickerOpen(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08]">
                                                    <X className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                </button>
                                            </div>
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
                                    {/* Bot inline mode popover — "@botname query" */}
                                    <NxInlinePopover text={input} convId={selectedId} onSent={() => setInput("")} />
                                    {/* Bot commands autocomplete popover */}
                                    {cmdPopoverOpen && agentCommands.length > 0 && (() => {
                                        const filtered = agentCommands.filter(c => c.cmd.startsWith(cmdFilter));
                                        if (filtered.length === 0) return null;
                                        return (
                                            <div className="absolute bottom-full mb-2 left-3 z-40 rounded-xl overflow-hidden max-h-64 overflow-y-auto"
                                                style={{
                                                    background: "rgba(11,18,40,0.98)",
                                                    border: "1px solid rgba(43,62,232,0.35)",
                                                    boxShadow: "0 12px 32px rgba(0,0,0,0.60)",
                                                    minWidth: 280,
                                                }}>
                                                {filtered.map((c, i) => (
                                                    <button
                                                        key={c.cmd}
                                                        type="button"
                                                        onMouseDown={e => {
                                                            e.preventDefault();
                                                            setInput("/" + c.cmd);
                                                            setCmdPopoverOpen(false);
                                                            setTimeout(() => composerInputRef.current?.focus(), 0);
                                                        }}
                                                        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06] transition"
                                                        style={i === 0 ? { background: "rgba(0,206,200,0.10)" } : undefined}
                                                    >
                                                        <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: "#00CEC8" }}>
                                                            /{c.cmd}
                                                        </span>
                                                        <span className="text-xs text-white/70 truncate">{c.description}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    <NxComposerTextarea
                                        ref={composerInputRef}
                                        value={editingId ? editingText : input}
                                        onChange={v => {
                                            if (editingId) { setEditingText(v); return; }
                                            setInput(v);
                                            const now = Date.now();
                                            if (peer?.id && myProfileId && now - lastTypingSentRef.current > 2000) {
                                                sendTyping(peer.id, myProfileId, myName);
                                                lastTypingSentRef.current = now;
                                            }
                                            if (peer?.isAgent && agentCommands.length > 0 && /^\/[a-z0-9_]*$/i.test(v)) {
                                                setCmdPopoverOpen(true);
                                                setCmdFilter(v.slice(1).toLowerCase());
                                            } else {
                                                setCmdPopoverOpen(false);
                                            }
                                        }}
                                        onSubmit={() => { if (editingId) void saveEdit(); else send(); }}
                                        onKeyExtra={(e) => {
                                            if (emojiCode !== null && emojiCodeSuggestions.length > 0) {
                                                if (e.key === "ArrowDown") { e.preventDefault(); setEmojiCodeIdx(i => (i + 1) % emojiCodeSuggestions.length); return true; }
                                                if (e.key === "ArrowUp") { e.preventDefault(); setEmojiCodeIdx(i => (i - 1 + emojiCodeSuggestions.length) % emojiCodeSuggestions.length); return true; }
                                                if (e.key === "Enter" || e.key === "Tab") {
                                                    e.preventDefault();
                                                    const pick = emojiCodeSuggestions[emojiCodeIdx];
                                                    if (pick) insertEmojiShortcode(pick.emoji);
                                                    return true;
                                                }
                                                if (e.key === "Escape") { e.preventDefault(); setEmojiCode(null); return true; }
                                            }
                                            if (mentionQuery !== null && mentionSuggestions.length > 0) {
                                                if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionSuggestions.length); return true; }
                                                if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); return true; }
                                                if (e.key === "Enter" || e.key === "Tab") {
                                                    e.preventDefault();
                                                    const pick = mentionSuggestions[mentionIdx];
                                                    if (pick) insertMention(pick.username);
                                                    return true;
                                                }
                                                if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return true; }
                                            }
                                            if (editingId && e.key === "Escape") { e.preventDefault(); setEditingId(null); setEditingText(""); return true; }
                                            return false;
                                        }}
                                        placeholder={editingId ? "Tahrirlash..." : "Xabar yozing..."}
                                    />
                                    <ComposerBtn icon={Smile} title="Emoji" onClick={() => setEmojiOpen(v => !v)} accent={emojiOpen} />
                                    {editingId ? (
                                        // Tahrirlash rejimi: ✓ Saqlash / ✕ Bekor
                                        <>
                                            <button onClick={() => { setEditingId(null); setEditingText(""); }}
                                                title="Bekor (Esc)"
                                                className="w-10 h-10 rounded-xl flex items-center justify-center transition"
                                                style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                                <X className="w-4 h-4" style={{ color: "#EF4444" }} />
                                            </button>
                                            <button onClick={saveEdit} disabled={!editingText.trim()}
                                                title="Saqlash (Enter)"
                                                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                <Check className="w-4 h-4 text-white" />
                                            </button>
                                        </>
                                    ) : input.trim() ? (
                                        <button onClick={send} disabled={sending}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                                        </button>
                                    ) : (
                                        // Telegram uslubi: tap → mode swap (Mic <-> Camera), hold → yozib olish
                                        <button
                                            onPointerDown={handleHoldStart}
                                            onPointerUp={() => handleHoldEnd(false)}
                                            onPointerLeave={() => holdActiveRef.current && handleHoldEnd(true)}
                                            onPointerCancel={() => handleHoldEnd(true)}
                                            title={composerMode === "voice"
                                                ? "Ovozli xabar (bosib turing) — tap: video xabarga o'tish"
                                                : "Video xabar (bosib turing) — tap: ovozli xabarga o'tish"}
                                            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition active:scale-95 select-none"
                                            style={{ background: "rgba(43,62,232,0.08)", touchAction: "none" }}
                                        >
                                            {composerMode === "voice"
                                                ? <Mic className="w-4 h-4" style={{ color: "rgba(160,176,224,0.90)" }} />
                                                : <Camera className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            }
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Emoji picker (composer ustidagi popover) — 3 tabli: Emoji/Sticker/GIF */}
                            {emojiOpen && (
                                <EmojiPicker
                                    onPick={(emoji) => { setInput(prev => prev + emoji); }}
                                    onPickMedia={async (m) => {
                                        setEmojiOpen(false);
                                        if (!selectedId) return;
                                        try {
                                            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                                                method: "POST", headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    text: "",
                                                    mediaUrl: m.mediaUrl,
                                                    mediaType: m.kind === "GIF" ? "gif" : "sticker",
                                                    mediaMime: m.kind === "GIF"
                                                        ? "video/mp4"
                                                        : (m.mediaUrl.endsWith(".png") ? "image/png" : "image/webp"),
                                                }),
                                            });
                                            if (r.ok) {
                                                const d = await r.json();
                                                setMessages(mm => [...mm, d.message]);
                                                loadConvs();
                                            }
                                        } catch { /* ignore */ }
                                    }}
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
            {selectedId && !selectedChannel && showInfo && infoView && (
                <MediaDetailPanel
                    type={infoView}
                    messages={messages}
                    onBack={() => setInfoView(null)}
                    onOpenImage={i => setGalleryIdx(i)}
                />
            )}
            {selectedId && !selectedChannel && showInfo && !infoView && (
                <div className="w-[320px] flex-shrink-0 flex flex-col border-l overflow-y-auto nx-scrollbar"
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
                            {/* Media taqsimoti (kliklanuvchi — batafsil sahifa) */}
                            {Object.keys(chatStats.mediaCounts).length > 0 && (
                                <div className="space-y-0.5 mt-2">
                                    {Object.entries(chatStats.mediaCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                                        const meta = mediaTypeMeta(type);
                                        const Icon = meta.icon;
                                        return (
                                            <button key={type}
                                                onClick={() => setInfoView(type)}
                                                className="w-full flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition text-left">
                                                <span className="flex items-center gap-2" style={{ color: "rgba(180,195,235,0.90)" }}>
                                                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                                                    {meta.label}
                                                </span>
                                                <span className="flex items-center gap-1 font-bold" style={{ color: "#00CEC8" }}>
                                                    {count}
                                                    <ChevronRight className="w-3 h-3 opacity-60" />
                                                </span>
                                            </button>
                                        );
                                    })}
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

                    {/* Umumiy guruh + kanallar (Telegram uslub) */}
                    {(commonGroups.length > 0 || commonChannels.length > 0) && (
                        <div className="p-4 border-t space-y-2" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.55)" }}>
                                Umumiy
                            </p>
                            {commonGroups.length > 0 && (
                                <div>
                                    <p className="text-[10px] mb-1" style={{ color: "rgba(140,160,210,0.65)" }}>
                                        {commonGroups.length} umumiy guruh
                                    </p>
                                    <div className="space-y-1">
                                        {commonGroups.slice(0, 5).map(g => (
                                            <button key={g.id}
                                                onClick={() => { setListTab("groups"); setSelectedChannel(g.id); }}
                                                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] text-left"
                                                style={{ background: "rgba(43,62,232,0.06)" }}>
                                                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                                                    style={{ background: "rgba(43,62,232,0.15)" }}>
                                                    {g.avatarUrl
                                                        ? <img src={g.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        : <Users className="w-4 h-4" style={{ color: "rgba(180,195,235,0.60)" }} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-xs font-bold text-white truncate">{g.name}</p>
                                                        {g.isSystem && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                    </div>
                                                    <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                        {g.memberCount} a&apos;zo
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {commonChannels.length > 0 && (
                                <div>
                                    <p className="text-[10px] mb-1 mt-2" style={{ color: "rgba(140,160,210,0.65)" }}>
                                        {commonChannels.length} umumiy kanal
                                    </p>
                                    <div className="space-y-1">
                                        {commonChannels.slice(0, 5).map(g => (
                                            <button key={g.id}
                                                onClick={() => { setListTab("channels"); setSelectedChannel(g.id); }}
                                                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] text-left"
                                                style={{ background: "rgba(43,62,232,0.06)" }}>
                                                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                                                    style={{ background: "rgba(43,62,232,0.15)" }}>
                                                    {g.avatarUrl
                                                        ? <img src={g.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        : <Megaphone className="w-4 h-4" style={{ color: "rgba(180,195,235,0.60)" }} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-xs font-bold text-white truncate">{g.name}</p>
                                                        {g.isSystem && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                    </div>
                                                    <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                        {g.memberCount} a&apos;zo
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                        <div className="p-4 grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
                            {Object.entries(CHAT_THEMES).map(([id, t]) => (
                                <button key={id} onClick={() => pickTheme(id)}
                                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition"
                                    style={{
                                        background: (chatTheme === id && !customWallpaperUrl) ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                                        border: `1px solid ${(chatTheme === id && !customWallpaperUrl) ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                                    }}>
                                    <div className="w-14 h-14 rounded-lg"
                                        style={{ background: t.swatch, border: "1px solid rgba(255,255,255,0.10)" }} />
                                    <span className="text-[10px] font-bold" style={{ color: (chatTheme === id && !customWallpaperUrl) ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                            {/* Custom wallpaper — foydalanuvchi rasm yuklaydi */}
                            <label
                                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition cursor-pointer"
                                style={{
                                    background: customWallpaperUrl ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                                    border: `1px dashed ${customWallpaperUrl ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.35)"}`,
                                }}>
                                <input type="file" accept="image/*" className="hidden"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) void uploadWallpaper(f);
                                        e.target.value = "";
                                    }} />
                                <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden"
                                    style={{
                                        background: customWallpaperUrl
                                            ? `url("${customWallpaperUrl}") center/cover`
                                            : "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(0,206,200,0.15))",
                                        border: "1px solid rgba(255,255,255,0.10)",
                                    }}>
                                    {uploadingWallpaper
                                        ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} />
                                        : !customWallpaperUrl && <Plus className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                    }
                                </div>
                                <span className="text-[10px] font-bold" style={{ color: customWallpaperUrl ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>
                                    {customWallpaperUrl ? "Mening rasmim" : "Rasm yuklash"}
                                </span>
                            </label>
                        </div>
                        <p className="px-4 pb-4 text-[10px] text-center" style={{ color: "rgba(140,160,210,0.55)" }}>
                            Mavzu faqat sizga ko&apos;rinadi — brauzeringizda saqlanadi
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
            {/* Yangi agent yaratish modali — @BotFather naqshi */}
            {agentCreateOpen && (
                <AgentCreateModal
                    unlimited={agentsUnlimited}
                    onClose={() => setAgentCreateOpen(false)}
                    onCreated={() => {
                        // Ro'yxatni qayta yuklash
                        setLoadingAgents(true);
                        fetch("/api/nexus/agents", { cache: "no-store" })
                            .then(r => r.ok ? r.json() : { items: [] })
                            .then(d => {
                                setAgents(d.items ?? []);
                                setAgentsMax(d.max ?? null);
                                setAgentsUnlimited(!!d.unlimited);
                            })
                            .finally(() => setLoadingAgents(false));
                        setAgentCreateOpen(false);
                    }}
                />
            )}
            {/* Humo Media picker — Sticker (user-generated) */}
            {stickerPickerOpen && (
                <NxHumoMediaPicker
                    kind="STICKER"
                    onClose={() => setStickerPickerOpen(false)}
                    onSelect={async (m) => {
                        setStickerPickerOpen(false);
                        if (!selectedId) return;
                        try {
                            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: "",
                                    mediaUrl: m.mediaUrl,
                                    mediaType: "sticker",
                                    mediaMime: m.mediaUrl.endsWith(".png") ? "image/png" : "image/webp",
                                }),
                            });
                            if (r.ok) {
                                const d = await r.json();
                                setMessages(mm => [...mm, d.message]);
                                loadConvs();
                            }
                        } catch { /* ignore */ }
                    }}
                />
            )}
            {/* Humo Media picker — GIF (user-generated video) */}
            {gifPickerOpen && (
                <NxHumoMediaPicker
                    kind="GIF"
                    onClose={() => setGifPickerOpen(false)}
                    onSelect={async (m) => {
                        setGifPickerOpen(false);
                        if (!selectedId) return;
                        try {
                            const r = await fetch(`/api/nexus/messages/${selectedId}`, {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: "",
                                    mediaUrl: m.mediaUrl,
                                    mediaType: "gif",
                                    mediaMime: m.mediaUrl.endsWith(".mp4") || m.mediaUrl.includes(".mp4") ? "video/mp4" : "image/gif",
                                }),
                            });
                            if (r.ok) {
                                const d = await r.json();
                                setMessages(mm => [...mm, d.message]);
                                loadConvs();
                            }
                        } catch { /* ignore */ }
                    }}
                />
            )}
            {/* Chatni o'chirish modal (3 varinat: o'zim/ikkala/vaqtinchalik) */}
            {deleteChatFor && (() => {
                const c = convs.find(x => x.conversationId === deleteChatFor);
                if (!c) { setDeleteChatFor(null); return null; }
                return (
                    <DeleteChatModal
                        convId={deleteChatFor}
                        convName={c.other?.name ?? c.other?.username ?? "Foydalanuvchi"}
                        isSelf={!!c.isSelf}
                        onClose={() => setDeleteChatFor(null)}
                        onDone={(action) => {
                            if (selectedIdRef.current === deleteChatFor && (action === "mine" || action === "both")) {
                                setMessages([]);
                            }
                            if (action === "hide") {
                                // Yashirin bo'lgani uchun tanlangan bo'lsa yopamiz
                                if (selectedIdRef.current === deleteChatFor) setSelectedId(null);
                            }
                            loadConvs();
                        }}
                    />
                );
            })()}
            {/* Sana picker modal (sana separator bosilsa) */}
            {datePickerOpen && (
                <DatePickerModal
                    month={pickerMonth}
                    onMonthChange={setPickerMonth}
                    minDate={messages.length > 0 ? new Date(messages[0].createdAt) : new Date()}
                    maxDate={new Date()}
                    onPick={jumpToDate}
                    onClose={() => setDatePickerOpen(false)}
                />
            )}
            {/* Chat lock modal (setup / unlock / remove) */}
            {lockModal && (
                <NxChatLockModal
                    convId={lockModal.convId}
                    mode={lockModal.mode}
                    onClose={() => setLockModal(null)}
                    onDone={(result) => {
                        setLockModal(null);
                        rerenderLocks();
                        if (result === "unlocked") {
                            // Muvaffaqiyatli unlock — chatga o'tish
                            setSelectedId(lockModal.convId);
                        }
                        if (result === "removed") {
                            // Lock olib tashlandi
                        }
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
    const [zoom, setZoom] = useState(1);         // 0.5..8
    const [rotate, setRotate] = useState(0);     // deg
    const [pan, setPan] = useState({ x: 0, y: 0 });   // pikselda
    const [dragging, setDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1600); };
    const resetView = () => { setZoom(1); setRotate(0); setPan({ x: 0, y: 0 }); };

    // Rasm almashsa yoki oyna yopilsa view'ni tiklash
    useEffect(() => { resetView(); }, [idx]);

    // Keyboard shortcuts
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
            else if (e.key === "ArrowRight") setIdx(i => Math.min(images.length - 1, i + 1));
            else if (e.key === "+" || e.key === "=") setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)));
            else if (e.key === "-" || e.key === "_") setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
            else if (e.key === "0") resetView();
            else if (e.key === "r") setRotate(r => (r + 90) % 360);
            else if (e.key === "1") setZoom(1);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [images.length, onClose]);

    const cur = images[idx];
    if (!cur?.mediaUrl) return null;

    const download = async () => {
        try {
            const r = await fetch(cur.mediaUrl!);
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `image-${idx + 1}.${(blob.type.split("/")[1] || "jpg").split(";")[0]}`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            showToast("Yuklab olindi");
        } catch { showToast("Xato"); }
    };
    const share = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ url: cur.mediaUrl! });
            } else {
                await navigator.clipboard.writeText(cur.mediaUrl!);
                showToast("Havola nusxa olindi");
            }
        } catch { /* ignore */ }
    };
    // Rasmni HAQIQIY buffer sifatida clipboard'ga yozish (URL emas — image bytes)
    const copyImage = async () => {
        try {
            const r = await fetch(cur.mediaUrl!);
            let blob = await r.blob();
            // Ba'zi brauzerlarda faqat image/png qo'llanadi — canvas orqali PNG'ga o'tkazamiz
            if (blob.type !== "image/png") {
                const img = new window.Image();
                img.crossOrigin = "anonymous";
                img.src = cur.mediaUrl!;
                await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("no ctx");
                ctx.drawImage(img, 0, 0);
                blob = await new Promise<Blob>((res, rej) =>
                    canvas.toBlob(b => b ? res(b) : rej(new Error("no blob")), "image/png"));
            }
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            showToast("Rasm nusxa olindi");
        } catch {
            // Fallback — URL nusxa
            try { await navigator.clipboard.writeText(cur.mediaUrl!); showToast("Havola nusxa olindi"); }
            catch { showToast("Xato"); }
        }
    };

    const zoomStep = 0.25;
    const zoomIn = () => setZoom(z => Math.min(8, +(z + zoomStep).toFixed(2)));
    const zoomOut = () => {
        setZoom(z => {
            const nz = Math.max(0.5, +(z - zoomStep).toFixed(2));
            if (nz <= 1) setPan({ x: 0, y: 0 });
            return nz;
        });
    };
    const fitScreen = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    const actualSize = () => { setZoom(1); setPan({ x: 0, y: 0 }); showToast("100%"); };
    const rotateCw = () => setRotate(r => (r + 90) % 360);

    // Wheel bilan zoom (Ctrl bosilgan bo'lmasa ham — Telegram uslub)
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
        setZoom(z => {
            const nz = Math.max(0.5, Math.min(8, +(z + delta).toFixed(2)));
            if (nz <= 1) setPan({ x: 0, y: 0 });
            return nz;
        });
    };

    // Mouse drag — pan (faqat zoom > 1 bo'lsa)
    const onMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
        };
        const onUp = () => { setDragging(false); dragStartRef.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [dragging]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(3,5,15,0.94)" }}
            onClick={onClose}
            onWheel={onWheel}>

            {/* Toolbar — yuqorida (Nexus stylida) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-2xl"
                onClick={e => e.stopPropagation()}
                style={{
                    background: "rgba(11,18,40,0.85)",
                    border: "1px solid rgba(43,62,232,0.30)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.60)",
                }}>
                <span className="px-2 text-[11px] font-black tabular-nums" style={{ color: "rgba(200,215,245,0.85)" }}>
                    {idx + 1} / {images.length}
                </span>
                <div className="w-px h-5" style={{ background: "rgba(43,62,232,0.30)" }} />
                <ToolBtn icon={Download} title="Yuklab olish" onClick={download} />
                <ToolBtn icon={Forward}  title="Ulashish" onClick={share} />
                <ToolBtn icon={Copy}     title="Rasmni nusxa olish" onClick={copyImage} />
                <ToolBtn icon={RotateCw} title={`Aylantirish (R) — ${rotate}°`} onClick={rotateCw} />
                <div className="w-px h-5" style={{ background: "rgba(43,62,232,0.30)" }} />
                <ToolBtn icon={ZoomOut}  title="Kichraytirish (−)" onClick={zoomOut} disabled={zoom <= 0.5} />
                <button onClick={fitScreen}
                    title="1:1 asl o'lchamga qaytish"
                    className="h-9 min-w-[52px] px-2 rounded-lg text-[10.5px] font-black tabular-nums transition hover:bg-white/[0.08]"
                    style={{ color: zoom !== 1 ? "#00CEC8" : "rgba(220,232,255,0.90)" }}>
                    {Math.round(zoom * 100)}%
                </button>
                <ToolBtn icon={ZoomIn}   title="Kattalashtirish (+)" onClick={zoomIn} disabled={zoom >= 8} />
                <ToolBtn icon={Maximize2} title="Ekranga to'ldirish" onClick={actualSize} />
                <div className="w-px h-5" style={{ background: "rgba(43,62,232,0.30)" }} />
                <ToolBtn icon={X} title="Yopish (Esc)" onClick={onClose} danger />
            </div>

            {/* Toast (succsess feedback) */}
            {toast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[11px] font-black text-white pointer-events-none z-[210]"
                    style={{
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 4px 20px rgba(0,206,200,0.45)",
                    }}>
                    {toast}
                </div>
            )}

            {/* Chap/o'ng navigatsiya */}
            {idx > 0 && (
                <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                    className="absolute left-4 w-11 h-11 rounded-full flex items-center justify-center transition hover:brightness-125 z-[201]"
                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(6px)" }}>
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
            )}
            {idx < images.length - 1 && (
                <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
                    className="absolute right-4 w-11 h-11 rounded-full flex items-center justify-center transition hover:brightness-125 z-[201]"
                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(6px)" }}>
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            )}

            {/* Rasm — zoom + rotate + pan transformlari bilan */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.mediaUrl} alt=""
                className="max-w-[92vw] max-h-[86vh] object-contain rounded-lg select-none"
                draggable={false}
                onClick={e => e.stopPropagation()}
                onMouseDown={onMouseDown}
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotate}deg)`,
                    transition: dragging ? "none" : "transform 0.20s ease",
                    cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
                }}
                onDoubleClick={(e) => { e.stopPropagation(); if (zoom > 1) fitScreen(); else setZoom(2); }} />

            {/* Pastda thumbnail strip — multi-rasmda */}
            {images.length > 1 && (
                <div className="absolute left-1/2 bottom-3 -translate-x-1/2 flex items-center gap-1.5 max-w-[92vw] overflow-x-auto px-3 py-2 rounded-2xl nx-hide-scrollbar"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: "rgba(11,18,40,0.85)",
                        border: "1px solid rgba(43,62,232,0.30)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.60)",
                    }}>
                    {images.map((im, i) => im.mediaUrl ? (
                        <button key={i} onClick={() => setIdx(i)}
                            className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 transition"
                            style={{
                                border: `2px solid ${i === idx ? "#00CEC8" : "rgba(43,62,232,0.20)"}`,
                                boxShadow: i === idx ? "0 0 12px rgba(0,206,200,0.55)" : undefined,
                                opacity: i === idx ? 1 : 0.55,
                            }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={im.mediaUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                    ) : null)}
                </div>
            )}

            {/* Klaviatura yordami — pastki-chap */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-black pointer-events-none"
                style={{ background: "rgba(11,18,40,0.65)", color: "rgba(160,180,220,0.65)", border: "1px solid rgba(43,62,232,0.20)", backdropFilter: "blur(6px)" }}>
                ← → · +/− · R · 0 · Esc
            </div>
        </div>
    );
}

// Lightbox toolbar tugma
function ToolBtn({ icon: Icon, title, onClick, accent, danger, disabled }: {
    icon: React.ElementType; title: string; onClick: () => void;
    accent?: boolean; danger?: boolean; disabled?: boolean;
}) {
    const color = danger ? "#EF4444" : accent ? "#00CEC8" : "rgba(220,232,255,0.90)";
    return (
        <button onClick={onClick} disabled={disabled} title={title}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition disabled:opacity-40 hover:bg-white/[0.08]">
            <Icon className="w-4 h-4" style={{ color }} />
        </button>
    );
}

function ConvAvatar({ other, online, isSelf }: { other: { name: string | null; username: string | null; image: string | null } | null; online?: boolean; isSelf?: boolean }) {
    // For Humo qoida: avatarlar doim rounded-square (rounded-2xl) — sirt o'tkir emas, yumshoq radius
    if (isSelf) {
        return (
            <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)" }}>
                    <Bookmark className="w-5 h-5 text-white" fill="#fff" />
                </div>
            </div>
        );
    }
    return (
        <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                {other?.image ? (
                    <Image src={other.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-black text-white">
                        {(other?.name ?? other?.username ?? "?")[0]?.toUpperCase()}
                    </span>
                )}
            </div>
            {online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ background: "#22C55E", borderColor: "#0B1228" }} />
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

// Media type -> icon + label + color (info panel batafsil sub-page uchun)
function mediaTypeMeta(type: string): { label: string; icon: React.ElementType; color: string } {
    switch (type) {
        case "image":         return { label: "Rasm",           icon: FileIcon,   color: "#60A5FA" };
        case "video":         return { label: "Video",          icon: Video,      color: "#A78BFA" };
        case "audio":         return { label: "Ovozli xabar",   icon: Mic,        color: "#F59E0B" };
        case "video-circle":  return { label: "Video xabar",    icon: Camera,     color: "#EC4899" };
        case "file":          return { label: "Fayl",           icon: Paperclip,  color: "#94A3B8" };
        case "poll":          return { label: "So'rovnoma",     icon: BarChart2,  color: "#10B981" };
        case "location":      return { label: "Joylashuv",      icon: MapPin,     color: "#F97316" };
        case "transfer":      return { label: "O'tkazma",       icon: Wallet,     color: "#00CEC8" };
        case "agent":         return { label: "Agent xabari",   icon: BotIcon,    color: "#8B5CF6" };
        default:              return { label: type,             icon: FileIcon,   color: "rgba(160,176,224,0.85)" };
    }
}

// Info panel batafsil sub-panel — 'Rasm/Video/Ovoz/...' bosilganda ochiladi.
// Xabarlarni turi bo'yicha filterlab, alohida layoutda ko'rsatadi.
function MediaDetailPanel({ type, messages, onBack, onOpenImage }: {
    type: string;
    messages: Msg[];
    onBack: () => void;
    onOpenImage: (idx: number) => void;
}) {
    const meta = mediaTypeMeta(type);
    const Icon = meta.icon;
    const items = messages.filter(m => m.mediaType === type);
    // Image gallery uchun index (galleryImages messages'da image bo'lganlar)
    const imageMessages = messages.filter(m => m.mediaType === "image" && m.mediaUrl);
    const imgIndex = (m: Msg) => imageMessages.findIndex(x => x.id === m.id);

    return (
        <div className="w-[320px] flex-shrink-0 flex flex-col border-l overflow-hidden"
            style={{ borderColor: "rgba(43,62,232,0.15)", background: "rgba(8,12,32,0.65)" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3 border-b flex-shrink-0"
                style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                <button onClick={onBack}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(43,62,232,0.10)" }}>
                    <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <Icon className="w-4 h-4" style={{ color: meta.color }} />
                <p className="text-sm font-black flex-1 text-white">{meta.label}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,206,200,0.15)", color: "#00CEC8" }}>
                    {items.length}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto nx-scrollbar p-3">
                {items.length === 0 ? (
                    <p className="text-center py-10 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                        Hech narsa yo&apos;q
                    </p>
                ) : (type === "image") ? (
                    <div className="grid grid-cols-3 gap-1">
                        {items.map(m => m.mediaUrl && (
                            <button key={m.id} onClick={() => onOpenImage(imgIndex(m))}
                                className="aspect-square rounded overflow-hidden active:scale-95 transition">
                                <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                ) : (type === "video" || type === "video-circle") ? (
                    // Video/Video xabar — Nexus stylida (native controls o'rniga bizni pleyer)
                    <div className={type === "video-circle" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                        {items.map(m => m.mediaUrl && (
                            <div key={m.id} className={type === "video-circle" ? "" : ""}>
                                {type === "video-circle"
                                    ? <NxCirclePlayer src={m.mediaUrl} durationMs={m.durationMs} />
                                    : <NxMediaVideo src={m.mediaUrl} durationMs={m.durationMs} />}
                                <p className="text-[10px] mt-1 px-1" style={{ color: "rgba(140,160,210,0.55)" }}>
                                    {m.mine ? "Siz" : "U kishi"} · {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (type === "audio") ? (
                    // Ovozli xabar — Nexus NxVoicePlayer (waveform + tezlik + transkript)
                    <div className="space-y-2">
                        {items.map(m => m.mediaUrl && (
                            <div key={m.id} className="p-2.5 rounded-xl"
                                style={{
                                    background: "rgba(43,62,232,0.10)",
                                    border: "1px solid rgba(43,62,232,0.20)",
                                }}>
                                <p className="text-[10px] mb-1.5 font-bold" style={{ color: m.mine ? "#00CEC8" : "rgba(200,215,245,0.70)" }}>
                                    {m.mine ? "Siz" : "U kishi"} · {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <NxVoicePlayer src={m.mediaUrl} mine={false} seed={m.id} initialDurationMs={m.durationMs} />
                            </div>
                        ))}
                    </div>
                ) : (type === "file") ? (
                    <div className="space-y-1.5">
                        {items.map(m => m.mediaUrl && (
                            <a key={m.id} href={m.mediaUrl} target="_blank" rel="noopener noreferrer" download={m.mediaName ?? true}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04]"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                <FileIcon className="w-6 h-6 flex-shrink-0" style={{ color: "#94A3B8" }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate text-white">{m.mediaName || "Fayl"}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        {typeof m.mediaSize === "number" ? formatBytes(m.mediaSize) : ""}
                                        {" · "}
                                        {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                    </p>
                                </div>
                                <Download className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(160,176,224,0.60)" }} />
                            </a>
                        ))}
                    </div>
                ) : (type === "location") ? (
                    <div className="space-y-1.5">
                        {items.map(m => (
                            typeof m.locLat === "number" && typeof m.locLng === "number" ? (
                                <a key={m.id} href={`https://www.google.com/maps?q=${m.locLat},${m.locLng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04]"
                                    style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: "#F97316" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white">
                                            {m.locExpiresAt ? "Jonli joylashuv" : "Joylashuv"}
                                        </p>
                                        <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.60)" }}>
                                            {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(160,176,224,0.60)" }} />
                                </a>
                            ) : null
                        ))}
                    </div>
                ) : (type === "transfer") ? (
                    <div className="space-y-1.5">
                        {items.map(m => (
                            <div key={m.id} className="p-3 rounded-lg"
                                style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)" }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Wallet className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>
                                        {m.mine ? "Yuborildi" : "Qabul qilindi"}
                                    </span>
                                </div>
                                <p className="text-sm font-black text-white">
                                    {m.transferAmount && m.transferCurrency
                                        ? formatMoney(m.transferAmount, m.transferCurrency as "UZS" | "USD")
                                        : ""}
                                </p>
                                {m.transferNote && (
                                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(200,215,245,0.85)" }}>{m.transferNote}</p>
                                )}
                                <p className="text-[10px] mt-1" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Boshqa turlari (poll, agent, ...) — matnli ro'yxat
                    <div className="space-y-1.5">
                        {items.map(m => (
                            <div key={m.id} className="p-2.5 rounded-lg" style={{ background: "rgba(43,62,232,0.06)" }}>
                                <p className="text-xs truncate text-white">
                                    {m.text || m.pollQuestion || "(bo'sh)"}
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    {m.mine ? "Siz" : "U kishi"} · {new Date(m.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Sana picker modal — chat ichida BUGUN/13 avgust bosilsa ochiladi
function DatePickerModal({ month, onMonthChange, minDate, maxDate, onPick, onClose }: {
    month: Date;
    onMonthChange: (d: Date) => void;
    minDate: Date;
    maxDate: Date;
    onPick: (d: Date) => void;
    onClose: () => void;
}) {
    const minD0 = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
    const maxD0 = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    // Toshkent kalendari: Dushanba boshlanadi (0=Yak, 1=Du, ...)
    // JS Date.getDay: 0=Yak. Bizga Du=0 kerak → shift = (getDay + 6) % 7
    const firstDayShift = (monthStart.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < firstDayShift; i++) days.push(null);
    for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);

    const canPrev = new Date(month.getFullYear(), month.getMonth(), 1).getTime() > minD0;
    const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime() <= maxD0;

    const monthLabel = month.toLocaleDateString("uz-UZ", { year: "numeric", month: "long" });
    const wd = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-xs rounded-2xl overflow-hidden p-4"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => canPrev && onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                        disabled={!canPrev}
                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <p className="text-sm font-black capitalize" style={{ color: "rgba(220,230,255,0.95)" }}>
                        {monthLabel}
                    </p>
                    <button onClick={() => canNext && onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                        disabled={!canNext}
                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {wd.map(w => (
                        <div key={w} className="text-center text-[10px] font-bold py-1"
                            style={{ color: "rgba(140,160,210,0.60)" }}>{w}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        if (!d) return <div key={i} />;
                        const dT = d.getTime();
                        const outOfRange = dT < minD0 || dT > maxD0;
                        const isToday = dT === new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
                        return (
                            <button key={i}
                                onClick={() => !outOfRange && onPick(d)}
                                disabled={outOfRange}
                                className="aspect-square rounded-lg text-xs font-bold transition disabled:opacity-25 hover:brightness-125 active:scale-90"
                                style={{
                                    background: isToday
                                        ? "linear-gradient(135deg,#2B3EE8,#00CEC8)"
                                        : outOfRange ? "transparent" : "rgba(43,62,232,0.10)",
                                    color: isToday ? "#fff" : outOfRange ? "rgba(140,160,210,0.40)" : "rgba(220,230,255,0.95)",
                                }}>
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>
                    <span>
                        {minDate.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span>→</span>
                    <span>Bugun</span>
                </div>
            </div>
        </div>
    );
}

// Agent yaratish modali — Telegram @BotFather naqshi
function AgentCreateModal({ unlimited, onClose, onCreated }: {
    unlimited: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);

    async function submit() {
        setErr(null);
        const u = username.trim().replace(/^@/, "").toLowerCase();
        const withSuffix = u.endsWith("_agent") ? u : `${u}_agent`;
        if (!name.trim()) { setErr("Ismni kiriting"); return; }
        if (u.length < 2) { setErr("Username juda qisqa"); return; }
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/agents", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: withSuffix, name: name.trim() }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { setErr(d?.error ?? "Xatolik yuz berdi"); return; }
            if (d.apiKey) setApiKey(d.apiKey);
            else onCreated();
        } finally { setBusy(false); }
    }

    if (apiKey) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}>
                <div className="w-full max-w-md rounded-2xl overflow-hidden p-5"
                    style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <BotIcon className="w-5 h-5" style={{ color: "#00CEC8" }} />
                        <p className="text-sm font-black text-white flex-1">Agent yaratildi</p>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "rgba(200,215,245,0.85)" }}>
                        Quyidagi API kalitni saqlab qo&apos;ying — u faqat bir marta ko&apos;rsatiladi.
                        Webhook bilan xabar yuborish uchun kerak.
                    </p>
                    <div className="p-2 rounded-lg mb-3 break-all font-mono text-xs"
                        style={{ background: "rgba(0,0,0,0.40)", border: "1px solid rgba(0,206,200,0.30)", color: "#00CEC8" }}>
                        {apiKey}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(apiKey)}
                            className="flex-1 h-9 rounded-lg text-xs font-bold text-white"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.35)" }}>
                            Nusxa olish
                        </button>
                        <button onClick={() => { setApiKey(null); onCreated(); }}
                            className="flex-1 h-9 rounded-lg text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            Yopish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => !busy && onClose()}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden p-5"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <BotIcon className="w-5 h-5" style={{ color: "#00CEC8" }} />
                        <p className="text-sm font-black text-white">Yangi agent yaratish</p>
                    </div>
                    <button onClick={onClose} disabled={busy}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                    </button>
                </div>
                <label className="block mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.75)" }}>
                        Nomi (ko&apos;rinadigan)
                    </span>
                    <input value={name} onChange={e => setName(e.target.value)}
                        maxLength={50} placeholder="Masalan: Mening yordamchim"
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-transparent text-white text-sm focus:outline-none"
                        style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                </label>
                <label className="block mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.75)" }}>
                        Username (_agent bilan tugaydi)
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                        <span className="text-sm font-black" style={{ color: "rgba(140,160,210,0.85)" }}>@</span>
                        <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            maxLength={26} placeholder="my_helper"
                            className="flex-1 h-10 px-3 rounded-lg bg-transparent text-white text-sm focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                        <span className="text-xs font-bold" style={{ color: "#00CEC8" }}>_agent</span>
                    </div>
                    <p className="mt-1 text-[10px]" style={{ color: "rgba(140,160,210,0.60)" }}>
                        4-32 belgi: a-z, 0-9, _
                    </p>
                </label>
                {err && (
                    <p className="mb-3 text-[11px] font-bold p-2 rounded"
                        style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.30)" }}>
                        {err}
                    </p>
                )}
                <p className="mb-3 text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>
                    {unlimited
                        ? "Sizga cheklov qo'yilmagan — istagancha agent yaratishingiz mumkin."
                        : "Har foydalanuvchida maksimal 10 ta agent bo'lishi mumkin."}
                </p>
                <button onClick={submit} disabled={busy || !name.trim() || username.trim().length < 2}
                    className="w-full h-10 rounded-xl text-sm font-black text-white disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Yaratish"}
                </button>
            </div>
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

// Xabar ustidagi 3-dot menyu qatori (Telegram context-menu uslub)
function MsgMenuItem({ icon: Icon, label, onClick, accent, danger }: {
    icon: React.ElementType; label: string; onClick?: () => void; accent?: boolean; danger?: boolean;
}) {
    const color = danger ? "#EF4444" : accent ? "#00CEC8" : "rgba(220,230,255,0.90)";
    const iconColor = danger ? "#EF4444" : accent ? "#00CEC8" : "rgba(160,176,224,0.85)";
    return (
        <button onClick={onClick} type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition hover:bg-white/[0.06]"
            style={{ color }}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: iconColor }} />
            <span className="flex-1 truncate">{label}</span>
        </button>
    );
}

// Telegram uslub attach menu (+) ichidagi kartochka
function AttachMenuItem({ icon: Icon, label, onClick, accent }: {
    icon: React.ElementType; label: string; onClick?: () => void; accent?: boolean;
}) {
    return (
        <button onClick={onClick} type="button"
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition active:scale-95 hover:bg-white/[0.06]"
            style={accent ? { background: "rgba(0,206,200,0.10)" } : undefined}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: accent
                    ? "linear-gradient(135deg,rgba(0,206,200,0.25),rgba(43,62,232,0.25))"
                    : "rgba(43,62,232,0.14)" }}>
                <Icon className="w-4 h-4" style={{ color: accent ? "#00CEC8" : "rgba(200,215,245,0.90)" }} />
            </span>
            <span className="text-[10px] font-bold" style={{ color: accent ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>
                {label}
            </span>
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
    // Yangi fonlar — WhatsApp/Telegram uslubidagi katta variantlar
    aurora:  { label: "Aurora",   bg: "linear-gradient(135deg,#0b0f2e 0%,#1e2352 30%,#2d1e5c 60%,#4a1e5c 100%)", swatch: "linear-gradient(135deg,#2d1e5c,#7a3ea8)" },
    crimson: { label: "Qizil",    bg: "linear-gradient(135deg,#1a0808,#3a0d15 60%,#5c1f2c)", swatch: "linear-gradient(135deg,#3a0d15,#8b2c3a)" },
    emerald: { label: "Zumrad",   bg: "linear-gradient(135deg,#052018,#0d3a2b 60%,#1a5c42)", swatch: "linear-gradient(135deg,#0d3a2b,#2a8060)" },
    midnight:{ label: "Yarim tun",bg: "linear-gradient(135deg,#000814,#001d3d 60%,#003566)", swatch: "linear-gradient(135deg,#001d3d,#0a4a8a)" },
    peach:   { label: "Shaftoli", bg: "linear-gradient(135deg,#2c1810,#5c2f1a 60%,#8a4a2c)", swatch: "linear-gradient(135deg,#5c2f1a,#c47850)" },
    nordic:  { label: "Nordik",   bg: "linear-gradient(135deg,#1e2530,#2e3948 60%,#3e5063)", swatch: "linear-gradient(135deg,#2e3948,#6a7e94)" },
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

// Chat list ustunidagi vaqt: bugun→HH:mm, o'tgan 7 kun→hafta kuni, undan oldingi→dd.mm(.yy)
function formatConvTime(iso: string | Date): string {
    const d = new Date(iso);
    const now = new Date();
    if (isSameDay(d, now)) {
        return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        // Hafta kuni qisqa (Du/Se/Ch/Pa/Ju/Sh/Ya)
        return d.toLocaleDateString("uz-UZ", { weekday: "short" });
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return sameYear
        ? d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })
        : d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
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

// ─────────────────────────────────────────────────────────────────────────────
// EmojiPicker (unified) — Telegram uslubidagi 3-tabli picker: Emoji / Sticker / GIF.
// Fon Nexus rangida (rgba(11,18,40,0.98) + gradient accent).
// Emoji tab: kategoriya paneli + Twemoji SVG grid.
// Sticker/GIF tab: foydalanuvchining pack'lari (owned + subscribed) + qidiruv.
// ─────────────────────────────────────────────────────────────────────────────
interface MediaItem { id: string; mediaUrl: string; thumbUrl: string | null; width?: number; height?: number; keywords?: string[]; }
interface MediaPack { id: string; slug: string; name: string; kind: "GIF" | "STICKER"; items?: MediaItem[]; owner?: { username: string | null } | null; }
interface PickedMedia { kind: "GIF" | "STICKER"; mediaUrl: string; thumbUrl: string | null; width: number; height: number; }

function EmojiPicker({ onPick, onPickMedia, onClose }: {
    onPick: (emoji: string) => void;
    onPickMedia?: (m: PickedMedia) => void;
    onClose: () => void;
}) {
    const [mainTab, setMainTab] = useState<"emoji" | "sticker" | "gif">("emoji");
    const [cat, setCat] = useState(0);
    const [packs, setPacks] = useState<{ owned: MediaPack[]; subscribed: MediaPack[] }>({ owned: [], subscribed: [] });
    const [searchPacks, setSearchPacks] = useState<MediaPack[]>([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
        setTimeout(() => document.addEventListener("mousedown", h), 0);
        return () => document.removeEventListener("mousedown", h);
    }, [onClose]);

    // Pack'larni yuklash — tab o'zgarganda
    useEffect(() => {
        if (mainTab === "emoji") return;
        const kind = mainTab === "sticker" ? "STICKER" : "GIF";
        setLoading(true);
        setQ("");
        fetch(`/api/humo/user/packs?kind=${kind}`)
            .then(r => r.ok ? r.json() : { owned: [], subscribed: [] })
            .then(d => setPacks({ owned: d.owned ?? [], subscribed: d.subscribed ?? [] }))
            .catch(() => setPacks({ owned: [], subscribed: [] }))
            .finally(() => setLoading(false));
    }, [mainTab]);

    // Qidiruv — 250ms debounce
    useEffect(() => {
        if (mainTab === "emoji") return;
        const query = q.trim();
        if (query.length < 1) { setSearchPacks([]); return; }
        const kind = mainTab === "sticker" ? "STICKER" : "GIF";
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/humo/packs/search?kind=${kind}&q=${encodeURIComponent(query)}&limit=20`);
                if (r.ok) { const d = await r.json(); setSearchPacks(d.packs ?? []); }
            } finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(t);
    }, [q, mainTab]);

    const pickMedia = (kind: "GIF" | "STICKER", it: MediaItem) => {
        onPickMedia?.({ kind, mediaUrl: it.mediaUrl, thumbUrl: it.thumbUrl, width: it.width ?? 0, height: it.height ?? 0 });
    };

    const allPacks = q.trim() ? searchPacks : [...packs.owned, ...packs.subscribed];
    const kindKey = mainTab === "sticker" ? "sticker" : "gif";

    return (
        <div ref={ref}
            className="absolute bottom-full right-2 mb-2 w-[360px] rounded-2xl overflow-hidden z-40 flex flex-col"
            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
            {/* Top: 3 asosiy tab (Emoji / Sticker / GIF) — Telegram uslubi */}
            <div className="flex items-center gap-1 p-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.16)" }}>
                {([
                    { id: "emoji" as const, label: "Emoji", icon: Smile },
                    { id: "sticker" as const, label: "Sticker", icon: Sticker },
                    { id: "gif" as const, label: "GIF", icon: Film },
                ]).map(t => (
                    <button key={t.id} onClick={() => setMainTab(t.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-black transition"
                        style={mainTab === t.id
                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                            : { background: "rgba(43,62,232,0.06)", color: "rgba(160,180,220,0.80)" }}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {/* Body */}
            {mainTab === "emoji" ? (
                <>
                    {/* Category bar */}
                    <div className="flex gap-1 p-2 overflow-x-auto nx-hide-scrollbar" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                        {EMOJI_CATEGORIES.map((c, i) => (
                            <button key={c.name} onClick={() => setCat(i)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 transition"
                                style={cat === i
                                    ? { background: "rgba(0,206,200,0.18)", color: "#00CEC8" }
                                    : { color: "rgba(140,160,210,0.70)" }}>
                                {c.name}
                            </button>
                        ))}
                    </div>
                    <div className="p-2 max-h-[280px] overflow-y-auto nx-scrollbar grid grid-cols-8 gap-1">
                        {EMOJI_CATEGORIES[cat].emojis.map(e => (
                            <button key={e} onClick={() => onPick(e)} title={e}
                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.06] active:scale-90 transition-transform">
                                <Emoji char={e} size={24} />
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* Search + boshqarish havolasi */}
                    <div className="p-2 flex items-center gap-2 relative" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                        <div className="flex-1 relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(140,160,210,0.55)" }} />
                            <input type="search" value={q} onChange={e => setQ(e.target.value)}
                                placeholder={mainTab === "sticker" ? "Sticker qidirish..." : "GIF qidirish..."}
                                className="w-full h-8 pl-8 pr-2 rounded-lg text-[11.5px] outline-none"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(230,238,255,0.96)", caretColor: "#00CEC8" }} />
                        </div>
                        <a href={`/nexus/agent/${kindKey}`} target="_blank" rel="noopener"
                            title="Pack yaratish/boshqarish"
                            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.25)" }}>
                            <ExternalLink className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                        </a>
                    </div>
                    {/* Pack ro'yxati */}
                    <div className="p-2 max-h-[300px] overflow-y-auto nx-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00CEC8" }} /></div>
                        ) : allPacks.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-[11.5px] mb-3" style={{ color: "rgba(200,215,245,0.75)" }}>
                                    {q.trim() ? `"${q}" bo'yicha topilmadi` : `Hali ${mainTab === "sticker" ? "sticker" : "GIF"} pack yo'q`}
                                </p>
                                <a href={`/nexus/agent/${kindKey}`} target="_blank" rel="noopener"
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Plus className="w-3 h-3" /> Yaratish
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allPacks.map(pack => (
                                    <div key={pack.id}>
                                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                            <p className="text-[10.5px] font-black truncate" style={{ color: "rgba(230,238,255,0.90)" }}>{pack.name}</p>
                                            {pack.owner?.username && (
                                                <span className="text-[9.5px] truncate" style={{ color: "rgba(140,160,210,0.55)" }}>@{pack.owner.username}</span>
                                            )}
                                            <span className="ml-auto text-[9.5px] tabular-nums" style={{ color: "rgba(140,160,210,0.55)" }}>{pack.items?.length ?? 0}</span>
                                        </div>
                                        <div className={mainTab === "sticker" ? "grid grid-cols-5 gap-1" : "grid grid-cols-3 gap-1"}>
                                            {(pack.items ?? []).slice(0, mainTab === "sticker" ? 15 : 9).map(it => (
                                                <button key={it.id} onClick={() => pickMedia(pack.kind, it)}
                                                    className="aspect-square rounded-md overflow-hidden active:scale-90 transition-transform"
                                                    style={{ background: "rgba(43,62,232,0.08)" }}>
                                                    {pack.kind === "GIF" ? (
                                                        it.thumbUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={it.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <video src={it.mediaUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                                                        )
                                                    ) : (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={it.mediaUrl} alt="" loading="lazy" className="w-full h-full object-contain" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
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

// ─────────────────────────────────────────────────────────────────────────────
// NxComposerTextarea — auto-grow multiline textarea (Telegram uslub).
// - Rows=1 boshlanadi, matn uzunligiga qarab scroll'siz o'sadi 200px'gacha
// - 200px'dan keyin ichki scroll (matn yo'qotilmaydi, boshi ham ko'rinadi)
// - Enter → onSubmit, Shift+Enter → yangi qator
// - onKeyExtra callback bo'lsa (mention/emoji navigation), true qaytarsa Enter'ni yutadi
// - forwardRef bilan tashqi ref (fokus, selection uchun)
// ─────────────────────────────────────────────────────────────────────────────
interface NxComposerTextareaProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onKeyExtra?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;   // true = event yutildi
    placeholder?: string;
}
const NxComposerTextarea = React.forwardRef<HTMLTextAreaElement, NxComposerTextareaProps>(
    function NxComposerTextarea({ value, onChange, onSubmit, onKeyExtra, placeholder }, ref) {
        const innerRef = useRef<HTMLTextAreaElement | null>(null);
        // Kompozit ref — parent'ga ham, ichki auto-grow uchun ham kerak
        const setRef = (el: HTMLTextAreaElement | null) => {
            innerRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        };
        // Auto-grow: value o'zgarsa balandlikni qayta hisoblash
        useEffect(() => {
            const el = innerRef.current;
            if (!el) return;
            el.style.height = "auto";
            const MAX = 200;
            el.style.height = Math.min(MAX, el.scrollHeight) + "px";
            el.style.overflowY = el.scrollHeight > MAX ? "auto" : "hidden";
        }, [value]);

        return (
            <textarea ref={setRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                    if (onKeyExtra && onKeyExtra(e)) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit();
                    }
                }}
                placeholder={placeholder}
                rows={1}
                className="nx-scrollbar flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-transparent text-white text-sm focus:outline-none resize-none"
                style={{
                    border: "1px solid rgba(43,62,232,0.20)",
                    minHeight: 40,
                    maxHeight: 200,
                    lineHeight: "20px",
                }}
            />
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// NxCirclePlayer — Telegram uslubidagi doiraviy video xabar (кружочек / video note).
// - Perfectly round (border-radius 50%), border yo'q
// - Autoplay muted + loop + playsInline (Telegram default)
// - Bosilsa ovoz yoqiladi/o'chadi (mute toggle)
// - Yuqori-chapda: davomiylik + speaker ikonasi (0:02 🔊)
// - Atrofida progress halqa (SVG stroke — konstruktiv efekt)
// - Fon shaffof (bubble sticker uslubi — hech qanday bubble borderi kerak emas)
// ─────────────────────────────────────────────────────────────────────────────
function NxCirclePlayer({ src, durationMs }: { src: string; durationMs?: number | null }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [progress, setProgress] = useState(0);  // 0..1
    const [duration, setDuration] = useState((durationMs ?? 0) / 1000);
    const SIZE = 220;
    const RADIUS = 24; // rounded-square (kvadrat, qiyali burchaklar)

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onTime = () => {
            if (!v.duration || !isFinite(v.duration)) return;
            setProgress(v.currentTime / v.duration);
            setDuration(v.duration);
        };
        const onMeta = () => { if (isFinite(v.duration)) setDuration(v.duration); };
        v.addEventListener("timeupdate", onTime);
        v.addEventListener("loadedmetadata", onMeta);
        v.play().catch(() => { /* muted autoplay policy */ });
        return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
    }, [src]);

    const fmtDur = (s: number) => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="mb-1 relative select-none overflow-hidden bg-black"
            style={{
                width: SIZE, height: SIZE,
                borderRadius: RADIUS,
                cursor: "pointer",
                border: "1px solid rgba(0,206,200,0.30)",
                boxShadow: "0 4px 20px rgba(0,206,200,0.15)",
            }}
            onClick={() => {
                setMuted(m => {
                    if (videoRef.current) videoRef.current.muted = !m;
                    return !m;
                });
            }}>
            <video ref={videoRef} src={src}
                autoPlay muted={muted} loop playsInline
                className="w-full h-full object-cover" />

            {/* Yuqori-chapda: davomiylik + speaker ikonasi (Telegram uslub) */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums pointer-events-none"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(4px)" }}>
                {muted
                    ? <VolumeX className="w-3 h-3" style={{ color: "rgba(255,255,255,0.85)" }} />
                    : <Volume2 className="w-3 h-3" style={{ color: "#00CEC8" }} />
                }
                <span>{fmtDur(duration - (videoRef.current?.currentTime ?? 0))}</span>
            </div>

            {/* Pastda progress bar (SVG halqa o'rniga — kvadrat shakl uchun mos) */}
            <div className="absolute left-2 right-2 bottom-2 h-1 rounded-full overflow-hidden pointer-events-none"
                style={{ background: "rgba(255,255,255,0.20)" }}>
                <div className="h-full rounded-full"
                    style={{
                        width: `${progress * 100}%`,
                        background: "linear-gradient(90deg,#00CEC8,#2B3EE8)",
                        boxShadow: "0 0 6px rgba(0,206,200,0.60)",
                        transition: "width 0.15s linear",
                    }} />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxMediaImage — Nexus brendlangan rasm ko'rinishi (DM + kelajakda feed uchun).
// - Rounded-2xl + Nexus gradient border (soft glow atrofida)
// - Yuklanish paytida skeleton (Nexus rangida shimmer)
// - Hover'da soft lift + border yorug'roq
// - Yuqori-o'ng burchakda dekorativ "N" chevron (brend belgi)
// - Bosilsa gallery lightbox ochadi (onOpen callback)
// ─────────────────────────────────────────────────────────────────────────────
function NxMediaImage({ src, onOpen }: { src: string; onOpen?: () => void }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <button type="button" onClick={onOpen}
            className="relative block mb-1 rounded-2xl overflow-hidden group active:scale-[0.98] transition-transform"
            style={{
                border: "1px solid rgba(43,62,232,0.28)",
                boxShadow: "0 4px 20px rgba(43,62,232,0.12), inset 0 0 40px rgba(0,206,200,0.04)",
                background: "linear-gradient(135deg, rgba(43,62,232,0.06), rgba(0,206,200,0.04))",
            }}>
            {/* Loading skeleton — shimmer */}
            {!loaded && (
                <div className="w-[280px] h-[200px] relative overflow-hidden"
                    style={{ background: "rgba(11,18,40,0.55)" }}>
                    <div className="absolute inset-0 animate-pulse"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(0,206,200,0.08), transparent)", backgroundSize: "200% 100%" }} />
                </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" onLoad={() => setLoaded(true)}
                className={`max-w-full max-h-80 block transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
                style={{ display: loaded ? "block" : undefined }} />

            {/* Brend chevron — yuqori-o'ng, hover'da yorug'roq */}
            <div className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center opacity-70 group-hover:opacity-100 transition"
                style={{
                    background: "rgba(11,18,40,0.65)",
                    border: "1px solid rgba(0,206,200,0.30)",
                    backdropFilter: "blur(6px)",
                }}>
                <span className="text-[9px] font-black" style={{
                    background: "linear-gradient(135deg,#00CEC8,#2B3EE8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}>N</span>
            </div>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxMediaVideo — Nexus brendlangan video pleyer.
// - Poster/first-frame ko'rsatiladi, katta gradient Play tugma markazda
// - Bosilganda native controls yoqiladi (playing = true)
// - Yuqori-chapda "VIDEO" badge (Nexus rangi)
// - Yuqori-o'ngda davomiylik (agar bor bo'lsa) — pill format
// - Rounded-2xl + Nexus gradient border + glow
// ─────────────────────────────────────────────────────────────────────────────
function NxMediaVideo({ src, durationMs }: { src: string; durationMs?: number | null }) {
    // DM ichida — kompakt preview (sokin autoplay muted loop, minimal chrome).
    // Bosilganda katta modal (NxVideoLightbox) ochiladi — barcha nazoratlar u yerda.
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState((durationMs ?? 0) / 1000);
    const [hover, setHover] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        const v = videoRef.current; if (!v) return;
        const onMeta = () => { if (isFinite(v.duration)) setDuration(v.duration); };
        v.addEventListener("loadedmetadata", onMeta);
        // Autoplay muted attempt
        v.play().catch(() => { /* muted autoplay policy */ });
        return () => v.removeEventListener("loadedmetadata", onMeta);
    }, []);

    // Modal ochilsa preview'da pauza (2 nusxa bir vaqtda o'ynamasin)
    useEffect(() => {
        const v = videoRef.current; if (!v) return;
        if (lightboxOpen) { v.pause(); }
        else { v.play().catch(() => {}); }
    }, [lightboxOpen]);

    const fmt = (s: number) => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <>
            <div
                className="relative mb-1 rounded-2xl overflow-hidden inline-block cursor-pointer"
                onClick={() => setLightboxOpen(true)}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    border: "1px solid rgba(43,62,232,0.30)",
                    boxShadow: "0 4px 20px rgba(0,206,200,0.12), inset 0 0 60px rgba(43,62,232,0.05)",
                    background: "linear-gradient(135deg, rgba(43,62,232,0.10), rgba(0,206,200,0.06))",
                }}>
                <video ref={videoRef} src={src}
                    autoPlay muted loop playsInline
                    preload="metadata"
                    className="max-w-full max-h-80 block bg-black pointer-events-none"
                    style={{ borderRadius: "calc(1rem - 1px)" }} />

                {/* Hover overlay — sokin play tugma, "kattalashtirish" ma'nosini bildiradi */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hover ? "opacity-100" : "opacity-0"}`}
                    style={{ background: "linear-gradient(135deg, rgba(5,8,24,0.35), rgba(5,8,24,0.10))" }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            boxShadow: "0 8px 28px rgba(0,206,200,0.45), 0 0 50px rgba(43,62,232,0.30)",
                        }}>
                        <Play className="w-6 h-6 text-white translate-x-0.5" fill="#fff" />
                    </div>
                </div>

                {/* Yuqori-chapda VIDEO badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full pointer-events-none"
                    style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(0,206,200,0.30)", backdropFilter: "blur(6px)" }}>
                    <Film className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />
                    <span className="text-[9px] font-black tracking-wider" style={{ color: "#00CEC8" }}>VIDEO</span>
                </div>

                {/* Yuqori-o'ngda: muted icon + davomiylik */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full pointer-events-none"
                    style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(6px)" }}>
                    <VolumeX className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.75)" }} />
                    {duration > 0 && (
                        <span className="text-[10px] font-black tabular-nums text-white">{fmt(duration)}</span>
                    )}
                </div>
            </div>

            {lightboxOpen && (
                <NxVideoLightbox src={src} onClose={() => setLightboxOpen(false)} />
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxVideoLightbox — fullscreen modal video pleyer (Telegram screenshot 2 uslubi).
// - Fon: qora backdrop-blur, video markazda, katta o'lchamda
// - Custom controls: progress bar (buffered+played+hover tooltip), skip -10/+10,
//   time, volume slider, speed dropdown (0.5x-2x), PiP, fullscreen
// - Klavishlar: Space, ← →, J L, M, F, Esc
// - Auto-hide controls (2.5s harakat yo'q bo'lsa)
// ─────────────────────────────────────────────────────────────────────────────
function NxVideoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showVol, setShowVol] = useState(false);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [waiting, setWaiting] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const [pip, setPip] = useState(false);
    const [speed, setSpeed] = useState<0.5 | 1 | 1.25 | 1.5 | 2>(1);
    const [speedOpen, setSpeedOpen] = useState(false);
    const [hoverSeek, setHoverSeek] = useState<{ x: number; time: number } | null>(null);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const v = videoRef.current; if (!v) return;
        const onMeta = () => { if (isFinite(v.duration)) setDuration(v.duration); };
        const onTime = () => setCurrent(v.currentTime);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onWaiting = () => setWaiting(true);
        const onPlaying = () => setWaiting(false);
        const onProgress = () => {
            if (!v.duration || !isFinite(v.duration) || v.buffered.length === 0) return;
            setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration);
        };
        const onEnterPip = () => setPip(true);
        const onLeavePip = () => setPip(false);
        v.addEventListener("loadedmetadata", onMeta);
        v.addEventListener("timeupdate", onTime);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        v.addEventListener("waiting", onWaiting);
        v.addEventListener("playing", onPlaying);
        v.addEventListener("progress", onProgress);
        v.addEventListener("enterpictureinpicture", onEnterPip);
        v.addEventListener("leavepictureinpicture", onLeavePip);
        // Auto-play kirishda (ovoz bilan)
        v.muted = false;
        v.play().catch(() => { /* audio autoplay bloklansa muted rejim */
            v.muted = true;
            setMuted(true);
            v.play().catch(() => {});
        });
        return () => {
            v.removeEventListener("loadedmetadata", onMeta);
            v.removeEventListener("timeupdate", onTime);
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
            v.removeEventListener("waiting", onWaiting);
            v.removeEventListener("playing", onPlaying);
            v.removeEventListener("progress", onProgress);
            v.removeEventListener("enterpictureinpicture", onEnterPip);
            v.removeEventListener("leavepictureinpicture", onLeavePip);
        };
    }, []);

    useEffect(() => {
        const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);
    useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume]);

    // Controls auto-hide
    const bumpControls = () => {
        setShowControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        if (playing && !speedOpen && !showVol) hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    };
    useEffect(() => { bumpControls(); return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }; }, [playing, speedOpen, showVol]);

    // Klavishlar
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const v = videoRef.current; if (!v) return;
            if (e.key === "Escape") { e.preventDefault(); onClose(); }
            else if (e.key === " " || e.key === "k") { e.preventDefault(); if (v.paused) void v.play(); else v.pause(); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
            else if (e.key === "ArrowRight") { e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); }
            else if (e.key === "j" || e.key === "J") { v.currentTime = Math.max(0, v.currentTime - 10); }
            else if (e.key === "l" || e.key === "L") { v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); }
            else if (e.key === "m" || e.key === "M") { v.muted = !v.muted; setMuted(v.muted); }
            else if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); const nv = Math.min(1, volume + 0.1); v.volume = nv; setVolume(nv); v.muted = false; setMuted(false); }
            else if (e.key === "ArrowDown") { e.preventDefault(); const nv = Math.max(0, volume - 0.1); v.volume = nv; setVolume(nv); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [volume, onClose]);

    const fmt = (s: number) => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };
    const toggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); };
    const seek = (frac: number) => { const v = videoRef.current; if (!v || !isFinite(v.duration)) return; v.currentTime = v.duration * Math.max(0, Math.min(1, frac)); };
    const skip = (delta: number) => { const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta)); };
    const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void containerRef.current.requestFullscreen();
    };
    const togglePip = async () => {
        const v = videoRef.current; if (!v) return;
        try {
            if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
            else await v.requestPictureInPicture();
        } catch { /* PiP not supported */ }
    };
    const download = async () => {
        try {
            const r = await fetch(src);
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `video.${(blob.type.split("/")[1] || "mp4").split(";")[0]}`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    const progress = duration > 0 ? current / duration : 0;

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center"
            style={{ background: "rgba(3,5,15,0.95)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
            onMouseMove={bumpControls}>

            <div ref={containerRef}
                className="relative rounded-2xl overflow-hidden bg-black"
                style={{
                    maxWidth: "min(1200px, 92vw)",
                    maxHeight: "88vh",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.80), 0 0 80px rgba(0,206,200,0.15)",
                    border: "1px solid rgba(43,62,232,0.30)",
                }}
                onClick={e => e.stopPropagation()}>
                <video ref={videoRef} src={src}
                    playsInline
                    className="block max-w-full max-h-[88vh] bg-black cursor-pointer"
                    onClick={toggle}
                    onDoubleClick={toggleFullscreen} />

                {/* Loading spinner */}
                {waiting && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#00CEC8", filter: "drop-shadow(0 0 16px rgba(0,206,200,0.75))" }} />
                    </div>
                )}

                {/* Yopish tugma — yuqori-o'ngda, doim ko'rinadi */}
                <button onClick={onClose}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition hover:brightness-125 z-10"
                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(6px)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>

                {/* Yuklab olish — yuqori-chap */}
                <button onClick={download} title="Yuklab olish"
                    className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition hover:brightness-125 z-10 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    style={{ background: "rgba(11,18,40,0.85)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(6px)" }}>
                    <Download className="w-4 h-4 text-white" />
                </button>

                {/* Pause overlay (playing emas bo'lsa katta play tugma) */}
                {!playing && !waiting && (
                    <button type="button"
                        onClick={() => { videoRef.current?.play(); }}
                        className="absolute inset-0 flex items-center justify-center transition"
                        style={{ background: "rgba(5,8,24,0.20)" }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                            style={{
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                boxShadow: "0 12px 40px rgba(0,206,200,0.50), 0 0 80px rgba(43,62,232,0.35)",
                            }}>
                            <Play className="w-10 h-10 text-white translate-x-0.5" fill="#fff" />
                        </div>
                    </button>
                )}

                {/* Bottom controls */}
                <div className={`absolute left-0 right-0 bottom-0 px-4 pt-12 pb-3 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    style={{ background: "linear-gradient(to top, rgba(5,8,24,0.95), rgba(5,8,24,0))" }}
                    onClick={e => e.stopPropagation()}>
                    {/* Progress bar */}
                    <div className="h-2 rounded-full mb-3 cursor-pointer relative group/bar"
                        style={{ background: "rgba(255,255,255,0.20)" }}
                        onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); seek((e.clientX - rect.left) / rect.width); }}
                        onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoverSeek({ x: e.clientX - rect.left, time: duration * ((e.clientX - rect.left) / rect.width) }); }}
                        onMouseLeave={() => setHoverSeek(null)}>
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${buffered * 100}%`, background: "rgba(255,255,255,0.30)" }} />
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg,#00CEC8,#2B3EE8)", boxShadow: "0 0 10px rgba(0,206,200,0.75)" }} />
                        {hoverSeek && (
                            <div className="absolute -top-7 px-2 py-0.5 rounded text-[11px] font-black tabular-nums text-white pointer-events-none -translate-x-1/2"
                                style={{ left: hoverSeek.x, background: "rgba(11,18,40,0.95)", border: "1px solid rgba(0,206,200,0.35)" }}>
                                {fmt(hoverSeek.time)}
                            </div>
                        )}
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-transform group-hover/bar:scale-125"
                            style={{ left: `calc(${progress * 100}% - 8px)`, background: "#fff", boxShadow: "0 0 10px rgba(0,206,200,0.90)" }} />
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => skip(-10)} title="10s orqaga (J)"
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-white/[0.10]">
                            <ChevronLeft className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-black text-white -ml-0.5">10</span>
                        </button>
                        <button onClick={toggle}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 12px rgba(0,206,200,0.35)" }}>
                            {playing
                                ? <Pause className="w-5 h-5 text-white" fill="#fff" />
                                : <Play className="w-5 h-5 text-white translate-x-0.5" fill="#fff" />}
                        </button>
                        <button onClick={() => skip(10)} title="10s oldinga (L)"
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-white/[0.10]">
                            <span className="text-[9px] font-black text-white -mr-0.5">10</span>
                            <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                        <span className="ml-2 text-[12px] font-black tabular-nums text-white">
                            {fmt(current)} / {fmt(duration)}
                        </span>
                        <div className="flex-1" />

                        <div className="relative flex items-center"
                            onMouseEnter={() => setShowVol(true)}
                            onMouseLeave={() => setShowVol(false)}>
                            <button onClick={toggleMute}
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition"
                                style={{ background: "rgba(11,18,40,0.55)" }}>
                                {muted || volume === 0
                                    ? <VolumeX className="w-4 h-4 text-white" />
                                    : <Volume2 className="w-4 h-4 text-white" />}
                            </button>
                            {showVol && (
                                <div className="ml-2 h-1.5 w-24 rounded-full cursor-pointer relative"
                                    style={{ background: "rgba(255,255,255,0.25)" }}
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const nv = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                        setVolume(nv);
                                        if (videoRef.current) { videoRef.current.volume = nv; videoRef.current.muted = false; }
                                        setMuted(false);
                                    }}>
                                    <div className="h-full rounded-full"
                                        style={{ width: `${(muted ? 0 : volume) * 100}%`, background: "linear-gradient(90deg,#00CEC8,#2B3EE8)" }} />
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={() => setSpeedOpen(o => !o)}
                                className="h-9 min-w-[42px] px-2 rounded-lg text-[11px] font-black text-white flex-shrink-0 transition"
                                style={{ background: speedOpen ? "rgba(0,206,200,0.25)" : "rgba(11,18,40,0.55)" }}>
                                {speed}x
                            </button>
                            {speedOpen && (
                                <div className="absolute bottom-full right-0 mb-1 rounded-lg overflow-hidden min-w-[100px]"
                                    style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.60)" }}>
                                    {([0.5, 1, 1.25, 1.5, 2] as const).map(s => (
                                        <button key={s} onClick={() => { setSpeed(s); setSpeedOpen(false); }}
                                            className="w-full text-left px-3 py-1.5 text-[12px] font-black text-white hover:bg-white/[0.08]"
                                            style={s === speed ? { background: "rgba(0,206,200,0.20)", color: "#00CEC8" } : undefined}>
                                            {s}x{s === 1 ? " · oddiy" : ""}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={togglePip} title="Picture-in-Picture"
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition"
                            style={{ background: pip ? "rgba(0,206,200,0.25)" : "rgba(11,18,40,0.55)" }}>
                            <MessageSquare className="w-4 h-4 text-white -scale-x-100" />
                        </button>
                        <button onClick={toggleFullscreen} title={fullscreen ? "Chiqish (F)" : "To'liq ekran (F)"}
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition"
                            style={{ background: "rgba(11,18,40,0.55)" }}>
                            {fullscreen
                                ? <Minimize2 className="w-4 h-4 text-white" />
                                : <Maximize2 className="w-4 h-4 text-white" />}
                        </button>
                    </div>

                    {/* Klavishlar yordami */}
                    <div className="mt-2 text-[10px] font-black tracking-wider" style={{ color: "rgba(160,180,220,0.55)" }}>
                        SPACE · ← → · J L · M · F · ESC
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxMediaGif — GIF ko'rinishi (mp4 avtoplayning avtomatik loop bilan).
// - Rounded-2xl + Nexus gradient border
// - Yuqori-chapda "GIF" badge (Nexus rangi)
// - Hover'da soft lift
// ─────────────────────────────────────────────────────────────────────────────
function NxMediaGif({ src }: { src: string }) {
    const isMp4 = src.endsWith(".mp4") || src.includes(".mp4?");
    return (
        <div className="relative mb-1 rounded-2xl overflow-hidden inline-block"
            style={{
                border: "1px solid rgba(43,62,232,0.28)",
                boxShadow: "0 4px 16px rgba(0,206,200,0.10)",
                background: "rgba(11,18,40,0.55)",
            }}>
            {isMp4 ? (
                <video src={src} autoPlay loop muted playsInline
                    className="max-w-full max-h-64 block"
                    style={{ borderRadius: "calc(1rem - 1px)" }} />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="GIF" className="max-w-full max-h-64 block"
                    style={{ borderRadius: "calc(1rem - 1px)" }} />
            )}
            {/* GIF badge — Nexus rangi, brend belgi */}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md pointer-events-none"
                style={{
                    background: "rgba(11,18,40,0.85)",
                    border: "1px solid rgba(0,206,200,0.30)",
                    backdropFilter: "blur(4px)",
                }}>
                <span className="text-[9px] font-black tracking-wider" style={{
                    background: "linear-gradient(135deg,#00CEC8,#2B3EE8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}>GIF</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxAudioCard — Nexus brendlangan audio fayl pleyeri (mp3/wav/ogg/m4a/aac/flac/opus).
// Klassik <audio controls>'dan farqli: gradient fon, katta play/pause tugma,
// deterministik waveform panjaralari (seed = src URL), Nexus rangi bilan sinxron
// progress fill, tezlik toggle (1x/1.5x/2x), download tugma.
// Fon: Nexus panel + border-glow, hover'da yorugroq.
// ─────────────────────────────────────────────────────────────────────────────
function NxAudioCard({ src, name, sizeBytes, mine }: {
    src: string;
    name: string;
    sizeBytes: number | null;
    mine: boolean;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);   // 0..1
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
    const barCount = 40;

    // Deterministik "waveform" — src URL'dan hash, har bar balandligi 30-100%
    const bars = (() => {
        let h = 0;
        for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) & 0xffffffff;
        const arr: number[] = [];
        for (let i = 0; i < barCount; i++) {
            h = (h * 1103515245 + 12345) & 0x7fffffff;
            arr.push(30 + (h % 71));   // 30-100
        }
        return arr;
    })();

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const onTime = () => {
            if (!a.duration || !isFinite(a.duration)) return;
            setProgress(a.currentTime / a.duration);
            setCurrentTime(a.currentTime);
            setDuration(a.duration);
        };
        const onMeta = () => { if (isFinite(a.duration)) setDuration(a.duration); };
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
        a.addEventListener("timeupdate", onTime);
        a.addEventListener("loadedmetadata", onMeta);
        a.addEventListener("play", onPlay);
        a.addEventListener("pause", onPause);
        a.addEventListener("ended", onEnded);
        return () => {
            a.removeEventListener("timeupdate", onTime);
            a.removeEventListener("loadedmetadata", onMeta);
            a.removeEventListener("play", onPlay);
            a.removeEventListener("pause", onPause);
            a.removeEventListener("ended", onEnded);
        };
    }, [src]);

    useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) void a.play(); else a.pause();
    };
    const seekTo = (frac: number) => {
        const a = audioRef.current;
        if (!a || !a.duration || !isFinite(a.duration)) return;
        a.currentTime = a.duration * Math.max(0, Math.min(1, frac));
    };
    const nextSpeed = () => setSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 1);

    const fmt = (s: number) => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };
    const fmtBytes = (b: number) => {
        if (b < 1024) return b + " B";
        if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
        return (b / 1024 / 1024).toFixed(1) + " MB";
    };

    return (
        <div className="mb-1 rounded-2xl overflow-hidden relative"
            style={{
                minWidth: 320,
                maxWidth: 380,
                background: mine
                    ? "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))"
                    : "linear-gradient(135deg, rgba(43,62,232,0.14), rgba(0,206,200,0.08))",
                border: `1px solid ${mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.28)"}`,
                boxShadow: mine ? "none" : "0 4px 16px rgba(0,206,200,0.10), inset 0 0 40px rgba(43,62,232,0.06)",
            }}>
            {/* Glow orbital — dekorativ, Nexus brend belgisi */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,206,200,0.20), transparent 70%)" }} />

            {/* Row 1: Play + Waveform */}
            <div className="flex items-center gap-3 px-3 pt-3">
                {/* Big Play/Pause tugma — Nexus gradient */}
                <button onClick={toggle}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                    style={{
                        background: playing
                            ? "linear-gradient(135deg,#00CEC8,#2B3EE8)"
                            : "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 4px 12px rgba(0,206,200,0.35), 0 0 24px rgba(43,62,232,0.20)",
                    }}>
                    {playing
                        ? <Pause className="w-5 h-5 text-white" fill="#fff" />
                        : <Play className="w-5 h-5 text-white translate-x-0.5" fill="#fff" />}
                </button>

                {/* Waveform — 40 ta bar, progress bilan Nexus gradient bilan to'ldiriladi */}
                <div className="flex-1 h-10 flex items-center gap-[2px] cursor-pointer"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        seekTo((e.clientX - rect.left) / rect.width);
                    }}>
                    {bars.map((h, i) => {
                        const barFrac = (i + 0.5) / barCount;
                        const filled = barFrac <= progress;
                        return (
                            <div key={i} className="flex-1 rounded-full transition-colors"
                                style={{
                                    height: `${h}%`,
                                    minWidth: 2,
                                    background: filled
                                        ? "linear-gradient(180deg,#00CEC8,#2B3EE8)"
                                        : (mine ? "rgba(255,255,255,0.30)" : "rgba(140,160,210,0.35)"),
                                }} />
                        );
                    })}
                </div>
            </div>

            {/* Row 2: Filename, size, time, speed, download */}
            <div className="flex items-center gap-2 px-3 pt-2 pb-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black truncate" style={{ color: mine ? "#fff" : "rgba(230,238,255,0.96)" }}>
                        {name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] tabular-nums"
                        style={{ color: mine ? "rgba(255,255,255,0.70)" : "rgba(160,180,220,0.75)" }}>
                        <span>{fmt(currentTime)}</span>
                        <span>·</span>
                        <span>{fmt(duration)}</span>
                        {sizeBytes && <><span>·</span><span>{fmtBytes(sizeBytes)}</span></>}
                    </div>
                </div>

                {/* Tezlik toggle — 1x / 1.5x / 2x */}
                <button onClick={nextSpeed}
                    className="h-6 min-w-[30px] px-1.5 rounded-md text-[10px] font-black flex-shrink-0"
                    style={{
                        background: mine ? "rgba(255,255,255,0.15)" : "rgba(0,206,200,0.14)",
                        color: mine ? "#fff" : "#00CEC8",
                        border: `1px solid ${mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.30)"}`,
                    }}>
                    {speed}x
                </button>

                {/* Yuklab olish */}
                <a href={src} target="_blank" rel="noopener noreferrer" download={name}
                    title="Yuklab olish"
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                        background: mine ? "rgba(255,255,255,0.15)" : "rgba(43,62,232,0.14)",
                        border: `1px solid ${mine ? "rgba(255,255,255,0.20)" : "rgba(43,62,232,0.28)"}`,
                    }}>
                    <Download className="w-3.5 h-3.5" style={{ color: mine ? "#fff" : "rgba(200,215,245,0.85)" }} />
                </a>
            </div>

            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxEmptyChat — yangi ochilgan / bo'sh chat uchun "boshlanish" ekrani.
// Telegram'ning "здесь пока ничего нет + orange character"дан butunlay farqli:
// katta shaffof gradient halqa, ismning birinchi harfi + peer nomi + 4 ta
// "conversation starter" kartochkasi (bosilsa composer'ga matn tushadi).
// Rasm/animatsiya YO'Q — pastki dizayn language + o'zimizni brand ranglari (Nexus teal/blue).
// ─────────────────────────────────────────────────────────────────────────────
function NxEmptyChat({ peerName, isSelf, onQuick }: {
    peerName: string;
    isSelf: boolean;
    onQuick: (text: string) => void;
}) {
    // Vaqt bo'yicha salom (Toshkent vaqti bo'yicha soddaroq: 5–12 tong, 12–18 kunduz, 18–22 kech, 22–5 tun)
    const hh = new Date().getHours();
    const greet = hh < 5 ? "Salom" : hh < 12 ? "Xayrli tong" : hh < 18 ? "Xayrli kun" : hh < 22 ? "Xayrli kech" : "Salom";
    const initial = (peerName?.[0] ?? "•").toUpperCase();

    // Kontekstli boshlash variantlari — universal, hech kimni no'noqroq holatga solmaydigan
    const starters = isSelf
        ? [
            "📌 Eslatma: bugun bajarish kerak",
            "🔖 Foydali link saqladim",
            "💡 Kelasi hafta uchun g'oya",
            "✅ Yakunlangan ishlar ro'yhati",
        ]
        : [
            `${greet}! 👋`,
            `Salom, qanday yordam bera olaman?`,
            `Bir daqiqangiz bormi?`,
            `Yaxshi kunlar tilayman 🌤️`,
        ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 select-none">
            {/* Katta shaffof gradient halqa — o'rtada ismning birinchi harfi */}
            <div className="relative mb-5">
                <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
                    style={{
                        background: "linear-gradient(135deg, rgba(43,62,232,0.18), rgba(0,206,200,0.18))",
                        border: "2px solid rgba(43,62,232,0.35)",
                        boxShadow: "0 0 60px rgba(0,206,200,0.20), inset 0 0 30px rgba(43,62,232,0.15)",
                    }}>
                    {isSelf ? (
                        <Bookmark className="w-9 h-9" style={{ color: "#00CEC8" }} fill="rgba(0,206,200,0.20)" />
                    ) : (
                        <span className="text-4xl font-black" style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}>{initial}</span>
                    )}
                </div>
                {/* Orbital dot — tirikligini bildiruvchi kichik detal */}
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                    style={{ background: "#00CEC8", boxShadow: "0 0 10px rgba(0,206,200,0.90)" }} />
            </div>

            {/* Sarlavha */}
            <h3 className="text-base font-black text-center mb-1.5"
                style={{ color: "rgba(230,238,255,0.98)" }}>
                {isSelf ? "Saqlangan xabarlar" : `${peerName} bilan yangi suhbat`}
            </h3>
            <p className="text-[12px] text-center max-w-[280px] mb-6"
                style={{ color: "rgba(160,180,220,0.75)" }}>
                {isSelf
                    ? "Bu yerga faqat siz kirasiz. Muhim matn, link va rasm saqlash uchun ideal."
                    : "Hozircha xabar yo'q. Bittasini yozib boshlang — quyidagi variantlarni ham tanlashingiz mumkin."}
            </p>

            {/* 4 ta boshlash kartochkasi — bosilsa composer'ga tushadi */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-[340px]">
                {starters.map((s, i) => (
                    <button key={i} onClick={() => onQuick(s)}
                        className="text-left p-2.5 rounded-xl transition hover:brightness-125 active:scale-[0.98]"
                        style={{
                            background: "rgba(11,18,40,0.75)",
                            border: "1px solid rgba(43,62,232,0.28)",
                        }}>
                        <p className="text-[11.5px] font-bold line-clamp-2"
                            style={{ color: "rgba(220,232,255,0.90)" }}>{s}</p>
                    </button>
                ))}
            </div>

            {/* Nozik yordamchi matn (Telegram'nikidan farqli — biz maslahat beramiz) */}
            <p className="mt-6 text-[10.5px] text-center flex items-center gap-1.5"
                style={{ color: "rgba(140,160,210,0.55)" }}>
                <Sparkles className="w-3 h-3" style={{ color: "rgba(0,206,200,0.60)" }} />
                Kartochkani bosing yoki pastdan o&apos;zingizni yozing
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteChatModal — 3-variantli chatni o'chirish oynasi.
// Nexus rangida styled, native confirm() o'rniga (aks holda brauzer prompt'i chiqadi).
//   1. O'zim uchun butunlay o'chirish  →  POST /clear
//   2. Ikkala tomon uchun o'chirish     →  POST /clear-both
//   3. Vaqtinchalik yashirish           →  POST /hide  (keyin qaytarish mumkin)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteChatModal({ convId, convName, isSelf, onClose, onDone }: {
    convId: string;
    convName: string;
    isSelf: boolean;
    onClose: () => void;
    onDone: (action: "mine" | "both" | "hide") => void;
}) {
    const [busy, setBusy] = useState<null | "mine" | "both" | "hide">(null);
    const [err, setErr] = useState<string | null>(null);

    const act = async (kind: "mine" | "both" | "hide") => {
        setBusy(kind); setErr(null);
        const endpoint = kind === "mine" ? "/clear" : kind === "both" ? "/clear-both" : "/hide";
        try {
            const r = await fetch(`/api/nexus/messages/${convId}${endpoint}`, { method: "POST" });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setErr(d?.error ?? "Xato — qayta urinib ko'ring");
                setBusy(null);
                return;
            }
            onDone(kind);
            onClose();
        } catch {
            setErr("Tarmoq xatosi");
            setBusy(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[220]" onClick={busy ? undefined : onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(3,5,15,0.72)", backdropFilter: "blur(8px)" }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[440px] rounded-2xl overflow-hidden"
                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.35)", boxShadow: "0 24px 64px rgba(0,0,0,0.75)" }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.20)" }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
                        <Trash2 className="w-5 h-5" style={{ color: "#EF4444" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black" style={{ color: "rgba(230,238,255,0.98)" }}>Chatni o&apos;chirish</h3>
                        <p className="text-[11.5px] truncate mt-0.5" style={{ color: "rgba(160,180,220,0.75)" }}>
                            {isSelf ? "Saqlangan xabarlar" : convName}
                        </p>
                    </div>
                    {!busy && (
                        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                        </button>
                    )}
                </div>

                {/* Options */}
                <div className="p-2.5 space-y-2">
                    <DcOption icon={Trash2} title="O'zim uchun butunlay o'chirish"
                        desc={isSelf ? "Saqlangan xabarlar tozalanadi." : "Sizga xabarlar ko'rinmaydi. U kishida qoladi."}
                        danger busy={busy === "mine"} disabled={!!busy}
                        onClick={() => act("mine")} />
                    {!isSelf && (
                        <DcOption icon={AlertTriangle} title="Ikkala tomon uchun o'chirish"
                            desc="Chat sizda ham, unda ham butunlay tozalanadi. Bu amalni bekor qilib bo'lmaydi."
                            danger warning busy={busy === "both"} disabled={!!busy}
                            onClick={() => act("both")} />
                    )}
                    <DcOption icon={EyeOff} title="Vaqtinchalik yashirish"
                        desc={`Chat ro'yxatdan g'oyib bo'ladi lekin xabarlar saqlanadi. "Yashirin chatlar" bo'limidan qaytarish mumkin.`}
                        busy={busy === "hide"} disabled={!!busy}
                        onClick={() => act("hide")} />
                </div>

                {err && (
                    <div className="mx-3 mb-3 p-2 rounded-lg text-[11.5px]"
                        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)", color: "#FCA5A5" }}>
                        {err}
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 flex justify-end" style={{ borderTop: "1px solid rgba(43,62,232,0.20)" }}>
                    <button onClick={onClose} disabled={!!busy}
                        className="h-9 px-4 rounded-lg text-[12px] font-black transition disabled:opacity-40"
                        style={{ background: "rgba(43,62,232,0.10)", color: "rgba(200,215,245,0.85)" }}>
                        Bekor qilish
                    </button>
                </div>
            </div>
        </div>
    );
}

function DcOption({ icon: Icon, title, desc, danger, warning, busy, disabled, onClick }: {
    icon: React.ElementType; title: string; desc: string;
    danger?: boolean; warning?: boolean; busy?: boolean; disabled?: boolean;
    onClick: () => void;
}) {
    const accent = warning ? "#F59E0B" : danger ? "#EF4444" : "#00CEC8";
    const bg = warning ? "rgba(245,158,11,0.10)" : danger ? "rgba(239,68,68,0.08)" : "rgba(0,206,200,0.08)";
    const bd = warning ? "rgba(245,158,11,0.30)" : danger ? "rgba(239,68,68,0.25)" : "rgba(0,206,200,0.25)";
    return (
        <button onClick={onClick} disabled={disabled}
            className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition disabled:opacity-50 hover:brightness-110"
            style={{ background: bg, border: `1px solid ${bd}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(11,18,40,0.55)" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: accent }} />
                    : <Icon className="w-4 h-4" style={{ color: accent }} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-black" style={{ color: "rgba(230,238,255,0.96)" }}>{title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(160,180,220,0.75)" }}>{desc}</p>
            </div>
        </button>
    );
}
