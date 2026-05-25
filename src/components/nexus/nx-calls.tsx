"use client";

import { useState, useEffect } from "react";
import {
    X, Phone, Video, PhoneCall, PhoneOff, Mic, MicOff,
    Camera, CameraOff, Volume2, VolumeX, UserPlus,
    Clock, Search, BadgeCheck,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const RECENT_CALLS = [
    { name: "Islomjon Karimov", seed: "islom",   type: "video",  dir: "in",   time: "Bugun, 14:32",  missed: false },
    { name: "Madina Ergash",    seed: "madina",  type: "audio",  dir: "out",  time: "Bugun, 11:05",  missed: false },
    { name: "Sardor Toshev",    seed: "sardor",  type: "video",  dir: "in",   time: "Kecha, 20:14",  missed: true  },
    { name: "Kamola Yusupova",  seed: "kamola",  type: "audio",  dir: "in",   time: "Kecha, 16:00",  missed: true  },
    { name: "Bobur Alimov",     seed: "bobur",   type: "video",  dir: "out",  time: "2 kun oldin",   missed: false },
    { name: "Dilnoza Saidova",  seed: "dilnoza", type: "audio",  dir: "in",   time: "3 kun oldin",   missed: false },
    { name: "Jasur Nazarov",    seed: "jasur",   type: "video",  dir: "out",  time: "4 kun oldin",   missed: false },
];

const CONTACTS = [
    { name: "Islomjon Karimov", seed: "islom",   online: true  },
    { name: "Madina Ergash",    seed: "madina",  online: true  },
    { name: "Sardor Toshev",    seed: "sardor",  online: false },
    { name: "Kamola Yusupova",  seed: "kamola",  online: true  },
    { name: "Bobur Alimov",     seed: "bobur",   online: false },
    { name: "Dilnoza Saidova",  seed: "dilnoza", online: false },
    { name: "Jasur Nazarov",    seed: "jasur",   online: true  },
    { name: "Zulfiya Rahimova", seed: "zulfiya", online: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Faol qo'ng'iroq oynasi
// ─────────────────────────────────────────────────────────────────────────────
function ActiveCall({ caller, type, onEnd }: {
    caller: { name: string; seed: string };
    type: "audio" | "video";
    onEnd: () => void;
}) {
    const [muted,   setMuted]   = useState(false);
    const [camOff,  setCamOff]  = useState(false);
    const [speaker, setSpeaker] = useState(true);
    const [duration, setDuration] = useState(0);

    // Simple timer
    useEffect(() => {
        const id = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-between"
            style={{ background: "rgba(5,8,24,0.97)" }}
        >
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
                    style={{ background: "radial-gradient(circle,rgba(43,62,232,0.25) 0%,transparent 70%)" }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
                    style={{ background: "radial-gradient(circle,rgba(0,206,200,0.15) 0%,transparent 70%)" }} />
            </div>

            {/* Top — caller info */}
            <div className="relative flex flex-col items-center pt-20">
                <div className="relative mb-6">
                    <div
                        className="w-28 h-28 rounded-3xl overflow-hidden"
                        style={{
                            border: "3px solid rgba(43,62,232,0.50)",
                            boxShadow: "0 0 40px rgba(43,62,232,0.40), 0 0 80px rgba(0,206,200,0.20)",
                        }}
                    >
                        <img
                            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${caller.seed}`}
                            alt={caller.name}
                            className="w-full h-full object-cover bg-white"
                        />
                    </div>
                    {/* Pulse rings */}
                    <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
                        style={{ border: "2px solid #2B3EE8", animationDuration: "2s" }} />
                    <div className="absolute -inset-3 rounded-3xl animate-ping opacity-10"
                        style={{ border: "2px solid #00CEC8", animationDuration: "2.5s", animationDelay: "0.5s" }} />
                </div>

                <h2 className="text-2xl font-black text-white mb-1">{caller.name}</h2>
                <p className="text-sm mb-2" style={{ color: "rgba(0,206,200,0.80)" }}>
                    {type === "video" ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}
                </p>
                <p className="text-lg font-mono font-bold" style={{ color: "rgba(140,160,210,0.90)" }}>
                    {fmt(duration)}
                </p>
            </div>

            {/* Video placeholder if video call */}
            {type === "video" && !camOff && (
                <div
                    className="relative w-28 h-40 rounded-2xl overflow-hidden self-end mr-6 mb-4"
                    style={{ border: "2px solid rgba(43,62,232,0.40)" }}
                >
                    <img
                        src="https://api.dicebear.com/9.x/avataaars/svg?seed=self"
                        alt="Men"
                        className="w-full h-full object-cover bg-white"
                    />
                    <p className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-bold"
                        style={{ color: "rgba(160,180,220,0.80)" }}>Sen</p>
                </div>
            )}

            {/* Bottom — controls */}
            <div className="relative w-full px-8 pb-16">
                <div className="flex items-center justify-center gap-5 mb-8">
                    {/* Mute */}
                    <button
                        onClick={() => setMuted(m => !m)}
                        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                        style={muted ? {
                            background: "rgba(239,68,68,0.20)",
                            border: "2px solid rgba(239,68,68,0.50)",
                        } : {
                            background: "rgba(43,62,232,0.15)",
                            border: "2px solid rgba(43,62,232,0.30)",
                        }}
                    >
                        {muted
                            ? <MicOff className="w-6 h-6" style={{ color: "#EF4444" }} />
                            : <Mic className="w-6 h-6" style={{ color: "rgba(140,160,220,0.90)" }} />
                        }
                    </button>

                    {/* End call */}
                    <button
                        onClick={onEnd}
                        className="w-18 h-18 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                        style={{
                            width: "72px", height: "72px",
                            background: "linear-gradient(135deg,#EF4444,#DC2626)",
                            boxShadow: "0 4px 20px rgba(239,68,68,0.50)",
                        }}
                    >
                        <PhoneOff className="w-7 h-7 text-white" />
                    </button>

                    {/* Camera or Speaker */}
                    {type === "video" ? (
                        <button
                            onClick={() => setCamOff(c => !c)}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={camOff ? {
                                background: "rgba(239,68,68,0.20)",
                                border: "2px solid rgba(239,68,68,0.50)",
                            } : {
                                background: "rgba(43,62,232,0.15)",
                                border: "2px solid rgba(43,62,232,0.30)",
                            }}
                        >
                            {camOff
                                ? <CameraOff className="w-6 h-6" style={{ color: "#EF4444" }} />
                                : <Camera className="w-6 h-6" style={{ color: "rgba(140,160,220,0.90)" }} />
                            }
                        </button>
                    ) : (
                        <button
                            onClick={() => setSpeaker(s => !s)}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={{
                                background: speaker ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.15)",
                                border: `2px solid ${speaker ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.30)"}`,
                            }}
                        >
                            {speaker
                                ? <Volume2 className="w-6 h-6" style={{ color: "#00CEC8" }} />
                                : <VolumeX className="w-6 h-6" style={{ color: "rgba(140,160,220,0.90)" }} />
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxCalls — asosiy panel
// ─────────────────────────────────────────────────────────────────────────────
export function NxCalls() {
    const { callsOpen, setCallsOpen } = useNxPlayer();
    const [tab,     setTab]     = useState<"recent" | "contacts">("recent");
    const [search,  setSearch]  = useState("");
    const [active,  setActive]  = useState<{ caller: { name: string; seed: string }; type: "audio" | "video" } | null>(null);

    if (!callsOpen) return null;

    const filteredContacts = CONTACTS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (active) {
        return <ActiveCall caller={active.caller} type={active.type} onEnd={() => setActive(null)} />;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setCallsOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[86vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "88vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white">Qo'ng'iroqlar</h2>
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>
                            Ovozli va video qo'ng'iroqlar
                        </p>
                    </div>
                    <button
                        onClick={() => setCallsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {(["recent", "contacts"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.20)",
                                color: "rgba(140,160,210,0.85)",
                            }}
                        >
                            {t === "recent" ? <><Clock className="w-3 h-3" /> So'ngi</> : <><UserPlus className="w-3 h-3" /> Kontaktlar</>}
                        </button>
                    ))}
                </div>

                {/* Search (contacts tab) */}
                {tab === "contacts" && (
                    <div className="px-5 pb-3 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                                style={{ color: "rgba(43,62,232,0.50)" }} />
                            <input
                                type="text"
                                placeholder="Kontakt qidirish..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-white outline-none"
                                style={{
                                    background: "rgba(5,8,24,0.60)",
                                    border: "1px solid rgba(43,62,232,0.22)",
                                    caretColor: "#00CEC8",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {tab === "recent" && (
                        <div className="flex flex-col gap-1">
                            {RECENT_CALLS.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl group"
                                    style={{ border: "1px solid transparent" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.20)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "transparent"}
                                >
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 bg-white">
                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.seed}`} alt={c.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {c.type === "video"
                                                ? <Video className="w-3 h-3 flex-shrink-0" style={{ color: c.missed ? "#EF4444" : "rgba(0,206,200,0.70)" }} />
                                                : <Phone className="w-3 h-3 flex-shrink-0" style={{ color: c.missed ? "#EF4444" : "rgba(0,206,200,0.70)" }} />
                                            }
                                            <span className="text-[10px]" style={{ color: c.missed ? "rgba(239,68,68,0.80)" : "rgba(80,100,150,0.80)" }}>
                                                {c.missed ? "O'tkazib yuborilgan" : c.dir === "in" ? "Kiruvchi" : "Chiquvchi"} · {c.time}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setActive({ caller: { name: c.name, seed: c.seed }, type: "audio" })}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        >
                                            <Phone className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        </button>
                                        <button
                                            onClick={() => setActive({ caller: { name: c.name, seed: c.seed }, type: "video" })}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        >
                                            <Video className="w-4 h-4" style={{ color: "#2B3EE8" }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === "contacts" && (
                        <div className="flex flex-col gap-1">
                            {filteredContacts.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl group"
                                    style={{ border: "1px solid transparent" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.20)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "transparent"}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white">
                                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.seed}`} alt={c.name} className="w-full h-full object-cover" />
                                        </div>
                                        {c.online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                                style={{ background: "#10B981", borderColor: "#050818" }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: c.online ? "rgba(16,185,129,0.80)" : "rgba(80,100,150,0.70)" }}>
                                            {c.online ? "Onlayn" : "Oflayn"}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setActive({ caller: { name: c.name, seed: c.seed }, type: "audio" })}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        >
                                            <Phone className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        </button>
                                        <button
                                            onClick={() => setActive({ caller: { name: c.name, seed: c.seed }, type: "video" })}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        >
                                            <Video className="w-4 h-4" style={{ color: "#2B3EE8" }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredContacts.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-sm" style={{ color: "rgba(80,100,150,0.70)" }}>Kontakt topilmadi</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick call bottom */}
                <div className="px-5 pb-6 flex-shrink-0 flex gap-3"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                    <button
                        onClick={() => setActive({ caller: { name: "Yangi qo'ng'iroq", seed: "new" }, type: "audio" })}
                        className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-150 active:scale-95 mt-4"
                        style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}
                    >
                        <PhoneCall className="w-4 h-4" style={{ color: "#10B981" }} />
                        <span style={{ color: "#10B981" }}>Ovozli</span>
                    </button>
                    <button
                        onClick={() => setActive({ caller: { name: "Video qo'ng'iroq", seed: "vid" }, type: "video" })}
                        className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-150 active:scale-95 mt-4"
                        style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.35)" }}
                    >
                        <Video className="w-4 h-4" style={{ color: "#2B3EE8" }} />
                        <span style={{ color: "#00CEC8" }}>Video</span>
                    </button>
                </div>
            </div>
        </>
    );
}
