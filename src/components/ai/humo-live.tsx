"use client";

// Humo Live — real-vaqt ovozli (+ ekran/kamera) suhbat, Gemini Live native-audio.
// Mikrofon 16kHz PCM oqim -> Gemini -> 24kHz audio jonli ijro. Barge-in, jonli to'lqin,
// karaoke matn (input+output transkripsiya), til auto-aniqlanadi, ekran/kamera vision.
// Kalit brauzerda EMAS: /api/ai/live/token ephemeral token, @google/genai v1alpha.

import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
    X as XIcon, Mic, MicOff, PhoneOff, AudioLines, Loader2, Play, Square,
    Monitor, MonitorOff, Video, VideoOff, SwitchCamera,
} from "lucide-react";

const LIVE_VOICES = [
    { id: "Orus", name: "Umid", sub: "To'liq, mustahkam ohang" },
    { id: "Zephyr", name: "Dilnoza", sub: "Yorug', yengil ohang" },
];
const PREVIEW_TEXT = "Assalomu alaykum, men Humo AI. Sizga qanday yordam bera olaman?";
const LIVE_SYS =
    "Siz Humo AI'siz — For Humo super-ilovasining ovozli yordamchisi. " +
    "Foydalanuvchi qaysi tilda gapirsa, AYNAN o'sha tilda javob bering (o'zbek, rus, ingliz va h.k.). " +
    "Tabiiy, iliq, samimiy va qisqa suhbatdosh ohangda gapiring — robotdek emas. " +
    "Agar kamera yoki ekran ko'rsatilsa, ko'rgan narsangizni hisobga oling.";

type LiveStatus = "idle" | "connecting" | "live" | "ended" | "error";
type VideoMode = "cam" | "screen" | null;

function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
    if (outRate >= inRate) return input;
    const ratio = inRate / outRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const start = Math.floor(i * ratio), end = Math.floor((i + 1) * ratio);
        let sum = 0, c = 0;
        for (let j = start; j < end && j < input.length; j++) { sum += input[j]; c++; }
        out[i] = c ? sum / c : 0;
    }
    return out;
}
function floatToPcm16Base64(input: Float32Array): string {
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
function base64ToFloat32(b64: string): Float32Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;
    return f32;
}

