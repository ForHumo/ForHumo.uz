"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Hash, Users, Plus, Loader2, X, Send, BadgeCheck, Lock, ArrowLeft, Check, Megaphone, UserPlus, Trash2, Shield, ShieldOff, BarChart2, Pin, PinOff, Edit3, Smile, Reply, Forward, Bookmark, BookmarkCheck, Search, Volume2, VolumeX, Languages, Copy, History, Clock, MoreVertical, LogOut,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { NxPollCreate } from "./nx-poll-create";
import { NxMarkdown } from "./nx-markdown";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { Emoji } from "@/lib/twemoji";
import { subscribeUserChannel } from "@/lib/pusher-client";

type ChType = "CHANNEL" | "GROUP";
interface ChItem { id: string; type: ChType; name: string; handle: string | null; description?: string | null; avatarUrl: string | null; memberCount: number; role?: string; isMember: boolean }
interface ChDetail { id: string; type: ChType; name: string; handle: string | null; description: string | null; avatarUrl: string | null; isPrivate: boolean; memberCount: number; isOwner: boolean; isMember: boolean; role: string | null; canPost: boolean; allowComments?: boolean }
interface ChMsg {
    id: string; text: string | null; media: string[]; createdAt: string; mine: boolean;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    pollQuestion?: string | null; pollOptions?: string[]; pollExpiresAt?: string | null; pollMulti?: boolean;
    pollVoteCounts?: number[] | null; pollMyVotes?: number[] | null; pollTotal?: number | null;
    pinnedAt?: string | null;
    editedAt?: string | null;
    reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
    replyTo?: { id: string; text: string | null; senderName: string | null } | null;
    replyToId?: string | null;
    bookmarked?: boolean;
    commentCount?: number;
}
interface ChComment {
    id: string;
    text: string | null;
    media: string[];
    createdAt: string;
    editedAt?: string | null;
    mine: boolean;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
}

function avatarFor(c: { name: string; avatarUrl?: string | null }) {
    return c.avatarUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(c.name)}`;
}
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function NxChannels({ type }: { type: ChType }) {
    const [scope, setScope] = useState<"mine" | "discover">("mine");
    const [list, setList] = useState<ChItem[] | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(() => {
        setList(null);
        fetch(`/api/nexus/channels?scope=${scope}&type=${type}`).then(r => r.json())
            .then(d => setList(d.channels ?? [])).catch(() => setList([]));
    }, [scope, type]);
    useEffect(() => { load(); }, [load]);

    const label = type === "CHANNEL" ? "Kanal" : "Guruh";

    if (openId) return <NxChannelRoom id={openId} onBack={() => { setOpenId(null); load(); }} />;

    return (
        <div className="px-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1 flex-1">
                    {(["mine", "discover"] as const).map(s => (
                        <button key={s} onClick={() => setScope(s)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                            style={scope === s ? { background: "rgba(43,62,232,0.18)", color: "#fff" } : { background: "rgba(11,18,40,0.5)", color: "rgba(140,160,210,0.8)" }}>
                            {s === "mine" ? "Mening" : "Kashfiyot"}
                        </button>
                    ))}
                </div>
                <button onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Plus className="w-3.5 h-3.5" /> {label}
                </button>
            </div>

            {list === null ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                        {type === "CHANNEL" ? <Hash className="w-5 h-5" style={{ color: "rgba(43,62,232,0.5)" }} /> : <Users className="w-5 h-5" style={{ color: "rgba(43,62,232,0.5)" }} />}
                    </div>
                    <p className="text-sm font-bold text-white/60">{scope === "mine" ? `Hali ${label.toLowerCase()} yo'q` : "Kashf qilish uchun yo'q"}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(120,140,185,0.7)" }}>{scope === "mine" ? `Yangi ${label.toLowerCase()} yarating` : "Birinchi bo'lib yarating"}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {list.map(c => (
                        <button key={c.id} onClick={() => setOpenId(c.id)}
                            className="flex items-center gap-3 p-2.5 rounded-2xl text-left active:scale-[0.99] transition"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <img src={avatarFor(c)} alt="" className="w-12 h-12 rounded-2xl object-cover bg-white flex-shrink-0" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-white truncate">{c.name}</span>
                                    {c.type === "CHANNEL" ? <Megaphone className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(120,140,185,0.7)" }} /> : null}
                                </div>
                                <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.8)" }}>
                                    {c.handle ? `@${c.handle} · ` : ""}{c.memberCount} a&apos;zo{c.description ? ` · ${c.description}` : ""}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {createOpen && <CreateChannel type={type} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setScope("mine"); load(); }} />}
        </div>
    );
}

function CreateChannel({ type, onClose, onCreated }: { type: ChType; onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState("");
    const [handle, setHandle] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const label = type === "CHANNEL" ? "Kanal" : "Guruh";

    async function create() {
        if (busy) return;
        if (!name.trim()) { setErr("Nom kerak"); return; }
        setBusy(true); setErr(null);
        try {
            const res = await fetch("/api/nexus/channels", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, name, handle: handle || undefined, description, isPrivate }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "Xatolik"); return; }
            onCreated();
        } finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white">Yangi {label.toLowerCase()}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}><X className="w-4 h-4 text-white" /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder={`${label} nomi`}
                        className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                    <div className="flex items-center px-3.5 py-3 rounded-xl gap-1" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <span className="text-sm font-bold" style={{ color: "#00CEC8" }}>@</span>
                        <input value={handle} onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="handle (ixtiyoriy)"
                            className="flex-1 bg-transparent text-sm text-white outline-none" />
                    </div>
                    <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={2} placeholder="Tavsif (ixtiyoriy)"
                        className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none resize-none" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                    <button onClick={() => setIsPrivate(p => !p)} className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <span className="flex items-center gap-2 text-sm font-bold text-white"><Lock className="w-4 h-4" style={{ color: isPrivate ? "#00CEC8" : "rgba(120,140,185,0.7)" }} />Yopiq (taklif bilan)</span>
                        <div className="w-10 h-6 rounded-full p-0.5 transition" style={{ background: isPrivate ? "#00CEC8" : "rgba(43,62,232,0.25)" }}>
                            <div className="w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: isPrivate ? "translateX(16px)" : "none" }} />
                        </div>
                    </button>
                    {err && <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{err}</p>}
                    <button onClick={create} disabled={busy} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Yaratish
                    </button>
                </div>
            </div>
        </>
    );
}

