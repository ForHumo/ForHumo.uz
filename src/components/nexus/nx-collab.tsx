"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, Check, MessageSquare, UserPlus,
    Music, Film, Mic, Pencil, Send, Clock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type CollabType = "music" | "video" | "podcast" | "writing";
type CollabStatus = "pending" | "accepted" | "declined";

interface CollabRequest {
    id: string;
    from: string;
    avatar: string;
    type: CollabType;
    title: string;
    message: string;
    time: string;
    status: CollabStatus;
    incoming: boolean;
}

interface Creator {
    id: string;
    name: string;
    avatar: string;
    category: string;
    followers: string;
    match: number; // compatibility score 0-100
    open: boolean; // open to collabs
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_REQUESTS: CollabRequest[] = [
    {
        id: "cr1", from: "Shahlo Musiqasi", avatar: "SM", type: "music", incoming: true, status: "pending",
        title: "Duet qo'shiq yozish",
        message: "Sizning ovozingiz ajoyib! Birga lofi duet yozsak? Aranjirovka tayyorlab qo'ydim, sizdan vokal kerak bo'ladi.",
        time: "2 soat",
    },
    {
        id: "cr2", from: "DevTalk UZ", avatar: "DT", type: "podcast", incoming: true, status: "pending",
        title: "Podkastga mehmon",
        message: "Keyingi epizodimizda ijodkorlik mavzusida gaplashsak? 45 daqiqa, online format.",
        time: "5 soat",
    },
    {
        id: "cr3", from: "Dilnoza Videolar", avatar: "DV", type: "video", incoming: false, status: "accepted",
        title: "Travel vlog birgalikda",
        message: "Samarqand bo'ylab sayohat vlogini birgalikda suramiz degan edik.",
        time: "1 kun",
    },
    {
        id: "cr4", from: "Azizbek Writes", avatar: "AW", type: "writing", incoming: false, status: "declined",
        title: "Blog maqola hammuallifi",
        message: "O'zbek madaniyati haqida qo'shma maqola yozish haqida so'ragan edim.",
        time: "3 kun",
    },
];

const MOCK_CREATORS: Creator[] = [
    { id: "cr_1", name: "Jasur Beats",     avatar: "JB", category: "Musiqa",     followers: "45K",  match: 94, open: true  },
    { id: "cr_2", name: "Zilola Films",    avatar: "ZF", category: "Video",      followers: "128K", match: 87, open: true  },
    { id: "cr_3", name: "MindsetUZ",       avatar: "MU", category: "Podkast",    followers: "52K",  match: 81, open: true  },
    { id: "cr_4", name: "Art Kollektiv",   avatar: "AK", category: "San'at",     followers: "23K",  match: 76, open: false },
    { id: "cr_5", name: "Tech Review UZ",  avatar: "TR", category: "Texnologiya",followers: "89K",  match: 72, open: true  },
    { id: "cr_6", name: "Oshpaz Online",   avatar: "OO", category: "Taom",       followers: "31K",  match: 65, open: true  },
];

const TYPE_ICONS: Record<CollabType, typeof Music> = {
    music: Music, video: Film, podcast: Mic, writing: Pencil,
};
const TYPE_LABELS: Record<CollabType, string> = {
    music: "Musiqa", video: "Video", podcast: "Podkast", writing: "Blog",
};
const STATUS_STYLE: Record<CollabStatus, { label: string; bg: string; color: string }> = {
    pending:  { label: "Kutilmoqda", bg: "rgba(234,179,8,0.15)",   color: "#EAB308" },
    accepted: { label: "Qabul",      bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
    declined: { label: "Rad",        bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
};

// ─────────────────────────────────────────────────────────────────────────────
// NxCollab
// ─────────────────────────────────────────────────────────────────────────────
export function NxCollab() {
    const { collabOpen, setCollabOpen } = useNxPlayer();

    const [tab,       setTab]       = useState<"inbox" | "discover">("inbox");
    const [requests,  setRequests]  = useState<CollabRequest[]>(MOCK_REQUESTS);
    const [detail,    setDetail]    = useState<CollabRequest | null>(null);
    const [sentIds,   setSentIds]   = useState<Set<string>>(new Set());
    const [newCollab, setNewCollab] = useState(false);
    const [ncType,    setNcType]    = useState<CollabType>("music");
    const [ncMsg,     setNcMsg]     = useState("");

    if (!collabOpen) return null;

    // ── Request detail ─────────────────────────────────────────────────────
    if (detail) {
        const Icon   = TYPE_ICONS[detail.type];
        const status = STATUS_STYLE[detail.status];

        const respond = (accepted: boolean) => {
            setRequests(prev => prev.map(r =>
                r.id === detail.id ? { ...r, status: accepted ? "accepted" : "declined" } : r
            ));
            setDetail(prev => prev ? { ...prev, status: accepted ? "accepted" : "declined" } : null);
        };

        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => setDetail(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <p className="flex-1 text-sm font-bold text-white">Hamkorlik so'rovi</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5" style={{ scrollbarWidth: "none" }}>
                    {/* Creator row */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {detail.avatar}
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">{detail.from}</p>
                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                {detail.incoming ? "Sizga so'rov yubordi" : "Siz so'rov yubordingiz"} · {detail.time} oldin
                            </p>
                        </div>
                    </div>

                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.25)" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                            <span className="text-[11px] font-bold" style={{ color: "#00CEC8" }}>
                                {TYPE_LABELS[detail.type]}
                            </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-full"
                            style={{ background: status.bg }}>
                            <span className="text-[11px] font-black" style={{ color: status.color }}>
                                {status.label}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm font-black text-white mb-3">{detail.title}</p>
                    <div className="p-4 rounded-2xl mb-5" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(160,176,224,0.80)" }}>
                            {detail.message}
                        </p>
                    </div>

                    {/* Reply area */}
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                        style={{ color: "rgba(100,120,170,0.60)" }}>
                        Javob
                    </p>
                    <textarea rows={4} placeholder="Javob yozing..."
                        className="w-full bg-transparent text-sm text-white outline-none px-3 py-3 rounded-xl resize-none"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }} />
                </div>

                {/* Actions */}
                {detail.incoming && detail.status === "pending" && (
                    <div className="px-4 py-3 flex gap-3 flex-shrink-0"
                        style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                        <button onClick={() => respond(false)}
                            className="flex-1 py-3 rounded-2xl text-sm font-black"
                            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
                            Rad etish
                        </button>
                        <button onClick={() => respond(true)}
                            className="flex-1 py-3 rounded-2xl text-sm font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            Qabul qilish
                        </button>
                    </div>
                )}
                {detail.status !== "pending" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                        <button onClick={() => setDetail(null)}
                            className="w-full py-3 rounded-2xl text-sm font-black text-white"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.30)" }}>
                            Orqaga
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setCollabOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Hamkorlik</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Ijodkorlar bilan birlashtiring</p>
                </div>
                <button onClick={() => setNewCollab(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Send className="w-3.5 h-3.5" />
                    So'rov
                </button>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-3 pb-0 gap-1 flex-shrink-0">
                {(["inbox", "discover"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="flex-1 py-2 text-[12px] font-black rounded-xl transition-all"
                        style={{
                            background: tab === t ? "rgba(43,62,232,0.25)" : "transparent",
                            color: tab === t ? "white" : "rgba(100,120,170,0.60)",
                            border: `1px solid ${tab === t ? "rgba(43,62,232,0.45)" : "transparent"}`,
                        }}>
                        {t === "inbox" ? "Kiruvchi" : "Topish"}
                        {t === "inbox" && requests.filter(r => r.incoming && r.status === "pending").length > 0 && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black"
                                style={{ background: "#2B3EE8", color: "white" }}>
                                {requests.filter(r => r.incoming && r.status === "pending").length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8" style={{ scrollbarWidth: "none" }}>
                {/* INBOX tab */}
                {tab === "inbox" && (
                    <div className="flex flex-col gap-3">
                        {requests.length === 0 && (
                            <p className="text-center text-sm py-10" style={{ color: "rgba(100,120,170,0.50)" }}>
                                Hali so'rovlar yo'q
                            </p>
                        )}
                        {requests.map(r => {
                            const Icon    = TYPE_ICONS[r.type];
                            const status  = STATUS_STYLE[r.status];
                            return (
                                <button key={r.id} onClick={() => setDetail(r)}
                                    className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]"
                                    style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {r.avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[12px] font-black text-white">{r.from}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                                    style={{ background: status.bg, color: status.color }}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-white mb-1 truncate">{r.title}</p>
                                            <p className="text-[10px] line-clamp-1 mb-2" style={{ color: "rgba(120,140,190,0.70)" }}>
                                                {r.message}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <Icon className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                                    <span className="text-[10px]" style={{ color: "#00CEC8" }}>{TYPE_LABELS[r.type]}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" style={{ color: "rgba(100,120,170,0.50)" }} />
                                                    <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.50)" }}>{r.time} oldin</span>
                                                </div>
                                                <span className="text-[10px] ml-auto"
                                                    style={{ color: r.incoming ? "rgba(43,62,232,0.80)" : "rgba(100,120,170,0.50)" }}>
                                                    {r.incoming ? "Kiruvchi" : "Chiquvchi"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* DISCOVER tab */}
                {tab === "discover" && (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                            style={{ color: "rgba(100,120,170,0.60)" }}>
                            Mos ijodkorlar
                        </p>
                        <div className="flex flex-col gap-3">
                            {MOCK_CREATORS.map(c => {
                                const sent = sentIds.has(c.id);
                                return (
                                    <div key={c.id}
                                        className="p-4 rounded-2xl"
                                        style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                {c.avatar}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[12px] font-black text-white">{c.name}</p>
                                                    {!c.open && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                                            style={{ background: "rgba(100,120,170,0.12)", color: "rgba(100,120,170,0.60)" }}>
                                                            Band
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px]" style={{ color: "rgba(120,140,190,0.70)" }}>
                                                    {c.category} · {c.followers} obunachilar
                                                </p>
                                            </div>
                                            <button
                                                disabled={sent || !c.open}
                                                onClick={() => setSentIds(prev => new Set(prev).add(c.id))}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all"
                                                style={{
                                                    background: sent ? "rgba(16,185,129,0.15)" : c.open ? "rgba(43,62,232,0.25)" : "rgba(43,62,232,0.08)",
                                                    border: `1px solid ${sent ? "rgba(16,185,129,0.30)" : "rgba(43,62,232,0.30)"}`,
                                                    color: sent ? "#10B981" : c.open ? "white" : "rgba(100,120,170,0.40)",
                                                }}>
                                                {sent ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                                {sent ? "Yuborildi" : "So'rov"}
                                            </button>
                                        </div>

                                        {/* Match score */}
                                        <div className="mt-3">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.60)" }}>Moslik darajasi</span>
                                                <span className="text-[9px] font-black" style={{ color: c.match >= 85 ? "#10B981" : "#00CEC8" }}>
                                                    {c.match}%
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                                <div className="h-full rounded-full"
                                                    style={{
                                                        width: `${c.match}%`,
                                                        background: c.match >= 85
                                                            ? "linear-gradient(90deg,#10B981,#00CEC8)"
                                                            : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                                    }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* New collab sheet */}
            {newCollab && (
                <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "#050818" }}>
                    <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                        <button onClick={() => setNewCollab(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 text-sm font-black text-white">Yangi hamkorlik so'rovi</p>
                        <button
                            disabled={!ncMsg.trim()}
                            onClick={() => { setNewCollab(false); setNcMsg(""); }}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{ background: ncMsg.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)" }}>
                            Yuborish
                        </button>
                    </div>
                    <div className="flex-1 px-4 py-4 flex flex-col gap-4">
                        {/* Type selection */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Hamkorlik turi
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {(Object.keys(TYPE_LABELS) as CollabType[]).map(t => {
                                    const Icon = TYPE_ICONS[t];
                                    return (
                                        <button key={t} onClick={() => setNcType(t)}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                                            style={{
                                                background: ncType === t ? "rgba(43,62,232,0.30)" : "rgba(43,62,232,0.08)",
                                                border: `1px solid ${ncType === t ? "rgba(43,62,232,0.55)" : "rgba(43,62,232,0.15)"}`,
                                            }}>
                                            <Icon className="w-4 h-4" style={{ color: ncType === t ? "#00CEC8" : "rgba(120,140,190,0.60)" }} />
                                            <span className="text-[9px] font-bold"
                                                style={{ color: ncType === t ? "white" : "rgba(100,120,170,0.60)" }}>
                                                {TYPE_LABELS[t]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <input placeholder="Hamkorlik nomi..."
                            className="w-full bg-transparent text-sm font-bold text-white outline-none px-3 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }} />
                        <textarea placeholder="So'rov matnini yozing — nima qilmoqchisiz, qanday yordam kerak..."
                            rows={6} value={ncMsg} onChange={e => setNcMsg(e.target.value)}
                            className="w-full bg-transparent text-sm text-white outline-none px-3 py-3 rounded-xl resize-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }} />
                    </div>
                </div>
            )}
        </div>
    );
}
