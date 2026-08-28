"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X, Radio, Mic, MicOff, Camera, CameraOff, Eye, Loader2,
    Send, Globe, Users, Lock, StopCircle, Clock, MessageSquare,
    Monitor, MonitorOff, Layout, User, Sparkles, Gift,
} from "lucide-react";
import { Room, LocalVideoTrack, LocalAudioTrack, Track } from "livekit-client";
import { upload } from "@vercel/blob/client";
import { useNxPlayer } from "./nx-player-ctx";
import { createStudio, startStudioRecorder, type Studio, type StudioRecorder, type SceneLayout } from "@/lib/nexus-live-studio";
import { formatMoney, type Currency } from "@/lib/money";
import { NxVerifiedBadge } from "./nx-verified-badge";

// ─────────────────────────────────────────────────────────────────────────────
// NxGoLive — REAL streamer studiyasi:
//  • getUserMedia kamera/mikrofon (haqiqiy oldindan ko'rish)
//  • POST /api/nexus/live — efir DB'da yaratiladi (LiveView ro'yxatida chiqadi)
//  • Jonli: real chat (polling) + real ko'ruvchilar (detail GET) + real timer
//  • Tugatish: PATCH end → real statistika
//  Video oqimini tomoshabinlarga uzatish — Faza 3 (professional provayder).
// ─────────────────────────────────────────────────────────────────────────────

type Stage = "setup" | "live" | "ended";
type Privacy = "PUBLIC" | "FRIENDS" | "PRIVATE";

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface ChatMsg { id: string; text: string; tipAmount?: number; createdAt: string; author: LAuthor | null }

const PRIVACY_OPTS: { value: Privacy; label: string; icon: React.ElementType }[] = [
    { value: "PUBLIC", label: "Hammaga ochiq", icon: Globe },
    { value: "FRIENDS", label: "Do'stlar uchun", icon: Users },
    { value: "PRIVATE", label: "Maxfiy", icon: Lock },
];

const CATS = [
    { id: "", label: "Umumiy" },
    { id: "suhbat", label: "Suhbat" },
    { id: "musiqa", label: "Musiqa" },
    { id: "talim", label: "Ta'lim" },
    { id: "kulinariya", label: "Oshxona" },
    { id: "sport", label: "Sport" },
    { id: "shou", label: "Shou" },
    { id: "podkast", label: "Podkast" },
    { id: "gaming", label: "Gaming" },
    { id: "dasturlash", label: "Dasturlash" },
];

const LAYOUTS: { id: SceneLayout; label: string; icon: React.ElementType }[] = [
    { id: "solo",    label: "Solo",     icon: User },
    { id: "podcast", label: "Podkast",  icon: MessageSquare },
    { id: "pip",     label: "PiP",      icon: Layout },
    { id: "screen",  label: "Ekran",    icon: Monitor },
];

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }

export function NxGoLive() {
    const { goLiveOpen, setGoLiveOpen } = useNxPlayer();

    const [stage, setStage] = useState<Stage>("setup");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [privacy, setPrivacy] = useState<Privacy>("PUBLIC");
    const [crossToChannel, setCrossToChannel] = useState(true);   // efir kanalda ham
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [camErr, setCamErr] = useState(false);
    const [starting, setStarting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [streamId, setStreamId] = useState<string | null>(null);
    const [viewers, setViewers] = useState(0);
    const [peak, setPeak] = useState(0);
    const [duration, setDuration] = useState(0);
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [chatIn, setChatIn] = useState("");
    const [chatBusy, setChatBusy] = useState(false);
    const [endingBusy, setEndingBusy] = useState(false);
    const [description, setDescription] = useState("");
    const [layout, setLayout] = useState<SceneLayout>("solo");
    const [screenOn, setScreenOn] = useState(false);
    const [recordingReady, setRecordingReady] = useState(false);   // recording tugagach show
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [currency, setCurrency] = useState<Currency>("UZS");
    const [totalTips, setTotalTips] = useState(0);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (!goLiveOpen) return;
        fetch("/api/pay/wallet").then(r => r.json()).then(d => setCurrency(d.currency === "USD" ? "USD" : "UZS")).catch(() => {});
    }, [goLiveOpen]);
    const screenRef = useRef<MediaStream | null>(null);
    const studioRef = useRef<Studio | null>(null);
    const recorderRef = useRef<StudioRecorder | null>(null);
    const recordStartRef = useRef<number>(0);

    const mediaRef = useRef<MediaStream | null>(null);
    const videoElRef = useRef<HTMLVideoElement>(null);
    const lastTsRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const roomRef = useRef<Room | null>(null);
    const publishedTracksRef = useRef<{ video?: LocalVideoTrack; audio?: LocalAudioTrack }>({});
    // Modal yopilganda cleanup uchun eng oxirgi qiymatlarni ushlash
    const streamIdRef = useRef<string | null>(null);
    const stageRef = useRef<Stage>("setup");
    useEffect(() => { streamIdRef.current = streamId; }, [streamId]);
    useEffect(() => { stageRef.current = stage; }, [stage]);

    // ── Kamera/mikrofon — modal ochilganda yoqiladi, yopilganda o'chadi ──
    useEffect(() => {
        if (!goLiveOpen) return;
        let cancelled = false;
        navigator.mediaDevices?.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
            .then(ms => {
                if (cancelled) { ms.getTracks().forEach(t => t.stop()); return; }
                mediaRef.current = ms;
                if (videoElRef.current) videoElRef.current.srcObject = ms;
                setCamErr(false);
            })
            .catch(() => setCamErr(true));
        return () => {
            cancelled = true;
            mediaRef.current?.getTracks().forEach(t => t.stop());
            mediaRef.current = null;
        };
    }, [goLiveOpen]);

    // Stage almashganda video elementga oqimni qayta ulash (remount bo'ladi)
    useEffect(() => {
        if (videoElRef.current && mediaRef.current) videoElRef.current.srcObject = mediaRef.current;
    }, [stage]);

    useEffect(() => {
        mediaRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; });
        publishedTracksRef.current.audio?.mediaStreamTrack && (publishedTracksRef.current.audio.mediaStreamTrack.enabled = micOn);
    }, [micOn]);
    useEffect(() => {
        mediaRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; });
        publishedTracksRef.current.video?.mediaStreamTrack && (publishedTracksRef.current.video.mediaStreamTrack.enabled = camOn);
    }, [camOn]);

    // ── Reset (yopilganda) — jonli efir aktiv bo'lsa DB'da ham tugatiladi ──
    useEffect(() => {
        if (!goLiveOpen) {
            const wasLive = stageRef.current === "live";
            const activeId = streamIdRef.current;
            disconnectLiveKit();
            // Efir aktiv edi va foydalanuvchi tugatmasdan yopdi — avto-tugatish
            if (wasLive && activeId) {
                fetch(`/api/nexus/live/${activeId}`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }),
                }).catch(() => { });
            }
            setStage("setup"); setTitle(""); setCategory(""); setPrivacy("PUBLIC");
            setMicOn(true); setCamOn(true); setStarting(false); setErr(null);
            setStreamId(null); setViewers(0); setPeak(0); setDuration(0);
            setMsgs([]); setChatIn(""); lastTsRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goLiveOpen]);

    // ── Jonli: real timer ──
    useEffect(() => {
        if (stage !== "live") return;
        const iv = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(iv);
    }, [stage]);

    // ── Jonli: real ko'ruvchilar (detail GET, har 10s) ──
    useEffect(() => {
        if (stage !== "live" || !streamId) return;
        const poll = () => fetch(`/api/nexus/live/${streamId}`)
            .then(r => r.json())
            .then(d => { if (d.stream) { setViewers(d.stream.viewers); setPeak(d.stream.peakViewers); } })
            .catch(() => { });
        poll();
        const iv = setInterval(poll, 10_000);
        return () => clearInterval(iv);
    }, [stage, streamId]);

    // ── Jonli: real chat polling (3.5s) ──
    useEffect(() => {
        if (stage !== "live" || !streamId) return;
        let stop = false;
        const poll = async () => {
            try {
                const qs = lastTsRef.current ? `?since=${encodeURIComponent(lastTsRef.current)}` : "";
                const d = await fetch(`/api/nexus/live/${streamId}/chat${qs}`).then(r => r.json());
                if (stop || !d.messages?.length) return;
                setMsgs(prev => {
                    const seen = new Set(prev.map((m: ChatMsg) => m.id));
                    const fresh = d.messages.filter((m: ChatMsg) => !seen.has(m.id));
                    if (fresh.length) {
                        const tipSum = fresh.reduce((a: number, m: ChatMsg) => a + (m.tipAmount ?? 0), 0);
                        if (tipSum > 0) setTotalTips(t => t + tipSum);
                    }
                    return fresh.length ? [...prev, ...fresh].slice(-200) : prev;
                });
                lastTsRef.current = d.messages[d.messages.length - 1].createdAt;
            } catch { /* tarmoq */ }
        };
        poll();
        const iv = setInterval(poll, 3_500);
        return () => { stop = true; clearInterval(iv); };
    }, [stage, streamId]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    // Layout o'zgarganda studio ham yangilanadi
    useEffect(() => {
        studioRef.current?.setLayout(layout);
    }, [layout]);
    useEffect(() => {
        studioRef.current?.setOverlay({ title, subtitle: category ? CATS.find(c => c.id === category)?.label : undefined });
    }, [title, category]);

    const close = useCallback(() => setGoLiveOpen(false), [setGoLiveOpen]);

    if (!goLiveOpen || !mounted) return null;

    const fmtDuration = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
    };

    async function startLive() {
        if (!title.trim() || starting) return;
        setStarting(true); setErr(null);
        try {
            const r = await fetch("/api/nexus/live", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, category, privacy, crossToChannel }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.stream) { setErr(d.error || "Efir boshlanmadi"); return; }
            const newId: string = d.stream.id;

            // Studio composer — camera + screen composite
            const studio = createStudio({
                layout,
                sources: { camera: mediaRef.current ?? null, screen: screenRef.current ?? null },
                overlay: { title, subtitle: category ? CATS.find(c => c.id === category)?.label : undefined },
            });
            studioRef.current = studio;

            // Recording — composite video + audio (mikrofon)
            const audioOnly = mediaRef.current
                ? new MediaStream(mediaRef.current.getAudioTracks())
                : null;
            try {
                recorderRef.current = startStudioRecorder(studio.stream, audioOnly);
                recordStartRef.current = Date.now();
            } catch { /* recording xato bo'lsa ham efir boradi */ }

            // LiveKit token
            const tk = await fetch(`/api/nexus/live/${newId}/token`).then(x => x.json()).catch(() => null);
            if (tk?.token && tk?.url) {
                try {
                    const room = new Room({ adaptiveStream: true, dynacast: true });
                    await room.connect(tk.url, tk.token);
                    roomRef.current = room;
                    // Composite video track — canvas.captureStream'dan
                    const videoTrack = studio.stream.getVideoTracks()[0];
                    const audioTrack = mediaRef.current?.getAudioTracks()[0];
                    if (videoTrack) {
                        const lv = new LocalVideoTrack(videoTrack);
                        await room.localParticipant.publishTrack(lv, {
                            source: Track.Source.Camera,
                            simulcast: true,
                            videoEncoding: { maxBitrate: 4_500_000, maxFramerate: 30, priority: "high" },
                        });
                        publishedTracksRef.current.video = lv;
                    }
                    if (audioTrack) {
                        const la = new LocalAudioTrack(audioTrack);
                        await room.localParticipant.publishTrack(la, { source: Track.Source.Microphone });
                        publishedTracksRef.current.audio = la;
                    }
                } catch (e) {
                    console.warn("[NxGoLive] LiveKit publish xato:", e);
                }
            }

            // Description agar bor bo'lsa — meta update
            if (description.trim()) {
                fetch(`/api/nexus/live/${newId}`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "update", description }),
                }).catch(() => { });
            }

            setStreamId(newId); setStage("live"); setDuration(0);
        } catch { setErr("Tarmoq xatosi"); }
        finally { setStarting(false); }
    }

    // Screen share toggle
    async function toggleScreen() {
        if (screenOn) {
            screenRef.current?.getTracks().forEach(t => t.stop());
            screenRef.current = null;
            setScreenOn(false);
            studioRef.current?.setSources({ camera: mediaRef.current ?? null, screen: null });
            return;
        }
        try {
            const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            screenRef.current = s;
            setScreenOn(true);
            studioRef.current?.setSources({ camera: mediaRef.current ?? null, screen: s });
            // Foydalanuvchi ekran ulashishni to'xtatsa
            const track = s.getVideoTracks()[0];
            if (track) track.onended = () => {
                screenRef.current = null;
                setScreenOn(false);
                studioRef.current?.setSources({ camera: mediaRef.current ?? null, screen: null });
            };
        } catch { /* rad etildi */ }
    }

    async function disconnectLiveKit() {
        try { await roomRef.current?.disconnect(); } catch { /* ignore */ }
        roomRef.current = null;
        publishedTracksRef.current = {};
    }

    async function endLive() {
        if (!streamId || endingBusy) return;
        setEndingBusy(true);
        try {
            await disconnectLiveKit();

            // Recording tugatish + Vercel Blob'ga yuklash
            let uploadedRecUrl: string | null = null;
            let recDur = 0;
            const rec = recorderRef.current;
            if (rec) {
                try {
                    const blob = await rec.stop();
                    recDur = Math.round((Date.now() - recordStartRef.current) / 1000);
                    if (blob.size > 0 && recDur > 3) {
                        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
                        const file = new File([blob], `live-${streamId}.${ext}`, { type: blob.type || "video/webm" });
                        try {
                            const up = await upload(`nexus/live/${streamId}.${ext}`, file, {
                                access: "public", handleUploadUrl: "/api/market/upload/client-token",
                            });
                            uploadedRecUrl = up.url;
                        } catch { /* upload xato — recording yo'q */ }
                    }
                } catch { /* recorder stop xato */ }
                recorderRef.current = null;
            }
            studioRef.current?.stop();
            studioRef.current = null;

            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "end",
                    ...(uploadedRecUrl ? { recordingUrl: uploadedRecUrl, recordingDurationSec: recDur } : {}),
                }),
            });
            if (uploadedRecUrl) { setRecordingUrl(uploadedRecUrl); setRecordingReady(true); }
            const d = await fetch(`/api/nexus/live/${streamId}`).then(r => r.json()).catch(() => null);
            if (d?.stream) setPeak(d.stream.peakViewers);
            setStage("ended");
        } finally { setEndingBusy(false); }
    }

    async function sendChat() {
        if (!streamId || !chatIn.trim() || chatBusy) return;
        setChatBusy(true);
        const text = chatIn.trim(); setChatIn("");
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/chat`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
            });
            if (r.ok) {
                const d = await r.json();
                setMsgs(prev => [...prev, d.message].slice(-200));
                lastTsRef.current = d.message.createdAt;
            }
        } finally { setChatBusy(false); }
    }

    // ── Kamera preview bloki (setup va live'da umumiy) ──
    const cameraBlock = (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden"
            style={{ background: "rgba(5,8,24,0.95)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <video ref={videoElRef} autoPlay muted playsInline
                className="w-full h-full object-cover"
                style={{ display: camOn && !camErr ? "block" : "none", transform: "scaleX(-1)" }} />
            {(!camOn || camErr) && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                    <CameraOff className="w-12 h-12" style={{ color: "rgba(239,68,68,0.40)" }} />
                    <p className="text-xs" style={{ color: "rgba(80,100,150,0.70)" }}>{camErr ? "Kameraga ruxsat berilmadi" : "Kamera o'chiq"}</p>
                </div>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                <button onClick={() => setMicOn(m => !m)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150"
                    style={{ background: micOn ? "rgba(43,62,232,0.35)" : "rgba(239,68,68,0.50)", backdropFilter: "blur(8px)" }}>
                    {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
                </button>
                <button onClick={() => setCamOn(c => !c)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150"
                    style={{ background: camOn ? "rgba(43,62,232,0.35)" : "rgba(239,68,68,0.50)", backdropFilter: "blur(8px)" }}>
                    {camOn ? <Camera className="w-4 h-4 text-white" /> : <CameraOff className="w-4 h-4 text-white" />}
                </button>
            </div>
            {stage === "live" && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                    </span>
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: "rgba(5,8,24,0.75)" }}>{fmtDuration(duration)}</span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: "rgba(5,8,24,0.75)" }}>
                        <Eye className="w-3 h-3" />{viewers}
                    </span>
                </div>
            )}
        </div>
    );

    /* ── SETUP ── */
    if (stage === "setup") {
        return createPortal(
            <>
                <div className="fixed inset-0 z-[200]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={close} />
                <div className="fixed inset-x-0 bottom-0 z-[200] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:rounded-3xl"
                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "92vh" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                <Radio className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-base font-black text-white">Jonli efir boshlash</h2>
                        </div>
                        <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4" style={{ scrollbarWidth: "none" }}>
                        {cameraBlock}

                        <div>
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>Efir sarlavhasi</p>
                            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder="Bu efirda nima bo'ladi?"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#F97316" }} />
                        </div>

                        <div>
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>Tavsif (ixtiyoriy)</p>
                            <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={2}
                                placeholder="Efir haqida bir necha jumla..."
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-y"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#F97316" }} />
                        </div>

                        {/* Scene layout — Solo/Podkast/PiP/Ekran */}
                        <div>
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>
                                <Sparkles className="w-3 h-3 inline mr-1" />Sahna sxemasi
                            </p>
                            <div className="grid grid-cols-4 gap-1.5">
                                {LAYOUTS.map(l => (
                                    <button key={l.id} onClick={() => setLayout(l.id)}
                                        className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-black transition active:scale-95"
                                        style={layout === l.id
                                            ? { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff" }
                                            : { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(220,160,150,0.80)" }}>
                                        <l.icon className="w-4 h-4" />{l.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] mt-1.5 px-1" style={{ color: "rgba(140,160,210,0.60)" }}>
                                Solo — faqat kamera • Podkast — markazda kvadrat • PiP — ekran+kamera burchakda • Ekran — faqat ekran ulash
                            </p>
                        </div>

                        {/* Screen share — LIVE'dan oldin ham yoqish mumkin */}
                        {(layout === "pip" || layout === "screen") && (
                            <button onClick={toggleScreen}
                                className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl text-xs font-black transition active:scale-95"
                                style={screenOn
                                    ? { background: "rgba(0,206,200,0.15)", border: "1px solid rgba(0,206,200,0.40)", color: "#00CEC8" }
                                    : { background: "rgba(239,68,68,0.06)", border: "1px dashed rgba(239,68,68,0.30)", color: "rgba(220,160,150,0.85)" }}>
                                {screenOn ? <><Monitor className="w-3.5 h-3.5" />Ekran ulashilyapti — bekor qilish</>
                                          : <><Monitor className="w-3.5 h-3.5" />Ekranni ulash</>}
                            </button>
                        )}

                        <div>
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>Kategoriya</p>
                            <div className="flex flex-wrap gap-1.5">
                                {CATS.map(c => (
                                    <button key={c.id} onClick={() => setCategory(c.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                        style={category === c.id
                                            ? { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff" }
                                            : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.16)", color: "rgba(220,160,150,0.85)" }}>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "rgba(140,160,210,0.80)" }}>Kim ko&apos;ra oladi</p>
                            <div className="flex flex-col gap-2">
                                {PRIVACY_OPTS.map(({ value, label, icon: Icon }) => (
                                    <button key={value} onClick={() => setPrivacy(value)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition"
                                        style={privacy === value
                                            ? { background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.40)" }
                                            : { background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                        <Icon className="w-4 h-4" style={{ color: privacy === value ? "#F97316" : "rgba(140,160,210,0.7)" }} />
                                        <span className="text-xs font-bold text-white">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {err && <p className="text-xs text-red-400 font-bold">{err}</p>}

                        <button onClick={startLive} disabled={starting || !title.trim()}
                            className="w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}>
                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Radio className="w-4 h-4" /> Efirni boshlash</>}
                        </button>
                    </div>
                </div>
            </>,
            document.body,
        );
    }

    /* ── LIVE — studio ── */
    if (stage === "live") {
        return createPortal(
            <div className="fixed inset-0 z-[200] flex flex-col md:flex-row" style={{ background: "rgba(5,8,24,0.98)" }}>
                <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                    <div className="w-full max-w-3xl">{cameraBlock}
                        {/* Studio panel — live paytida layout va screen share almashtirish */}
                        <div className="mt-3 mb-2 grid grid-cols-4 gap-1.5">
                            {LAYOUTS.map(l => (
                                <button key={l.id} onClick={() => setLayout(l.id)}
                                    className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition active:scale-95"
                                    style={layout === l.id
                                        ? { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff" }
                                        : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(220,160,150,0.85)" }}>
                                    <l.icon className="w-3.5 h-3.5" />{l.label}
                                </button>
                            ))}
                        </div>
                        {(layout === "pip" || layout === "screen") && (
                            <button onClick={toggleScreen}
                                className="w-full mb-2 flex items-center gap-2 justify-center py-2 rounded-xl text-xs font-black transition active:scale-95"
                                style={screenOn
                                    ? { background: "rgba(0,206,200,0.15)", border: "1px solid rgba(0,206,200,0.40)", color: "#00CEC8" }
                                    : { background: "rgba(43,62,232,0.06)", border: "1px dashed rgba(43,62,232,0.30)", color: "rgba(160,180,230,0.85)" }}>
                                {screenOn ? <><MonitorOff className="w-3.5 h-3.5" />Ekranni to&apos;xtatish</>
                                          : <><Monitor className="w-3.5 h-3.5" />Ekranni ulash</>}
                            </button>
                        )}
                        <div className="flex items-center justify-between mt-3">
                            <p className="text-sm font-black text-white truncate pr-3">{title}</p>
                            <button onClick={endLive} disabled={endingBusy}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white flex-shrink-0 disabled:opacity-60"
                                style={{ background: "rgba(239,68,68,0.9)" }}>
                                {endingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Tugatish
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat */}
                <div className="md:w-80 flex flex-col flex-shrink-0 min-h-0" style={{ background: "rgba(8,12,32,0.98)", borderLeft: "1px solid rgba(239,68,68,0.15)", height: "45vh" }}>
                    <div className="px-4 py-3 flex-shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(239,68,68,0.10)" }}>
                        <MessageSquare className="w-4 h-4" style={{ color: "#F97316" }} />
                        <span className="text-sm font-black text-white">Jonli chat</span>
                        {totalTips > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", boxShadow: "0 2px 8px rgba(245,158,11,0.35)" }}>
                                <Gift className="w-3 h-3" />{formatMoney(totalTips, currency)}
                            </span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[11px] font-black" style={{ color: "#F97316" }}><Eye className="w-3.5 h-3.5" />{viewers}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0" style={{ scrollbarWidth: "none" }}>
                        {msgs.length === 0 ? (
                            <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Tomoshabinlar xabarlari shu yerda chiqadi</p>
                        ) : msgs.map(m => (
                            (m.tipAmount ?? 0) > 0 ? (
                                <div key={m.id} className="my-1.5 rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300"
                                    style={{ border: "1px solid rgba(245,158,11,0.55)", boxShadow: "0 4px 20px rgba(245,158,11,0.35), 0 0 20px rgba(245,158,11,0.15)" }}>
                                    <div className="flex items-center justify-between px-2.5 py-2" style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-white">
                                            <Gift className="w-3.5 h-3.5" />
                                            <img src={avatarOf(m.author)} alt="" className="w-5 h-5 rounded-full object-cover bg-white ring-1 ring-white/40 -ml-0.5" />
                                            {m.author?.name || m.author?.username || "Foydalanuvchi"}
                                            {m.author?.verified && <NxVerifiedBadge category={m.author.verifiedCategory} size={12} />}
                                        </span>
                                        <span className="text-xs font-black text-white">{formatMoney(m.tipAmount ?? 0, currency)}</span>
                                    </div>
                                    {m.text && <p className="px-2.5 py-1.5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.10)", color: "rgba(245,225,190,0.95)" }}>{m.text}</p>}
                                </div>
                            ) : (
                                <div key={m.id} className="flex gap-2 py-1.5">
                                    <img src={avatarOf(m.author)} alt="" className="w-6 h-6 rounded-lg object-cover bg-white flex-shrink-0" />
                                    <p className="text-xs leading-relaxed min-w-0">
                                        <span className="font-black mr-1.5 inline-flex items-center gap-0.5" style={{ color: "rgba(240,160,140,0.95)" }}>
                                            {m.author?.name || m.author?.username || "Foydalanuvchi"}
                                            {m.author?.verified && <NxVerifiedBadge category={m.author.verifiedCategory} size={12} />}
                                        </span>
                                        <span style={{ color: "rgba(210,220,245,0.9)" }}>{m.text}</span>
                                    </p>
                                </div>
                            )
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    <div className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(239,68,68,0.10)" }}>
                        <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                            placeholder="Javob yozing..." className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", caretColor: "#F97316" }} />
                        <button onClick={sendChat} disabled={chatBusy || !chatIn.trim()}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                            {chatBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    /* ── ENDED — statistika ── */
    return createPortal(
        <>
            <div className="fixed inset-0 z-[200]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={close} />
            <div className="fixed z-[200] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm p-7 rounded-3xl text-center"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)" }}
                onClick={e => e.stopPropagation()}>
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                    <Radio className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-black text-white mb-1">Efir yakunlandi</h2>
                <p className="text-xs mb-5 truncate" style={{ color: "rgba(150,170,220,0.75)" }}>{title}</p>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                        { icon: Clock, label: "Davomiylik", value: fmtDuration(duration) },
                        { icon: Eye, label: "Eng yuqori", value: String(Math.max(peak, viewers)) },
                        { icon: MessageSquare, label: "Xabarlar", value: String(msgs.length) },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "#F97316" }} />
                            <p className="text-sm font-black text-white">{value}</p>
                            <p className="text-[9px]" style={{ color: "rgba(150,150,180,0.7)" }}>{label}</p>
                        </div>
                    ))}
                </div>
                {recordingReady && recordingUrl && (
                    <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.30)" }}>
                        <p className="text-[11px] font-black mb-1" style={{ color: "#00CEC8" }}>Yozuv tayyor</p>
                        <p className="text-[10px] mb-2" style={{ color: "rgba(160,220,215,0.85)" }}>
                            Efir Nexus'da endi qayta ko&apos;rish mumkin
                        </p>
                        <video src={recordingUrl} controls playsInline className="w-full rounded-lg bg-black" style={{ maxHeight: 160 }} />
                    </div>
                )}
                <button onClick={close} className="w-full h-11 rounded-xl text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    Yopish
                </button>
            </div>
        </>,
        document.body,
    );
}
