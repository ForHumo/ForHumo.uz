"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    X, Radio, Mic, MicOff, Camera, CameraOff, Eye, Loader2,
    Send, Globe, Users, Lock, StopCircle, BadgeCheck, Clock, MessageSquare,
} from "lucide-react";
import { Room, LocalVideoTrack, LocalAudioTrack, Track } from "livekit-client";
import { useNxPlayer } from "./nx-player-ctx";

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

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface ChatMsg { id: string; text: string; createdAt: string; author: LAuthor | null }

const PRIVACY_OPTS: { value: Privacy; label: string; icon: React.ElementType }[] = [
    { value: "PUBLIC", label: "Hammaga ochiq", icon: Globe },
    { value: "FRIENDS", label: "Do'stlar uchun", icon: Users },
    { value: "PRIVATE", label: "Maxfiy", icon: Lock },
];

const CATS = [
    { id: "", label: "Boshqa" },
    { id: "gaming", label: "Gaming" },
    { id: "musiqa", label: "Musiqa" },
    { id: "dasturlash", label: "Dasturlash" },
    { id: "sport", label: "Sport" },
    { id: "talim", label: "Ta'lim" },
];

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }

export function NxGoLive() {
    const { goLiveOpen, setGoLiveOpen } = useNxPlayer();

    const [stage, setStage] = useState<Stage>("setup");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [privacy, setPrivacy] = useState<Privacy>("PUBLIC");
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
        navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
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

    const close = useCallback(() => setGoLiveOpen(false), [setGoLiveOpen]);

    if (!goLiveOpen) return null;

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
                body: JSON.stringify({ title, category, privacy }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.stream) { setErr(d.error || "Efir boshlanmadi"); return; }

            // LiveKit token — video oqimini tomoshabinlarga uzatish uchun
            const newId: string = d.stream.id;
            const tk = await fetch(`/api/nexus/live/${newId}/token`).then(x => x.json()).catch(() => null);
            if (tk?.token && tk?.url && mediaRef.current) {
                try {
                    const room = new Room({ adaptiveStream: true, dynacast: true });
                    await room.connect(tk.url, tk.token);
                    roomRef.current = room;
                    const videoTrack = mediaRef.current.getVideoTracks()[0];
                    const audioTrack = mediaRef.current.getAudioTracks()[0];
                    if (videoTrack) {
                        const lv = new LocalVideoTrack(videoTrack);
                        await room.localParticipant.publishTrack(lv, { source: Track.Source.Camera });
                        publishedTracksRef.current.video = lv;
                    }
                    if (audioTrack) {
                        const la = new LocalAudioTrack(audioTrack);
                        await room.localParticipant.publishTrack(la, { source: Track.Source.Microphone });
                        publishedTracksRef.current.audio = la;
                    }
                } catch (e) {
                    console.warn("[NxGoLive] LiveKit publish xato:", e);
                    // Video transport ishlamasa ham efir DB'da qoladi (chat + heartbeat baribir real)
                }
            }

            setStreamId(newId); setStage("live"); setDuration(0);
        } catch { setErr("Tarmoq xatosi"); }
        finally { setStarting(false); }
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
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }),
            });
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
        return (
            <>
                <div className="fixed inset-0 z-[55]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={close} />
                <div className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:rounded-3xl"
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
            </>
        );
    }

    /* ── LIVE — studio ── */
    if (stage === "live") {
        return (
            <div className="fixed inset-0 z-[55] flex flex-col md:flex-row" style={{ background: "rgba(5,8,24,0.98)" }}>
                <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                    <div className="w-full max-w-3xl">{cameraBlock}
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
                        <span className="ml-auto flex items-center gap-1 text-[11px] font-black" style={{ color: "#F97316" }}><Eye className="w-3.5 h-3.5" />{viewers}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0" style={{ scrollbarWidth: "none" }}>
                        {msgs.length === 0 ? (
                            <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Tomoshabinlar xabarlari shu yerda chiqadi</p>
                        ) : msgs.map(m => (
                            <div key={m.id} className="flex gap-2 py-1.5">
                                <img src={avatarOf(m.author)} alt="" className="w-6 h-6 rounded-lg object-cover bg-white flex-shrink-0" />
                                <p className="text-xs leading-relaxed min-w-0">
                                    <span className="font-black mr-1.5 inline-flex items-center gap-0.5" style={{ color: "rgba(240,160,140,0.95)" }}>
                                        {m.author?.name || m.author?.username || "Foydalanuvchi"}
                                        {m.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                    </span>
                                    <span style={{ color: "rgba(210,220,245,0.9)" }}>{m.text}</span>
                                </p>
                            </div>
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
            </div>
        );
    }

    /* ── ENDED — statistika ── */
    return (
        <>
            <div className="fixed inset-0 z-[55]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={close} />
            <div className="fixed z-[55] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm p-7 rounded-3xl text-center"
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
                <button onClick={close} className="w-full h-11 rounded-xl text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    Yopish
                </button>
            </div>
        </>
    );
}
