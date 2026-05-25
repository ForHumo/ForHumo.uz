"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X, Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
    Monitor, MonitorOff, MessageSquare, Users, Hand,
    MoreHorizontal, Copy, Check, Link2, Shield,
    Settings, Grid3X3, Maximize2, ChevronRight,
    Send, Smile, BadgeCheck, Circle,
    Layout, UserPlus, Clock, Loader2,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type Stage = "lobby" | "meeting" | "ended";
type Layout = "grid" | "speaker" | "spotlight";
type Panel = "chat" | "participants" | null;

interface Participant {
    id: string;
    name: string;
    seed: string;
    micOn: boolean;
    camOn: boolean;
    handRaised: boolean;
    host: boolean;
    speaking: boolean;
}

interface ChatMsg {
    id: string;
    from: string;
    text: string;
    time: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock ishtirokchilar
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_PARTICIPANTS: Participant[] = [
    { id: "p1", name: "Islomjon K.", seed: "islom",   micOn: true,  camOn: true,  handRaised: false, host: true,  speaking: false },
    { id: "p2", name: "Madina E.",   seed: "madina",  micOn: true,  camOn: true,  handRaised: false, host: false, speaking: false },
    { id: "p3", name: "Sardor T.",   seed: "sardor",  micOn: false, camOn: true,  handRaised: true,  host: false, speaking: false },
    { id: "p4", name: "Kamola Y.",   seed: "kamola",  micOn: true,  camOn: false, handRaised: false, host: false, speaking: false },
    { id: "p5", name: "Bobur A.",    seed: "bobur",   micOn: false, camOn: false, handRaised: false, host: false, speaking: false },
];

const REACTIONS = ["", "", "", "", "", ""];

// ─────────────────────────────────────────────────────────────────────────────
// Meeting ID generator
// ─────────────────────────────────────────────────────────────────────────────
function genMeetingId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${seg()}-${seg()}-${seg()}`;
}

function fmtDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxMeeting — asosiy export
// ─────────────────────────────────────────────────────────────────────────────
export function NxMeeting() {
    const { meetingOpen, setMeetingOpen } = useNxPlayer();
    if (!meetingOpen) return null;
    return <MeetingRoot onClose={() => setMeetingOpen(false)} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — stage boshqarish
// ─────────────────────────────────────────────────────────────────────────────
function MeetingRoot({ onClose }: { onClose: () => void }) {
    const [stage, setStage] = useState<Stage>("lobby");
    const [meetingId, setMeetingId] = useState(() => genMeetingId());
    const [joinCode, setJoinCode] = useState("");

    if (stage === "lobby") {
        return (
            <MeetingLobby
                meetingId={meetingId}
                joinCode={joinCode}
                setJoinCode={setJoinCode}
                onNewMeeting={() => { setMeetingId(genMeetingId()); setStage("meeting"); }}
                onJoin={() => { if (joinCode.length >= 8) setStage("meeting"); }}
                onClose={onClose}
            />
        );
    }

    if (stage === "ended") {
        return <MeetingEnded onClose={onClose} onRejoin={() => setStage("meeting")} />;
    }

    return (
        <MeetingRoom
            meetingId={meetingId}
            onEnd={() => setStage("ended")}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lobby — yaratish / qo'shilish
// ─────────────────────────────────────────────────────────────────────────────
interface LobbyProps {
    meetingId: string; joinCode: string; setJoinCode: (v: string) => void;
    onNewMeeting: () => void; onJoin: () => void; onClose: () => void;
}

function MeetingLobby({ meetingId, joinCode, setJoinCode, onNewMeeting, onJoin, onClose }: LobbyProps) {
    const [copied, setCopied] = useState(false);
    const [camPreview, setCamPreview] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [tab, setTab] = useState<"new" | "join">("new");

    const copyId = () => {
        navigator.clipboard?.writeText(meetingId).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ background: "rgba(3,5,16,0.96)", backdropFilter: "blur(20px)" }}>

            {/* Close */}
            <button onClick={onClose}
                className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-xl z-10"
                style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)" }}>
                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
            </button>

            <div className="w-full max-w-4xl mx-4 grid md:grid-cols-2 gap-6 items-center">

                {/* ── Kamera preview ── */}
                <div className="relative aspect-video rounded-3xl overflow-hidden flex items-center justify-center"
                    style={{ background: "rgba(11,18,40,0.80)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    {camPreview ? (
                        <>
                            {/* Simulated camera — avatar grid */}
                            <div className="w-24 h-24 rounded-2xl overflow-hidden"
                                style={{ border: "3px solid rgba(43,62,232,0.45)", boxShadow: "0 0 32px rgba(43,62,232,0.40)" }}>
                                <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=me" alt="" className="w-full h-full object-cover bg-white" />
                            </div>
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                                style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-white">Kamera yoqilgan</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <VideoOff className="w-12 h-12" style={{ color: "rgba(80,100,150,0.60)" }} />
                            <span className="text-sm" style={{ color: "rgba(80,100,150,0.80)" }}>Kamera o'chirilgan</span>
                        </div>
                    )}

                    {/* Cam/Mic controls */}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <button onClick={() => setMicOn(p => !p)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: micOn ? "rgba(43,62,232,0.25)" : "rgba(239,68,68,0.25)", border: `1px solid ${micOn ? "rgba(43,62,232,0.40)" : "rgba(239,68,68,0.40)"}` }}>
                            {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-red-400" />}
                        </button>
                        <button onClick={() => setCamPreview(p => !p)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: camPreview ? "rgba(43,62,232,0.25)" : "rgba(239,68,68,0.25)", border: `1px solid ${camPreview ? "rgba(43,62,232,0.40)" : "rgba(239,68,68,0.40)"}` }}>
                            {camPreview ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                        </button>
                    </div>
                </div>

                {/* ── Yaratish / Qo'shilish ── */}
                <div className="flex flex-col gap-5">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-1">Video Majlis</h2>
                        <p className="text-sm" style={{ color: "rgba(120,140,190,0.80)" }}>
                            Yangi majlis boshlang yoki mavjudiga qo'shiling
                        </p>
                    </div>

                    {/* Tab */}
                    <div className="flex rounded-2xl overflow-hidden"
                        style={{ background: "rgba(11,18,40,0.80)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        {(["new", "join"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className="flex-1 py-3 text-sm font-black transition-all duration-200"
                                style={tab === t ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                                } : { color: "rgba(140,160,210,0.75)" }}>
                                {t === "new" ? "Yangi Majlis" : "Qo'shilish"}
                            </button>
                        ))}
                    </div>

                    {tab === "new" ? (
                        <div className="flex flex-col gap-3">
                            {/* Meeting ID */}
                            <div className="p-4 rounded-2xl" style={{ background: "rgba(11,18,40,0.80)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(43,62,232,0.70)" }}>Majlis ID</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-mono font-bold text-white tracking-widest">{meetingId}</span>
                                    <button onClick={copyId}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.30)", color: copied ? "#00CEC8" : "rgba(140,160,210,0.90)" }}>
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copied ? "Nusxa olindi" : "Nusxa"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} />
                                    <span style={{ color: "rgba(160,180,220,0.85)" }}>Majlis oxirigacha shifrlangan (E2E)</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                                    <span style={{ color: "rgba(160,180,220,0.85)" }}>100 tagacha ishtirokchi</span>
                                </div>
                            </div>

                            <button onClick={onNewMeeting}
                                className="nx-press w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 24px rgba(43,62,232,0.45)" }}>
                                <Video className="w-5 h-5" />
                                Yangi Majlis Boshlash
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold" style={{ color: "rgba(140,160,210,0.80)" }}>Majlis kodi yoki ID</label>
                                <input
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    placeholder="xxxx-xxxx-xxxx"
                                    className="w-full h-12 rounded-xl px-4 text-white text-base font-mono outline-none"
                                    style={{
                                        background: "rgba(11,18,40,0.80)",
                                        border: `1px solid ${joinCode.length >= 8 ? "rgba(43,62,232,0.55)" : "rgba(43,62,232,0.22)"}`,
                                        caretColor: "#00CEC8",
                                    }}
                                />
                            </div>
                            <button
                                onClick={onJoin}
                                disabled={joinCode.length < 8}
                                className="nx-press w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: joinCode.length >= 8 ? "0 8px 24px rgba(43,62,232,0.45)" : "none" }}>
                                <UserPlus className="w-5 h-5" />
                                Qo'shilish
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meeting Room — asosiy xona
// ─────────────────────────────────────────────────────────────────────────────
function MeetingRoom({ meetingId, onEnd }: { meetingId: string; onEnd: () => void }) {
    const [micOn,     setMicOn]     = useState(true);
    const [camOn,     setCamOn]     = useState(true);
    const [screenOn,  setScreenOn]  = useState(false);
    const [handUp,    setHandUp]    = useState(false);
    const [layout,    setLayout]    = useState<Layout>("grid");
    const [panel,     setPanel]     = useState<Panel>(null);
    const [duration,  setDuration]  = useState(0);
    const [chatMsg,   setChatMsg]   = useState("");
    const [chatMsgs,  setChatMsgs]  = useState<ChatMsg[]>([
        { id: "1", from: "Islomjon K.", text: "Hammani ko'ryapman, eshitilyapsizmi?", time: "09:01" },
        { id: "2", from: "Madina E.",   text: "Ha, aniq eshitilyapsiz!", time: "09:02" },
        { id: "3", from: "Sardor T.",   text: "Ekranni ulashishingizni kutayapmiz", time: "09:03" },
    ]);
    const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
    const [reaction, setReaction] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Duration timer
    useEffect(() => {
        const id = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMsgs]);

    // Simulate random speaker animation
    useEffect(() => {
        const id = setInterval(() => {
            setParticipants(prev => prev.map(p => ({
                ...p,
                speaking: p.micOn && Math.random() > 0.75,
            })));
        }, 2000);
        return () => clearInterval(id);
    }, []);

    const sendChat = useCallback(() => {
        if (!chatMsg.trim()) return;
        setChatMsgs(prev => [...prev, {
            id: Date.now().toString(),
            from: "Siz",
            text: chatMsg.trim(),
            time: new Date().toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }),
        }]);
        setChatMsg("");
    }, [chatMsg]);

    const showReaction = useCallback((r: string) => {
        setReaction(r);
        setTimeout(() => setReaction(null), 2000);
    }, []);

    const copyLink = () => {
        navigator.clipboard?.writeText(`https://nexus.humo.uz/meet/${meetingId}`).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const gridCols = participants.length <= 1 ? 1
        : participants.length <= 2 ? 2
        : participants.length <= 4 ? 2
        : 3;

