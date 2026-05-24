"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Type, Palette, Smile, Music2, Link2, BarChart2, Send,
    ChevronLeft,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type StoryTool = "text" | "color" | "music" | "link" | "poll" | null;
type TextAlign = "left" | "center" | "right";

const BG_COLORS = [
    "linear-gradient(135deg,#2B3EE8,#00CEC8)",
    "linear-gradient(135deg,#8B5CF6,#EC4899)",
    "linear-gradient(135deg,#F59E0B,#EF4444)",
    "linear-gradient(135deg,#10B981,#3B82F6)",
    "linear-gradient(135deg,#1E1E2E,#2B3EE8)",
    "linear-gradient(135deg,#0F172A,#8B5CF6)",
    "linear-gradient(135deg,#065F46,#10B981)",
    "linear-gradient(135deg,#7C2D12,#F97316)",
];

const TEXT_COLORS = ["#FFFFFF","#F59E0B","#10B981","#EF4444","#8B5CF6","#00CEC8","#EC4899","#000000"];

const MOCK_SONGS = [
    { id: "s1", title: "Lo-fi Beats", artist: "Jasur Beats" },
    { id: "s2", title: "Toshkent Kechalari", artist: "Shahlo M" },
    { id: "s3", title: "City Groove", artist: "Nexus Beats" },
    { id: "s4", title: "Bahor Shamoli", artist: "Anvar T" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxStoryCreate
// ─────────────────────────────────────────────────────────────────────────────
export function NxStoryCreate() {
    const { storyCreateOpen, setStoryCreateOpen } = useNxPlayer();

    const [bgIndex,     setBgIndex]     = useState(0);
    const [text,        setText]        = useState("");
    const [textColor,   setTextColor]   = useState("#FFFFFF");
    const [textAlign,   setTextAlign]   = useState<TextAlign>("center");
    const [fontSize,    setFontSize]    = useState<"sm" | "md" | "lg">("md");
    const [activeTool,  setActiveTool]  = useState<StoryTool>(null);
    const [selectedSong,setSelectedSong]= useState<typeof MOCK_SONGS[0] | null>(null);
    const [linkText,    setLinkText]    = useState("");
    const [pollQ,       setPollQ]       = useState("");
    const [pollA,       setPollA]       = useState(["Bor", "Yo'q"]);
    const [published,   setPublished]   = useState(false);

    if (!storyCreateOpen) return null;

    if (published) {
        return (
            <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center"
                style={{ background: "#050818" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "rgba(16,185,129,0.18)", border: "2px solid rgba(16,185,129,0.40)" }}>
                    <Send className="w-8 h-8" style={{ color: "#10B981" }} />
                </div>
                <p className="text-base font-black text-white mb-1">Story joylandi!</p>
                <p className="text-[11px] mb-6" style={{ color: "rgba(140,160,210,0.75)" }}>
                    24 soat ko'rinadi
                </p>
                <button onClick={() => { setPublished(false); setStoryCreateOpen(false); }}
                    className="px-6 py-3 rounded-2xl text-sm font-black text-white"
                    style={{ background: "rgba(43,62,232,0.25)", border: "1px solid rgba(43,62,232,0.40)" }}>
                    Yopish
                </button>
            </div>
        );
    }

    const fontSizeClass = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" }[fontSize];

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#000" }}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2">
                <button onClick={() => setStoryCreateOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.50)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={() => setPublished(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Send className="w-4 h-4" />
                    Joylash
                </button>
            </div>

            {/* Story canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden"
                style={{ background: BG_COLORS[bgIndex] }}>

                {/* Sticker: selected song */}
                {selectedSong && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                        <Music2 className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        <div>
                            <p className="text-[10px] font-black text-white">{selectedSong.title}</p>
                            <p className="text-[9px]" style={{ color: "rgba(200,210,255,0.70)" }}>{selectedSong.artist}</p>
                        </div>
                    </div>
                )}

                {/* Poll sticker */}
                {pollQ && (
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-52 px-4 py-3 rounded-2xl"
                        style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)" }}>
                        <p className="text-[12px] font-black text-white text-center mb-2">{pollQ}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {pollA.map((a, i) => (
                                <div key={i} className="py-1.5 rounded-xl text-center text-[11px] font-bold text-white"
                                    style={{ background: i === 0 ? "rgba(43,62,232,0.60)" : "rgba(239,68,68,0.60)" }}>
                                    {a}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Link sticker */}
                {linkText && (
                    <div className="absolute top-32 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{ background: "rgba(0,0,0,0.55)" }}>
                        <Link2 className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                        <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{linkText}</span>
                    </div>
                )}

                {/* Text layer */}
                <div className={`w-full px-6 text-${textAlign}`} style={{ color: textColor }}>
                    <p className={`${fontSizeClass} font-black leading-snug drop-shadow-lg`}>
                        {text || (activeTool !== "text" ? "" : "")}
                    </p>
                </div>

                {/* Text input overlay */}
                {activeTool === "text" && (
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                        <textarea
                            autoFocus
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Matn kiriting..."
                            rows={4}
                            className={`w-full bg-transparent outline-none resize-none font-black leading-snug text-${textAlign} ${fontSizeClass} placeholder-white/30`}
                            style={{ color: textColor }}
                        />
                    </div>
                )}
            </div>

            {/* Bottom toolbar */}
            <div className="flex-shrink-0" style={{ background: "rgba(5,8,24,0.97)" }}>
                {/* Tool panels */}
                {activeTool === "color" && (
                    <div className="px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(100,120,170,0.60)" }}>
                            Fon
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                            {BG_COLORS.map((c, i) => (
                                <button key={i} onClick={() => setBgIndex(i)}
                                    className="w-10 h-10 rounded-xl flex-shrink-0 transition-all"
                                    style={{ background: c, border: bgIndex === i ? "2px solid white" : "2px solid transparent", transform: bgIndex === i ? "scale(1.12)" : "scale(1)" }} />
                            ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest mt-3 mb-2" style={{ color: "rgba(100,120,170,0.60)" }}>
                            Matn rangi
                        </p>
                        <div className="flex gap-2">
                            {TEXT_COLORS.map(c => (
                                <button key={c} onClick={() => setTextColor(c)}
                                    className="w-7 h-7 rounded-full flex-shrink-0 transition-all"
                                    style={{ background: c, border: textColor === c ? "2px solid rgba(43,62,232,0.80)" : "1px solid rgba(255,255,255,0.20)", transform: textColor === c ? "scale(1.2)" : "scale(1)" }} />
                            ))}
                        </div>
                    </div>
                )}

                {activeTool === "text" && (
                    <div className="flex gap-3 px-4 py-2">
                        {(["left", "center", "right"] as TextAlign[]).map(a => (
                            <button key={a} onClick={() => setTextAlign(a)}
                                className="flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                                style={{ background: textAlign === a ? "rgba(43,62,232,0.30)" : "rgba(43,62,232,0.10)", color: textAlign === a ? "white" : "rgba(140,160,210,0.60)" }}>
                                {a === "left" ? "Chap" : a === "center" ? "Markaz" : "O'ng"}
                            </button>
                        ))}
                        {(["sm", "md", "lg"] as const).map(s => (
                            <button key={s} onClick={() => setFontSize(s)}
                                className="flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                                style={{ background: fontSize === s ? "rgba(0,206,200,0.22)" : "rgba(43,62,232,0.10)", color: fontSize === s ? "#00CEC8" : "rgba(140,160,210,0.60)" }}>
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {activeTool === "music" && (
                    <div className="px-4 py-3 flex flex-col gap-2">
                        {MOCK_SONGS.map(s => (
                            <button key={s.id}
                                onClick={() => { setSelectedSong(prev => prev?.id === s.id ? null : s); setActiveTool(null); }}
                                className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                                style={{
                                    background: selectedSong?.id === s.id ? "rgba(0,206,200,0.18)" : "rgba(43,62,232,0.08)",
                                    border: `1px solid ${selectedSong?.id === s.id ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.15)"}`,
                                }}>
                                <Music2 className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <div className="flex-1 text-left">
                                    <p className="text-[12px] font-bold text-white">{s.title}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(120,140,190,0.70)" }}>{s.artist}</p>
                                </div>
                                {selectedSong?.id === s.id && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                        style={{ background: "rgba(0,206,200,0.20)", color: "#00CEC8" }}>
                                        Tanlangan
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {activeTool === "link" && (
                    <div className="px-4 py-3">
                        <input value={linkText} onChange={e => setLinkText(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-transparent text-sm text-white outline-none px-3 py-2.5 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }} />
                        <button onClick={() => setActiveTool(null)}
                            className="w-full mt-2 py-2 rounded-xl text-sm font-black text-white"
                            style={{ background: "rgba(43,62,232,0.25)" }}>
                            Qo'shish
                        </button>
                    </div>
                )}

                {activeTool === "poll" && (
                    <div className="px-4 py-3 flex flex-col gap-2">
                        <input value={pollQ} onChange={e => setPollQ(e.target.value)}
                            placeholder="Savol..."
                            className="w-full bg-transparent text-sm text-white outline-none px-3 py-2 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }} />
                        <div className="grid grid-cols-2 gap-2">
                            {pollA.map((a, i) => (
                                <input key={i} value={a} onChange={e => { const n = [...pollA]; n[i] = e.target.value; setPollA(n); }}
                                    className="bg-transparent text-sm text-white outline-none px-3 py-2 rounded-xl text-center"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }} />
                            ))}
                        </div>
                        <button onClick={() => setActiveTool(null)}
                            className="w-full py-2 rounded-xl text-sm font-black text-white"
                            style={{ background: "rgba(43,62,232,0.25)" }}>
                            Qo'shish
                        </button>
                    </div>
                )}

                {/* Tool buttons */}
                <div className="flex justify-around py-4 px-4">
                    {[
                        { id: "text"  as StoryTool, Icon: Type,     label: "Matn"    },
                        { id: "color" as StoryTool, Icon: Palette,   label: "Rang"    },
                        { id: "music" as StoryTool, Icon: Music2,    label: "Musiqa"  },
                        { id: "link"  as StoryTool, Icon: Link2,     label: "Havola"  },
                        { id: "poll"  as StoryTool, Icon: BarChart2, label: "So'rov"  },
                    ].map(({ id, Icon, label }) => (
                        <button key={label}
                            onClick={() => setActiveTool(prev => prev === id ? null : id)}
                            className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
                                style={{
                                    background: activeTool === id ? "rgba(43,62,232,0.40)" : "rgba(43,62,232,0.12)",
                                    border: `1px solid ${activeTool === id ? "rgba(43,62,232,0.70)" : "rgba(43,62,232,0.22)"}`,
                                    transform: activeTool === id ? "scale(1.08)" : "scale(1)",
                                }}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: "rgba(140,160,210,0.70)" }}>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