export function HumoLive({ onClose }: { onClose: () => void }) {
    const [status, setStatus] = useState<LiveStatus>("idle");
    const [voice, setVoice] = useState("Orus");
    const [muted, setMuted] = useState(false);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [seconds, setSeconds] = useState(0);
    const [previewing, setPreviewing] = useState<string | null>(null);
    const [captionUser, setCaptionUser] = useState("");
    const [captionAi, setCaptionAi] = useState("");
    const [videoMode, setVideoMode] = useState<VideoMode>(null);
    const [camFacing, setCamFacing] = useState<"user" | "environment">("user");

    const sessionRef = useRef<Session | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const capCtxRef = useRef<AudioContext | null>(null);
    const procRef = useRef<ScriptProcessorNode | null>(null);
    const capAnalyserRef = useRef<AnalyserNode | null>(null);
    const playCtxRef = useRef<AudioContext | null>(null);
    const playAnalyserRef = useRef<AnalyserNode | null>(null);
    const nextTimeRef = useRef(0);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const mutedRef = useRef(false);
    const aiSpeakingRef = useRef(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoElRef = useRef<HTMLVideoElement | null>(null);
    const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastCompleteRef = useRef(true);

    useEffect(() => { mutedRef.current = muted; }, [muted]);
    useEffect(() => { aiSpeakingRef.current = aiSpeaking; }, [aiSpeaking]);

    // ---- jonli to'lqin (canvas) ----
    const startViz = useCallback(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            const analyser = aiSpeakingRef.current ? playAnalyserRef.current : capAnalyserRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
                    ctx.clearRect(0, 0, W, H);
                    if (analyser) {
                        const bins = analyser.frequencyBinCount;
                        const data = new Uint8Array(bins);
                        analyser.getByteFrequencyData(data);
                        const r0 = 92;
                        const bars = 64;
                        for (let i = 0; i < bars; i++) {
                            const v = data[i % bins] / 255;
                            const len = 6 + v * 46;
                            const ang = (i / bars) * Math.PI * 2 - Math.PI / 2;
                            const x1 = cx + Math.cos(ang) * r0, y1 = cy + Math.sin(ang) * r0;
                            const x2 = cx + Math.cos(ang) * (r0 + len), y2 = cy + Math.sin(ang) * (r0 + len);
                            ctx.strokeStyle = `rgba(255,255,255,${0.25 + v * 0.6})`;
                            ctx.lineWidth = 3;
                            ctx.lineCap = "round";
                            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                        }
                    }
                }
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        if (rafRef.current == null) rafRef.current = requestAnimationFrame(draw);
    }, []);

    const flushPlayback = useCallback(() => {
        for (const s of sourcesRef.current) { try { s.stop(); } catch { /* ignore */ } }
        sourcesRef.current = [];
        nextTimeRef.current = 0;
        setAiSpeaking(false);
    }, []);

    const playChunk = useCallback((f32: Float32Array) => {
        let ctx = playCtxRef.current;
        if (!ctx) {
            ctx = new AudioContext({ sampleRate: 24000 });
            playCtxRef.current = ctx;
            const an = ctx.createAnalyser(); an.fftSize = 128;
            an.connect(ctx.destination);
            playAnalyserRef.current = an;
        }
        const an = playAnalyserRef.current!;
        const buf = ctx.createBuffer(1, f32.length, 24000);
        buf.getChannelData(0).set(f32);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(an);
        const startAt = Math.max(ctx.currentTime, nextTimeRef.current);
        src.start(startAt);
        nextTimeRef.current = startAt + buf.duration;
        sourcesRef.current.push(src);
        setAiSpeaking(true);
        src.onended = () => {
            sourcesRef.current = sourcesRef.current.filter(s => s !== src);
            if (sourcesRef.current.length === 0) setAiSpeaking(false);
        };
    }, []);

    // ---- kamera / ekran ----
    const stopVideo = useCallback(() => {
        if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
        try { videoStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        videoStreamRef.current = null;
        if (videoElRef.current) videoElRef.current.srcObject = null;
        setVideoMode(null);
    }, []);

    const startFrameLoop = useCallback(() => {
        if (frameTimerRef.current) clearInterval(frameTimerRef.current);
        const cnv = document.createElement("canvas");
        frameTimerRef.current = setInterval(() => {
            const v = videoElRef.current;
            const s = sessionRef.current;
            if (!v || !s || v.videoWidth === 0) return;
            const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * 640) || 480;
            cnv.width = w; cnv.height = h;
            const c = cnv.getContext("2d"); if (!c) return;
            c.drawImage(v, 0, 0, w, h);
            const dataUrl = cnv.toDataURL("image/jpeg", 0.6);
            const b64 = dataUrl.split(",")[1];
            if (b64) { try { s.sendRealtimeInput({ media: { data: b64, mimeType: "image/jpeg" } }); } catch { /* ignore */ } }
        }, 1500);
    }, []);

    const startVideoSource = useCallback(async (mode: "cam" | "screen") => {
        stopVideo();
        try {
            const stream = mode === "cam"
                ? await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing } })
                : await navigator.mediaDevices.getDisplayMedia({ video: true });
            videoStreamRef.current = stream;
            const el = videoElRef.current;
            if (el) { el.srcObject = stream; await el.play().catch(() => {}); }
            // ekran ulashishni foydalanuvchi to'xtatsa
            stream.getVideoTracks()[0].addEventListener("ended", () => stopVideo());
            setVideoMode(mode);
            startFrameLoop();
        } catch {
            setVideoMode(null);
        }
    }, [camFacing, stopVideo, startFrameLoop]);

    const switchCamera = useCallback(async () => {
        if (videoMode !== "cam") return;
        const next = camFacing === "user" ? "environment" : "user";
        setCamFacing(next);
        stopVideo();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next } });
            videoStreamRef.current = stream;
            const el = videoElRef.current;
            if (el) { el.srcObject = stream; await el.play().catch(() => {}); }
            stream.getVideoTracks()[0].addEventListener("ended", () => stopVideo());
            setVideoMode("cam");
            startFrameLoop();
        } catch { setVideoMode(null); }
    }, [videoMode, camFacing, stopVideo, startFrameLoop]);

    const cleanup = useCallback(() => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        try { procRef.current?.disconnect(); } catch { /* ignore */ }
        procRef.current = null;
        try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        micStreamRef.current = null;
        try { capCtxRef.current?.close(); } catch { /* ignore */ }
        capCtxRef.current = null;
        capAnalyserRef.current = null;
        flushPlayback();
        try { playCtxRef.current?.close(); } catch { /* ignore */ }
        playCtxRef.current = null;
        playAnalyserRef.current = null;
        stopVideo();
        try { sessionRef.current?.close(); } catch { /* ignore */ }
        sessionRef.current = null;
    }, [flushPlayback, stopVideo]);

    const startMic = useCallback(async (session: Session) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        capCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser(); an.fftSize = 128;
        source.connect(an);
        capAnalyserRef.current = an;
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        proc.onaudioprocess = (e) => {
            if (mutedRef.current) return;
            const input = e.inputBuffer.getChannelData(0);
            const b64 = floatToPcm16Base64(downsample(input, ctx.sampleRate, 16000));
            try { session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } }); } catch { /* ignore */ }
        };
        const sink = ctx.createGain(); sink.gain.value = 0;
        source.connect(proc); proc.connect(sink); sink.connect(ctx.destination);
    }, []);

    const handleMessage = useCallback((msg: LiveServerMessage) => {
        const sc = msg.serverContent;
        if (sc?.interrupted) { flushPlayback(); setCaptionAi(""); }
        // Transkripsiya (karaoke) — yangi user gapi kelsa ikkalasini tozalaymiz
        const it = sc?.inputTranscription?.text;
        if (it) {
            if (lastCompleteRef.current) { setCaptionUser(""); setCaptionAi(""); lastCompleteRef.current = false; }
            setCaptionUser(prev => prev + it);
        }
        const ot = sc?.outputTranscription?.text;
        if (ot) setCaptionAi(prev => prev + ot);
        for (const p of (sc?.modelTurn?.parts ?? [])) {
            const d = p.inlineData?.data;
            if (d) playChunk(base64ToFloat32(d));
        }
        if (sc?.turnComplete) lastCompleteRef.current = true;
    }, [flushPlayback, playChunk]);

    const start = useCallback(async () => {
        setErrorMsg(""); setCaptionUser(""); setCaptionAi(""); lastCompleteRef.current = true;
        setStatus("connecting");
        try {
            const r = await fetch("/api/ai/live/token", { method: "POST" });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                setErrorMsg(j?.error === "auth_required" ? "Iltimos, avval kiring." : "Live hozircha ishlamayapti.");
                setStatus("error"); return;
            }
            const { token, model } = await r.json();
            const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: LIVE_SYS,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setStatus("live");
                        startViz();
                        startMic(session).catch(() => { setErrorMsg("Mikrofonga ruxsat berilmadi."); setStatus("error"); });
                        try { session.sendClientContent({ turns: "(Suhbat boshlandi — juda qisqa salomlashing va nima yordam kerakligini so'rang.)" }); } catch { /* ignore */ }
                    },
                    onmessage: handleMessage,
                    onerror: () => { setErrorMsg("Ulanishda xatolik."); setStatus("error"); },
                    onclose: () => { setStatus(prev => prev === "live" ? "ended" : prev); },
                },
            });
            sessionRef.current = session;
        } catch (e) {
            console.error("[HumoLive] start", e);
            setErrorMsg("Ulanib bo'lmadi. Qayta urinib ko'ring.");
            setStatus("error");
        }
    }, [voice, handleMessage, startMic, startViz]);

    const end = useCallback(() => { cleanup(); setStatus("ended"); }, [cleanup]);

    // Ovoz preview (play bosilganda — tanlash jim)
    const previewVoice = useCallback(async (voiceId: string) => {
        if (previewing === voiceId) {
            previewAudioRef.current?.pause();
            setPreviewing(null);
            return;
        }
        previewAudioRef.current?.pause();
        setPreviewing(voiceId);
        try {
            const r = await fetch("/api/ai/tts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: PREVIEW_TEXT, voice: voiceId }),
            });
            if (!r.ok) { setPreviewing(null); return; }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            previewAudioRef.current = audio;
            audio.onended = () => { setPreviewing(p => p === voiceId ? null : p); URL.revokeObjectURL(url); };
            audio.onerror = () => { setPreviewing(p => p === voiceId ? null : p); URL.revokeObjectURL(url); };
            await audio.play();
        } catch { setPreviewing(null); }
    }, [previewing]);

    useEffect(() => {
        if (status !== "live") return;
        const id = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    useEffect(() => () => { cleanup(); previewAudioRef.current?.pause(); }, [cleanup]);

    const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    const statusText = status === "connecting" ? "Ulanmoqda..."
        : status === "live" ? (aiSpeaking ? "Humo gapiryapti..." : muted ? "Mikrofon o'chiq" : "Tinglayapman...")
        : status === "ended" ? "Suhbat tugadi" : status === "error" ? errorMsg : "Boshlashga tayyor";
    const inCall = status === "live" || status === "connecting";

    const ctrlBtn = "w-14 h-14 rounded-full grid place-items-center transition-colors flex-shrink-0";

    return (
        <div className="fixed inset-0 z-[210] flex flex-col items-center justify-between py-10 px-6"
            style={{ background: "radial-gradient(1000px 520px at 50% 26%, #171722, #08080c 72%), #08080c" }}>
            {/* Tepa */}
            <div className="w-full max-w-3xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AudioLines className="w-5 h-5" style={{ color: "#ECECEC" }} />
                    <span className="font-black text-[var(--foreground)]">Humo Live</span>
                </div>
                <button onClick={() => { cleanup(); onClose(); }} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-white/[0.08]" style={{ color: "var(--muted-foreground)" }}>
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Markaz — logo + jonli to'lqin + status + karaoke matn */}
            <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                <div className="relative grid place-items-center" style={{ width: 300, height: 300 }}>
                    <canvas ref={canvasRef} width={300} height={300} className="absolute inset-0" style={{ opacity: status === "live" ? 1 : 0, transition: "opacity .4s" }} />
                    {status === "live" && !aiSpeaking && (
                        <span className="absolute rounded-full" style={{ width: 200, height: 200, background: "radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)", animation: "aiLiveGlow 3.4s ease-in-out infinite" }} />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ai-icons/humo-live.png" alt="Humo Live"
                        className="relative w-28 h-28 select-none" draggable={false}
                        style={{
                            filter: aiSpeaking ? "drop-shadow(0 0 44px rgba(255,255,255,0.5))" : status === "live" ? "drop-shadow(0 0 24px rgba(255,255,255,0.2))" : "drop-shadow(0 0 16px rgba(255,255,255,0.1))",
                            transition: "filter .35s ease",
                            animation: status === "live" ? (aiSpeaking ? "aiLiveBeat 0.9s ease-in-out infinite" : "aiLiveBreath 3.4s ease-in-out infinite") : "none",
                        }} />
                </div>
                <div className="text-center min-h-[1.5rem]">
                    <p className="text-lg font-bold text-[var(--foreground)]">{statusText}</p>
                    {status === "live" && <p className="text-sm mt-1 tabular-nums" style={{ color: "var(--muted-foreground)" }}>{mmss}</p>}
                </div>
                {/* Karaoke matn */}
                {status === "live" && (captionUser || captionAi) && (
                    <div className="w-full text-center space-y-1.5 px-2">
                        {captionUser && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}><span className="opacity-60">Siz: </span>{captionUser}</p>}
                        {captionAi && <p className="text-base font-medium text-[var(--foreground)]">{captionAi}</p>}
                    </div>
                )}
            </div>

            {/* Pastki — boshqaruv */}
            <div className="w-full max-w-2xl flex flex-col items-center gap-6">
                {!inCall ? (
                    <>
                        {/* Ovoz tanlash + preview */}
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                            {LIVE_VOICES.map(v => {
                                const active = voice === v.id;
                                return (
                                    <div key={v.id}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                                        onClick={() => setVoice(v.id)}
                                        style={active ? { background: "#ECECEC", color: "#0d0d0d" } : { background: "rgba(255,255,255,0.05)", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.09)" }}>
                                        <div className="text-left">
                                            <span className="block text-sm font-black leading-tight">{v.name}</span>
                                            <span className="block text-[10px] opacity-70 leading-tight">{v.sub}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); previewVoice(v.id); }}
                                            title="Eshitib ko'rish"
                                            className="w-7 h-7 rounded-full grid place-items-center flex-shrink-0"
                                            style={active ? { background: "rgba(0,0,0,0.12)" } : { background: "rgba(255,255,255,0.1)" }}>
                                            {previewing === v.id ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Ekran | Start | Kamera */}
                        <div className="flex items-center gap-5">
                            <button onClick={() => startVideoSource("screen")} title="Ekranni ulashish"
                                className={ctrlBtn} style={{ background: videoMode === "screen" ? "#ECECEC" : "rgba(255,255,255,0.08)", color: videoMode === "screen" ? "#0d0d0d" : "#fff" }}>
                                <Monitor className="w-6 h-6" />
                            </button>
                            <button onClick={start}
                                className="w-[72px] h-[72px] rounded-full grid place-items-center hover:brightness-95 transition-all"
                                style={{ background: "#ECECEC", color: "#0d0d0d" }} title="Suhbatni boshlash">
                                <AudioLines className="w-8 h-8" />
                            </button>
                            <button onClick={() => startVideoSource("cam")} title="Kamerani yoqish"
                                className={ctrlBtn} style={{ background: videoMode === "cam" ? "#ECECEC" : "rgba(255,255,255,0.08)", color: videoMode === "cam" ? "#0d0d0d" : "#fff" }}>
                                <Video className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)" }}>
                            Tugmani bosing va gaplashing (istalgan tilda). Mikrofonga ruxsat bering.
                        </p>
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        {/* Ekran */}
                        <button onClick={() => videoMode === "screen" ? stopVideo() : startVideoSource("screen")} title={videoMode === "screen" ? "Ekranni to'xtatish" : "Ekranni ulashish"}
                            className={ctrlBtn} style={{ background: videoMode === "screen" ? "#ECECEC" : "rgba(255,255,255,0.08)", color: videoMode === "screen" ? "#0d0d0d" : "#fff" }}>
                            {videoMode === "screen" ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                        </button>
                        {/* Mikrofon */}
                        <button onClick={() => setMuted(m => !m)} disabled={status !== "live"} title={muted ? "Mikrofonni yoqish" : "Mikrofonni o'chirish"}
                            className={ctrlBtn} style={{ background: muted ? "#EF4444" : "rgba(255,255,255,0.08)", color: "#fff" }}>
                            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                        {/* Tugatish */}
                        <button onClick={end} title="Tugatish"
                            className="w-[72px] h-[72px] rounded-full grid place-items-center hover:brightness-105" style={{ background: "#EF4444", color: "#fff" }}>
                            {status === "connecting" ? <Loader2 className="w-8 h-8 animate-spin" /> : <PhoneOff className="w-8 h-8" />}
                        </button>
                        {/* Kamera */}
                        <button onClick={() => videoMode === "cam" ? stopVideo() : startVideoSource("cam")} title={videoMode === "cam" ? "Kamerani o'chirish" : "Kamerani yoqish"}
                            className={ctrlBtn} style={{ background: videoMode === "cam" ? "#ECECEC" : "rgba(255,255,255,0.08)", color: videoMode === "cam" ? "#0d0d0d" : "#fff" }}>
                            {videoMode === "cam" ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                        {/* Kamera almashtirish */}
                        {videoMode === "cam" && (
                            <button onClick={switchCamera} title="Kamerani almashtirish"
                                className={ctrlBtn} style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                                <SwitchCamera className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Kamera/ekran preview (doim mount — ko'rinishi videoMode bilan) */}
            <video ref={videoElRef} muted playsInline autoPlay
                className="fixed bottom-5 right-5 w-40 rounded-xl border shadow-lg"
                style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    transform: videoMode === "cam" && camFacing === "user" ? "scaleX(-1)" : "none",
                    display: (inCall && videoMode) ? "block" : "none",
                }} />

            <style>{`
@keyframes aiLivePulse{0%{transform:scale(0.75);opacity:0.75}100%{transform:scale(1.7);opacity:0}}
@keyframes aiLiveGlow{0%,100%{opacity:0.45;transform:scale(0.98)}50%{opacity:0.85;transform:scale(1.08)}}
@keyframes aiLiveBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes aiLiveBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
`}</style>
        </div>
    );
}
