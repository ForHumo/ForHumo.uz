"use client";

// Ovozli xabar plyaeri — waveform + davomiylik + play/pause tugmasi.
// Waveform statik (deterministik seed URL'dan) — chunki serverda audio kadr tahlili yo'q.
// Faqat vizual iluziya; foydalanuvchi tajribasi Telegram/WhatsApp'ga o'xshaydi.

import { useEffect, useRef, useState } from "react";
import { Play, Pause, FileText, Loader2 } from "lucide-react";

interface Props {
    src: string;
    mine?: boolean;
    seed?: string;
    initialDurationMs?: number | null;
    enableTranscribe?: boolean;                                 // AI transkripsiya tugmasini ko'rsatish
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

// Voice speed tanlash (Telegram/WhatsApp/podkast uslub)
const SPEEDS = [1, 1.5, 2] as const;

export function NxVoicePlayer({ src, mine, seed, initialDurationMs, enableTranscribe }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState<number>(initialDurationMs ? initialDurationMs / 1000 : 0);
    const [current, setCurrent] = useState(0);
    const [speedIdx, setSpeedIdx] = useState(0); // 0=1x, 1=1.5x, 2=2x
    const bars = seededBars(seed || src, BAR_COUNT);
    // O'ynayotgan level (0..1) — bar balandligini kuchsizlantiradi/kuchaytiradi
    const [audioLevel, setAudioLevel] = useState(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    // Transkripsiya holati
    const [transcribing, setTranscribing] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);

    async function transcribe() {
        if (transcript) { setTranscript(null); return; }
        setTranscribing(true);
        try {
            const r = await fetch("/api/ai/transcribe", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioUrl: src }),
            });
            if (r.ok) {
                const d = await r.json();
                setTranscript(d.text ?? "");
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Transkripsiya bo'lmadi");
            }
        } finally { setTranscribing(false); }
    }

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

    function ensureAnalyser() {
        // MUHIM: createMediaElementSource audio'ni Web Audio'ga bog'laydi va shundan keyin
        // audio faqat AudioContext.destination orqali eshittiriladi. Agar ctx suspend bo'lsa
        // yoki cross-origin CORS bo'lmasa — HECH QANDAY ovoz chiqmaydi. Shuning uchun:
        //  1) crossOrigin="anonymous" bilan CORS talab qilamiz (Vercel Blob ruxsat beradi)
        //  2) resume()'ni play()'dan avval kutamiz
        //  3) Muvaffaqiyatsiz bo'lsa native audio o'z-o'zidan eshittiriladi (analyser'siz)
        const a = audioRef.current;
        if (!a || analyserRef.current) return;
        try {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const src = ctx.createMediaElementSource(a);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            src.connect(analyser);
            analyser.connect(ctx.destination);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
        } catch {
            // CORS yoki boshqa xato — analyser'siz native audio ishlaydi
            audioCtxRef.current = null;
            analyserRef.current = null;
        }
    }
    function stopAnalyserLoop() {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        setAudioLevel(0);
    }
    function startAnalyserLoop() {
        const analyser = analyserRef.current;
        if (!analyser) return;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
            analyser.getByteFrequencyData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i];
            const avg = sum / (buf.length * 255);
            setAudioLevel(avg);
            rafRef.current = requestAnimationFrame(loop);
        };
        loop();
    }
    async function toggle() {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); setPlaying(false); stopAnalyserLoop(); return; }
        ensureAnalyser();
        // AudioContext suspend bo'lsa AVVAL resume — aks holda ovoz chiqmaydi
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === "suspended") {
            try { await ctx.resume(); } catch { /* ignore */ }
        }
        try {
            await a.play();
            setPlaying(true);
            startAnalyserLoop();
        } catch { /* autoplay bloklangan yoki src xato */ }
    }
    // Cleanup: komponent unmount'da AudioContext yopish
    useEffect(() => () => {
        stopAnalyserLoop();
        try { audioCtxRef.current?.close(); } catch {}
    }, []);

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
        <div className="flex flex-col gap-1 min-w-[220px]">
        <div className="flex items-center gap-2 py-1">
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
                        // O'ynayotgan payt: barlar audioLevel bilan pulsatsiya qiladi
                        // (o'rtadagilar ko'proq — dolg'a effekti)
                        const centerBias = 1 - Math.abs((i / (BAR_COUNT - 1)) - 0.5) * 1.4;
                        const pulse = playing ? 1 + audioLevel * centerBias * 0.9 : 1;
                        return (
                            <div
                                key={i}
                                className="rounded-full transition-colors"
                                style={{
                                    width: 2.5,
                                    height: `${Math.round(h * 22 * pulse)}px`,
                                    background: active ? activeColor : dimColor,
                                    transition: "height 90ms linear, background-color 200ms",
                                }}
                            />
                        );
                    })}
                </div>
                <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.85)" }}>
                    {fmtTime(playing || current > 0 ? current : duration)}
                </p>
            </div>
            {/* Speed tanlash — playback tezligini o'zgartirish (1x/1.5x/2x) */}
            <button
                type="button"
                onClick={() => {
                    const next = (speedIdx + 1) % SPEEDS.length;
                    setSpeedIdx(next);
                    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
                }}
                title={`Tezlik: ${SPEEDS[speedIdx]}×`}
                className="min-w-[28px] h-7 px-1.5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-black tabular-nums"
                style={{
                    background: speedIdx > 0
                        ? (mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.15)")
                        : (mine ? "rgba(255,255,255,0.08)" : "rgba(43,62,232,0.08)"),
                    color: speedIdx > 0 ? activeColor : (mine ? "rgba(255,255,255,0.75)" : "rgba(140,160,210,0.85)"),
                }}
            >
                {SPEEDS[speedIdx]}×
            </button>
            {enableTranscribe && (
                <button onClick={transcribe} disabled={transcribing}
                    title={transcript ? "Transkriptni yashirish" : "AI orqali matnga aylantirish"}
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    style={{
                        background: transcript ? "rgba(0,206,200,0.20)" : (mine ? "rgba(255,255,255,0.14)" : "rgba(0,206,200,0.10)"),
                        border: `1px solid ${transcript ? "rgba(0,206,200,0.50)" : (mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.30)")}`,
                    }}>
                    {transcribing
                        ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: activeColor }} />
                        : <FileText className="w-3 h-3" style={{ color: transcript ? "#00CEC8" : activeColor }} />
                    }
                </button>
            )}
            {/* crossOrigin=anonymous — Web Audio createMediaElementSource CORS'siz xato bermasin */}
            <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" className="hidden" />
        </div>
        {transcript && (
            <div className="pl-2 pr-1 pt-1 text-xs italic"
                style={{
                    borderLeft: `2px solid ${mine ? "rgba(255,255,255,0.60)" : "#00CEC8"}`,
                    color: mine ? "rgba(255,255,255,0.90)" : "rgba(220,230,255,0.85)",
                }}>
                <span className="text-[9px] font-black uppercase tracking-wider mr-1.5"
                    style={{ color: mine ? "rgba(255,255,255,0.75)" : "#00CEC8" }}>Transkript</span>
                {transcript}
            </div>
        )}
        </div>
    );
}
