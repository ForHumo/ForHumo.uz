"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Users, Link, Check, MessageSquare, Send, Crown, Tv, Copy } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Participant {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    reaction: string | null;
}

interface ChatMsg {
    id: string;
    user: string;
    text: string;
    time: string;
}

const INIT_PARTICIPANTS: Participant[] = [
    { id: "p1", name: "Siz (Host)", avatar: "https://picsum.photos/seed/wp1/40/40", isHost: true,  reaction: null },
    { id: "p2", name: "Sardor",     avatar: "https://picsum.photos/seed/wp2/40/40", isHost: false, reaction: null },
    { id: "p3", name: "Malika",     avatar: "https://picsum.photos/seed/wp3/40/40", isHost: false, reaction: null },
];

const MOCK_CHAT_INIT: ChatMsg[] = [
    { id: "c1", user: "Sardor", text: "Ajoyib film!", time: "21:42" },
    { id: "c2", user: "Malika", text: "Ha, men ham tomosha qilaman", time: "21:43" },
];

const MOCK_VIDEOS = [
    { title: "React 19 Yangiliklari",    author: "Dev UZ",    img: "https://picsum.photos/seed/wp_v1/320/180", duration: "24:10" },
    { title: "O'zbekiston Tabiati 4K",   author: "Nature UZ", img: "https://picsum.photos/seed/wp_v2/320/180", duration: "18:45" },
    { title: "UX Masterclass — Qism 3",  author: "Design UZ", img: "https://picsum.photos/seed/wp_v3/320/180", duration: "31:22" },
];

const REACTIONS = ["", "", "", "", "", ""];

