"use client";

// Karaoke Player — chiroyli full-screen modal
// - Audio (asosiy yoki instrumental) + optional video klip (musiqa video)
// - Timing bilan lyrics: hozirgi qator markazda katta, avval o'ynagani susayadi, keyingi qatorlar rangsiz
// - Vokalsiz (instrumental) toggle — foydalanuvchi karaoke qiladi
// - Klip video bo'lsa fon sifatida chiqadi

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Mic2, Music2, SkipBack, SkipForward } from "lucide-react";
import { activeLyricIndex, type LrcLine } from "@/lib/nexus-lrc";

interface Props {
    open: boolean;
    onClose: () => void;
    trackId: string;
    title: string;
    artist: string | null;
    cover: string | null;
    audioUrl: string;               // asosiy audio (vokal bilan)
}

interface LyricsPayload {
    hasKaraoke: boolean;
    instrumentalUrl: string | null;
    videoUrl: string | null;
    lines: LrcLine[];
}

export function NxKaraokePlayer(p: Props) {
    const [payload, setPayload] = useState<LyricsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [currentMs, setCurrentMs] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [useInstrumental, setUseInstrumental] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lyricsRef = useRef<HTMLDivElement>(null);

    // Lyrics + karaoke ma'lumotlarini yuklash
    useEffect(() => {
        if (!p.open) return;
        setLoading(true);
        fetch(`/api/nexus/tracks/${p.trackId}/lyrics`)
            .then(r => r.json())
            .then((d: LyricsPayload) => setPayload(d))
            .catch(() => setPayload({ hasKaraoke: false, instrumentalUrl: null, videoUrl: null, lines: [] }))
            .finally(() => setLoading(false));
    }, [p.open, p.trackId]);

    // Audio manba (instrumental yoki asl)
    const audioSrc = useInstrumental && payload?.instrumentalUrl ? payload.instrumentalUrl : p.audioUrl;

    // Audio o'zgartirilganda o'chirib qayta yuklash
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const wasPlaying = playing;
        const t = a.currentTime;
        a.pause();
        a.src = audioSrc;
        a.currentTime = t;
        if (wasPlaying) a.play().catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioSrc]);

    // Play/pause tugma
    const toggle = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) { a.play().catch(() => { }); setPlaying(true); }
        else { a.pause(); setPlaying(false); }
    }, []);

    // Video bo'lsa audio bilan sinxron o'ynatish
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (playing) v.play().catch(() => { });
        else v.pause();
    }, [playing]);

    // Audio time update
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const onTime = () => setCurrentMs(a.currentTime * 1000);
        const onDur = () => setDuration(a.duration || 0);
        const onEnd = () => setPlaying(false);
        a.addEventListener("timeupdate", onTime);
        a.addEventListener("loadedmetadata", onDur);
        a.addEventListener("ended", onEnd);
        return () => {
            a.removeEventListener("timeupdate", onTime);
            a.removeEventListener("loadedmetadata", onDur);
            a.removeEventListener("ended", onEnd);
        };
    }, []);

    // Modal ochilgach body scroll'ni bloklash
    useEffect(() => {
        if (!p.open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [p.open]);

    // Escape yopadi
    useEffect(() => {
        if (!p.open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") p.onClose();
            if (e.key === " ") { e.preventDefault(); toggle(); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [p.open, p.onClose, toggle]);

    // Aktiv qator indeksi va avto-scroll
    const lines = payload?.lines ?? [];
    const active = activeLyricIndex(lines, currentMs);

    useEffect(() => {
        if (!lyricsRef.current || active < 0) return;
        const el = lyricsRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [active]);

    if (!p.open) return null;

    const hasVideo = !!payload?.videoUrl;
    const hasLines = lines.length > 0;
    const hasInstrumental = !!payload?.instrumentalUrl;

    return (
        <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: "#050818" }}>
            {/* Video fon (agar bor bo'lsa) */}
            {hasVideo && (
                <video ref={videoRef} src={payload!.videoUrl!} muted playsInline
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ opacity: 0.35 }} />
            )}
            {/* Gradient overlay (kontrast uchun) */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(5,8,24,0.85) 0%, rgba(8,12,32,0.55) 30%, rgba(8,12,32,0.55) 70%, rgba(5,8,24,0.95) 100%)" }} />

            {/* Header */}
            <div className="relative z-10 flex items-center gap-3 px-5 py-4">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(139,92,246,0.35)" }}>
                    {p.cover
                        ? <img src={p.cover} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                            <Mic2 className="w-5 h-5 text-white" />
                          </div>}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#8B5CF6" }}>Karaoke</p>
                    <h2 className="text-base font-black text-white truncate">{p.title}</h2>
                    {p.artist && <p className="text-[11px] truncate" style={{ color: "rgba(180,150,220,0.75)" }}>{p.artist}</p>}
                </div>
                <button onClick={p.onClose} className="w-10 h-10 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Lyrics scroll */}
            <div ref={lyricsRef}
                className="relative z-10 flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center"
                style={{ scrollbarWidth: "none" }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full opacity-60">
                        <p className="text-sm" style={{ color: "rgba(180,150,220,0.75)" }}>Lyrics yuklanmoqda...</p>
                    </div>
                ) : !hasLines ? (
                    <div className="flex items-center justify-center h-full flex-col gap-3 text-center px-4">
                        <Mic2 className="w-12 h-12" style={{ color: "rgba(139,92,246,0.30)" }} />
                        <p className="text-sm font-black text-white">Lyrics mavjud emas</p>
                        <p className="text-xs" style={{ color: "rgba(180,150,220,0.65)" }}>
                            Trek egasi hali karaoke lyrics qo&apos;shmagan.
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl flex flex-col items-center gap-8 py-[40vh]">
                        {lines.map((l, i) => {
                            const isActive = i === active;
                            const isPast = i < active;
                            const distance = Math.abs(i - active);
                            const size = isActive ? "text-3xl md:text-5xl" : distance === 1 ? "text-xl md:text-2xl" : "text-base md:text-lg";
                            const opacity = isActive ? 1 : isPast ? 0.35 : Math.max(0.15, 0.65 - distance * 0.10);
                            return (
                                <p key={i} data-idx={i}
                                    className={`${size} font-black text-center leading-tight transition-all duration-300`}
                                    style={{
                                        color: isActive ? "#fff" : "rgba(220,200,240,0.85)",
                                        textShadow: isActive ? "0 4px 24px rgba(139,92,246,0.65)" : "none",
                                        opacity,
                                        transform: isActive ? "scale(1.05)" : "scale(1)",
                                    }}>
                                    {l.text || "♪"}
                                </p>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Boshqaruv (progress + tugmalar) */}
            <div className="relative z-10 px-5 py-4"
                style={{ background: "linear-gradient(180deg, transparent 0%, rgba(5,8,24,0.90) 40%)" }}>
                {/* Progress bar */}
                <div className="relative h-1.5 rounded-full overflow-hidden mb-3 cursor-pointer"
                    style={{ background: "rgba(139,92,246,0.20)" }}
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        const a = audioRef.current;
                        if (a && duration) { a.currentTime = pct * duration; setCurrentMs(pct * duration * 1000); }
                    }}>
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{
                            width: duration ? `${(currentMs / 1000 / duration) * 100}%` : "0%",
                            background: "linear-gradient(90deg,#8B5CF6,#EC4899)",
                        }} />
                </div>

                <div className="flex items-center justify-between gap-3">
                    {/* Vaqt */}
                    <span className="text-[11px] font-mono flex-shrink-0" style={{ color: "rgba(180,150,220,0.85)" }}>
                        {fmtTime(currentMs / 1000)} / {fmtTime(duration)}
                    </span>

                    {/* O'yin tugmalari */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, a.currentTime - 10); }}
                            className="w-9 h-9 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(139,92,246,0.15)" }}>
                            <SkipBack className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={toggle}
                            className="w-14 h-14 flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 8px 24px rgba(139,92,246,0.55)" }}>
                            {playing ? <Pause className="w-6 h-6 text-white fill-white" /> : <Play className="w-6 h-6 text-white fill-white ml-0.5" />}
                        </button>
                        <button onClick={() => { const a = audioRef.current; if (a) a.currentTime = Math.min(duration, a.currentTime + 10); }}
                            className="w-9 h-9 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(139,92,246,0.15)" }}>
                            <SkipForward className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Ovoz + karaoke rejimi */}
                    <div className="flex items-center gap-2">
                        {hasInstrumental && (
                            <button onClick={() => setUseInstrumental(v => !v)}
                                title={useInstrumental ? "Vokal bilan" : "Vokalsiz (karaoke)"}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black"
                                style={useInstrumental
                                    ? { background: "linear-gradient(135deg,#8B5CF6,#EC4899)", color: "#fff" }
                                    : { background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)", color: "rgba(220,200,240,0.85)" }}>
                                {useInstrumental ? <Mic2 className="w-3 h-3" /> : <Music2 className="w-3 h-3" />}
                                {useInstrumental ? "Karaoke" : "Asl"}
                            </button>
                        )}
                        <button onClick={() => { const a = audioRef.current; if (a) { a.muted = !a.muted; setMuted(a.muted); } }}
                            className="w-9 h-9 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(139,92,246,0.15)" }}>
                            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Audio element (yashirin) */}
            <audio ref={audioRef} src={audioSrc} preload="auto" autoPlay onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        </div>
    );
}

function fmtTime(s: number): string {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
}
