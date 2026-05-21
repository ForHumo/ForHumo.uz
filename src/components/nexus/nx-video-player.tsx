"use client";

import { useState, useEffect, useRef } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Play, Pause, Volume2, VolumeX, Maximize2,
    ThumbsUp, ThumbsDown, Share2, Bookmark, Eye,
    ChevronRight, Settings,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxVideoPlayer — to'liq ekran video modal
// ─────────────────────────────────────────────────────────────────────────────
export function NxVideoPlayer() {
    const { video, videoOpen, closeVideo } = useNxPlayer();

    const [playing,   setPlaying]   = useState(false);
    const [progress,  setProgress]  = useState(0);
    const [volume,    setVolume]    = useState(80);
    const [muted,     setMuted]     = useState(false);
    const [quality,   setQuality]   = useState("1080p");
    const [showQMenu, setShowQMenu] = useState(false);
    const [liked,     setLiked]     = useState<"up"|"down"|null>(null);
    const [saved,     setSaved]     = useState(false);
    const [showCtrl,  setShowCtrl]  = useState(true);

    const timer      = useRef<ReturnType<typeof setInterval> | null>(null);
    const hideTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);

    /* Ochilganda reset */
    useEffect(() => {
        if (videoOpen) { setPlaying(false); setProgress(0); setShowCtrl(true); }
    }, [videoOpen]);

    /* Progress sim */
    useEffect(() => {
        if (playing) {
            timer.current = setInterval(() => {
                setProgress(p => p >= 100 ? (setPlaying(false), 0) : p + 100 / 600);
            }, 1000);
        } else {
            if (timer.current) clearInterval(timer.current);
        }
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [playing]);

    /* Nazorat avtoyashirish */
    const resetHide = () => {
        setShowCtrl(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => { if (playing) setShowCtrl(false); }, 3000);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        setProgress(((e.clientX - r.left) / r.width) * 100);
    };

    const formatTime = (pct: number, total = 600) => {
        const s = Math.floor(total * pct / 100);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };

    if (!video) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 transition-opacity duration-300"
                style={{
                    background: "rgba(5,8,24,0.90)",
                    backdropFilter: "blur(8px)",
                    opacity: videoOpen ? 1 : 0,
                    pointerEvents: videoOpen ? "auto" : "none",
                }}
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex flex-col md:flex-row overflow-hidden transition-all duration-300"
                style={{
                    opacity: videoOpen ? 1 : 0,
                    pointerEvents: videoOpen ? "auto" : "none",
                    transform: videoOpen ? "scale(1)" : "scale(0.97)",
                }}
            >
                {/* ── Video tomoshabin ────────────────────────────── */}
                <div
                    className="relative flex-1 bg-black flex items-center justify-center"
                    onMouseMove={resetHide}
                    onClick={() => { setPlaying(p => !p); resetHide(); }}
                >
                    {/* Thumbnail (fake video) */}
                    <img
                        src={video.image}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        style={{ filter: playing ? "none" : "brightness(0.55)" }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0" style={{
                        background: "linear-gradient(to top, rgba(5,8,24,0.90) 0%, transparent 40%, rgba(5,8,24,0.40) 100%)"
                    }} />

                    {/* Play/Pause icon — markazda */}
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
                        style={{ opacity: !playing || !showCtrl ? 1 : 0 }}
                    >
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{
                                background: "rgba(43,62,232,0.80)",
                                backdropFilter: "blur(8px)",
                                boxShadow: "0 0 40px rgba(43,62,232,0.50)",
                            }}
                        >
                            {playing
                                ? <Pause className="w-7 h-7 text-white fill-white" />
                                : <Play  className="w-7 h-7 text-white fill-white ml-1" />}
                        </div>
                    </div>

                    {/* Tepada — yopish + sarlavha */}
                    <div
                        className="absolute top-0 left-0 right-0 px-4 pt-4 flex items-center gap-3 transition-opacity duration-300"
                        style={{ opacity: showCtrl ? 1 : 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={closeVideo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
                            style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(43,62,232,0.25)" }}
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                        <p className="text-sm font-bold text-white truncate flex-1">{video.title}</p>
                        {/* Quality */}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setShowQMenu(p => !p)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black"
                                style={{ background: "rgba(5,8,24,0.70)", border: "1px solid rgba(43,62,232,0.25)", color: "#00CEC8" }}
                            >
                                <Settings className="w-3 h-3" /> {quality}
                            </button>
                            {showQMenu && (
                                <div
                                    className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden"
                                    style={{ background: "rgba(8,12,32,0.96)", border: "1px solid rgba(43,62,232,0.25)", minWidth: "80px" }}
                                >
                                    {["4K","1080p","720p","480p"].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => { setQuality(q); setShowQMenu(false); }}
                                            className="w-full px-3 py-2 text-[11px] font-bold text-left transition-colors duration-150 hover:bg-blue-500/10"
                                            style={{ color: q === quality ? "#00CEC8" : "rgba(180,190,220,0.80)" }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pastda — nazorat */}
                    <div
                        className="absolute bottom-0 left-0 right-0 px-4 pb-4 transition-opacity duration-300"
                        style={{ opacity: showCtrl ? 1 : 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Progress xat */}
                        <div
                            className="relative h-1.5 rounded-full mb-3 cursor-pointer group"
                            style={{ background: "rgba(255,255,255,0.20)" }}
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress}% - 8px)`, boxShadow: "0 0 8px rgba(43,62,232,0.60)" }}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={() => setPlaying(p => !p)}>
                                {playing
                                    ? <Pause className="w-5 h-5 text-white fill-white" />
                                    : <Play  className="w-5 h-5 text-white fill-white ml-0.5" />}
                            </button>

                            <span className="text-xs text-white/70">
                                {formatTime(progress)} / {video.duration}
                            </span>

                            <div className="flex-1" />

                            {/* Volume */}
                            <button onClick={() => setMuted(p => !p)}>
                                {muted || volume === 0
                                    ? <VolumeX className="w-4 h-4 text-white/70" />
                                    : <Volume2 className="w-4 h-4 text-white/70" />}
                            </button>
                            <div
                                className="hidden md:block w-20 h-1.5 rounded-full cursor-pointer"
                                style={{ background: "rgba(255,255,255,0.20)" }}
                                onClick={e => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setVolume(Math.round(((e.clientX - r.left) / r.width) * 100));
                                }}
                            >
                                <div className="h-full rounded-full" style={{ width: `${muted ? 0 : volume}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                            </div>

                            <button>
                                <Maximize2 className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── O'ng panel — info + tavsiya ──────────────────── */}
                <div
                    className="hidden md:flex flex-col w-80 overflow-y-auto"
                    style={{
                        background: "rgba(8,12,32,0.98)",
                        borderLeft: "1px solid rgba(43,62,232,0.18)",
                        scrollbarWidth: "none",
                    }}
                >
                    {/* Yopish */}
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.60)" }}>Video ma'lumot</span>
                        <button onClick={closeVideo}>
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.60)" }} />
                        </button>
                    </div>

                    {/* Video meta */}
                    <div className="px-4 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                        <h3 className="text-sm font-black text-white leading-snug mb-2">{video.title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                            <img src={video.avatar} alt={video.author}
                                className="w-7 h-7 rounded-full"
                                style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div>
                                <p className="text-[11px] font-bold text-white">{video.author}</p>
                                <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                    <Eye className="inline w-2.5 h-2.5 mr-0.5" />{video.views} ko'rish
                                </p>
                            </div>
                            <button
                                className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-black"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                            >
                                Obuna
                            </button>
                        </div>

                        {/* Like / Dislike / Share / Save */}
                        <div className="flex items-center gap-2">
                            {([
                                { icon: ThumbsUp,   label: "4.2K", action: () => setLiked(p => p === "up"   ? null : "up"),   active: liked === "up"   },
                                { icon: ThumbsDown, label: "",      action: () => setLiked(p => p === "down" ? null : "down"), active: liked === "down" },
                            ] as const).map(({ icon: Icon, label, action, active }, i) => (
                                <button
                                    key={i}
                                    onClick={action}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150"
                                    style={{
                                        background: active ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)",
                                        border: `1px solid ${active ? "rgba(43,62,232,0.40)" : "rgba(43,62,232,0.14)"}`,
                                        color: active ? "#00CEC8" : "rgba(160,176,224,0.80)",
                                    }}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                            <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(160,176,224,0.80)" }}
                            >
                                <Share2 className="w-3.5 h-3.5" /> Ulash
                            </button>
                            <button
                                onClick={() => setSaved(p => !p)}
                                className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
                                style={{
                                    background: saved ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.08)",
                                    border: `1px solid ${saved ? "rgba(43,62,232,0.40)" : "rgba(43,62,232,0.14)"}`,
                                }}
                            >
                                <Bookmark className="w-3.5 h-3.5" style={{ color: saved ? "#00CEC8" : "rgba(160,176,224,0.80)", fill: saved ? "#00CEC8" : "none" }} />
                            </button>
                        </div>
                    </div>

                    {/* Tavsiya etilgan videolar */}
                    <div className="flex-1 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>
                            Keyingi videolar
                        </p>
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="flex gap-2.5 mb-3 cursor-pointer group">
                                <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0"
                                    style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <img
                                        src={`https://picsum.photos/seed/rec${i + 80}/400/225`}
                                        alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{ background: "rgba(5,8,24,0.50)" }}>
                                        <Play className="w-4 h-4 text-white fill-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-[#00CEC8] transition-colors">
                                        {["Nexus platformasi bilan tanishing","O'zbek texnologiyasi 2026","React 19 va Server Actions","AI bilan ishlaymiz","Mobile birinchi yondashuv","Creator Economy"][i]}
                                    </p>
                                    <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                        {["Nexus Dev","Tech UZ","Sardor","AI Studio","Humo","Creator"][i]}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <ChevronRight className="w-2.5 h-2.5" style={{ color: "rgba(43,62,232,0.40)" }} />
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                            {(i + 1) * 45}K ko'rish
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
