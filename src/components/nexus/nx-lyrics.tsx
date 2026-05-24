"use client";

import { useState, useEffect, useRef } from "react";
import { X, Music2, AlignLeft } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock lyrics (timed)
// ─────────────────────────────────────────────────────────────────────────────
interface LyricLine {
    sec: number;
    text: string;
}

const MOCK_LYRICS: LyricLine[] = [
    { sec: 0,   text: "..." },
    { sec: 4,   text: "Seni ko'rsam ko'zlarim yorishadi" },
    { sec: 8,   text: "Yuragim quvonchdan to'lib-toshadi" },
    { sec: 12,  text: "Sening bilan dunyo boshqacha ko'rinadi" },
    { sec: 16,  text: "Har lahzam mazmunli, har kunim qimmatli" },
    { sec: 20,  text: "..." },
    { sec: 24,  text: "Kel yoningda bo'lay har doim" },
    { sec: 28,  text: "Baxtimizni birgalikda quraylik" },
    { sec: 32,  text: "Qo'ling tutib yo'l olaylik uzun" },
    { sec: 36,  text: "Sevgi yoqsin qalbimizda har kun" },
    { sec: 40,  text: "..." },
    { sec: 44,  text: "Sen mening hayotimning ma'nosi" },
    { sec: 48,  text: "Qalbimning yagona qo'shig'i" },
    { sec: 52,  text: "Sensiz dunyo bo'sh ko'rinadi" },
    { sec: 56,  text: "Sening sevging bilan yashayman men" },
    { sec: 60,  text: "..." },
    { sec: 64,  text: "Kel yoningda bo'lay har doim" },
    { sec: 68,  text: "Baxtimizni birgalikda quraylik" },
    { sec: 72,  text: "Qo'ling tutib yo'l olaylik uzun" },
    { sec: 76,  text: "Sevgi yoqsin qalbimizda har kun" },
    { sec: 80,  text: "..." },
    { sec: 84,  text: "Seni sevaman, seni sevaman" },
    { sec: 88,  text: "Bu so'zlar mening qalbimdan" },
    { sec: 92,  text: "Hech qachon unutmayman seni" },
    { sec: 96,  text: "Abadiy senikiman men" },
    { sec: 100, text: "..." },
];

function getCurrentLineIdx(progressPct: number, durationSec: number): number {
    const currentSec = (progressPct / 100) * durationSec;
    let idx = 0;
    for (let i = 0; i < MOCK_LYRICS.length; i++) {
        if (MOCK_LYRICS[i].sec <= currentSec) idx = i;
        else break;
    }
    return idx;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxLyrics — full-screen lyrics panel for music player
// ─────────────────────────────────────────────────────────────────────────────
export function NxLyrics() {
    const { lyricsOpen, setLyricsOpen, track, progress } = useNxPlayer();
    const scrollRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

    const durationSec = track?.durationSec ?? 120;
    const activeIdx = getCurrentLineIdx(progress, durationSec);

    // Auto-scroll to active line
    useEffect(() => {
        const el = lineRefs.current[activeIdx];
        if (el && scrollRef.current) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [activeIdx]);

    if (!lyricsOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[62]"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }}
                onClick={() => setLyricsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[62] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:h-[70vh] md:rounded-3xl"
                style={{
                    background: "rgba(6,10,26,0.98)",
                    border: "1px solid rgba(43,62,232,0.25)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
                    maxHeight: "88vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
                            <AlignLeft className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white">So'zlar</h2>
                            {track && (
                                <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                    {track.title} · {track.artist}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setLyricsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Track cover strip */}
                {track && (
                    <div className="px-5 pb-4 flex items-center gap-3 flex-shrink-0">
                        <img src={track.image} alt={track.title}
                            className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                            <p className="text-xs font-bold text-white">{track.title}</p>
                            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{track.artist}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1"
                            style={{ color: "#10B981" }}>
                            <Music2 className="w-3 h-3" />
                            <span className="text-[9px] font-bold">Ijro etilmoqda</span>
                        </div>
                    </div>
                )}

                {/* Gradient top fade */}
                <div className="flex-shrink-0 h-6 -mb-6 relative z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, rgba(6,10,26,0.98), transparent)" }} />

                {/* Lyrics scroll area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-5 pb-16"
                    style={{ scrollbarWidth: "none" }}
                >
                    <div className="flex flex-col gap-4 pt-4">
                        {!track ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Music2 className="w-12 h-12" style={{ color: "rgba(43,62,232,0.30)" }} />
                                <p className="text-sm text-center" style={{ color: "rgba(80,100,150,0.60)" }}>
                                    Musiqa ijro etilganda so'zlar ko'rinadi
                                </p>
                            </div>
                        ) : (
                            MOCK_LYRICS.map((line, i) => {
                                const isActive = i === activeIdx;
                                const isPast = i < activeIdx;
                                return (
                                    <p
                                        key={i}
                                        ref={el => { lineRefs.current[i] = el; }}
                                        className="text-lg font-black leading-snug transition-all duration-500 cursor-pointer"
                                        style={{
                                            color: isActive
                                                ? "white"
                                                : isPast
                                                    ? "rgba(255,255,255,0.30)"
                                                    : "rgba(255,255,255,0.18)",
                                            transform: isActive ? "scale(1.03)" : "scale(1)",
                                            transformOrigin: "left center",
                                            textShadow: isActive ? "0 0 24px rgba(43,62,232,0.50)" : "none",
                                        }}
                                    >
                                        {line.text}
                                    </p>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Gradient bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(6,10,26,0.98), transparent)" }} />
            </div>
        </>
    );
}