    return (
        <div className="fixed inset-0 z-[70] flex flex-col"
            style={{ background: "#050818" }}>

            {/* ── Top bar ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-10"
                style={{ background: "rgba(8,12,32,0.90)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-black text-green-400">{fmtDuration(duration)}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5">
                        <span className="text-xs font-mono" style={{ color: "rgba(100,120,170,0.80)" }}>{meetingId}</span>
                        <button onClick={copyLink}
                            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" style={{ color: "rgba(100,120,170,0.70)" }} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Layout */}
                    <button onClick={() => setLayout(l => l === "grid" ? "speaker" : "grid")}
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        {layout === "grid"
                            ? <Grid3X3 className="w-4 h-4" style={{ color: "rgba(140,160,210,0.80)" }} />
                            : <Layout className="w-4 h-4" style={{ color: "rgba(140,160,210,0.80)" }} />}
                    </button>
                    {/* Participants count */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <Users className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.80)" }} />
                        <span className="text-xs font-bold text-white">{participants.length + 1}</span>
                    </div>
                </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Participant grid ── */}
                <div className="flex-1 p-3 overflow-hidden">
                    {layout === "grid" ? (
                        <div
                            className="h-full grid gap-2"
                            style={{
                                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                                gridAutoRows: "1fr",
                            }}
                        >
                            {/* Me */}
                            <ParticipantTile
                                name="Siz (Moderator)"
                                seed="me"
                                micOn={micOn}
                                camOn={camOn}
                                speaking={false}
                                host
                                isSelf
                            />
                            {participants.map(p => (
                                <ParticipantTile key={p.id} {...p} />
                            ))}
                        </div>
                    ) : (
                        /* Speaker view — one large, others small strip */
                        <div className="h-full flex flex-col gap-2">
                            <div className="flex-1 relative">
                                <ParticipantTile
                                    name={participants.find(p => p.speaking)?.name ?? participants[0]?.name ?? "Siz"}
                                    seed={participants.find(p => p.speaking)?.seed ?? "islom"}
                                    micOn
                                    camOn
                                    speaking
                                    host={false}
                                />
                            </div>
                            <div className="flex gap-2 h-24 flex-shrink-0">
                                <ParticipantTile name="Siz" seed="me" micOn={micOn} camOn={camOn} speaking={false} host isSelf />
                                {participants.slice(0, 4).map(p => (
                                    <ParticipantTile key={p.id} {...p} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Side panel ── */}
                {panel && (
                    <div
                        className="w-80 flex-shrink-0 flex flex-col border-l"
                        style={{ background: "rgba(8,12,32,0.95)", borderColor: "rgba(43,62,232,0.18)" }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <p className="text-sm font-black text-white">
                                {panel === "chat" ? "Majlis chati" : "Ishtirokchilar"}
                            </p>
                            <button onClick={() => setPanel(null)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg"
                                style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.70)" }} />
                            </button>
                        </div>

                        {panel === "chat" ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
                                    {chatMsgs.map(m => (
                                        <div key={m.id} className={`flex flex-col ${m.from === "Siz" ? "items-end" : "items-start"}`}>
                                            <span className="text-[9px] mb-0.5" style={{ color: "rgba(80,100,150,0.70)" }}>{m.from} · {m.time}</span>
                                            <div
                                                className="max-w-[80%] px-3 py-2 rounded-2xl text-xs text-white leading-relaxed"
                                                style={m.from === "Siz" ? {
                                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                                } : {
                                                    background: "rgba(43,62,232,0.12)",
                                                    border: "1px solid rgba(43,62,232,0.20)",
                                                }}
                                            >
                                                {m.text}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="flex-shrink-0 p-3 flex gap-2"
                                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                    <input
                                        value={chatMsg}
                                        onChange={e => setChatMsg(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendChat()}
                                        placeholder="Xabar yozing..."
                                        className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }}
                                    />
                                    <button onClick={sendChat}
                                        className="nx-press w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Send className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                                {/* Me */}
                                <ParticipantRow name="Siz (Moderator)" seed="me" micOn={micOn} camOn={camOn} handRaised={handUp} host />
                                {participants.map(p => (
                                    <ParticipantRow key={p.id} {...p} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Floating reaction ── */}
            {reaction && (
                <div
                    className="fixed bottom-32 left-1/2 -translate-x-1/2 text-6xl pointer-events-none z-[80]"
                    style={{ animation: "nx-slide-up 0.3s ease both" }}
                >
                    {reaction}
                </div>
            )}

            {/* ── Controls bar ── */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-4 z-10"
                style={{ background: "rgba(8,12,32,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(43,62,232,0.15)" }}>

                {/* Mic */}
                <ControlBtn
                    active={micOn}
                    icon={micOn ? Mic : MicOff}
                    label={micOn ? "Mik" : "Mik off"}
                    onClick={() => setMicOn(p => !p)}
                    danger={!micOn}
                />

                {/* Camera */}
                <ControlBtn
                    active={camOn}
                    icon={camOn ? Video : VideoOff}
                    label={camOn ? "Kamera" : "Kamera off"}
                    onClick={() => setCamOn(p => !p)}
                    danger={!camOn}
                />

                {/* Screen share */}
                <ControlBtn
                    active={!screenOn}
                    icon={screenOn ? MonitorOff : Monitor}
                    label={screenOn ? "To'xtatish" : "Ekran"}
                    onClick={() => setScreenOn(p => !p)}
                    accent={screenOn}
                />

                {/* Hand */}
                <ControlBtn
                    active={!handUp}
                    icon={Hand}
                    label={handUp ? "Qo'l tushir" : "Qo'l ko'tar"}
                    onClick={() => setHandUp(p => !p)}
                    accent={handUp}
                />

                {/* Reactions */}
                <div className="relative group">
                    <button
                        className="nx-press flex flex-col items-center gap-1 w-12 h-14 justify-center rounded-2xl transition-colors duration-150"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <Smile className="w-5 h-5" style={{ color: "rgba(180,195,235,0.90)" }} />
                        <span className="text-[9px] font-bold" style={{ color: "rgba(120,140,190,0.75)" }}>Reaksiya</span>
                    </button>
                    {/* Reaction picker */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-2 p-2 rounded-2xl z-10"
                        style={{ background: "rgba(8,12,32,0.97)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.50)" }}>
                        {REACTIONS.map((r, i) => (
                            <button key={i} onClick={() => showReaction(r)}
                                className="text-2xl hover:scale-125 transition-transform duration-150 active:scale-95">
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <ControlBtn
                    active={panel !== "chat"}
                    icon={MessageSquare}
                    label="Chat"
                    onClick={() => setPanel(p => p === "chat" ? null : "chat")}
                    accent={panel === "chat"}
                />

                {/* Participants */}
                <ControlBtn
                    active={panel !== "participants"}
                    icon={Users}
                    label="Ishtirokchi"
                    onClick={() => setPanel(p => p === "participants" ? null : "participants")}
                    accent={panel === "participants"}
                />

                {/* Spacer */}
                <div className="flex-1 md:flex-none" />

                {/* End call */}
                <button
                    onClick={onEnd}
                    className="nx-press flex flex-col items-center gap-1 px-5 h-14 justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.45)" }}
                >
                    <PhoneOff className="w-5 h-5 text-white" />
                    <span className="text-[9px] font-black text-white">Chiqish</span>
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Participant tile — video grid kartasi
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantTile({ name, seed, micOn, camOn, speaking, host, isSelf }: {
    name: string; seed: string; micOn: boolean; camOn: boolean;
    speaking: boolean; host: boolean; isSelf?: boolean;
}) {
    return (
        <div
            className="relative rounded-2xl overflow-hidden flex items-center justify-center h-full min-h-[100px]"
            style={{
                background: "rgba(11,18,40,0.80)",
                border: speaking
                    ? "2px solid rgba(43,62,232,0.90)"
                    : "2px solid rgba(43,62,232,0.18)",
                boxShadow: speaking ? "0 0 20px rgba(43,62,232,0.35)" : "none",
                transition: "border-color 0.3s ease, box-shadow 0.3s ease",
            }}
        >
            {camOn ? (
                <img
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`}
                    alt={name}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-white"
                    style={{ border: "2px solid rgba(43,62,232,0.30)" }}
                />
            ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                    style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.40),rgba(0,206,200,0.25))" }}>
                    {name[0].toUpperCase()}
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(5,8,24,0.75) 0%, transparent 50%)" }} />

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white truncate max-w-[80px] md:max-w-[120px]">{name}</span>
                    {host && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                    {isSelf && <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(43,62,232,0.50)", color: "rgba(200,215,255,0.90)" }}>Siz</span>}
                </div>
                {!micOn && (
                    <MicOff className="w-3 h-3 flex-shrink-0 text-red-400" />
                )}
            </div>

            {/* Speaking pulse ring */}
            {speaking && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ boxShadow: "inset 0 0 0 2px rgba(43,62,232,0.80)", animation: "nx-glow-pulse 1.5s ease-in-out infinite" }} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Participant row — panel ro'yxati
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantRow({ name, seed, micOn, camOn, handRaised, host }: {
    name: string; seed: string; micOn: boolean; camOn: boolean; handRaised: boolean; host: boolean;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150"
            style={{ borderBottom: "1px solid rgba(43,62,232,0.08)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <div className="relative w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: "1px solid rgba(43,62,232,0.25)" }}>
                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`} alt={name} className="w-full h-full object-cover bg-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate">{name}</span>
                    {host && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                </div>
                {handRaised && <span className="text-[9px]" style={{ color: "#F59E0B" }}>Qo'l ko'tarilgan</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {!micOn && <MicOff className="w-3 h-3 text-red-400" />}
                {!camOn && <VideoOff className="w-3 h-3" style={{ color: "rgba(80,100,150,0.60)" }} />}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Control button
// ─────────────────────────────────────────────────────────────────────────────
function ControlBtn({ icon: Icon, label, onClick, active, danger, accent }: {
    icon: React.ElementType; label: string; onClick: () => void;
    active: boolean; danger?: boolean; accent?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="nx-press flex flex-col items-center gap-1 w-12 h-14 justify-center rounded-2xl transition-colors duration-150"
            style={danger ? {
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.35)",
            } : accent ? {
                background: "rgba(43,62,232,0.25)",
                border: "1px solid rgba(43,62,232,0.50)",
            } : {
                background: "rgba(43,62,232,0.10)",
                border: "1px solid rgba(43,62,232,0.22)",
            }}
        >
            <Icon className="w-5 h-5"
                style={{ color: danger ? "#EF4444" : accent ? "#00CEC8" : "rgba(180,195,235,0.90)" }} />
            <span className="text-[9px] font-bold text-center leading-tight"
                style={{ color: danger ? "#EF4444" : accent ? "#00CEC8" : "rgba(120,140,190,0.75)" }}>
                {label}
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meeting ended screen
// ─────────────────────────────────────────────────────────────────────────────
function MeetingEnded({ onClose, onRejoin }: { onClose: () => void; onRejoin: () => void }) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ background: "rgba(3,5,16,0.97)", backdropFilter: "blur(24px)" }}>
            <div className="flex flex-col items-center gap-6 text-center px-6 max-w-sm">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.35)" }}>
                    <PhoneOff className="w-9 h-9 text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white mb-2">Majlis tugadi</h2>
                    <p className="text-sm" style={{ color: "rgba(120,140,190,0.80)" }}>
                        Majlisdan chiqdingiz. Qayta qo'shilishingiz mumkin.
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                    <button onClick={onRejoin}
                        className="nx-press w-full py-3.5 rounded-2xl font-black text-white"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        Qayta Qo'shilish
                    </button>
                    <button onClick={onClose}
                        className="nx-press w-full py-3.5 rounded-2xl font-bold"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(160,180,220,0.90)" }}>
                        Chiqish
                    </button>
                </div>
            </div>
        </div>
    );
}