// ─────────────────────────────────────────────────────────────────────────────
// NxWatchParty
// ─────────────────────────────────────────────────────────────────────────────
export function NxWatchParty() {
    const { watchPartyOpen, setWatchPartyOpen } = useNxPlayer();

    const [stage,        setStage]        = useState<"lobby" | "watching">("lobby");
    const [selectedVid,  setSelectedVid]  = useState(0);
    const [playing,      setPlaying]      = useState(false);
    const [progress,     setProgress]     = useState(0);
    const [participants, setParticipants] = useState<Participant[]>(INIT_PARTICIPANTS);
    const [msgs,         setMsgs]         = useState<ChatMsg[]>(MOCK_CHAT_INIT);
    const [chatIn,       setChatIn]       = useState("");
    const [copied,       setCopied]       = useState(false);
    const [myReaction,   setMyReaction]   = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const ROOM_CODE = "NX-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    useEffect(() => {
        if (!watchPartyOpen) { setStage("lobby"); setPlaying(false); setProgress(0); }
    }, [watchPartyOpen]);

    useEffect(() => {
        if (!playing || stage !== "watching") return;
        const iv = setInterval(() => {
            setProgress(p => {
                if (p >= 100) { setPlaying(false); return 100; }
                return p + 0.5;
            });
        }, 300);
        return () => clearInterval(iv);
    }, [playing, stage]);

    // Simulate incoming chat in watching mode
    useEffect(() => {
        if (stage !== "watching") return;
        const iv = setInterval(() => {
            if (Math.random() > 0.6) {
                const users = ["Sardor", "Malika"];
                const texts = ["Bu qism juda zo'r!", "Haha", "Sharhlash uchun to'xtab ol!", "Ajoyib!", "10/10"];
                const u = users[Math.floor(Math.random() * users.length)];
                setMsgs(prev => [...prev.slice(-40), {
                    id: `c${Date.now()}`, user: u,
                    text: texts[Math.floor(Math.random() * texts.length)],
                    time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
                }]);
            }
        }, 3500);
        return () => clearInterval(iv);
    }, [stage]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    if (!watchPartyOpen) return null;

    const video = MOCK_VIDEOS[selectedVid];

    const copyCode = () => {
        navigator.clipboard.writeText(ROOM_CODE).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sendMsg = () => {
        if (!chatIn.trim()) return;
        setMsgs(prev => [...prev, {
            id: `c${Date.now()}`, user: "Siz",
            text: chatIn.trim(),
            time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }]);
        setChatIn("");
    };

    const sendReaction = (r: string) => {
        setMyReaction(r);
        setTimeout(() => setMyReaction(null), 2000);
    };

    /* ── LOBBY ── */
    if (stage === "lobby") {
        return (
            <>
                <div className="fixed inset-0 z-[55]"
                    style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                    onClick={() => setWatchPartyOpen(false)} />

                <div
                    className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[88vh] md:rounded-3xl"
                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "90vh" }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                                <Tv className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white">Watch Party</h2>
                                <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>Do'stlar bilan birgalikda tomosha</p>
                            </div>
                        </div>
                        <button onClick={() => setWatchPartyOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                        {/* Room code */}
                        <div className="p-4 rounded-2xl mb-4"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Xona kodi — do'stlaringizga yuboring
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black tracking-widest" style={{
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                                }}>{ROOM_CODE}</span>
                                <button onClick={copyCode}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150"
                                    style={copied ? {
                                        background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)", color: "#10B981",
                                    } : {
                                        background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.30)", color: "#00CEC8",
                                    }}>
                                    {copied ? <><Check className="w-3 h-3" /> Nusxalandi</> : <><Copy className="w-3 h-3" /> Nusxalash</>}
                                </button>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold mb-2 px-1" style={{ color: "rgba(80,100,150,0.80)" }}>
                                <Users className="w-3 h-3 inline mr-1" />{participants.length} ishtirokchi
                            </p>
                            <div className="flex gap-2">
                                {participants.map(p => (
                                    <div key={p.id} className="flex flex-col items-center gap-1 relative">
                                        <div className="relative">
                                            <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                                            {p.isHost && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ background: "#F59E0B" }}>
                                                    <Crown className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-bold text-white w-12 text-center truncate">{p.name.split(" ")[0]}</span>
                                    </div>
                                ))}
                                <button className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px dashed rgba(43,62,232,0.30)" }}>
                                    <Link className="w-4 h-4" style={{ color: "rgba(43,62,232,0.60)" }} />
                                </button>
                            </div>
                        </div>

                        {/* Video selection */}
                        <p className="text-[10px] font-bold mb-2 px-1" style={{ color: "rgba(80,100,150,0.80)" }}>
                            Video tanlang
                        </p>
                        <div className="flex flex-col gap-2 mb-6">
                            {MOCK_VIDEOS.map((v, i) => (
                                <button key={i} onClick={() => setSelectedVid(i)}
                                    className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-150"
                                    style={selectedVid === i ? {
                                        background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.40)",
                                    } : {
                                        background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)",
                                    }}>
                                    <img src={v.img} alt={v.title} className="w-20 h-12 rounded-xl object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{v.title}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.70)" }}>
                                            {v.author} · {v.duration}
                                        </p>
                                    </div>
                                    {selectedVid === i && (
                                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setStage("watching")}
                            className="w-full py-4 rounded-2xl font-black text-base text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            Watch Party boshlash
                        </button>
                    </div>
                </div>
            </>
        );
    }

    /* ── WATCHING ── */
    return (
        <div className="fixed inset-0 z-[60] flex flex-col"
            style={{ background: "#050818" }}>
            {/* Video area */}
            <div className="relative flex-shrink-0"
                style={{ background: "rgba(5,8,24,0.95)", borderBottom: "1px solid rgba(43,62,232,0.20)" }}>
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                    <img src={video.img} alt={video.title} className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button onClick={() => setPlaying(p => !p)}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
                            style={{ background: "rgba(43,62,232,0.70)", backdropFilter: "blur(8px)" }}>
                            {playing ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white fill-white" />}
                        </button>
                    </div>
                    {/* Reactions overlay */}
                    {myReaction && (
                        <div className="absolute top-4 right-4 text-4xl animate-bounce">{myReaction}</div>
                    )}
                    {/* Header overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                            style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }}>
                            <Tv className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                            <span className="text-xs font-black text-white">Watch Party</span>
                            <div className="flex -space-x-1.5 ml-1">
                                {participants.map(p => (
                                    <img key={p.id} src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full border border-[rgba(43,62,232,0.40)] object-cover" />
                                ))}
                            </div>
                        </div>
                        <button onClick={() => { setStage("lobby"); setPlaying(false); setProgress(0); }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: "rgba(43,62,232,0.20)" }}>
                    <div className="h-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                </div>

                {/* Title + reactions */}
                <div className="flex items-center justify-between px-4 py-2">
                    <div>
                        <p className="text-sm font-black text-white">{video.title}</p>
                        <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>{video.author}</p>
                    </div>
                    <div className="flex gap-1.5">
                        {REACTIONS.map((r, i) => (
                            <button key={i} onClick={() => sendReaction(r)}
                                className="text-lg transition-transform duration-150 active:scale-125">
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5" style={{ scrollbarWidth: "none" }}>
                {msgs.map(m => (
                    <div key={m.id} className="flex items-start gap-2">
                        <span className="text-[10px] font-black flex-shrink-0" style={{ color: m.user === "Siz" ? "#00CEC8" : "#8B5CF6" }}>{m.user}</span>
                        <span className="text-xs text-white">{m.text}</span>
                        <span className="text-[9px] ml-auto flex-shrink-0" style={{ color: "rgba(80,100,150,0.50)" }}>{m.time}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 pb-4 pt-2 flex items-center gap-2 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(43,62,232,0.18)" }}>
                <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                <input value={chatIn} onChange={e => setChatIn(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMsg(); } }}
                    placeholder="Xabar yozing..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none" />
                <button onClick={sendMsg}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Send className="w-3.5 h-3.5 text-white" />
                </button>
            </div>
        </div>
    );
}
