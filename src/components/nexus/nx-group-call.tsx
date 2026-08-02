"use client";

// Nexus guruh chaqiruv — LiveKit Cloud SFU orqali 3+ ishtirokchi.
// Yaratish yoki mavjud xonaga kirish. Grid layout + control bar (mic/cam/screen/leave).

import "@livekit/components-styles";

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { Loader2, X, Check, PhoneOff, Users, Plus, Link as LinkIcon, UserPlus, Search, BadgeCheck, MessageSquare } from "lucide-react";
import { NxGroupChat } from "./nx-group-chat";
import { NxGroupParticipants } from "./nx-group-participants";
import { NxGroupRecord } from "./nx-group-record";
import { getPusherClient } from "@/lib/pusher-client";
import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";

interface GroupCallListItem {
    id: string; roomName: string; title: string | null; status: "ACTIVE" | "ENDED";
    createdAt: string; endedAt: string | null; hostId: string; participantCount: number; isHost: boolean;
}

interface TokenInfo { token: string; url: string; roomName: string; identity: string }
interface SUser { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean }

export function NxGroupCall() {
    const { groupCallOpen, setGroupCallOpen, consumeJoinGroupCallId } = useNxPlayer();
    const [view, setView] = useState<"list" | "create" | "room">("list");
    const [calls, setCalls] = useState<GroupCallListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [err, setErr] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteQuery, setInviteQuery] = useState("");
    const [inviteResults, setInviteResults] = useState<SUser[]>([]);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteSent, setInviteSent] = useState<Set<string>>(new Set());
    const [chatOpen, setChatOpen] = useState(false);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [callInfo, setCallInfo] = useState<{ hostId: string; isHost: boolean } | null>(null);
    const [peerRecording, setPeerRecording] = useState<{ name: string } | null>(null);

    // Peer yozib olish holatini kuzatish (Pusher)
    const { data: session } = useSession();
    // @ts-ignore
    const myProfileId: string | null = session?.user?.profileId ?? null;
    useEffect(() => {
        if (!myProfileId || !activeCallId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-user-${myProfileId}`);
        const onStart = (d: { callId: string; fromName: string }) => {
            if (d.callId === activeCallId) setPeerRecording({ name: d.fromName || "Kimdir" });
        };
        const onStop = (d: { callId: string }) => {
            if (d.callId === activeCallId) setPeerRecording(null);
        };
        channel.bind("group-recording:start", onStart);
        channel.bind("group-recording:stop", onStop);
        return () => {
            channel.unbind("group-recording:start", onStart);
            channel.unbind("group-recording:stop", onStop);
        };
    }, [myProfileId, activeCallId]);

    // Xona ma'lumotini yuklash (host bo'lish uchun)
    useEffect(() => {
        if (!activeCallId) { setCallInfo(null); return; }
        fetch(`/api/nexus/group-calls/${activeCallId}`)
            .then(r => r.json())
            .then(r => { if (r?.call) setCallInfo({ hostId: r.call.hostId, isHost: r.call.isHost }); })
            .catch(() => { });
    }, [activeCallId]);

    const load = useCallback(async () => {
        setLoading(true); setErr("");
        try {
            const r = await fetch("/api/nexus/group-calls").then(x => x.json()) as { calls?: GroupCallListItem[] };
            setCalls(r?.calls ?? []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (groupCallOpen && view === "list") load(); }, [groupCallOpen, view, load]);

    // Ctx orqali join talab qilinsa (openGroupCall(id)) avtomatik kirish
    useEffect(() => {
        if (!groupCallOpen) return;
        const id = consumeJoinGroupCallId();
        if (id) joinCall(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupCallOpen]);

    // Deep link: /nexus?join=<id> — avtomatik guruh chaqiruvga kirish
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get("join");
        if (joinId) {
            setGroupCallOpen(true);
            // URL'ni tozalash (qayta yuklashda takrorlanmasin)
            const url = new URL(window.location.href);
            url.searchParams.delete("join");
            window.history.replaceState({}, "", url.toString());
            joinCall(joinId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createCall = async () => {
        setCreating(true); setErr("");
        try {
            const r = await fetch("/api/nexus/group-calls", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            }).then(x => x.json());
            if (r?.error) { setErr(r.error); return; }
            await joinCall(r.call.id);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Xato");
        } finally {
            setCreating(false);
        }
    };

    const joinCall = async (id: string) => {
        setErr("");
        const r = await fetch(`/api/nexus/group-calls/${id}/token`, { method: "POST" }).then(x => x.json());
        if (r?.error || !r?.token) { setErr(r?.error || "Token olinmadi"); return; }
        setTokenInfo(r);
        setActiveCallId(id);
        setView("room");
    };

    const leaveRoom = useCallback(async () => {
        if (activeCallId) {
            await fetch(`/api/nexus/group-calls/${activeCallId}/leave`, { method: "POST" }).catch(() => { });
        }
        setTokenInfo(null);
        setActiveCallId(null);
        setView("list");
        load();
    }, [activeCallId, load]);

    const endCall = async () => {
        if (!activeCallId) return leaveRoom();
        await fetch(`/api/nexus/group-calls/${activeCallId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "end" }),
        }).catch(() => { });
        await leaveRoom();
    };

    const inviteLink = tokenInfo && activeCallId
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/nexus?join=${activeCallId}`
        : "";

    const copyInvite = () => {
        if (!inviteLink) return;
        navigator.clipboard?.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Foydalanuvchi qidirish (invite panel uchun)
    useEffect(() => {
        if (!inviteOpen) return;
        const q = inviteQuery.trim();
        if (!q) { setInviteResults([]); return; }
        const t = setTimeout(async () => {
            const r = await fetch(`/api/nexus/search?q=${encodeURIComponent(q)}`)
                .then(x => x.json()).catch(() => null) as { users?: SUser[] } | null;
            setInviteResults(r?.users ?? []);
        }, 250);
        return () => clearTimeout(t);
    }, [inviteQuery, inviteOpen]);

    const invite = async (u: SUser) => {
        if (!activeCallId || inviteSent.has(u.id)) return;
        setInviteBusy(true);
        try {
            const r = await fetch(`/api/nexus/group-calls/${activeCallId}/invite`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileIds: [u.id] }),
            }).then(x => x.json());
            if (r?.invited) {
                setInviteSent(prev => new Set(prev).add(u.id));
            }
        } finally { setInviteBusy(false); }
    };

    if (!groupCallOpen) return null;

    // ── ROOM (LiveKit) ────────────────────────────────────────────────────────
    if (view === "room" && tokenInfo) {
        return (
            <div className="fixed inset-0 z-[300] flex flex-col bg-black text-white">
                <div className="relative flex-1" data-lk-theme="default">
                    <LiveKitRoom
                        token={tokenInfo.token}
                        serverUrl={tokenInfo.url}
                        connect
                        video
                        audio
                        onDisconnected={() => leaveRoom()}
                        style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        {/* Top bar — LiveKitRoom ichida (record tugmasi hook ishlatadi) */}
                        <div className="absolute inset-x-0 top-0 z-[15] flex items-center gap-2 bg-black/60 p-3 backdrop-blur-md sm:gap-3 sm:p-4">
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-black">Guruh chaqiruv</p>
                                <p className="mt-0.5 truncate text-[10px] text-white/60">{tokenInfo.roomName}</p>
                            </div>
                            {activeCallId && <NxGroupRecord callId={activeCallId} />}
                            <button onClick={() => setChatOpen(v => !v)}
                                title="Chat"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
                                <MessageSquare className="h-4 w-4 text-white" />
                            </button>
                            <button onClick={() => setParticipantsOpen(v => !v)}
                                title="Ishtirokchilar"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
                                <Users className="h-4 w-4 text-white" />
                            </button>
                            <button onClick={() => { setInviteOpen(true); setInviteQuery(""); setInviteResults([]); }}
                                className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
                                <UserPlus className="h-3.5 w-3.5" /> Taklif
                            </button>
                            <button onClick={copyInvite}
                                className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <LinkIcon className="h-3.5 w-3.5" />}
                                {copied ? "Ko'chirildi" : "Havola"}
                            </button>
                            <button onClick={endCall}
                                className="flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                                <PhoneOff className="h-3.5 w-3.5" /> Chiqish
                            </button>
                        </div>

                        {/* Peer yozib olyapti banneri */}
                        {peerRecording && (
                            <div className="pointer-events-none absolute inset-x-0 top-16 z-[14] flex justify-center">
                                <div className="flex items-center gap-2 rounded-full bg-rose-600/85 px-4 py-1.5 text-xs font-black text-white shadow-lg">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                                    {peerRecording.name} yozib olyapti
                                </div>
                            </div>
                        )}

                        <div className="pt-16" style={{ height: "100%" }}>
                            <VideoConference />
                        </div>
                        <RoomAudioRenderer />
                        <NxGroupChat open={chatOpen} onClose={() => setChatOpen(false)} />
                        {activeCallId && (
                            <NxGroupParticipants
                                open={participantsOpen}
                                onClose={() => setParticipantsOpen(false)}
                                callId={activeCallId}
                                isHost={callInfo?.isHost ?? false}
                            />
                        )}
                    </LiveKitRoom>
                </div>

                {/* Taklif panel — foydalanuvchi qidirib qo'shish */}
                {inviteOpen && (
                    <>
                        <div className="fixed inset-0 z-[310] bg-black/60 backdrop-blur-sm"
                            onClick={() => setInviteOpen(false)} />
                        <div className="fixed inset-x-0 bottom-0 z-[311] max-h-[70vh] overflow-hidden rounded-t-3xl bg-[#080C20] shadow-2xl md:inset-x-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
                            style={{ border: "1px solid rgba(43,62,232,0.22)" }}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                <h3 className="flex items-center gap-2 text-base font-black text-white">
                                    <UserPlus className="h-4 w-4" style={{ color: "#00CEC8" }} /> Taklif qilish
                                </h3>
                                <button onClick={() => setInviteOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </div>
                            <div className="px-4 pb-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                                        style={{ color: "rgba(43,62,232,0.5)" }} />
                                    <input value={inviteQuery} onChange={e => setInviteQuery(e.target.value)}
                                        placeholder="Ism yoki username..."
                                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm font-semibold text-white outline-none"
                                        style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-3 pb-5" style={{ maxHeight: "calc(70vh - 130px)", scrollbarWidth: "none" }}>
                                {inviteResults.length === 0 && inviteQuery && (
                                    <p className="py-6 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Topilmadi</p>
                                )}
                                {inviteResults.map(u => {
                                    const sent = inviteSent.has(u.id);
                                    const label = u.name || (u.username ? `@${u.username}` : u.humoId || "Foydalanuvchi");
                                    return (
                                        <button key={u.id} onClick={() => invite(u)} disabled={sent || inviteBusy}
                                            className="mb-1 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-70">
                                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                                                {u.image
                                                    ? <img src={u.image} alt="" className="h-full w-full object-cover" />
                                                    : <div className="flex h-full w-full items-center justify-center text-xs font-black text-white">{label.slice(0, 2).toUpperCase()}</div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <p className="truncate text-sm font-bold text-white">{label}</p>
                                                    {u.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "#00CEC8" }} />}
                                                </div>
                                                {u.username && <p className="truncate text-[10px]" style={{ color: "rgba(80,100,150,0.85)" }}>@{u.username}</p>}
                                            </div>
                                            {sent
                                                ? <Check className="h-4 w-4 shrink-0" style={{ color: "#00CEC8" }} />
                                                : <span className="rounded-lg px-2.5 py-1 text-[10px] font-black text-white shadow"
                                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Taklif</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── LIST + CREATE ────────────────────────────────────────────────────────
    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setGroupCallOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[55] flex flex-col overflow-hidden rounded-t-3xl md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:w-[480px] md:max-h-[86vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "88vh" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-black text-white">
                            <Users className="h-4 w-4" style={{ color: "#00CEC8" }} /> Guruh chaqiruv
                        </h2>
                        <p className="mt-0.5 text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                            3+ odam bilan video (LiveKit SFU)
                        </p>
                    </div>
                    <button onClick={() => setGroupCallOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: "none" }}>
                    {err && <p className="mx-1 mb-3 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100">{err}</p>}

                    {view === "list" && (
                        <>
                            <button onClick={() => { setTitle(""); setView("create"); }}
                                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                <Plus className="h-4 w-4" /> Yangi guruh chaqiruv
                            </button>

                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(140,160,210,0.6)" }} /></div>
                            ) : calls.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Users className="mx-auto mb-3 h-8 w-8" style={{ color: "rgba(80,100,150,0.5)" }} />
                                    <p className="text-sm" style={{ color: "rgba(120,140,185,0.7)" }}>Guruh chaqiruvlar yo'q</p>
                                    <p className="mt-1 text-[11px]" style={{ color: "rgba(80,100,150,0.5)" }}>Yuqoridagi tugma bilan yarating</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {calls.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-white/[0.03]"
                                            style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                                                style={{ background: c.status === "ACTIVE" ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)" }}>
                                                <Users className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-white">{c.title || "Nomsiz"}</p>
                                                <p className="mt-0.5 text-[10px]" style={{ color: c.status === "ACTIVE" ? "#00CEC8" : "rgba(80,100,150,0.85)" }}>
                                                    {c.status === "ACTIVE" ? "Faol" : "Tugagan"} · {c.participantCount} ishtirokchi{c.isHost ? " · Host" : ""}
                                                </p>
                                            </div>
                                            {c.status === "ACTIVE" ? (
                                                <button onClick={() => joinCall(c.id)}
                                                    className="rounded-xl px-3 py-1.5 text-xs font-black text-white shadow-lg"
                                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                    Kirish
                                                </button>
                                            ) : (
                                                <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.5)" }}>
                                                    {new Date(c.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {view === "create" && (
                        <div className="flex flex-col gap-3 pt-2">
                            <label className="text-[10px] font-bold uppercase" style={{ color: "rgba(140,160,210,0.7)" }}>
                                Chaqiruv nomi (ixtiyoriy)
                            </label>
                            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
                                placeholder="masalan: Jamoa yig'ilishi"
                                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none"
                                style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setView("list")}
                                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    Bekor
                                </button>
                                <button onClick={createCall} disabled={creating}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Yaratish va kirish
                                </button>
                            </div>
                            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.6)" }}>
                                Xonaga kirgach havolani ko'chirib do'stlaringizga yuboring.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
