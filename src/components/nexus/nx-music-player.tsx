"use client";

import { useNxPlayer } from "./nx-player-ctx";
import {
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
    Heart, ChevronDown, Shuffle, Repeat, ListMusic, X,
} from "lucide-react";
import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Asosiy komponent — track bo'lsa ko'rsatadi
// ─────────────────────────────────────────────────────────────────────────────
export function NxMusicPlayer() {
    const { track, musicExpanded } = useNxPlayer();
    if (!track) return null;
    return musicExpanded ? <ExpandedPlayer /> : <MiniPlayer />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-player — dock ustida suzib turadi
// ─────────────────────────────────────────────────────────────────────────────
function MiniPlayer() {
    const { track, isPlaying, progress, togglePlay, setMusicExpanded } = useNxPlayer();
    if (!track) return null;

    return (
        <div
            className="fixed left-1/2 z-40 flex items-center gap-3 px-3 py-2 rounded-2xl"
            style={{
                bottom: "90px",
                transform: "translateX(-50%)",
                maxWidth: "calc(100vw - 32px)",
                width: "360px",
                background: "rgba(8,12,36,0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(43,62,232,0.30)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.50), 0 0 0 1px rgba(43,62,232,0.10)",
            }}
        >
            {/* Progress xat — tepada */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
                <div
                    className="h-full transition-all duration-1000"
                    style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                    }}
                />
            </div>

            {/* Albom rasmi */}
            <img
                src={track.image}
                alt={track.title}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                onClick={() => setMusicExpanded(true)}
                style={{ border: "1px solid rgba(43,62,232,0.25)" }}
            />

            {/* Sarlavha */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setMusicExpanded(true)}>
                <p className="text-xs font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] truncate" style={{ color: "rgba(100,120,170,0.80)" }}>{track.artist}</p>
            </div>

            {/* Tugmalar */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <IconBtn onClick={togglePlay}>
                    {isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-white" />
                        : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                </IconBtn>
                <IconBtn onClick={() => setMusicExpanded(true)}>
                    <ChevronDown className="w-4 h-4" style={{ color: "rgba(100,120,170,0.80)" }} />
                </IconBtn>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kengaytirilgan player — to'liq ekran
// ─────────────────────────────────────────────────────────────────────────────
function ExpandedPlayer() {
    const {
        track, isPlaying, progress, volume,
        togglePlay, seek, setVol, setMusicExpanded,
    } = useNxPlayer();
    const [liked,    setLiked]    = useState(false);
    const [shuffled, setShuffled] = useState(false);
    const [repeated, setRepeated] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);

    if (!track) return null;

    /* Progressni hisoblash */
    const formatTime = (pct: number) => {
        const total = track.durationSec;
        const cur   = Math.floor(total * pct / 100);
        const m     = Math.floor(cur / 60);
        const s     = cur % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        seek(((e.clientX - rect.left) / rect.width) * 100);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 pt-12 pb-8"
            style={{ background: "rgba(5,8,24,0.98)", backdropFilter: "blur(40px)" }}
        >
            {/* ── Pastga yopish ── */}
            <div className="w-full flex items-center justify-between mb-6">
                <button onClick={() => setMusicExpanded(false)}>
                    <ChevronDown className="w-6 h-6" style={{ color: "rgba(160,176,224,0.70)" }} />
                </button>
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>Endi ijro etilmoqda</p>
                </div>
                <button>
                    <ListMusic className="w-5 h-5" style={{ color: "rgba(160,176,224,0.70)" }} />
                </button>
            </div>

            {/* ── Albom rasmi — katta ── */}
            <div
                className="w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden flex-shrink-0"
                style={{
                    border: "2px solid rgba(43,62,232,0.25)",
                    boxShadow: isPlaying
                        ? "0 0 60px rgba(43,62,232,0.35), 0 0 120px rgba(0,206,200,0.15)"
                        : "0 16px 48px rgba(0,0,0,0.60)",
                    transform: isPlaying ? "scale(1.04)" : "scale(1.00)",
                    transition: "transform 0.4s ease, box-shadow 0.4s ease",
                }}
            >
                <img src={track.image} alt={track.title} className="w-full h-full object-cover" />
            </div>

            {/* ── Sarlavha + like ── */}
            <div className="w-full flex items-center justify-between mt-8">
                <div className="min-w-0 flex-1 mr-4">
                    <h2 className="text-xl font-black text-white truncate">{track.title}</h2>
                    <p className="text-sm mt-1 truncate" style={{ color: "rgba(100,120,170,0.85)" }}>{track.artist}</p>
                </div>
                <button
                    onClick={() => setLiked(p => !p)}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
                    style={{ background: liked ? "rgba(239,68,68,0.15)" : "rgba(43,62,232,0.10)" }}
                >
                    <Heart
                        className="w-5 h-5 transition-all duration-200"
                        style={{
                            color: liked ? "#EF4444" : "rgba(160,176,224,0.70)",
                            fill: liked ? "#EF4444" : "none",
                        }}
                    />
                </button>
            </div>

            {/* ── Progress ── */}
            <div className="w-full mt-6">
                <div
                    ref={progressRef}
                    className="relative h-1.5 rounded-full cursor-pointer group"
                    style={{ background: "rgba(43,62,232,0.20)" }}
                    onClick={handleSeek}
                >
                    <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                        }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${progress}% - 8px)`, boxShadow: "0 0 8px rgba(43,62,232,0.60)" }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{formatTime(progress)}</span>
                    <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{track.duration}</span>
                </div>
            </div>

            {/* ── Nazorat tugmalari ── */}
            <div className="w-full flex items-center justify-between mt-4">
                <button onClick={() => setShuffled(p => !p)}>
                    <Shuffle className="w-5 h-5 transition-colors duration-200"
                        style={{ color: shuffled ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />
                </button>

                <button className="w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}>
                    <SkipBack className="w-5 h-5 fill-white text-white" />
                </button>

                <button
                    onClick={togglePlay}
                    className="w-16 h-16 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                    style={{
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 0 32px rgba(43,62,232,0.50), 0 0 64px rgba(0,206,200,0.20)",
                    }}
                >
                    {isPlaying
                        ? <Pause className="w-7 h-7 text-white fill-white" />
                        : <Play  className="w-7 h-7 text-white fill-white ml-1" />}
                </button>

                <button className="w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}>
                    <SkipForward className="w-5 h-5 fill-white text-white" />
                </button>

                <button onClick={() => setRepeated(p => !p)}>
                    <Repeat className="w-5 h-5 transition-colors duration-200"
                        style={{ color: repeated ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />
                </button>
            </div>

            {/* ── Volume ── */}
            <div className="w-full flex items-center gap-3 mt-4">
                <button onClick={() => setVol(volume === 0 ? 80 : 0)}>
                    {volume === 0
                        ? <VolumeX className="w-4 h-4" style={{ color: "rgba(100,120,170,0.60)" }} />
                        : <Volume2 className="w-4 h-4" style={{ color: "rgba(100,120,170,0.60)" }} />}
                </button>
                <div
                    className="flex-1 h-1.5 rounded-full cursor-pointer"
                    style={{ background: "rgba(43,62,232,0.20)" }}
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setVol(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                    }}
                >
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${volume}%`,
                            background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                        }}
                    />
                </div>
                <span className="text-[10px] w-7 text-right" style={{ color: "rgba(100,120,170,0.60)" }}>
                    {volume}%
                </span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchi
// ─────────────────────────────────────────────────────────────────────────────
function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
            style={{ background: "rgba(43,62,232,0.10)" }}
        >
            {children}
        </button>
    );
}
