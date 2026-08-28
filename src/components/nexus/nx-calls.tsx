"use client";

// Nexus qo'ng'iroqlar paneli — real tarix (/api/nexus/calls GET) va qayta-chaqirish.
// Faol qo'ng'iroq oynasi endi global NxIncomingCall'da (WebRTC).

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, Phone, Video, Clock, PhoneMissed, PhoneIncoming, PhoneOutgoing, Search, Mic, Users } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import { NxVerifiedBadge } from "./nx-verified-badge";

interface CallPeer { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean; verifiedCategory?: string | null }
interface CallRecording { id: string; audioUrl: string; durationSec: number; sizeKb: number }
interface GroupCallRecording { id: string; audioUrl: string; durationSec: number; sizeKb: number }
interface GroupCallItem { id: string; roomName: string; title: string | null; status: "ACTIVE" | "ENDED"; createdAt: string; endedAt: string | null; participantCount: number; isHost: boolean; recordings?: GroupCallRecording[] }
interface CallItem {
    id: string;
    kind: "audio" | "video";
    status: string;
    dir: "in" | "out";
    missed: boolean;
    peer: CallPeer | null;
    duration: number;
    createdAt: string;
    recordings?: CallRecording[];
}

type CallFilter = "all" | "missed" | "groups";

