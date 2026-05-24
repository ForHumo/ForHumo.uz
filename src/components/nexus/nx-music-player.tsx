"use client";

import React, { useState, useRef, useCallback } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
    Heart, ChevronDown, Shuffle, Repeat, ListMusic, X, Music2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
export function NxMusicPlayer() {
    const { track, musicExpanded } = useNxPlayer();
    if (!track) return null;
    return musicExpanded ? <ExpandedPlayer /> : <MiniPlayer />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-player
// ─────────────────────────────────────────────────────────────────────────────
function MiniPlayer() {
    const {
        track, isPlaying, progress,
        togglePlay, setMusicExpanded, nextTrack, prevTrack,
    } = useNxPlayer();
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
            {/* Progress xat */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
                <div className="h-full transition-all duration-1000"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
            </div>

            <img
                src={track.image} alt={track.title}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                onClick={() => setMusicExpanded(true)}
                style={{ border: "1px solid rgba(43,62,232,0.25)" }}
            />

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setMusicExpanded(true)}>
                <p className="text-xs font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] truncate" style={{ color: "rgba(100,120,170,0.80)" }}>{track.artist}</p>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
                <IconBtn onClick={prevTrack}>
                    <SkipBack className="w-3.5 h-3.5 text-white fill-white" />
                </IconBtn>
                <IconBtn onClick={togglePlay}>
                    {isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-white" />
                        : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                </IconBtn>
                <IconBtn onClick={nextTrack}>
                    <SkipForward className="w-3.5 h-3.5 text-white fill-white" />
                </IconBtn>
                <IconBtn onClick={() => setMusicExpanded(true)}>
                    <ChevronDown className="w-4 h-4" style={{ color: "rgba(100,120,170,0.80)" }} />
                </IconBtn>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kengaytirilgan player
// ─────────────────────────────────────────────────────────────────────────────
function ExpandedPlayer() {
    const {
        track, isPlaying, progress, volume, queue, queueIndex,
        shuffle, repeat,
        togglePlay, seek, setVol, setMusicExpanded,
        nextTrack, prevTrack, toggleShuffle, toggleRepeat,
        playQueue,
    } = useNxPlayer();

    const [liked,     setLiked]     = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);

    if (!track) return null;

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
            className="fixed inset-0 z-50 flex"
            style={{ background: "rgba(5,8,24,0.98)", backdropFilter: "blur(40px)" }}
        >
            {/* ── Asosiy panel ────────────────────────────────────────── */}
            <div className="flex flex-col items-center justify-between flex-1 px-6 pt-12 pb-8">
                {/* Tepada — yopish + navbat */}
                <div className="w-full flex items-center justify-between mb-6">
                    <button onClick={() => setMusicExpanded(false)}>
                        <ChevronDown className="w-6 h-6" style={{ color: "rgba(160,176,224,0.70)" }} />
                    </button>
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>
                            Endi ijro etilmoqda
                        </p>
                        {queue.length > 1 && (
                            <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,120,170,0.60)" }}>
                                {queueIndex + 1} / {queue.length}
                            </p>
                        )}
                    </div>
                    <button onClick={() => setShowQueue(p => !p)}>
                        <ListMusic className="w-5 h-5 transition-colors duration-200"
                            style={{ color: showQueue ? "#00CEC8" : "rgba(160,176,224,0.70)" }} />
                    </button>
                </div>

                {/* Albom rasmi */}
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

                {/* Sarlavha + like */}
                <div className="w-full flex items-center justify-between mt-8">
                    <div className="min-w-0 flex-1 mr-4">
                        <h2 className="text-xl font-black text-white truncate">{track.title}</h2>
                        <p className="text-sm mt-1 truncate" style={{ color: "rgba(100,120,170,0.85)" }}>{track.artist}</p>
                    </div>
                    <HeartBtn liked={liked} onToggle={() => setLiked(p => !p)} />
                </div>

                {/* Progress */}
                <div className="w-full mt-6">
                    <div
                        ref={progressRef}
                        className="relative h-1.5 rounded-full cursor-pointer group"
                        style={{ background: "rgba(43,62,232,0.20)" }}
                        onClick={handleSeek}
                    >
                        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `calc(${progress}% - 8px)`, boxShadow: "0 0 8px rgba(43,62,232,0.60)" }} />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{formatTime(progress)}</span>
                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{track.duration}</span>
                    </div>
                </div>

                {/* Nazorat */}
                <div className="w-full flex items-center justify-between mt-4">
                    <button onClick={toggleShuffle}>
                        <Shuffle className="w-5 h-5 transition-colors duration-200"
                            style={{ color: shuffle ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />
                    </button>

                    <SkipBtn onClick={prevTrack} direction="back" />
                    <PlayPauseBtn isPlaying={isPlaying} onToggle={togglePlay} />
                    <SkipBtn onClick={nextTrack} direction="forward" />

                    <button onClick={toggleRepeat}>
                        <Repeat className="w-5 h-5 transition-colors duration-200"
                            style={{ color: repeat ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />
                    </button>
                </div>

                {/* Volume */}
                <div className="w-full flex items-center gap-3 mt-4">
                    <button onClick={() => setVol(volume === 0 ? 80 : 0)}>
                        {volume === 0
                            ? <VolumeX className="w-4 h-4" style={{ color: "rgba(100,120,170,0.60)" }} />
                            : <Volume2 className="w-4 h-4" style={{ color: "rgba(100,120,170,0.60)" }} />}
                    </button>
                    <div className="flex-1 h-1.5 rounded-full cursor-pointer"
                        style={{ background: "rgba(43,62,232,0.20)" }}
                        onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setVol(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                        }}
                    >
                        <div className="h-full rounded-full"
                            style={{ width: `${volume}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                    </div>
                    <span className="text-[10px] w-7 text-right" style={{ color: "rgba(100,120,170,0.60)" }}>{volume}%</span>
                </div>
            </div>

            {/* ── Navbat paneli ───────────────────────────────────────── */}
            {showQueue && queue.length > 0 && (
                <div
                    className="flex flex-col w-72 border-l overflow-hidden"
                    style={{
                        background: "rgba(8,12,32,0.98)",
                        borderColor: "rgba(43,62,232,0.18)",
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.60)" }}>
                            Navbat — {queue.length} ta
                        </p>
                        <button onClick={() => setShowQueue(false)}>
                            <X className="w-4 h-4" style={{ color: "rgba(100,120,170,0.60)" }} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {queue.map((t, i) => (
                            <button
                                key={i}
                                onClick={() => playQueue(queue, i)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150"
                                style={{
                                    background: i === queueIndex ? "rgba(43,62,232,0.12)" : "transparent",
                                    borderBottom: "1px solid rgba(43,62,232,0.07)",
                                }}
                                onMouseEnter={e => { if (i !== queueIndex) (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.06)"; }}
                                onMouseLeave={e => { if (i !== queueIndex) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 relative"
                                    style={{ border: "1px solid rgba(43,62,232,0.20)" }}>
                                    <img src={t.image} alt={t.title} className="w-full h-full object-cover" />
                                    {i === queueIndex && (
                                        <div className="absolute inset-0 flex items-center justify-center"
                                            style={{ background: "rgba(43,62,232,0.60)" }}>
                                            <Music2 className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate"
                                        style={{ color: i === queueIndex ? "#00CEC8" : "rgba(200,210,235,0.90)" }}>
                                        {t.title}
                                    </p>
                                    <p className="text-[9px] truncate" style={{ color: "rgba(80,100,150,0.80)" }}>
                                        {t.artist} · {t.duration}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-player icon button — spring press + ripple
// ─────────────────────────────────────────────────────────────────────────────
function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top  = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button
            onClick={handleClick}
            className="nx-ripple-wrap nx-press w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(43,62,232,0.10)" }}
        >
            {children}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Heart/like button in expanded player
// ─────────────────────────────────────────────────────────────────────────────
function HeartBtn({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
    const heartRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback(() => {
        if (heartRef.current) {
            heartRef.current.classList.remove("nx-heart-pop");
            void (heartRef.current as unknown as HTMLElement).offsetWidth;
            heartRef.current.classList.add("nx-heart-pop");
        }
        onToggle();
    }, [onToggle]);

    return (
        <button
            onClick={handleClick}
            className="nx-press w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200"
            style={{ background: liked ? "rgba(239,68,68,0.15)" : "rgba(43,62,232,0.10)" }}
        >
            <Heart
                ref={heartRef as React.Ref<SVGSVGElement>}
                className="w-5 h-5"
                style={{ color: liked ? "#EF4444" : "rgba(160,176,224,0.70)", fill: liked ? "#EF4444" : "none" }}
            />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Play / Pause button — large, gradient, spring pop
// ─────────────────────────────────────────────────────────────────────────────
function PlayPauseBtn({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) {
    const iconRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback(() => {
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        onToggle();
    }, [onToggle]);

    return (
        <button
            onClick={handleClick}
            className="nx-press w-16 h-16 flex items-center justify-center rounded-full"
            style={{
                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                boxShadow: "0 0 32px rgba(43,62,232,0.50), 0 0 64px rgba(0,206,200,0.20)",
            }}
        >
            {isPlaying
                ? <Pause ref={iconRef as React.Ref<SVGSVGElement>} className="w-7 h-7 text-white fill-white" />
                : <Play  ref={iconRef as React.Ref<SVGSVGElement>} className="w-7 h-7 text-white fill-white ml-1" />}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip forward / back buttons
// ─────────────────────────────────────────────────────────────────────────────
function SkipBtn({ onClick, direction }: { onClick: () => void; direction: "back" | "forward" }) {
    const iconRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback(() => {
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        onClick();
    }, [onClick]);

    return (
        <button
            onClick={handleClick}
            className="nx-press w-12 h-12 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}
        >
            {direction === "back"
                ? <SkipBack    ref={iconRef as React.Ref<SVGSVGElement>} className="w-5 h-5 fill-white text-white" />
                : <SkipForward ref={iconRef as React.Ref<SVGSVGElement>} className="w-5 h-5 fill-white text-white" />}
        </button>
    );
}
