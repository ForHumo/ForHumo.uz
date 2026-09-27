"use client";

// Humo Live — real-vaqt ovozli suhbat (Gemini Live native-audio).
// Mikrofon 16kHz PCM oqim -> Gemini -> 24kHz audio jonli ijro. Barge-in (gapni bo'lish) qo'llanadi.
// Kalit brauzerda EMAS: /api/ai/live/token ephemeral token beradi, @google/genai v1alpha bilan ulanadi.

import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import { X as XIcon, Mic, MicOff, PhoneOff, AudioLines, Loader2 } from "lucide-react";

const LIVE_VOICES = [
    { id: "Orus", name: "Umid", sub: "To'liq, mustahkam ohang" },
    { id: "Zephyr", name: "Dilnoza", sub: "Yorug', yengil ohang" },
];
const LIVE_SYS =
    "Siz Humo AI'siz — For Humo super-ilovasining ovozli yordamchisi, O'zbekiston uchun. " +
    "FAQAT tabiiy, iliq, samimiy o'zbek tilida gaplashing — robotdek emas, tirik suhbatdosh kabi. " +
    "Qisqa va jonli javob bering. Foydalanuvchiga kod, savol, reja, tarjima — hamma narsada yordam berasiz.";

type LiveStatus = "idle" | "connecting" | "live" | "ended" | "error";