export function NxChannelRoom({ id, onBack }: { id: string; onBack: () => void }) {
    const { data: session } = useSession();
    const [myProfileId, setMyProfileId] = useState<string | null>(null);
    useEffect(() => {
        if (!session?.user?.email) return;
        fetch("/api/user/profile").then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.profile) setMyProfileId(d.profile.id); }).catch(() => {});
    }, [session?.user?.email]);
    const [ch, setCh] = useState<ChDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [msgs, setMsgs] = useState<ChMsg[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [joinBusy, setJoinBusy] = useState(false);

    // Kanal komment (Telegram uslub) — ochilgan izohlar
    const [commentsFor, setCommentsFor] = useState<string | null>(null);
    const [comments, setComments] = useState<ChComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentInput, setCommentInput] = useState("");
    const [sendingComment, setSendingComment] = useState(false);

    async function loadComments(msgId: string) {
        setLoadingComments(true);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/messages/${msgId}/comments?limit=100`);
            if (r.ok) {
                const d = await r.json();
                setComments(d.comments ?? []);
            }
        } finally { setLoadingComments(false); }
    }

    async function openComments(msgId: string) {
        if (commentsFor === msgId) {
            setCommentsFor(null);
            setComments([]);
            return;
        }
        setCommentsFor(msgId);
        setCommentInput("");
        await loadComments(msgId);
    }

    async function sendComment(msgId: string) {
        const t = commentInput.trim();
        if (!t || sendingComment) return;
        setSendingComment(true);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: t, replyToId: msgId }),
            });
            if (r.ok) {
                setCommentInput("");
                await loadComments(msgId);
                // commentCount ni ham +1
                setMsgs(prev => prev.map(x => x.id === msgId
                    ? { ...x, commentCount: (x.commentCount ?? 0) + 1 } : x));
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Izoh yuborilmadi");
            }
        } finally { setSendingComment(false); }
    }
    const [membersOpen, setMembersOpen] = useState(false);
    const [pollOpen, setPollOpen] = useState(false);

    async function sendPoll(poll: { question: string; options: string[]; expiresAt: string | null; multi: boolean }) {
        const r = await fetch(`/api/nexus/channels/${id}/messages`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "", pollQuestion: poll.question, pollOptions: poll.options,
                pollExpiresAt: poll.expiresAt, pollMulti: poll.multi,
            }),
        });
        if (r.ok) {
            const d = await r.json();
            setMsgs(prev => [...prev, d.message].slice(-200));
            lastTs.current = d.message.createdAt;
            setPollOpen(false);
        } else {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error || "Xato");
        }
    }

    async function votePoll(messageId: string, optionIndex: number) {
        const r = await fetch(`/api/nexus/channels/${id}/messages/${messageId}/poll-vote`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionIndex }),
        });
        if (r.ok) {
            const d = await r.json();
            setMsgs(prev => prev.map(m => m.id === messageId
                ? { ...m, pollVoteCounts: d.counts, pollMyVotes: d.myVotes, pollTotal: d.total }
                : m
            ));
        } else {
            const e = await r.json().catch(() => ({}));
            alert(e.error || "Ovoz berib bo'lmadi");
        }
    }
    const lastTs = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadDetail = useCallback(() => {
        fetch(`/api/nexus/channels/${id}`).then(r => r.json()).then(d => { if (d.channel) setCh(d.channel); }).finally(() => setLoading(false));
    }, [id]);
    useEffect(() => { loadDetail(); }, [loadDetail]);

    // Xabar polling (a'zo bo'lsa) — Pusher bo'lsa 20s fallback, aks holda 4s
    useEffect(() => {
        if (!ch?.isMember) return;
        let stop = false;
        const poll = async () => {
            try {
                const qs = lastTs.current ? `?since=${encodeURIComponent(lastTs.current)}` : "";
                const d = await fetch(`/api/nexus/channels/${id}/messages${qs}`).then(r => r.json());
                if (stop || !d.messages?.length) return;
                setMsgs(prev => {
                    const seen = new Set(prev.map((m: ChMsg) => m.id));
                    // Kanal komment (reply): asosiy oqimga tushmasin — faqat izohlar paneli ko'radi
                    const fresh = d.messages.filter((m: ChMsg) =>
                        !seen.has(m.id) && (ch?.type === "GROUP" || !m.replyToId)
                    );
                    return fresh.length ? [...prev, ...fresh].slice(-200) : prev;
                });
                lastTs.current = d.messages[d.messages.length - 1].createdAt;
            } catch { /* noop */ }
        };
        poll();
        const interval = myProfileId ? 20_000 : 4_000;
        const iv = setInterval(poll, interval);
        return () => { stop = true; clearInterval(iv); };
    }, [ch?.isMember, id, myProfileId]);

    // Real-time push — kanal xabari kelganda darhol ko'rsatish
    useEffect(() => {
        if (!ch?.isMember || !myProfileId) return;
        const pusherCh = subscribeUserChannel(myProfileId);
        if (!pusherCh) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMsgNew = (data: { channelId?: string; message: any }) => {
            if (data?.channelId !== id || !data?.message) return;
            const msg = data.message as ChMsg;
            // Kanal + reply — izoh, asosiy oqimga tushmasin, faqat parent commentCount ni bump
            if (ch?.type === "CHANNEL" && msg.replyToId) {
                setMsgs(prev => prev.map(x => x.id === msg.replyToId
                    ? { ...x, commentCount: (x.commentCount ?? 0) + 1 } : x));
                // Agar hozir shu parent uchun izohlar ochiq bo'lsa — comments'ga ham qo'shamiz
                if (commentsFor === msg.replyToId) {
                    setComments(prev => prev.some(c => c.id === msg.id) ? prev : [...prev, {
                        id: msg.id, text: msg.text, media: msg.media, createdAt: msg.createdAt,
                        editedAt: msg.editedAt ?? null, mine: msg.mine, author: msg.author,
                    } as ChComment]);
                }
                return;
            }
            setMsgs(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg].slice(-200);
            });
            lastTs.current = msg.createdAt;
        };
        pusherCh.bind("nx:msg:new", onMsgNew);
        return () => { pusherCh.unbind("nx:msg:new", onMsgNew); };
    }, [ch?.isMember, id, myProfileId]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    async function join() {
        if (joinBusy) return; setJoinBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/join`, { method: "POST" });
            if (r.ok) loadDetail();
        } finally { setJoinBusy(false); }
    }
    async function send() {
        if (!input.trim() || busy) return;
        setBusy(true);
        const text = input.trim(); setInput("");
        try { localStorage.removeItem(CH_DRAFT_PREFIX + id); } catch {}
        const replyToIdSnap = replyTo?.id ?? null;
        setReplyTo(null);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, ...(replyToIdSnap ? { replyToId: replyToIdSnap } : {}) }),
            });
            if (r.ok) { const d = await r.json(); setMsgs(prev => [...prev, d.message].slice(-200)); lastTs.current = d.message.createdAt; }
        } finally { setBusy(false); }
    }
    async function leaveOrDelete() {
        if (ch?.isOwner) {
            if (!confirm("Kanalni o'chirasizmi?")) return;
            await fetch(`/api/nexus/channels/${id}`, { method: "DELETE" });
        } else {
            await fetch(`/api/nexus/channels/${id}/join`, { method: "POST" });
        }
        onBack();
    }

    // Tahrirlash rejimi
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    // Reaksiya emoji tanlagich
    const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
    // Per-xabar 3-dot More menyu (Telegram uslub — kam ishlatiluvchi amallar shu yerda)
    const [chMsgMenuFor, setChMsgMenuFor] = useState<string | null>(null);
    useEffect(() => {
        if (!chMsgMenuFor) return;
        function onDown(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (t.closest("[data-ch-msg-menu]")) return;
            setChMsgMenuFor(null);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [chMsgMenuFor]);
    // Reply — javob berilayotgan xabar
    const [replyTo, setReplyTo] = useState<ChMsg | null>(null);
    // Moderatsiya inboxi (owner/admin uchun)
    interface ModFlag {
        id: string; messageId: string; reportCount: number;
        lastReason: string | null;
        aiVerdict: string | null; aiSeverity: number | null; aiReason: string | null;
        createdAt: string;
        message: { text: string | null; createdAt: string; hidden: boolean;
            sender: { name: string | null; username: string | null; image: string | null } | null } | null;
    }
    const [modOpen, setModOpen] = useState(false);
    const [modFlags, setModFlags] = useState<ModFlag[]>([]);
    const [modCount, setModCount] = useState(0);
    // Faqat owner/admin uchun periodic fetch
    useEffect(() => {
        if (!ch?.isOwner && ch?.role !== "ADMIN") return;
        let stop = false;
        async function load() {
            const r = await fetch(`/api/nexus/channels/${id}/moderation`, { cache: "no-store" }).catch(() => null);
            if (!r?.ok || stop) return;
            const d = await r.json();
            setModCount(d.total ?? 0);
            setModFlags(d.flags ?? []);
        }
        load();
        const iv = setInterval(load, 60_000);
        return () => { stop = true; clearInterval(iv); };
    }, [id, ch?.isOwner, ch?.role]);

    // Server-side qidiruv
    const [searchOpen, setSearchOpen] = useState(false);
    // Telegram uslub — kanal xonasi header 3-dot More menyu
    const [chMoreOpen, setChMoreOpen] = useState(false);
    const chMoreRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!chMoreOpen) return;
        function onDown(e: MouseEvent) {
            if (chMoreRef.current?.contains(e.target as Node)) return;
            setChMoreOpen(false);
        }
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [chMoreOpen]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ id: string; text: string | null; createdAt: string; mine: boolean; hasMedia: boolean; sender: { name: string | null; username: string | null; image: string | null } | null }> | null>(null);
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchBusy, setSearchBusy] = useState(false);
    useEffect(() => {
        if (!searchOpen) { setSearchResults(null); setSearchTotal(0); return; }
        const q = searchQuery.trim();
        if (q.length < 2) { setSearchResults(null); setSearchTotal(0); return; }
        setSearchBusy(true);
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/nexus/channels/${id}/messages/search?q=${encodeURIComponent(q)}&limit=50`, { cache: "no-store" });
                if (r.ok) {
                    const d = await r.json();
                    setSearchResults(d.results ?? []);
                    setSearchTotal(d.total ?? 0);
                }
            } finally { setSearchBusy(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, searchOpen, id]);
    function jumpToChMsg(msgId: string) {
        const el = document.querySelector<HTMLElement>(`[data-ch-msg-id="${msgId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.animate([{ background: "rgba(0,206,200,0.20)" }, { background: "transparent" }], { duration: 1400, iterations: 1 });
        } else {
            alert("Xabar hozirgi ko'rinishda emas — biroz yuqoriga aylantiring");
        }
    }

    // TTS (Web Speech API)
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    function speakMsg(msgId: string, text: string) {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        if (speakingId === msgId) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = /[а-яё]/i.test(text) ? "ru-RU" : "en-US";
        u.onend = () => setSpeakingId(null);
        u.onerror = () => setSpeakingId(null);
        setSpeakingId(msgId);
        window.speechSynthesis.speak(u);
    }
    useEffect(() => () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    }, []);

    // Tarjima (Gemini) + dropdown
    const [translated, setTranslated] = useState<Record<string, string>>({});
    const [translating, setTranslating] = useState<Record<string, boolean>>({});
    const [translatePickerFor, setTranslatePickerFor] = useState<string | null>(null);
    async function translateMsg(msgId: string, text: string, target: "uz" | "ru" | "en") {
        setTranslatePickerFor(null);
        setTranslating(prev => ({ ...prev, [msgId]: true }));
        try {
            const r = await fetch("/api/ai/translate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, target }),
            });
            if (r.ok) { const d = await r.json(); setTranslated(prev => ({ ...prev, [msgId]: d.translated })); }
            else alert("Tarjima qilib bo'lmadi");
        } finally {
            setTranslating(prev => { const n = { ...prev }; delete n[msgId]; return n; });
        }
    }
    function hideTranslated(msgId: string) {
        setTranslated(prev => { const n = { ...prev }; delete n[msgId]; return n; });
    }
    function copyMsg(text: string) {
        void copyToClipboard(text);
    }

    // Draft — per-channel localStorage
    const CH_DRAFT_PREFIX = "nexus:ch:draft:";
    // Chat ochilganda draft'ni tiklash
    useEffect(() => {
        try {
            const d = localStorage.getItem(CH_DRAFT_PREFIX + id);
            if (d) setInput(d);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    // Har input o'zgarishida (400ms debounce) saqlash
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                if (input.trim()) localStorage.setItem(CH_DRAFT_PREFIX + id, input);
                else localStorage.removeItem(CH_DRAFT_PREFIX + id);
            } catch {}
        }, 400);
        return () => clearTimeout(t);
    }, [input, id]);

    // Forward — kanal xabarni DM'ga jo'natish
    const [forwardMsg, setForwardMsg] = useState<ChMsg | null>(null);
    const [dmList, setDmList] = useState<Array<{ conversationId: string; other: { name: string | null; username: string | null; image: string | null } | null }>>([]);
    const [forwarding, setForwarding] = useState(false);
    // Tahrirlash tarixi modali
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyItems, setHistoryItems] = useState<Array<{ id: string; previousText: string; editedAt: string }>>([]);

    async function openHistory(msgId: string) {
        setHistoryModalOpen(true);
        setHistoryLoading(true);
        setHistoryItems([]);
        try {
            const r = await fetch(`/api/nexus/channels/${id}/messages/${msgId}/history`);
            if (r.ok) {
                const d = await r.json();
                setHistoryItems(d.edits ?? []);
            }
        } finally {
            setHistoryLoading(false);
        }
    }
    useEffect(() => {
        if (!forwardMsg) return;
        fetch("/api/nexus/messages").then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.conversations) setDmList(d.conversations); })
            .catch(() => {});
    }, [forwardMsg]);
    async function forwardToDm(convId: string) {
        if (!forwardMsg) return;
        setForwarding(true);
        try {
            const prefix = `↪ Kanaldan (${ch?.name ?? ""})\n`;
            const text = forwardMsg.text ? prefix + forwardMsg.text : prefix;
            const media = forwardMsg.media?.[0] ?? null;
            const body: Record<string, unknown> = { text };
            // Kanal media[] birinchi elementini DM mediaUrl sifatida
            if (media) {
                body.mediaUrl = media;
                body.mediaType = /\.(png|jpe?g|gif|webp)$/i.test(media) ? "image"
                    : /\.(mp4|webm|mov)$/i.test(media) ? "video"
                    : /\.(mp3|webm|m4a|wav|ogg)$/i.test(media) ? "audio"
                    : "file";
            }
            const r = await fetch(`/api/nexus/messages/${convId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (r.ok) setForwardMsg(null);
            else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Yuborib bo'lmadi");
            }
        } finally { setForwarding(false); }
    }

    async function editMsg(m: ChMsg) {
        if (!m.text) return;
        setEditingId(m.id); setEditingText(m.text);
    }
    async function saveEdit() {
        if (!editingId) return;
        const text = editingText.trim();
        if (!text) { setEditingId(null); return; }
        const r = await fetch(`/api/nexus/channels/${id}/messages/${editingId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        if (r.ok) {
            setMsgs(prev => prev.map(x => x.id === editingId ? { ...x, text, editedAt: new Date().toISOString() } : x));
            setEditingId(null); setEditingText("");
        } else {
            const d = await r.json().catch(() => ({}));
            alert(d?.error ?? "Tahrirlab bo'lmadi");
        }
    }
    async function deleteMsg(m: ChMsg) {
        if (!confirm("Xabarni o'chirilsinmi?")) return;
        const r = await fetch(`/api/nexus/channels/${id}/messages/${m.id}`, { method: "DELETE" });
        if (r.ok) setMsgs(prev => prev.filter(x => x.id !== m.id));
        else alert("O'chirib bo'lmadi");
    }
    async function toggleBookmark(m: ChMsg) {
        const now = !m.bookmarked;
        setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, bookmarked: now } : x));
        const url = `/api/nexus/channels/${id}/messages/${m.id}/bookmark`;
        const r = await fetch(url, now
            ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
            : { method: "DELETE" });
        if (!r.ok) setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, bookmarked: !now } : x));
    }

    async function toggleReact(m: ChMsg, emoji: string) {
        const r = await fetch(`/api/nexus/channels/${id}/messages/${m.id}/react`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
        });
        if (r.ok) {
            const d = await r.json();
            setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, reactions: d.reactions ?? [] } : x));
        }
        setReactPickerFor(null);
    }

    // Kanal xabarini pinga qo'yish / olib tashlash (faqat ega/admin)
    async function toggleChannelPin(m: ChMsg) {
        const isPinned = !!m.pinnedAt;
        const url = `/api/nexus/channels/${id}/messages/${m.id}/pin`;
        const opts: RequestInit = isPinned ? { method: "DELETE" } : { method: "POST" };
        const r = await fetch(url, opts);
        if (r.ok) {
            const nowIso = new Date().toISOString();
            setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, pinnedAt: isPinned ? null : nowIso } : x));
        } else {
            const d = await r.json().catch(() => ({}));
            alert(d?.error ?? "Bajarib bo'lmadi");
        }
    }
    const canManage = ch?.isOwner || ch?.role === "ADMIN";

    if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>;
    if (!ch) return <div className="px-4 py-10 text-center text-sm text-white/60">Topilmadi <button onClick={onBack} className="block mx-auto mt-3 text-xs underline">Orqaga</button></div>;

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-3 mx-2 rounded-2xl mb-2" style={{ background: "rgba(11,18,40,0.6)", border: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={onBack} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.12)" }}><ArrowLeft className="w-4 h-4 text-white" /></button>
                <img src={avatarFor(ch)} alt="" className="w-9 h-9 rounded-xl object-cover bg-white flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{ch.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.8)" }}>{ch.type === "CHANNEL" ? "Kanal" : "Guruh"} · {ch.memberCount} a&apos;zo</p>
                </div>
                {ch.isMember && (
                    <button onClick={() => { setSearchOpen(v => !v); setSearchQuery(""); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: searchOpen ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.12)" }}
                        title={searchOpen ? "Qidiruvni yopish" : "Kanalda qidirish"}>
                        {searchOpen
                            ? <X className="w-4 h-4" style={{ color: "#00CEC8" }} />
                            : <Search className="w-4 h-4" style={{ color: "rgba(180,195,235,0.95)" }} />
                        }
                    </button>
                )}
                {/* Telegram uslub — barcha kam ishlatiluvchi amallar 3-dot menyusi ichida */}
                {ch.isMember && (
                    <div className="relative" ref={chMoreRef}>
                        <button onClick={() => setChMoreOpen(v => !v)}
                            title="Ko'proq"
                            className="relative w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{
                                background: chMoreOpen
                                    ? "rgba(0,206,200,0.15)"
                                    : modCount > 0 ? "rgba(239,68,68,0.15)" : "rgba(43,62,232,0.12)",
                            }}>
                            <MoreVertical className="w-4 h-4" style={{ color: modCount > 0 && !chMoreOpen ? "#EF4444" : "rgba(180,195,235,0.95)" }} />
                            {modCount > 0 && !chMoreOpen && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                                    style={{ background: "#EF4444", color: "#fff" }}>
                                    {modCount > 99 ? "99+" : modCount}
                                </span>
                            )}
                        </button>
                        {chMoreOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-30"
                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                {(ch.isOwner || ch.role === "ADMIN") && (
                                    <button onClick={() => { setModOpen(true); setChMoreOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                        <Shield className="w-4 h-4" style={{ color: modCount > 0 ? "#EF4444" : "#00CEC8" }} />
                                        <span className="flex-1">Moderatsiya</span>
                                        {modCount > 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                                                {modCount > 99 ? "99+" : modCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {ch.isOwner && (
                                    <button onClick={() => { setMembersOpen(true); setChMoreOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left border-b"
                                        style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                        <Users className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                        <span className="flex-1">A&apos;zolar</span>
                                    </button>
                                )}
                                <button onClick={() => { leaveOrDelete(); setChMoreOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-red-500/10 text-left"
                                    style={{ color: "#EF4444" }}>
                                    {ch.isOwner
                                        ? <><Trash2 className="w-4 h-4" /> <span className="flex-1">{ch.type === "CHANNEL" ? "Kanalni o'chirish" : "Guruhni o'chirish"}</span></>
                                        : <><LogOut className="w-4 h-4" /> <span className="flex-1">{ch.type === "CHANNEL" ? "Kanaldan chiqish" : "Guruhdan chiqish"}</span></>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {membersOpen && <ChannelMembers id={id} onClose={() => setMembersOpen(false)} />}

            {/* Qidiruv paneli */}
            {searchOpen && ch.isMember && (
                <div className="mx-2 mb-2 rounded-xl overflow-hidden"
                    style={{ background: "rgba(11,18,40,0.6)", border: "1px solid rgba(43,62,232,0.18)" }}>
                    <div className="px-3 py-2 flex items-center gap-2">
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.60)" }} />
                        <input autoFocus value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Kanalda qidirish (2+ belgi)..."
                            className="flex-1 h-8 bg-transparent text-white text-sm focus:outline-none" />
                        {searchBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00CEC8" }} />}
                        {searchQuery.trim().length >= 2 && !searchBusy && (
                            <span className="text-[11px] font-bold" style={{ color: "rgba(140,160,210,0.85)" }}>{searchTotal} natija</span>
                        )}
                    </div>
                    {searchResults && searchResults.length > 0 && (
                        <div className="max-h-64 overflow-y-auto border-t" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            {searchResults.map(r => (
                                <button key={r.id} onClick={() => jumpToChMsg(r.id)}
                                    className="w-full text-left px-3 py-2 border-b hover:bg-white/[0.04] transition"
                                    style={{ borderColor: "rgba(43,62,232,0.08)" }}>
                                    <div className="flex items-center gap-2">
                                        {r.sender?.image
                                            ? <img src={r.sender.image} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: "rgba(43,62,232,0.20)" }} />
                                        }
                                        <span className="text-[10px] font-black truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                            {r.sender?.name ?? r.sender?.username ?? "Foydalanuvchi"}
                                        </span>
                                        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "rgba(140,160,210,0.60)" }}>
                                            {new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                                        </span>
                                    </div>
                                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(220,230,255,0.90)" }}>
                                        {r.text ?? (r.hasMedia ? "[media]" : "")}
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
                        <p className="px-3 py-2 text-xs text-center" style={{ color: "rgba(140,160,210,0.60)" }}>Hech narsa topilmadi</p>
                    )}
                </div>
            )}

            {!ch.isMember ? (
                <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
                    {ch.description && <p className="text-sm mb-4 max-w-xs" style={{ color: "rgba(180,200,240,0.85)" }}>{ch.description}</p>}
                    <button onClick={join} disabled={joinBusy} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {joinBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} A&apos;zo bo&apos;lish
                    </button>
                </div>
            ) : (
                <>
                    {/* Pinlangan xabarlar banneri */}
                    {(() => {
                        const pinned = msgs.filter(m => m.pinnedAt)
                            .sort((a, b) => new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime());
                        if (pinned.length === 0) return null;
                        const top = pinned[0];
                        return (
                            <button onClick={() => {
                                const el = document.querySelector<HTMLElement>(`[data-ch-msg-id="${top.id}"]`);
                                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                el?.animate([
                                    { background: "rgba(0,206,200,0.15)" }, { background: "transparent" },
                                ], { duration: 1400, iterations: 1 });
                            }} className="mx-3 mb-1 w-[calc(100%-24px)] flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/[0.03]"
                                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                <Pin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>
                                        Pinlangan xabar{pinned.length > 1 ? ` (${pinned.length})` : ""}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                        {top.text || "(media)"}
                                    </p>
                                </div>
                                {canManage && (
                                    <PinOff onClick={(e) => { e.stopPropagation(); toggleChannelPin(top); }}
                                        className="w-3.5 h-3.5 flex-shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                                        style={{ color: "rgba(160,176,224,0.85)" }} />
                                )}
                            </button>
                        );
                    })()}
                    <div className="flex-1 overflow-y-auto px-3 min-h-0" style={{ scrollbarWidth: "none" }}>
                        {msgs.length === 0 ? (
                            <p className="text-xs text-center py-8" style={{ color: "rgba(120,140,185,0.6)" }}>{ch.canPost ? "Birinchi xabarni yozing" : "Hali xabar yo'q"}</p>
                        ) : msgs.map(m => (
                            <div key={m.id} data-ch-msg-id={m.id} className={`group flex gap-2 py-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                                <img src={m.author?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(m.author?.username || "u")}`} alt="" className="w-7 h-7 rounded-lg object-cover bg-white flex-shrink-0" />
                                <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${m.mine ? "rounded-tr-sm" : "rounded-tl-sm"}`} style={{ background: m.mine ? "rgba(43,62,232,0.2)" : "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    {!m.mine && <p className="text-[11px] font-black mb-0.5 inline-flex items-center gap-1" style={{ color: "#00CEC8" }}>{m.author?.name || m.author?.username || "Foydalanuvchi"}{m.author?.verified && <BadgeCheck className="w-3 h-3" />}</p>}
                                    {m.replyTo && (
                                        <button onClick={() => {
                                            const el = document.querySelector<HTMLElement>(`[data-ch-msg-id="${m.replyTo!.id}"]`);
                                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                            el?.animate([{ background: "rgba(0,206,200,0.15)" }, { background: "transparent" }], { duration: 1400, iterations: 1 });
                                        }}
                                            className="mb-1.5 pl-2 pr-2 py-1 rounded-md text-xs text-left w-full"
                                            style={{ background: "rgba(0,0,0,0.20)", borderLeft: "3px solid #00CEC8" }}>
                                            <p className="font-bold text-[11px] mb-0.5" style={{ color: "#00CEC8" }}>
                                                {m.replyTo.senderName ?? "Foydalanuvchi"}
                                            </p>
                                            <p className="opacity-80 line-clamp-2" style={{ color: "rgba(220,230,255,0.85)" }}>
                                                {m.replyTo.text || "(media)"}
                                            </p>
                                        </button>
                                    )}
                                    {m.text && editingId !== m.id && (
                                        <div className="text-sm whitespace-pre-wrap" style={{ color: "rgba(210,220,245,0.95)" }}>
                                            <NxMarkdown text={m.text} />
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
                                    {editingId === m.id && (
                                        <div className="flex flex-col gap-1.5">
                                            <textarea value={editingText} onChange={e => setEditingText(e.target.value)}
                                                rows={2} autoFocus
                                                className="bg-black/30 rounded p-1.5 text-sm focus:outline-none resize-none w-full"
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
                                    {/* Poll render */}
                                    {m.pollQuestion && Array.isArray(m.pollOptions) && (() => {
                                        const counts = m.pollVoteCounts ?? m.pollOptions.map(() => 0);
                                        const total = m.pollTotal ?? 0;
                                        const myVotes = m.pollMyVotes ?? [];
                                        const expired = m.pollExpiresAt && new Date(m.pollExpiresAt) < new Date();
                                        const showResults = myVotes.length > 0 || expired;
                                        return (
                                            <div className="mt-1.5 space-y-1.5" style={{ minWidth: 240 }}>
                                                <div className="flex items-start gap-1.5">
                                                    <BarChart2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-white">{m.pollQuestion}</p>
                                                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>
                                                            {m.pollMulti ? "Bir necha variant" : "Bitta variant"} · {total} ovoz{expired && " · Yakunlangan"}
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
                                                            style={{ background: "rgba(43,62,232,0.10)" }}>
                                                            {showResults && (
                                                                <div className="absolute inset-y-0 left-0 rounded-lg transition-all"
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                        background: isMyVote ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.25)",
                                                                    }} />
                                                            )}
                                                            <div className="relative flex items-center gap-1.5 px-2 py-1.5">
                                                                {showResults && (
                                                                    <span className="text-[10px] font-black tabular-nums w-9 flex-shrink-0 text-white">{pct}%</span>
                                                                )}
                                                                <span className="text-xs flex-1 text-white" style={{ fontWeight: isMyVote ? 700 : 500 }}>{opt}</span>
                                                                {isMyVote && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} strokeWidth={3} />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                    {/* Reaksiya chiplari */}
                                    {m.reactions && m.reactions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {m.reactions.map(r => (
                                                <button key={r.emoji} onClick={() => toggleReact(m, r.emoji)}
                                                    className="px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-0.5 transition"
                                                    style={{
                                                        background: r.mine ? "rgba(0,206,200,0.25)" : "rgba(255,255,255,0.08)",
                                                        border: `1px solid ${r.mine ? "rgba(0,206,200,0.50)" : "rgba(255,255,255,0.14)"}`,
                                                    }}>
                                                    <span>{r.emoji}</span>
                                                    <span className="font-bold opacity-90">{r.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Kanal komment chip (Telegram uslub) — faqat CHANNEL + allowComments + top-level */}
                                    {ch?.type === "CHANNEL" && ch.allowComments && !m.replyToId && (
                                        <button onClick={() => openComments(m.id)}
                                            className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition hover:brightness-110"
                                            style={{
                                                background: commentsFor === m.id ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.10)",
                                                border: `1px solid ${commentsFor === m.id ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.25)"}`,
                                                color: commentsFor === m.id ? "#00CEC8" : "rgba(160,176,224,0.95)",
                                            }}>
                                            <Reply className="w-3 h-3" />
                                            {(m.commentCount ?? 0) > 0
                                                ? `${m.commentCount} izoh`
                                                : "Izoh yozish"}
                                        </button>
                                    )}
                                    {/* Izohlar paneli (kengaytiriladigan) */}
                                    {commentsFor === m.id && (
                                        <div className="mt-2 p-2 rounded-lg space-y-2"
                                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                            {loadingComments && comments.length === 0 ? (
                                                <div className="flex justify-center py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                                                </div>
                                            ) : comments.length === 0 ? (
                                                <p className="text-[10px] text-center py-2" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                    Hali izoh yo&apos;q — birinchi bo&apos;lib yozing
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                                    {comments.map(c => (
                                                        <div key={c.id} className="flex items-start gap-2 text-xs">
                                                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                                                                style={{ background: "rgba(43,62,232,0.20)" }}>
                                                                {c.author?.image
                                                                    ? <img src={c.author.image} alt="" className="w-full h-full object-cover" />
                                                                    : <span className="w-full h-full flex items-center justify-center text-[10px] font-black text-white">
                                                                        {(c.author?.name ?? c.author?.username ?? "?")[0]?.toUpperCase()}
                                                                    </span>
                                                                }
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[10px] font-bold" style={{ color: "#00CEC8" }}>
                                                                    {c.author?.name ?? c.author?.username ?? "Foydalanuvchi"}
                                                                </span>
                                                                <span className="text-[9px] ml-1.5" style={{ color: "rgba(140,160,210,0.60)" }}>
                                                                    {timeAgo(c.createdAt)}
                                                                </span>
                                                                <p className="text-xs mt-0.5 text-white/90 break-words">{c.text}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {ch?.isMember && (
                                                <div className="flex gap-1.5 pt-1 border-t" style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                                    <input
                                                        value={commentInput}
                                                        onChange={e => setCommentInput(e.target.value)}
                                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(m.id); } }}
                                                        placeholder="Izoh yozing..."
                                                        className="flex-1 h-8 px-2.5 rounded-lg bg-transparent text-white text-xs focus:outline-none"
                                                        style={{ border: "1px solid rgba(43,62,232,0.30)" }}
                                                    />
                                                    <button onClick={() => sendComment(m.id)}
                                                        disabled={sendingComment || !commentInput.trim()}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40"
                                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                        {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                                        {m.pinnedAt && <Pin className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />}
                                        <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.6)" }}>{timeAgo(m.createdAt)}</p>
                                    </div>
                                </div>
                                {/* Hover amallar (Telegram uslub) — faqat 3 ta: Reaksiya + Javob + 3-dot */}
                                <div className="opacity-0 group-hover:opacity-100 transition self-center flex flex-col gap-1 relative">
                                    <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)}
                                        title="Reaksiya"
                                        className="w-7 h-7 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                        <Smile className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </button>
                                    <button onClick={() => setReplyTo(m)} title="Javob berish"
                                        className="w-7 h-7 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                        <Reply className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </button>
                                    <div className="relative" data-ch-msg-menu>
                                        <button onClick={() => setChMsgMenuFor(chMsgMenuFor === m.id ? null : m.id)} title="Ko'proq"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{
                                                background: chMsgMenuFor === m.id ? "rgba(0,206,200,0.18)" : "rgba(11,18,40,0.65)",
                                                border: "1px solid rgba(43,62,232,0.25)",
                                            }}>
                                            <MoreVertical className="w-3 h-3" style={{ color: chMsgMenuFor === m.id ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                                        </button>
                                        {chMsgMenuFor === m.id && (
                                            <div className="absolute right-full mr-1 top-0 z-40 rounded-xl overflow-hidden min-w-[180px]"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.60)" }}>
                                                <button onClick={() => { setForwardMsg(m); setChMsgMenuFor(null); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                    <Forward className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> DM&apos;ga yuborish
                                                </button>
                                                <button onClick={() => { toggleBookmark(m); setChMsgMenuFor(null); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                    {m.bookmarked
                                                        ? <><BookmarkCheck className="w-4 h-4" style={{ color: "#F59E0B" }} /> Saqlashdan olish</>
                                                        : <><Bookmark className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Saqlash</>
                                                    }
                                                </button>
                                                {m.text && (
                                                    <button onClick={() => { copyMsg(m.text!); setChMsgMenuFor(null); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        <Copy className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Nusxa olish
                                                    </button>
                                                )}
                                                {m.text && (
                                                    <button onClick={() => {
                                                        if (translated[m.id]) { hideTranslated(m.id); setChMsgMenuFor(null); }
                                                        else { setTranslatePickerFor(m.id); setChMsgMenuFor(null); }
                                                    }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        <Languages className="w-4 h-4" style={{ color: translated[m.id] ? "#00CEC8" : "rgba(160,176,224,0.80)" }} />
                                                        {translated[m.id] ? "Tarjimani yashirish" : "Tarjima qilish"}
                                                    </button>
                                                )}
                                                {m.text && (
                                                    <button onClick={() => { speakMsg(m.id, m.text!); setChMsgMenuFor(null); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        {speakingId === m.id
                                                            ? <VolumeX className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                                            : <Volume2 className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                                        }
                                                        {speakingId === m.id ? "TTS to'xtatish" : "Ovoz bilan o'qish"}
                                                    </button>
                                                )}
                                                {m.mine && m.text && (
                                                    <button onClick={() => { editMsg(m); setChMsgMenuFor(null); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        <Edit3 className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Tahrirlash
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button onClick={() => { toggleChannelPin(m); setChMsgMenuFor(null); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/[0.05] text-left">
                                                        {m.pinnedAt
                                                            ? <><PinOff className="w-4 h-4" style={{ color: "#00CEC8" }} /> Pindan olish</>
                                                            : <><Pin className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} /> Pinlash</>
                                                        }
                                                    </button>
                                                )}
                                                {(m.mine || canManage) && (
                                                    <button onClick={() => { deleteMsg(m); setChMsgMenuFor(null); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-red-500/10 text-left"
                                                        style={{ color: "#EF4444" }}>
                                                        <Trash2 className="w-4 h-4" /> O&apos;chirish
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {/* Tarjima sub-picker (menudan chaqiriladi) */}
                                        {translatePickerFor === m.id && (
                                            <div className="absolute right-full mr-1 top-0 z-40 flex gap-1 p-1.5 rounded-lg"
                                                style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.50)" }}>
                                                {(["uz", "ru", "en"] as const).map(lg => (
                                                    <button key={lg} onClick={() => translateMsg(m.id, m.text!, lg)}
                                                        className="text-[10px] font-black px-2.5 py-1.5 rounded hover:bg-white/[0.08]"
                                                        style={{ color: "rgba(220,230,255,0.95)" }}>
                                                        {lg.toUpperCase()}
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
                                        <div className="absolute right-8 top-0 z-30 flex gap-1 p-1.5 rounded-lg"
                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                            {["❤️","👍","😂","😮","😢","🔥","🙏","👏"].map(e => (
                                                <button key={e} onClick={() => toggleReact(m, e)}
                                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] active:scale-90 transition-transform">
                                                    <Emoji char={e} size={22} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    {/* Reply preview (composer ustida) */}
                    {replyTo && (
                        <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
                            style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.30)" }}>
                            <Reply className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00CEC8" }}>
                                    Javob: {replyTo.author?.name ?? replyTo.author?.username ?? "Foydalanuvchi"}
                                </p>
                                <p className="text-xs truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                    {replyTo.text || (replyTo.media?.length ? "[media]" : "(bo'sh)")}
                                </p>
                            </div>
                            <button onClick={() => setReplyTo(null)}
                                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                    )}
                    {ch.canPost ? (
                        <div className="flex gap-2 px-3 py-3 mx-1" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                            <button onClick={() => setPollOpen(true)} title="So'rovnoma"
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-white flex-shrink-0"
                                style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                <BarChart2 className="w-4 h-4" />
                            </button>
                            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                                placeholder={ch.type === "CHANNEL" ? "E'lon yozing..." : "Xabar yozing..."} className="flex-1 h-10 rounded-xl px-3 text-sm text-white outline-none"
                                style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.2)", caretColor: "#00CEC8" }} />
                            <button onClick={send} disabled={busy || !input.trim()} className="w-10 h-10 flex items-center justify-center rounded-xl text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    ) : (
                        <p className="text-[11px] text-center py-3" style={{ color: "rgba(120,140,185,0.7)" }}>Bu kanalga faqat adminlar yozadi</p>
                    )}
                </>
            )}

            {/* Poll create modal */}
            <NxPollCreate open={pollOpen} onClose={() => setPollOpen(false)} onCreated={sendPoll} />

            {/* Moderatsiya inboxi modali */}
            {modOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => setModOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "85vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" style={{ color: modFlags.length > 0 ? "#EF4444" : "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Moderatsiya inboxi</p>
                                {modFlags.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>{modFlags.length}</span>
                                )}
                            </div>
                            <button onClick={() => setModOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {modFlags.length === 0 ? (
                                <p className="text-xs text-center py-10" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Hozircha shikoyat yoki bayroqli xabar yo&apos;q
                                </p>
                            ) : (
                                modFlags.map(f => (
                                    <div key={f.id} className="px-4 py-3 border-b" style={{ borderColor: "rgba(43,62,232,0.10)" }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {f.message?.sender?.image
                                                ? <img src={f.message.sender.image} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                                : <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "rgba(43,62,232,0.20)" }} />
                                            }
                                            <span className="text-[10px] font-black truncate" style={{ color: "rgba(220,230,255,0.85)" }}>
                                                {f.message?.sender?.name ?? f.message?.sender?.username ?? "Foydalanuvchi"}
                                            </span>
                                            {f.reportCount > 0 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                                                    {f.reportCount} shikoyat
                                                </span>
                                            )}
                                            {f.aiVerdict && f.aiVerdict !== "OK" && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                                                    AI: {f.aiVerdict}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mb-1 line-clamp-2" style={{ color: "rgba(220,230,255,0.90)" }}>
                                            {f.message?.text ?? "(o'chirilgan yoki media)"}
                                        </p>
                                        {(f.lastReason || f.aiReason) && (
                                            <p className="text-[10px] italic mb-2" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                {f.lastReason ? `Sabab: ${f.lastReason}` : f.aiReason}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                setModOpen(false);
                                                jumpToChMsg(f.messageId);
                                            }}
                                                className="text-[10px] font-bold px-2 py-1 rounded"
                                                style={{ background: "rgba(43,62,232,0.15)", color: "rgba(220,230,255,0.95)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                                Ko&apos;rish
                                            </button>
                                            <button onClick={async () => {
                                                const m = msgs.find(x => x.id === f.messageId);
                                                if (m) { await deleteMsg(m); setModFlags(prev => prev.filter(x => x.id !== f.id)); setModCount(c => Math.max(0, c - 1)); }
                                                else {
                                                    // Xabar joriy ro'yxatda yo'q — DELETE endpoint bilan urinamiz
                                                    const r = await fetch(`/api/nexus/channels/${id}/messages/${f.messageId}`, { method: "DELETE" });
                                                    if (r.ok) { setModFlags(prev => prev.filter(x => x.id !== f.id)); setModCount(c => Math.max(0, c - 1)); }
                                                }
                                            }}
                                                className="text-[10px] font-bold px-2 py-1 rounded"
                                                style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.30)" }}>
                                                O&apos;chirish
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t text-[10px] text-center" style={{ borderColor: "rgba(43,62,232,0.14)", color: "rgba(140,160,210,0.55)" }}>
                            Har 1 daqiqada avtomatik yangilanadi
                        </div>
                    </div>
                </div>
            )}

            {/* Forward to DM modal */}
            {forwardMsg && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={() => !forwarding && setForwardMsg(null)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "80vh" }}>
                        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-2">
                                <Forward className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Kimga yuborish</p>
                            </div>
                            <button onClick={() => setForwardMsg(null)}
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                            </button>
                        </div>
                        <div className="p-3 border-b text-xs italic line-clamp-2" style={{ borderColor: "rgba(43,62,232,0.20)", color: "rgba(160,176,224,0.75)" }}>
                            {forwardMsg.text || (forwardMsg.media?.length ? "[media]" : "(bo'sh)")}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {dmList.length === 0 ? (
                                <p className="text-xs text-center py-6" style={{ color: "rgba(140,160,210,0.60)" }}>DM suhbat topilmadi</p>
                            ) : (
                                dmList.map(c => (
                                    <button key={c.conversationId} onClick={() => forwardToDm(c.conversationId)}
                                        disabled={forwarding}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition disabled:opacity-40 text-left">
                                        {c.other?.image
                                            ? <img src={c.other.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "rgba(43,62,232,0.20)" }} />
                                        }
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate" style={{ color: "rgba(220,230,255,0.95)" }}>
                                                {c.other?.name ?? c.other?.username ?? "Foydalanuvchi"}
                                            </p>
                                            {c.other?.username && (
                                                <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.65)" }}>@{c.other.username}</p>
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

interface MemberItem { profileId: string; role: string; name: string | null; username: string | null; image: string | null; verified: boolean }

function ChannelMembers({ id, onClose }: { id: string; onClose: () => void }) {
    const [members, setMembers] = useState<MemberItem[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(() => {
        fetch(`/api/nexus/channels/${id}/members`).then(r => r.json()).then(d => setMembers(d.members ?? [])).catch(() => setMembers([]));
    }, [id]);
    useEffect(() => { load(); }, [load]);

    async function setRole(profileId: string, role: "ADMIN" | "MEMBER") {
        setBusy(profileId);
        setMembers(prev => prev?.map(m => m.profileId === profileId ? { ...m, role } : m) ?? prev);
        await fetch(`/api/nexus/channels/${id}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, role }) }).catch(() => { });
        setBusy(null);
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl max-h-[80vh] flex flex-col"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white">A&apos;zolar</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}><X className="w-4 h-4 text-white" /></button>
                </div>
                <div className="overflow-y-auto px-3 py-3 flex flex-col gap-1">
                    {members === null ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                        : members.map(m => (
                            <div key={m.profileId} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: "rgba(11,18,40,0.55)" }}>
                                <img src={m.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(m.username || "u")}`} alt="" className="w-9 h-9 rounded-xl object-cover bg-white flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate inline-flex items-center gap-1">{m.name || m.username || "Foydalanuvchi"}{m.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}</p>
                                    <p className="text-[11px]" style={{ color: m.role === "OWNER" ? "#F59E0B" : m.role === "ADMIN" ? "#00CEC8" : "rgba(120,140,185,0.75)" }}>{m.role === "OWNER" ? "Egasi" : m.role === "ADMIN" ? "Admin" : "A'zo"}</p>
                                </div>
                                {m.role !== "OWNER" && (
                                    <button onClick={() => setRole(m.profileId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")} disabled={busy === m.profileId}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                                        style={m.role === "ADMIN" ? { background: "rgba(239,68,68,0.1)", color: "#ff8a96" } : { background: "rgba(0,206,200,0.12)", color: "#00CEC8" }}>
                                        {m.role === "ADMIN" ? <><ShieldOff className="w-3 h-3" />Olib tashlash</> : <><Shield className="w-3 h-3" />Admin</>}
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </>
    );
}
