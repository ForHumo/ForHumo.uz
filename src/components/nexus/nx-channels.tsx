"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Hash, Users, Plus, Loader2, X, Send, BadgeCheck, Lock, ArrowLeft, Check, Megaphone, UserPlus, Trash2, Shield, ShieldOff, BarChart2, Pin, PinOff, Edit3, Smile,
} from "lucide-react";
import { NxPollCreate } from "./nx-poll-create";

type ChType = "CHANNEL" | "GROUP";
interface ChItem { id: string; type: ChType; name: string; handle: string | null; description?: string | null; avatarUrl: string | null; memberCount: number; role?: string; isMember: boolean }
interface ChDetail { id: string; type: ChType; name: string; handle: string | null; description: string | null; avatarUrl: string | null; isPrivate: boolean; memberCount: number; isOwner: boolean; isMember: boolean; role: string | null; canPost: boolean }
interface ChMsg {
    id: string; text: string | null; media: string[]; createdAt: string; mine: boolean;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    pollQuestion?: string | null; pollOptions?: string[]; pollExpiresAt?: string | null; pollMulti?: boolean;
    pollVoteCounts?: number[] | null; pollMyVotes?: number[] | null; pollTotal?: number | null;
    pinnedAt?: string | null;
    editedAt?: string | null;
    reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
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
    const [ch, setCh] = useState<ChDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [msgs, setMsgs] = useState<ChMsg[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [joinBusy, setJoinBusy] = useState(false);
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

    // Xabar polling (a'zo bo'lsa)
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
                    const fresh = d.messages.filter((m: ChMsg) => !seen.has(m.id));
                    return fresh.length ? [...prev, ...fresh].slice(-200) : prev;
                });
                lastTs.current = d.messages[d.messages.length - 1].createdAt;
            } catch { /* noop */ }
        };
        poll();
        const iv = setInterval(poll, 4000);
        return () => { stop = true; clearInterval(iv); };
    }, [ch?.isMember, id]);

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
        try {
            const r = await fetch(`/api/nexus/channels/${id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
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
                {ch.isOwner && <button onClick={() => setMembersOpen(true)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(43,62,232,0.12)" }}><Users className="w-4 h-4" style={{ color: "rgba(180,195,235,0.95)" }} /></button>}
                {ch.isMember && <button onClick={leaveOrDelete} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>{ch.isOwner ? <Trash2 className="w-4 h-4" style={{ color: "#ff8a96" }} /> : <X className="w-4 h-4" style={{ color: "#ff8a96" }} />}</button>}
            </div>

            {membersOpen && <ChannelMembers id={id} onClose={() => setMembersOpen(false)} />}

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
                                    {m.text && editingId !== m.id && (
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(210,220,245,0.95)" }}>
                                            {m.text}
                                            {m.editedAt && <span className="ml-1.5 text-[10px] opacity-50 italic">(tahrirlangan)</span>}
                                        </p>
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
                                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                                        {m.pinnedAt && <Pin className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />}
                                        <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.6)" }}>{timeAgo(m.createdAt)}</p>
                                    </div>
                                </div>
                                {/* Hover amallar: react + edit + pin + delete */}
                                <div className="opacity-0 group-hover:opacity-100 transition self-center flex flex-col gap-1 relative">
                                    <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)}
                                        title="Reaksiya"
                                        className="w-7 h-7 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                        <Smile className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                    </button>
                                    {m.mine && m.text && (
                                        <button onClick={() => editMsg(m)} title="Tahrirlash"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                            <Edit3 className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />
                                        </button>
                                    )}
                                    {canManage && (
                                        <button onClick={() => toggleChannelPin(m)}
                                            title={m.pinnedAt ? "Pindan olib tashlash" : "Pinga qo'yish"}
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
                                    )}
                                    {(m.mine || canManage) && (
                                        <button onClick={() => deleteMsg(m)} title="O'chirish"
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                            <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                                        </button>
                                    )}
                                    {reactPickerFor === m.id && (
                                        <div className="absolute right-8 top-0 z-30 flex gap-1 p-1.5 rounded-lg"
                                            style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                            {["❤️","👍","😂","😮","😢","🔥","🙏","👏"].map(e => (
                                                <button key={e} onClick={() => toggleReact(m, e)}
                                                    className="w-7 h-7 text-base rounded hover:bg-white/[0.08] active:scale-90">
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
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
