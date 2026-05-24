"use client";

import { useState, useEffect, useRef } from "react";
import {
    X, Radio, Camera, Mic, MicOff, CameraOff, Users, Eye,
    Heart, Gift, Settings, Share2, StopCircle, Loader2,
    MessageSquare, Send, Smile, Globe, Lock,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock chat messages during live
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_VIEWERS = ["Sardor", "Malika", "Jasur", "Dilnoza", "Bobur", "Nilufar", "Kamol", "Aziz"];
const MOCK_LIVE_MSGS = [
    "Salom! Jonli efirga xush kelibsiz",
    "Zo'r ko'rsatuv!",
    "Qachon yangi albom?",
    "Sizni kuzatib boraman",
    "Tabriklayman!",
];

interface LiveMsg { id: string; user: string; text: string; }

type Stage = "setup" | "preview" | "live" | "ended";
type Privacy = "public" | "friends" | "private";

const PRIVACY_OPTS: { value: Privacy; label: string; icon: React.ElementType }[] = [
    { value: "public",  label: "Hammaga ochiq",  icon: Globe },
    { value: "friends", label: "Do'stlar uchun", icon: Users },
    { value: "private", label: "Maxfiy",          icon: Lock  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxGoLive
// ─────────────────────────────────────────────────────────────────────────────
export function NxGoLive() {
    const { goLiveOpen, setGoLiveOpen } = useNxPlayer();

    const [stage,    setStage]    = useState<Stage>("setup");
    const [title,    setTitle]    = useState("");
    const [privacy,  setPrivacy]  = useState<Privacy>("public");
    const [micOn,    setMicOn]    = useState(true);
    const [camOn,    setCamOn]    = useState(true);
    const [viewers,  setViewers]  = useState(0);
    const [likes,    setLikes]    = useState(0);
    const [duration, setDuration] = useState(0);
    const [msgs,     setMsgs]     = useState<LiveMsg[]>([]);
    const [chatIn,   setChatIn]   = useState("");
    const [starting, setStarting] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Simulate viewer/like growth and incoming messages during live
    useEffect(() => {
        if (stage !== "live") return;
        const iv = setInterval(() => {
            setViewers(v => v + Math.floor(Math.random() * 8));
            setLikes(l => l + Math.floor(Math.random() * 15));
            setDuration(d => d + 1);

            if (Math.random() > 0.4) {
                const user = MOCK_VIEWERS[Math.floor(Math.random() * MOCK_VIEWERS.length)];
                const text = MOCK_LIVE_MSGS[Math.floor(Math.random() * MOCK_LIVE_MSGS.length)];
                setMsgs(prev => [...prev.slice(-30), { id: `m${Date.now()}`, user, text }]);
            }
        }, 1200);
        return () => clearInterval(iv);
    }, [stage]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs]);

    // Reset on close
    useEffect(() => {
        if (!goLiveOpen) {
            setStage("setup"); setTitle(""); setPrivacy("public");
            setMicOn(true); setCamOn(true); setViewers(0); setLikes(0);
            setDuration(0); setMsgs([]); setChatIn("");
        }
    }, [goLiveOpen]);

    if (!goLiveOpen) return null;

    const fmtDuration = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
            : `${m}:${String(sec).padStart(2, "0")}`;
    };

    const startLive = () => {
        setStarting(true);
        setTimeout(() => { setStarting(false); setStage("live"); setViewers(3); }, 1800);
    };

    const endLive = () => setStage("ended");

    const sendChat = () => {
        if (!chatIn.trim()) return;
        setMsgs(prev => [...prev, { id: `u${Date.now()}`, user: "Siz", text: chatIn.trim() }]);
        setChatIn("");
    };

    /* ── SETUP SCREEN ── */
    if (stage === "setup" || stage === "preview") {
        return (
            <>
                <div className="fixed inset-0 z-[55]"
                    style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                    onClick={() => setGoLiveOpen(false)} />

                <div
                    className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:max-h-[88vh] md:rounded-3xl"
                    style={{
                        background: "rgba(8,12,32,0.98)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                        maxHeight: "90vh",
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                <Radio className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white">Jonli efir boshlash</h2>
                                <p className="text-[9px]" style={{ color: "rgba(239,68,68,0.70)" }}>Go Live</p>
                            </div>
                        </div>
                        <button onClick={() => setGoLiveOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                        {/* Camera preview placeholder */}
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4"
                            style={{ background: "rgba(11,18,40,0.80)", border: "1px solid rgba(239,68,68,0.20)" }}>
                            {camOn ? (
                                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                                    <Camera className="w-12 h-12" style={{ color: "rgba(239,68,68,0.40)" }} />
                                    <p className="text-xs" style={{ color: "rgba(80,100,150,0.70)" }}>Kamera oldindan ko'rish</p>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center"
                                    style={{ background: "rgba(5,8,24,0.95)" }}>
                                    <CameraOff className="w-12 h-12" style={{ color: "rgba(80,100,150,0.40)" }} />
                                </div>
                            )}
                            {/* Mic/Cam controls overlay */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                                <button onClick={() => setMicOn(m => !m)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150"
                                    style={{ background: micOn ? "rgba(43,62,232,0.30)" : "rgba(239,68,68,0.40)", backdropFilter: "blur(8px)" }}>
                                    {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
                                </button>
                                <button onClick={() => setCamOn(c => !c)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150"
                                    style={{ background: camOn ? "rgba(43,62,232,0.30)" : "rgba(239,68,68,0.40)", backdropFilter: "blur(8px)" }}>
                                    {camOn ? <Camera className="w-4 h-4 text-white" /> : <CameraOff className="w-4 h-4 text-white" />}
                                </button>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>
                                Efir sarlavhasi
                            </p>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Bu efirda nima bo'ladi?"
                                maxLength={80}
                                className="w-full px-4 py-3 rounded-xl bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}
                            />
                            <p className="text-right text-[9px] mt-1 px-1" style={{ color: "rgba(80,100,150,0.50)" }}>
                                {title.length}/80
                            </p>
                        </div>

                        {/* Privacy */}
                        <div className="mb-6">
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>
                                Kim ko'ra oladi
                            </p>
                            <div className="flex flex-col gap-2">
                                {PRIVACY_OPTS.map(({ value, label, icon: Icon }) => (
                                    <button key={value} onClick={() => setPrivacy(value)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-left"
                                        style={privacy === value ? {
                                            background: "rgba(239,68,68,0.12)",
                                            border: "1px solid rgba(239,68,68,0.35)",
                                        } : {
                                            background: "rgba(43,62,232,0.06)",
                                            border: "1px solid rgba(43,62,232,0.18)",
                                        }}>
                                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: privacy === value ? "#EF4444" : "rgba(100,130,200,0.70)" }} />
                                        <span className="text-sm font-medium"
                                            style={{ color: privacy === value ? "white" : "rgba(160,180,230,0.85)" }}>{label}</span>
                                        {privacy === value && (
                                            <div className="ml-auto w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Start button */}
                        <button
                            onClick={startLive}
                            disabled={starting}
                            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all duration-200 flex items-center justify-center gap-2"
                            style={{ background: starting ? "rgba(239,68,68,0.30)" : "linear-gradient(135deg,#EF4444,#F97316)" }}
                        >
                            {starting ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Ulanmoqda...</>
                            ) : (
                                <><Radio className="w-5 h-5" /> Jonli efirni boshlash</>
                            )}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    /* ── ENDED SCREEN ── */
    if (stage === "ended") {
        return (
            <>
                <div className="fixed inset-0 z-[55]"
                    style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                    onClick={() => setGoLiveOpen(false)} />
                <div className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[380px] md:rounded-3xl"
                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", maxHeight: "90vh" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="p-8 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Radio className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white mb-1">Efir tugatildi</p>
                            <p className="text-sm" style={{ color: "rgba(100,120,170,0.80)" }}>
                                Davomiyligi: {fmtDuration(duration)}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 w-full">
                            {[
                                { label: "Tomoshabin", value: viewers.toLocaleString() },
                                { label: "Layk",       value: likes.toLocaleString()   },
                                { label: "Xabar",      value: msgs.length.toString()   },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex flex-col items-center py-3 rounded-xl"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                    <p className="text-lg font-black text-white">{value}</p>
                                    <p className="text-[9px] font-bold mt-0.5" style={{ color: "rgba(100,120,170,0.70)" }}>{label}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setGoLiveOpen(false)}
                            className="w-full py-3.5 rounded-2xl font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            Yopish
                        </button>
                    </div>
                </div>
            </>
        );
    }

    /* ── LIVE SCREEN ── */
    return (
        <div className="fixed inset-0 z-[60] flex flex-col"
            style={{ background: "#050818" }}>
            {/* Fake camera feed */}
            <div className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(43,62,232,0.15) 0%, transparent 70%)" }} />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-4">
                {/* Live badge + duration */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: "#EF4444" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black text-white">LIVE</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)" }}>
                        <span className="text-xs font-black text-white">{fmtDuration(duration)}</span>
                    </div>
                </div>

                {/* Viewer count */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)" }}>
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-xs font-bold text-white">{viewers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)" }}>
                        <Heart className="w-3 h-3" style={{ color: "#EF4444" }} />
                        <span className="text-xs font-bold text-white">{likes.toLocaleString()}</span>
                    </div>
                    <button onClick={() => setMicOn(m => !m)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)" }}>
                        {micOn ? <Mic className="w-3.5 h-3.5 text-white" /> : <MicOff className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                    </button>
                    <button onClick={endLive}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-150"
                        style={{ background: "rgba(239,68,68,0.80)", backdropFilter: "blur(8px)" }}>
                        <StopCircle className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-black text-white">Tugatish</span>
                    </button>
                </div>
            </div>

            {/* Title */}
            {title && (
                <div className="relative z-10 px-4 mt-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
                        style={{ background: "rgba(5,8,24,0.60)", backdropFilter: "blur(8px)" }}>
                        <Radio className="w-3 h-3" style={{ color: "#EF4444" }} />
                        <span className="text-xs font-bold text-white">{title}</span>
                    </div>
                </div>
            )}

            {/* Chat messages — bottom-left */}
            <div className="relative z-10 mt-auto px-3 pb-3 flex flex-col gap-1.5"
                style={{ maxHeight: "45vh", overflowY: "hidden" }}>
                {msgs.slice(-12).map(m => (
                    <div key={m.id} className="flex items-start gap-1.5 max-w-[80%]">
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            {m.user[0]}
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl"
                            style={{ background: "rgba(5,8,24,0.65)", backdropFilter: "blur(8px)" }}>
                            <span className="text-[10px] font-black" style={{ color: "#00CEC8" }}>{m.user} </span>
                            <span className="text-[10px] text-white">{m.text}</span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Chat input */}
            <div className="relative z-10 flex items-center gap-2 px-3 pb-4">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.40)" }} />
                    <input
                        value={chatIn}
                        onChange={e => setChatIn(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                        placeholder="Xabar yozing..."
                        className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none"
                    />
                </div>
                <button onClick={sendChat}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Send className="w-3.5 h-3.5 text-white" />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Gift className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                </button>
            </div>
        </div>
    );
}
