"use client";

// Ovozli xabar plyaeri — waveform + davomiylik + play/pause tugmasi.
// Waveform statik (deterministik seed URL'dan) — chunki serverda audio kadr tahlili yo'q.
// Faqat vizual iluziya; foydalanuvchi tajribasi Telegram/WhatsApp'ga o'xshaydi.

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
    src: string;
    mine?: boolean;
    seed?: string;
    initialDurationMs?: number | null;
}

// Deterministik pseudo-random (0..1) — URL'dan seed
function seededBars(seed: string, count: number): number[] {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const bars: number[] = [];
    for (let i = 0; i < count; i++) {
        h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
        const v = ((h >>> 0) % 1000) / 1000;
        // 0.25..1.0 oralig'ida — juda past qolmasin
        bars.push(0.25 + v * 0.75);
    }
    return bars;
}

function fmtTime(sec: number): string {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 32;

export function NxVoicePlayer({ src, mine, seed, initialDurationMs }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState<number>(initialDurationMs ? initialDurationMs / 1000 : 0);
    const [current, setCurrent] = useState(0);
    const bars = seededBars(seed || src, BAR_COUNT);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const onMeta = () => {
            if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
        };
        const onTime = () => setCurrent(a.currentTime);
        const onEnd = () => { setPlaying(false); setCurrent(0); };
        a.addEventListener("loadedmetadata", onMeta);
        a.addEventListener("timeupdate", onTime);
        a.addEventListener("ended", onEnd);
        return () => {
            a.removeEventListener("loadedmetadata", onMeta);
            a.removeEventListener("timeupdate", onTime);
            a.removeEventListener("ended", onEnd);
        };
    }, []);

    function toggle() {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); setPlaying(false); }
        else { a.play().then(() => setPlaying(true)).catch(() => {}); }
    }

    function onBarClick(e: React.MouseEvent<HTMLDivElement>) {
        const a = audioRef.current;
        if (!a || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        a.currentTime = ratio * duration;
        setCurrent(a.currentTime);
    }

    const progress = duration > 0 ? current / duration : 0;
    const activeColor = mine ? "#ffffff" : "#00CEC8";
    const dimColor = mine ? "rgba(255,255,255,0.35)" : "rgba(0,206,200,0.30)";

    return (
        <div className="flex items-center gap-2 py-1 min-w-[220px]">
            <button
                onClick={toggle}
                aria-label={playing ? "To'xtatish" : "Eshitish"}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-95"
                style={{
                    background: mine ? "rgba(255,255,255,0.18)" : "rgba(0,206,200,0.20)",
                }}>
                {playing
                    ? <Pause className="w-4 h-4" style={{ color: activeColor }} fill={activeColor} />
                    : <Play className="w-4 h-4 ml-0.5" style={{ color: activeColor }} fill={activeColor} />
                }
            </button>
            <div className="flex-1 min-w-0">
                <div
                    onClick={onBarClick}
                    className="flex items-center gap-[2px] h-7 cursor-pointer"
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                >
                    {bars.map((h, i) => {
                        const active = (i + 1) / BAR_COUNT <= progress;
                        return (
                            <div
                                key={i}
                                className="rounded-full transition-colors"
                                style={{
                                    width: 2.5,
                                    height: `${Math.round(h * 22)}px`,
                                    background: active ? activeColor : dimColor,
                                }}
                            />
                        );
                    })}
                </div>
                <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.85)" }}>
                    {fmtTime(playing || current > 0 ? current : duration)}
                </p>
            </div>
            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
        </div>
    );
}
