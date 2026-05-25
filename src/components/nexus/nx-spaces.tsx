"use client";

import { useState } from "react";
import {
    X, Mic, MicOff, Hand, Radio, Users, Heart,
    Share2, Plus, ChevronRight, Clock, Lock,
    Volume2, Star, BadgeCheck,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Space {
    id: string; title: string; host: string; hostSeed: string;
    listeners: number; speakers: string[]; speakerSeeds: string[];
    topic: string; live: boolean; scheduled?: string;
    likes: number; verified?: boolean;
}

const MOCK_SPACES: Space[] = [
    {
        id: "sp1", title: "O'zbekiston texnologiya startaplari: 2026 bashoratlar",
        host: "Humo AI", hostSeed: "humo_ai",
        listeners: 2840, speakers: ["Sardor Dev", "Kamola X", "Bobur T"], speakerSeeds: ["sardor", "kamola", "bobur"],
        topic: "Tech", live: true, likes: 312, verified: true,
    },
    {
        id: "sp2", title: "Kreator iqtisodiyoti — pul ishlash sirlari",
        host: "Madina Ergash", hostSeed: "madina",
        listeners: 1650, speakers: ["Jasur N", "Dilnoza S"], speakerSeeds: ["jasur", "dilnoza"],
        topic: "Biznes", live: true, likes: 180,
    },
    {
        id: "sp3", title: "AI va kelajak — insonlar uchun imkoniyatlar",
        host: "AI Hub UZ", hostSeed: "ai_hub",
        listeners: 980, speakers: ["Islom K"], speakerSeeds: ["islom"],
        topic: "AI", live: true, likes: 95,
    },
    {
        id: "sp4", title: "O'zbek rap: yangi avlod suhbati",
        host: "Beat Studio", hostSeed: "beat",
        listeners: 420, speakers: ["Zulfiya R", "Sardor T"], speakerSeeds: ["zulfiya", "sardor2"],
        topic: "Musiqa", live: false, scheduled: "Ertaga, 20:00", likes: 67,
    },
    {
        id: "sp5", title: "Veb dizayn asoslari — savollar va javoblar",
        host: "Design UZ", hostSeed: "design",
        listeners: 310, speakers: ["Kamola F"], speakerSeeds: ["kamolaf"],
        topic: "Dizayn", live: false, scheduled: "28 May, 18:00", likes: 45,
    },
];

const TOPICS = ["Hammasi", "Tech", "Biznes", "Musiqa", "AI", "Sport", "Dizayn", "Ta'lim"];

// ─────────────────────────────────────────────────────────────────────────────
// Faol Space oynasi
// ─────────────────────────────────────────────────────────────────────────────
function ActiveSpace({ space, onLeave }: { space: Space; onLeave: () => void }) {
    const { openShareSheet } = useNxPlayer();
    const [muted,    setMuted]    = useState(true);
    const [hand,     setHand]     = useState(false);
    const [likes,    setLikes]    = useState(space.likes);
    const [liked,    setLiked]    = useState(false);
    const [messages, setMessages] = useState<{ name: string; seed: string; text: string }[]>([
        { name: space.host, seed: space.hostSeed, text: "Salomlashib o'tamiz! Bugun juda qiziqarli mavzuni ko'rib chiqamiz." },
        { name: space.speakers[0] ?? "Mehmon", seed: space.speakerSeeds[0] ?? "guest", text: "Ha, men ham bu haqda ko'p o'ylanganman." },
    ]);
    const [input, setInput] = useState("");

    const allSpeakers = [
        { name: space.host, seed: space.hostSeed, isHost: true },
        ...space.speakers.map((n, i) => ({ name: n, seed: space.speakerSeeds[i] ?? "sp", isHost: false })),
    ];

    const handleLike = () => {
        setLiked(l => !l);
        setLikes(l => liked ? l - 1 : l + 1);
    };

    const sendMessage = () => {
        if (!input.trim()) return;
        setMessages(prev => [...prev, { name: "Men", seed: "self", text: input.trim() }]);
        setInput("");
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col"
            style={{ background: "rgba(5,8,24,0.98)" }}
        >
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                    style={{ background: "radial-gradient(circle,rgba(139,92,246,0.20) 0%,transparent 70%)" }} />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 pt-12 pb-4">
                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-black"
                        style={{ background: "linear-gradient(90deg,#8B5CF6,#6366F1)" }}>
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        JONLI
                    </div>
                    <span className="text-[10px]" style={{ color: "rgba(139,92,246,0.80)" }}>{space.topic}</span>
                </div>
                <button
                    onClick={onLeave}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.30)", color: "rgba(239,68,68,0.85)" }}
                >
                    Chiqish
                </button>
            </div>

            {/* Title */}
            <div className="relative px-5 mb-5">
                <h2 className="text-lg font-black text-white leading-snug mb-1">{space.title}</h2>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>
                        <Users className="w-3 h-3" />{space.listeners.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Speakers grid */}
            <div className="relative px-5 mb-5">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(139,92,246,0.55)" }}>
                    So'zlovchilar
                </p>
                <div className="flex flex-wrap gap-4">
                    {allSpeakers.map((s, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                            <div className="relative">
                                <div
                                    className="w-16 h-16 rounded-2xl overflow-hidden bg-white"
                                    style={{
                                        border: `2px solid ${s.isHost ? "rgba(139,92,246,0.60)" : "rgba(43,62,232,0.40)"}`,
                                        boxShadow: s.isHost ? "0 0 20px rgba(139,92,246,0.30)" : "none",
                                    }}
                                >
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${s.seed}`} alt={s.name} className="w-full h-full object-cover" />
                                </div>
                                {/* Mic indicator */}
                                <div
                                    className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(5,8,24,1)", border: "1.5px solid rgba(43,62,232,0.40)" }}
                                >
                                    <Mic className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                </div>
                                {s.isHost && (
                                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                        style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                                        <Star className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[9px] font-bold text-white text-center max-w-[60px] leading-tight">
                                {s.name.split(" ")[0]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 px-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>
                    Muhokama
                </p>
                <div className="flex flex-col gap-2">
                    {messages.map((m, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${m.seed}`} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 p-2.5 rounded-xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <p className="text-[10px] font-bold mb-0.5" style={{ color: "#00CEC8" }}>{m.name}</p>
                                <p className="text-xs text-white">{m.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="relative px-5 pb-10 pt-4" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                {/* Message input */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Muhokamaga qo'shiling..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        className="flex-1 h-10 rounded-xl px-4 text-sm text-white outline-none"
                        style={{
                            background: "rgba(5,8,24,0.60)",
                            border: "1px solid rgba(43,62,232,0.22)",
                            caretColor: "#00CEC8",
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                    >
                        <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-5">
                    <button
                        onClick={() => setMuted(m => !m)}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={muted ? {
                                background: "rgba(239,68,68,0.20)", border: "2px solid rgba(239,68,68,0.50)",
                            } : {
                                background: "rgba(43,62,232,0.15)", border: "2px solid rgba(43,62,232,0.40)",
                            }}
                        >
                            {muted
                                ? <MicOff className="w-5 h-5" style={{ color: "#EF4444" }} />
                                : <Mic    className="w-5 h-5" style={{ color: "#00CEC8" }} />
                            }
                        </div>
                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>{muted ? "Yoqish" : "O'chirish"}</span>
                    </button>

                    <button
                        onClick={() => setHand(h => !h)}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={hand ? {
                                background: "rgba(245,158,11,0.20)", border: "2px solid rgba(245,158,11,0.50)",
                            } : {
                                background: "rgba(43,62,232,0.15)", border: "2px solid rgba(43,62,232,0.40)",
                            }}
                        >
                            <Hand className="w-5 h-5" style={{ color: hand ? "#F59E0B" : "rgba(140,160,220,0.90)" }} />
                        </div>
                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>Qo'l</span>
                    </button>

                    <button onClick={handleLike} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={liked ? {
                                background: "rgba(239,68,68,0.20)", border: "2px solid rgba(239,68,68,0.50)",
                            } : {
                                background: "rgba(43,62,232,0.15)", border: "2px solid rgba(43,62,232,0.40)",
                            }}
                        >
                            <Heart className="w-5 h-5" style={{ color: liked ? "#EF4444" : "rgba(140,160,220,0.90)", fill: liked ? "#EF4444" : "none" }} />
                        </div>
                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>{likes}</span>
                    </button>

                    <button onClick={() => openShareSheet(space.title)} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={{ background: "rgba(43,62,232,0.15)", border: "2px solid rgba(43,62,232,0.40)" }}
                        >
                            <Share2 className="w-5 h-5" style={{ color: "rgba(140,160,220,0.90)" }} />
                        </div>
                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>Ulashish</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxSpaces — asosiy panel
// ─────────────────────────────────────────────────────────────────────────────
export function NxSpaces() {
    const { spacesOpen, setSpacesOpen } = useNxPlayer();
    const [activeTopic, setActiveTopic] = useState("Hammasi");
    const [activeSpace, setActiveSpace]  = useState<Space | null>(null);

    if (!spacesOpen) return null;

    const filtered = MOCK_SPACES.filter(s =>
        activeTopic === "Hammasi" || s.topic === activeTopic
    );

    if (activeSpace) {
        return <ActiveSpace space={activeSpace} onLeave={() => setActiveSpace(null)} />;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setSpacesOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(139,92,246,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Spaces
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
                                style={{ background: "linear-gradient(90deg,#8B5CF6,#6366F1)" }}>
                                YANGI
                            </span>
                        </h2>
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>
                            Jonli audio suhbatlar — Twitter Spaces uslubi
                        </p>
                    </div>
                    <button
                        onClick={() => setSpacesOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Topic filter */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {TOPICS.map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTopic(t)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                                style={activeTopic === t ? {
                                    background: "linear-gradient(135deg,#8B5CF6,#6366F1)",
                                    color: "white",
                                } : {
                                    background: "rgba(139,92,246,0.10)",
                                    border: "1px solid rgba(139,92,246,0.20)",
                                    color: "rgba(140,160,210,0.85)",
                                }}
                            >{t}</button>
                        ))}
                    </div>
                </div>

                {/* Spaces list */}
                <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
                    {/* Live spaces */}
                    {filtered.filter(s => s.live).length > 0 && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(139,92,246,0.55)" }}>Hozir Jonli</p>
                            <div className="flex flex-col gap-3 mb-5">
                                {filtered.filter(s => s.live).map(space => (
                                    <button
                                        key={space.id}
                                        onClick={() => setActiveSpace(space)}
                                        className="text-left p-4 rounded-2xl transition-all duration-200 active:scale-99 group"
                                        style={{
                                            background: "rgba(139,92,246,0.08)",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.50)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.25)"}
                                    >
                                        {/* Live badge + topic */}
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black"
                                                style={{ background: "linear-gradient(90deg,#8B5CF6,#6366F1)" }}>
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                JONLI
                                            </div>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                                                style={{ background: "rgba(139,92,246,0.15)", color: "rgba(167,139,250,0.90)" }}>
                                                {space.topic}
                                            </span>
                                            {space.verified && <BadgeCheck className="w-3.5 h-3.5 ml-auto" style={{ color: "#00CEC8" }} />}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-sm font-bold text-white leading-snug mb-2.5 group-hover:text-[#A78BFA] transition-colors duration-150">
                                            {space.title}
                                        </h3>

                                        {/* Speakers row */}
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="flex -space-x-2">
                                                {[space.hostSeed, ...space.speakerSeeds].slice(0, 4).map((seed, i) => (
                                                    <div key={i} className="w-7 h-7 rounded-full overflow-hidden border-2 bg-white"
                                                        style={{ borderColor: "rgba(8,12,32,1)" }}>
                                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>
                                                {space.host} va {space.speakers.length} so'zlovchi
                                            </span>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>
                                                <Users className="w-3 h-3" />{space.listeners.toLocaleString()} tinglovchi
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(239,68,68,0.70)" }}>
                                                <Heart className="w-3 h-3" />{space.likes}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Scheduled spaces */}
                    {filtered.filter(s => !s.live).length > 0 && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(43,62,232,0.55)" }}>Rejalashtirilgan</p>
                            <div className="flex flex-col gap-2 mb-4">
                                {filtered.filter(s => !s.live).map(space => (
                                    <div key={space.id}
                                        className="flex items-center gap-3 p-3.5 rounded-2xl"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.15)" }}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                            <Clock className="w-5 h-5" style={{ color: "#2B3EE8" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{space.title}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>
                                                {space.host} · {space.scheduled}
                                            </p>
                                        </div>
                                        <button
                                            className="px-3 py-1.5 rounded-xl text-[10px] font-bold flex-shrink-0 transition-all duration-150"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)", color: "#00CEC8" }}
                                        >
                                            Eslatma
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Create Space CTA */}
                <div className="px-5 pb-6 flex-shrink-0" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
                    <button
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold text-white transition-all duration-150 active:scale-95 mt-4"
                        style={{
                            background: "linear-gradient(135deg,#8B5CF6,#6366F1)",
                            boxShadow: "0 4px 20px rgba(139,92,246,0.40)",
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Space yaratish
                    </button>
                </div>
            </div>
        </>
    );
}