export function NxCalls() {
    const { callsOpen, setCallsOpen, startCall, setGroupCallOpen, openGroupCall } = useNxPlayer();
    const [calls, setCalls] = useState<CallItem[]>([]);
    const [groupCalls, setGroupCalls] = useState<GroupCallItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<CallFilter>("all");
    const [query, setQuery] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const [r1, r2] = await Promise.all([
            fetch("/api/nexus/calls").then(x => x.json()).catch(() => null) as Promise<{ calls?: CallItem[] } | null>,
            fetch("/api/nexus/group-calls").then(x => x.json()).catch(() => null) as Promise<{ calls?: GroupCallItem[] } | null>,
        ]);
        setCalls(r1?.calls || []);
        setGroupCalls(r2?.calls || []);
        setLoading(false);
    }, []);

    useEffect(() => { if (callsOpen) load(); }, [callsOpen, load]);
    // Tab yopilsa qidiruv tozalanadi
    useEffect(() => { if (!callsOpen) { setQuery(""); setFilter("all"); } }, [callsOpen]);

    if (!callsOpen) return null;

    const dial = async (peerId: string | undefined, kind: "AUDIO" | "VIDEO") => {
        if (!peerId) return;
        setCallsOpen(false);
        await startCall(peerId, kind);
    };

    // Filter + qidiruv
    const q = query.trim().toLowerCase();
    const filteredCalls = calls.filter(c => {
        if (filter === "missed" && !c.missed) return false;
        if (filter === "groups") return false;
        if (q) {
            const label = (c.peer?.name || c.peer?.username || c.peer?.humoId || "").toLowerCase();
            return label.includes(q);
        }
        return true;
    });
    const filteredGroups = groupCalls.filter(g => {
        if (filter === "missed") return false;
        if (q) return (g.title || "").toLowerCase().includes(q);
        return true;
    });

    // Kun bo'yicha guruhlash
    const dayGroups = groupByDay(filteredCalls);

    const missedCount = calls.filter(c => c.missed).length;
    const groupsCount = groupCalls.length;
    const allCount = calls.length + groupCalls.length;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setCallsOpen(false)} />
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col overflow-hidden rounded-t-3xl md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:w-[460px] md:max-h-[86vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "88vh" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
                    <div>
                        <h2 className="text-lg font-black text-white">Qo'ng'iroqlar</h2>
                        <p className="mt-0.5 text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>Ovozli va video qo'ng'iroqlar tarixi</p>
                    </div>
                    <button onClick={() => setCallsOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                {/* Qidiruv + filter tabs (C-1, C-2) */}
                <div className="flex-shrink-0 px-4 pb-3">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <input value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Qidirish..."
                            className="w-full h-9 rounded-xl pl-9 pr-9 text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                        {query && (
                            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="h-3.5 w-3.5" style={{ color: "rgba(160,180,220,0.70)" }} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        {([
                            { id: "all",     label: "Barchasi",       n: allCount },
                            { id: "missed",  label: "O'tkazib yub.",  n: missedCount },
                            { id: "groups",  label: "Guruh",          n: groupsCount },
                        ] as { id: CallFilter; label: string; n: number }[]).map(t => (
                            <button key={t.id} onClick={() => setFilter(t.id)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition active:scale-95"
                                style={filter === t.id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(160,180,230,0.85)" }}>
                                {t.label}{t.n > 0 && <span className="ml-1 opacity-70">{t.n}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: "none" }}>
                    {filter !== "missed" && (
                        <button onClick={() => { setCallsOpen(false); setGroupCallOpen(true); }}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Users className="h-4 w-4" /> Guruh chaqiruv (LiveKit)
                        </button>
                    )}

                    {loading && calls.length === 0 && groupCalls.length === 0 && (
                        <div className="flex flex-col gap-2">
                            {[0,1,2,3].map(i => <CallSkeleton key={i} />)}
                        </div>
                    )}

                    {/* Faol guruh chaqiruvlar (agar bo'lsa — birinchi ko'rsatiladi) */}
                    {filter !== "missed" && filteredGroups.filter(g => g.status === "ACTIVE").length > 0 && (
                        <div className="mb-3">
                            <p className="mb-1.5 px-1 text-[10px] font-black uppercase" style={{ color: "rgba(0,206,200,0.85)" }}>Faol guruh</p>
                            {filteredGroups.filter(g => g.status === "ACTIVE").map(g => (
                                <div key={g.id} className="mb-1 flex items-center gap-3 rounded-2xl p-3"
                                    style={{ border: "1px solid rgba(0,206,200,0.35)", background: "rgba(0,206,200,0.05)" }}>
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-white">{g.title || "Guruh chaqiruv"}</p>
                                        <p className="mt-0.5 text-[10px]" style={{ color: "#00CEC8" }}>
                                            Faol · {g.participantCount} ishtirokchi{g.isHost ? " · Host" : ""}
                                        </p>
                                    </div>
                                    <button onClick={() => { setCallsOpen(false); openGroupCall(g.id); }}
                                        className="rounded-xl px-3 py-1.5 text-xs font-black text-white shadow-lg"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        Kirish
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Guruh chaqiruv tarixi (tugagan) */}
                    {filter !== "missed" && filteredGroups.filter(g => g.status === "ENDED").length > 0 && (
                        <div className="mb-3">
                            <p className="mb-1.5 px-1 text-[10px] font-black uppercase" style={{ color: "rgba(140,160,210,0.7)" }}>Tugagan guruhlar</p>
                            {filteredGroups.filter(g => g.status === "ENDED").slice(0, filter === "groups" ? 30 : 5).map(g => (
                                <div key={g.id} className="mb-1 flex flex-col rounded-2xl">
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(43,62,232,0.15)" }}>
                                            <Users className="h-5 w-5" style={{ color: "rgba(140,160,210,0.8)" }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="truncate text-sm font-bold text-white">{g.title || "Guruh chaqiruv"}</p>
                                                {g.recordings && g.recordings.length > 0 && (
                                                    <Mic className="h-3 w-3 shrink-0" style={{ color: "#00CEC8" }} />
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-[10px]" style={{ color: "rgba(80,100,150,0.85)" }}>
                                                {g.participantCount} ishtirokchi{g.isHost ? " · Host" : ""} · {timeAgo(g.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {g.recordings && g.recordings.length > 0 && (
                                        <div className="flex flex-col gap-1.5 border-t px-3 py-2.5" style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                            {g.recordings.map(r => (
                                                <div key={r.id} className="flex items-center gap-2">
                                                    <Mic className="h-3.5 w-3.5 shrink-0" style={{ color: "#00CEC8" }} />
                                                    <audio src={r.audioUrl} controls className="h-8 flex-1" style={{ minWidth: 0 }} />
                                                    <span className="shrink-0 text-[10px]" style={{ color: "rgba(80,100,150,0.85)" }}>{formatDur(r.durationSec)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 1:1 kun bo'yicha guruhlangan */}
                    {!loading && filter !== "groups" && filteredCalls.length === 0 && filteredGroups.length === 0 && (
                        <div className="py-10 text-center">
                            <Clock className="mx-auto mb-3 h-8 w-8" style={{ color: "rgba(80,100,150,0.5)" }} />
                            <p className="text-sm" style={{ color: "rgba(120,140,185,0.7)" }}>
                                {query ? `"${query}" bo'yicha topilmadi` : filter === "missed" ? "O'tkazib yuborilgan qo'ng'iroq yo'q" : "Hozircha qo'ng'iroqlar yo'q"}
                            </p>
                            {!query && filter === "all" && (
                                <p className="mt-1 text-[11px]" style={{ color: "rgba(80,100,150,0.5)" }}>DM ichida telefon yoki video tugmasini bosing</p>
                            )}
                        </div>
                    )}

                    {filter !== "groups" && dayGroups.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {dayGroups.map(dg => (
                                <div key={dg.label} className="flex flex-col gap-1">
                                    <p className="mb-1 px-1 text-[10px] font-black uppercase" style={{ color: "rgba(140,160,210,0.7)" }}>{dg.label}</p>
                                    {dg.items.map(c => {
                                        const peerLabel = c.peer?.name || c.peer?.username || c.peer?.humoId || "Peer";
                                        const Icon = c.missed ? PhoneMissed : c.dir === "in" ? PhoneIncoming : PhoneOutgoing;
                                        const iconColor = c.missed ? "#EF4444" : c.dir === "in" ? "rgba(0,206,200,0.85)" : "rgba(43,62,232,0.85)";
                                        return (
                                            <div key={c.id} className="flex flex-col rounded-2xl transition-colors hover:bg-white/[0.03]">
                                                <div className="flex items-center gap-3 p-3">
                                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                                                        {c.peer?.image
                                                            ? <Image src={c.peer.image} alt="" width={44} height={44} className="h-full w-full object-cover" />
                                                            : <div className="flex h-full w-full items-center justify-center text-xs font-black text-white">{peerLabel.slice(0, 2).toUpperCase()}</div>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="truncate text-sm font-bold text-white">{peerLabel}</p>
                                                            {c.peer?.verified && <NxVerifiedBadge category={c.peer.verifiedCategory} size={14} />}
                                                            {c.recordings && c.recordings.length > 0 && (
                                                                <Mic className="h-3 w-3 shrink-0" style={{ color: "#00CEC8" }} />
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 flex items-center gap-1.5">
                                                            <Icon className="h-3 w-3 shrink-0" style={{ color: iconColor }} />
                                                            <span className="truncate text-[10px]" style={{ color: c.missed ? "rgba(239,68,68,0.85)" : "rgba(80,100,150,0.85)" }}>
                                                                {c.missed ? "O'tkazib yuborilgan" : c.dir === "in" ? "Kiruvchi" : "Chiquvchi"} · {c.kind === "video" ? "Video" : "Ovoz"} · {timeAgo(c.createdAt)}{c.duration > 0 ? ` · ${formatDur(c.duration)}` : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 gap-2">
                                                        <button onClick={() => dial(c.peer?.id, "AUDIO")}
                                                            disabled={!c.peer?.id}
                                                            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30"
                                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                                            <Phone className="h-4 w-4" style={{ color: "#00CEC8" }} />
                                                        </button>
                                                        <button onClick={() => dial(c.peer?.id, "VIDEO")}
                                                            disabled={!c.peer?.id}
                                                            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30"
                                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                                            <Video className="h-4 w-4" style={{ color: "#2B3EE8" }} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {c.recordings && c.recordings.length > 0 && (
                                                    <div className="flex flex-col gap-1.5 border-t px-3 py-2.5" style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                                                        {c.recordings.map(r => (
                                                            <div key={r.id} className="flex items-center gap-2">
                                                                <Mic className="h-3.5 w-3.5 shrink-0" style={{ color: "#00CEC8" }} />
                                                                <audio src={r.audioUrl} controls className="h-8 flex-1" style={{ minWidth: 0 }} />
                                                                <span className="shrink-0 text-[10px]" style={{ color: "rgba(80,100,150,0.85)" }}>{formatDur(r.durationSec)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
    if (s < 604800) return `${Math.floor(s / 86400)} kun oldin`;
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function formatDur(s: number): string {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
}

// Kun bo'yicha guruhlash (Bugun/Kecha/kun nomi/sana)
function groupByDay(items: CallItem[]): { label: string; items: CallItem[] }[] {
    if (items.length === 0) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
    const groups = new Map<string, CallItem[]>();
    for (const it of items) {
        const d = new Date(it.createdAt); d.setHours(0, 0, 0, 0);
        let label: string;
        if (d.getTime() === today.getTime()) label = "Bugun";
        else if (d.getTime() === yesterday.getTime()) label = "Kecha";
        else if (d >= weekAgo) label = d.toLocaleDateString("uz-UZ", { weekday: "long" });
        else label = d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push(it);
    }
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

// Skeleton kartochka
function CallSkeleton() {
    return (
        <div className="flex items-center gap-3 rounded-2xl p-3 animate-pulse">
            <div className="h-11 w-11 shrink-0 rounded-2xl" style={{ background: "rgba(43,62,232,0.15)" }} />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded" style={{ background: "rgba(43,62,232,0.15)", width: "60%" }} />
                <div className="h-2 rounded" style={{ background: "rgba(43,62,232,0.10)", width: "40%" }} />
            </div>
            <div className="flex shrink-0 gap-2">
                <div className="h-9 w-9 rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} />
                <div className="h-9 w-9 rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} />
            </div>
        </div>
    );
}
