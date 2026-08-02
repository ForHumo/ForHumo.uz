"use client";

// Nexus dumaloq video xabar yozib olish modali (Telegram uslubi).
// Front kamera + mikrofon → 60s gacha → circular preview → jo'natish.

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Circle, Square, SwitchCamera, Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onRecorded: (file: File, durationMs: number) => void | Promise<void>;
}

const MAX_SECONDS = 60;

export function NxVideoCircleRecorder({ open, onClose, onRecorded }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [facing, setFacing] = useState<"user" | "environment">("user");
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState<string>("");

    // Kamera oqimini boshlash
    const startCamera = useCallback(async (f: "user" | "environment") => {
        setErr(""); setReady(false);
        try {
            // Avvalgisini yopamiz
            streamRef.current?.getTracks().forEach(t => t.stop());
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: f },
                audio: true,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => { });
            }
            setReady(true);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Kameraga ruxsat berilmadi");
        }
    }, []);

    // Ochilganda kamera yoqiladi, yopilganda barcha resurs ozod
    useEffect(() => {
        if (open) startCamera(facing);
        return () => {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            try { recorderRef.current?.stop(); } catch { }
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const switchCam = () => {
        const next = facing === "user" ? "environment" : "user";
        setFacing(next);
        startCamera(next);
    };

    const start = () => {
        if (!streamRef.current || recording) return;
        chunksRef.current = [];
        // Video + audio yozish (webm/vp8+opus keng qo'llab-quvvatlanadi)
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus"
            : MediaRecorder.isTypeSupported("video/webm") ? "video/webm"
            : MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4"
            : "";
        const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = async () => {
            const dur = Date.now() - startedAtRef.current;
            const finalMime = rec.mimeType || "video/webm";
            const blob = new Blob(chunksRef.current, { type: finalMime });
            const ext = finalMime.includes("mp4") ? "mp4" : "webm";
            const file = new File([blob], `circle-${Date.now()}.${ext}`, { type: finalMime });
            try { await onRecorded(file, dur); } catch { /* handled by parent */ }
            onClose();
        };
        recorderRef.current = rec;
        startedAtRef.current = Date.now();
        rec.start(100);
        setRecording(true);
        setSeconds(0);
        timerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
            setSeconds(s);
            if (s >= MAX_SECONDS) stop();
        }, 200);
    };

    const stop = () => {
        if (!recording) return;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRecording(false);
        try { recorderRef.current?.stop(); } catch { }
        recorderRef.current = null;
    };

    if (!open) return null;

    const pct = Math.min(100, (seconds / MAX_SECONDS) * 100);
    const circumference = 2 * Math.PI * 148;   // radius 148 (yozish progress ring uchun)

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center"
            style={{ background: "rgba(5,8,24,0.94)", backdropFilter: "blur(12px)" }}>
            {/* Yopish tugma */}
            <button onClick={() => { if (recording) stop(); onClose(); }}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition"
                style={{ background: "rgba(255,255,255,0.10)" }}>
                <X className="w-5 h-5 text-white" />
            </button>

            {/* Kamera aylantirish */}
            <button onClick={switchCam} disabled={recording}
                className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.10)" }}>
                <SwitchCamera className="w-5 h-5 text-white" />
            </button>

            {/* Circular video preview + progress ring */}
            <div className="flex flex-col items-center gap-6">
                <div className="relative" style={{ width: 320, height: 320 }}>
                    {/* Progress ring (yozish davomida) */}
                    {recording && (
                        <svg className="absolute inset-0 pointer-events-none" width={320} height={320} style={{ transform: "rotate(-90deg)" }}>
                            <circle cx={160} cy={160} r={148} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={6} />
                            <circle cx={160} cy={160} r={148} fill="none" stroke="#EF4444" strokeWidth={6}
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - (pct / 100) * circumference}
                                strokeLinecap="round"
                                style={{ transition: "stroke-dashoffset 0.2s linear" }} />
                        </svg>
                    )}
                    {/* Dumaloq video */}
                    <div className="absolute inset-2 rounded-full overflow-hidden bg-black"
                        style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                        {ready ? (
                            <video ref={videoRef} muted playsInline autoPlay
                                className="w-full h-full object-cover"
                                style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {err ? (
                                    <p className="text-xs text-center px-4" style={{ color: "#EF4444" }}>{err}</p>
                                ) : (
                                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status matn + tugmalar */}
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sm font-bold text-white">
                        {recording ? (
                            <span className="tabular-nums" style={{ color: "#EF4444" }}>
                                <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse align-middle" style={{ background: "#EF4444" }} />
                                {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")} / 01:00
                            </span>
                        ) : ready ? (
                            "Yozish uchun bosing"
                        ) : ""}
                    </p>
                    {ready && (
                        recording ? (
                            <button onClick={stop}
                                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition"
                                style={{ background: "#EF4444", boxShadow: "0 0 0 4px rgba(239,68,68,0.30)" }}>
                                <Square className="w-6 h-6 text-white" fill="#fff" />
                            </button>
                        ) : (
                            <button onClick={start}
                                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition"
                                style={{ background: "#fff", boxShadow: "0 0 0 4px rgba(255,255,255,0.20)" }}>
                                <Circle className="w-8 h-8" fill="#EF4444" stroke="#EF4444" />
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