// ---- audio yordamchilari ----
function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
    if (outRate >= inRate) return input;
    const ratio = inRate / outRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
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

    const sessionRef = useRef<Session | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const capCtxRef = useRef<AudioContext | null>(null);
    const procRef = useRef<ScriptProcessorNode | null>(null);
    const playCtxRef = useRef<AudioContext | null>(null);
    const nextTimeRef = useRef(0);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const mutedRef = useRef(false);
    const T = { primary: "#ECECEC", onPrimary: "#0d0d0d", border: "rgba(255,255,255,0.09)" };

    useEffect(() => { mutedRef.current = muted; }, [muted]);

    const flushPlayback = useCallback(() => {
        for (const s of sourcesRef.current) { try { s.stop(); } catch { /* ignore */ } }
        sourcesRef.current = [];
        nextTimeRef.current = 0;
        setAiSpeaking(false);
    }, []);

    const playChunk = useCallback((f32: Float32Array) => {
        let ctx = playCtxRef.current;
        if (!ctx) { ctx = new AudioContext({ sampleRate: 24000 }); playCtxRef.current = ctx; }
        const buf = ctx.createBuffer(1, f32.length, 24000);
        buf.getChannelData(0).set(f32);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
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

    const cleanup = useCallback(() => {
        try { procRef.current?.disconnect(); } catch { /* ignore */ }
        procRef.current = null;
        try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        micStreamRef.current = null;
        try { capCtxRef.current?.close(); } catch { /* ignore */ }
        capCtxRef.current = null;
        flushPlayback();
        try { playCtxRef.current?.close(); } catch { /* ignore */ }
        playCtxRef.current = null;
        try { sessionRef.current?.close(); } catch { /* ignore */ }
        sessionRef.current = null;
    }, [flushPlayback]);

    const startMic = useCallback(async (session: Session) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        capCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        proc.onaudioprocess = (e) => {
            if (mutedRef.current) return;
            const input = e.inputBuffer.getChannelData(0);
            const ds = downsample(input, ctx.sampleRate, 16000);
            const b64 = floatToPcm16Base64(ds);
            try { session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } }); } catch { /* ignore */ }
        };
        // ScriptProcessor ishlashi uchun ulash kerak — ovoz qaytmasligi uchun gain=0 orqali
        const sink = ctx.createGain();
        sink.gain.value = 0;
        source.connect(proc);
        proc.connect(sink);
        sink.connect(ctx.destination);
    }, []);

    const handleMessage = useCallback((msg: LiveServerMessage) => {
        const sc = msg.serverContent;
        if (sc?.interrupted) flushPlayback();               // barge-in — foydalanuvchi gapirdi
        const parts = sc?.modelTurn?.parts ?? [];
        for (const p of parts) {
            const d = p.inlineData?.data;
            if (d) playChunk(base64ToFloat32(d));
        }
    }, [flushPlayback, playChunk]);

    const start = useCallback(async () => {
        setErrorMsg("");
        setStatus("connecting");
        try {
            const r = await fetch("/api/ai/live/token", { method: "POST" });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                setErrorMsg(j?.error === "auth_required" ? "Iltimos, avval kiring." : "Live hozircha ishlamayapti.");
                setStatus("error");
                return;
            }
            const { token, model } = await r.json();
            const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: LIVE_SYS,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                },
                callbacks: {
                    onopen: () => {
                        setStatus("live");
                        startMic(session).catch(() => { setErrorMsg("Mikrofonga ruxsat berilmadi."); setStatus("error"); });
                        // Humo birinchi bo'lib qisqa salomlashadi
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
    }, [voice, handleMessage, startMic]);

    const end = useCallback(() => { cleanup(); setStatus("ended"); }, [cleanup]);

    // Suhbat taymeri
    useEffect(() => {
        if (status !== "live") return;
        const id = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    // Unmount — tozalash
    useEffect(() => () => cleanup(), [cleanup]);

    const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    const statusText = status === "connecting" ? "Ulanmoqda..."
        : status === "live" ? (aiSpeaking ? "Humo gapiryapti..." : muted ? "Mikrofon o'chiq" : "Tinglayapman...")
        : status === "ended" ? "Suhbat tugadi"
        : status === "error" ? errorMsg : "Boshlashga tayyor";

    return (
        <div className="fixed inset-0 z-[210] flex flex-col items-center justify-between py-10 px-6"
            style={{ background: "radial-gradient(1200px 600px at 50% 30%, rgba(30,30,40,0.6), #060608 70%)" }}>
            {/* Tepa — sarlavha + yopish */}
            <div className="w-full max-w-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AudioLines className="w-5 h-5" style={{ color: T.primary }} />
                    <span className="font-black text-[var(--foreground)]">Humo Live</span>
                </div>
                <button onClick={() => { cleanup(); onClose(); }} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-white/[0.08]" style={{ color: "var(--muted-foreground)" }}>
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Markaz — pulslovchi logo + status */}
            <div className="flex flex-col items-center gap-6">
                <div className="relative grid place-items-center">
                    {(status === "live") && (
                        <>
                            <span className="absolute rounded-full" style={{ width: 180, height: 180, background: "rgba(236,236,236,0.06)", animation: aiSpeaking ? "aiLivePulse 1.2s ease-out infinite" : "none" }} />
                            <span className="absolute rounded-full" style={{ width: 140, height: 140, background: "rgba(236,236,236,0.08)", animation: aiSpeaking ? "aiLivePulse 1.2s ease-out infinite 0.3s" : "none" }} />
                        </>
                    )}
                    <span className="relative w-28 h-28 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-14 h-14 select-none" draggable={false} />
                    </span>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-[var(--foreground)]">{statusText}</p>
                    {status === "live" && <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{mmss}</p>}
                </div>
            </div>

            {/* Pastki — boshqaruv */}
            <div className="w-full max-w-md flex flex-col items-center gap-5">
                {(status === "idle" || status === "ended" || status === "error") ? (
                    <>
                        {/* Ovoz tanlash */}
                        <div className="flex items-center gap-2">
                            {LIVE_VOICES.map(v => {
                                const active = voice === v.id;
                                return (
                                    <button key={v.id} onClick={() => setVoice(v.id)}
                                        className="px-4 py-2 rounded-xl text-left transition-colors"
                                        style={active ? { background: T.primary, color: T.onPrimary } : { background: "rgba(255,255,255,0.05)", color: "var(--foreground)", border: `1px solid ${T.border}` }}>
                                        <span className="block text-sm font-black">{v.name}</span>
                                        <span className="block text-[10px] opacity-70">{v.sub}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={start}
                            className="w-16 h-16 rounded-full grid place-items-center hover:brightness-105"
                            style={{ background: "#22c55e", color: "#fff" }} title="Suhbatni boshlash">
                            <AudioLines className="w-7 h-7" />
                        </button>
                        <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)" }}>
                            Tugmani bosing va o'zbekcha gaplashing. Mikrofonga ruxsat bering.
                        </p>
                    </>
                ) : (
                    <div className="flex items-center gap-5">
                        <button onClick={() => setMuted(m => !m)} disabled={status !== "live"}
                            className="w-14 h-14 rounded-full grid place-items-center disabled:opacity-40"
                            style={{ background: muted ? "#EF4444" : "rgba(255,255,255,0.08)", color: "#fff" }}
                            title={muted ? "Mikrofonni yoqish" : "Mikrofonni o'chirish"}>
                            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                        <button onClick={end}
                            className="w-16 h-16 rounded-full grid place-items-center hover:brightness-105"
                            style={{ background: "#EF4444", color: "#fff" }} title="Tugatish">
                            {status === "connecting" ? <Loader2 className="w-7 h-7 animate-spin" /> : <PhoneOff className="w-7 h-7" />}
                        </button>
                    </div>
                )}
            </div>

            <style>{`@keyframes aiLivePulse{0%{transform:scale(0.9);opacity:0.7}100%{transform:scale(1.5);opacity:0}}`}</style>
        </div>
    );
}
