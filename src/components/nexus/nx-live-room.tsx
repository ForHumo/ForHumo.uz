"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X, Radio, Eye, Send, Loader2, StopCircle, Clock, CalendarClock, Gift,
    Volume2, VolumeX, Volume1, Play, Pause, Maximize2, Minimize2,
    MessageSquare, MessageSquareOff, Share2, MoreVertical,
} from "lucide-react";
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant } from "livekit-client";
import { formatMoney, type Currency } from "@/lib/money";
import { NxVerifiedBadge } from "./nx-verified-badge";
import { NxConfirm } from "./nx-confirm";

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface RoomStream {
    id: string; title: string; category: string | null; privacy: string;
    status: "UPCOMING" | "LIVE" | "ENDED";
    scheduledAt: string | null; startedAt: string | null; endedAt: string | null;
    viewers: number; peakViewers: number; likes: number; isMine: boolean;
    author: LAuthor | null;
    description?: string | null; recordingUrl?: string | null; recordingDurationSec?: number | null;
}
interface ChatMsg { id: string; text: string; tipAmount?: number; createdAt: string; author: LAuthor | null }

function scPresets(c: Currency) { return c === "USD" ? [1, 5, 10, 50] : [5000, 10000, 50000, 100000]; }

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }
function fmtViewers(n: number) {
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// NxLiveRoom — tomoshabin xonasi: real chat (polling) + heartbeat ko'ruvchi soni.
// Video oqimi Faza 3'da professional provayder bilan ulanadi (foydalanuvchi qarori).
// ─────────────────────────────────────────────────────────────────────────────
export function NxLiveRoom({ streamId, onClose }: { streamId: string; onClose: () => void }) {
    const [stream, setStream] = useState<RoomStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewers, setViewers] = useState(0);
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [ending, setEnding] = useState(false);
    const [scOpen, setScOpen] = useState(false);       // Super Chat summa tanlovi ochiqmi
    const [scAmount, setScAmount] = useState(0);        // 0 = oddiy xabar
    const [chatError, setChatError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<Currency>("UZS");
    const lastTsRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const videoElRef = useRef<HTMLVideoElement>(null);
    const audioElRef = useRef<HTMLAudioElement>(null);
    const roomRef = useRef<Room | null>(null);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
    // Player controls
    const [volume, setVolume] = useState(1);         // 0..1
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [chatOpen, setChatOpen] = useState(true);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [endConfirmOpen, setEndConfirmOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [shareToast, setShareToast] = useState(false);
    const controlsTimerRef = useRef<number | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Tafsilot — ochilishda + har 15s (status o'zgarishini ushlash uchun)
    const loadDetail = useCallback(() => {
        fetch(`/api/nexus/live/${streamId}`)
            .then(r => r.json())
            .then(d => { if (d.stream) { setStream(d.stream); setViewers(d.stream.viewers); } })
            .finally(() => setLoading(false));
    }, [streamId]);
    useEffect(() => {
        loadDetail();
        const iv = setInterval(loadDetail, 15_000);
        return () => clearInterval(iv);
    }, [loadDetail]);

    // Tomoshabin valyutasi (Super Chat uchun)
    useEffect(() => {
        fetch("/api/pay/wallet").then(r => r.json()).then(d => setCurrency(d.currency === "USD" ? "USD" : "UZS")).catch(() => { });
    }, []);

    // Heartbeat — faqat LIVE paytida, har 10s
    useEffect(() => {
        if (stream?.status !== "LIVE") return;
        const beat = () => fetch(`/api/nexus/live/${streamId}/heartbeat`, { method: "POST" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d && typeof d.viewers === "number") setViewers(d.viewers); })
            .catch(() => { });
        beat();
        const iv = setInterval(beat, 10_000);
        return () => clearInterval(iv);
    }, [stream?.status, streamId]);

    // Chat polling — har 3.5s, since kursori bilan
    useEffect(() => {
        if (!stream || stream.status === "UPCOMING") return;
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
    }, [stream, streamId]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    // ── LiveKit subscribe — video oqimini olish ──
    useEffect(() => {
        if (stream?.status !== "LIVE") return;
        let cancelled = false;
        (async () => {
            try {
                const tk = await fetch(`/api/nexus/live/${streamId}/token`).then(r => r.json());
                if (cancelled || !tk?.token || !tk?.url) return;
                const room = new Room({ adaptiveStream: true, dynacast: true });

                const onTrackSubscribed = (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
                    if (track.kind === Track.Kind.Video && videoElRef.current) {
                        track.attach(videoElRef.current);
                        setHasRemoteVideo(true);
                    } else if (track.kind === Track.Kind.Audio && audioElRef.current) {
                        track.attach(audioElRef.current);
                    }
                };
                const onTrackUnsubscribed = (track: RemoteTrack) => {
                    // React boshqaradigan element'ni DOM'dan olib tashlamaymiz —
                    // faqat track detach; element ref keyingi subscribe uchun mavjud qoladi.
                    if (track.kind === Track.Kind.Video && videoElRef.current) {
                        track.detach(videoElRef.current);
                        setHasRemoteVideo(false);
                    } else if (track.kind === Track.Kind.Audio && audioElRef.current) {
                        track.detach(audioElRef.current);
                    }
                };

                room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
                room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
                await room.connect(tk.url, tk.token);
                if (cancelled) { room.disconnect(); return; }
                roomRef.current = room;

                // Xonaga kirganda mavjud publisher (streamer) tracks'larini olish
                room.remoteParticipants.forEach(p => {
                    p.trackPublications.forEach(pub => {
                        if (pub.isSubscribed && pub.track) onTrackSubscribed(pub.track, pub, p);
                    });
                });
            } catch (e) {
                console.warn("[NxLiveRoom] LiveKit subscribe xato:", e);
            }
        })();
        return () => {
            cancelled = true;
            try { roomRef.current?.disconnect(); } catch { /* ignore */ }
            roomRef.current = null;
            setHasRemoteVideo(false);
        };
    }, [stream?.status, streamId]);

    async function send() {
        const isSC = scAmount > 0;
        if ((!input.trim() && !isSC) || busy) return;
        setBusy(true); setChatError(null);
        const text = input.trim();
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/chat`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, ...(isSC ? { tipAmount: scAmount } : {}) }),
            });
            const d = await r.json();
            if (r.ok) {
                setInput(""); setScAmount(0); setScOpen(false);
                setMsgs(prev => [...prev, d.message].slice(-200));
                lastTsRef.current = d.message.createdAt;
            } else {
                setChatError(d.error || "Yuborilmadi");
            }
        } catch {
            setChatError("Tarmoq xatosi");
        } finally { setBusy(false); }
    }

    async function endStream() {
        if (!stream?.isMine || ending) return;
        setEnding(true);
        try {
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }),
            });
            loadDetail();
            setEndConfirmOpen(false);
        } finally { setEnding(false); }
    }

    // ── Player controls: volume/muted/paused ──
    useEffect(() => {
        const v = videoElRef.current; const a = audioElRef.current;
        if (v) { v.volume = volume; v.muted = muted; }
        if (a) { a.volume = volume; a.muted = muted; }
    }, [volume, muted]);
    useEffect(() => {
        const v = videoElRef.current; const a = audioElRef.current;
        if (paused) { v?.pause(); a?.pause(); }
        else { v?.play().catch(() => {}); a?.play().catch(() => {}); }
    }, [paused]);

    // Fullscreen event
    useEffect(() => {
        const h = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", h);
        return () => document.removeEventListener("fullscreenchange", h);
    }, []);

    async function toggleFullscreen() {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await stageRef.current?.requestFullscreen();
        } catch { /* ruxsat yo'q */ }
    }

    // Auto-hide controls in fullscreen
    function pokeControls() {
        setControlsVisible(true);
        if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
        if (fullscreen || !chatOpen) {
            controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
        }
    }
    useEffect(() => { pokeControls(); }, [fullscreen, chatOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
            if (e.key === " ") { e.preventDefault(); setPaused(p => !p); pokeControls(); }
            else if (e.key === "m" || e.key === "M") { setMuted(m => !m); pokeControls(); }
            else if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
            else if (e.key === "c" || e.key === "C") { setChatOpen(o => !o); }
            else if (e.key === "Escape" && !fullscreen) { onClose(); }
            else if (e.key === "ArrowUp") { setVolume(v => Math.min(1, v + 0.05)); pokeControls(); }
            else if (e.key === "ArrowDown") { setVolume(v => Math.max(0, v - 0.05)); pokeControls(); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullscreen]);

    async function share() {
        const url = `${location.origin}/nexus/live/${streamId}`;
        try {
            if (navigator.share) await navigator.share({ title: stream?.title || "Jonli efir", url });
            else { await navigator.clipboard.writeText(url); setShareToast(true); setTimeout(() => setShareToast(false), 2000); }
        } catch { /* rad etildi */ }
    }

    const isLive = stream?.status === "LIVE";
    const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row" style={{ background: "rgba(5,8,24,0.98)" }}>

            {/* ── Sahna (video maydoni) ── */}
            <div ref={stageRef}
                onMouseMove={pokeControls} onTouchStart={pokeControls}
                className="flex-1 bg-black flex items-center justify-center min-h-0 relative group/stage">
                {/* LiveKit remote video (LIVE bo'lganda ko'rinadi) */}
                <video ref={videoElRef} autoPlay playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ display: isLive && hasRemoteVideo ? "block" : "none" }} />
                <audio ref={audioElRef} autoPlay />

                {/* Yuqori control bar — X yopish, chat toggle, share */}
                <div className={`absolute top-0 left-0 right-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)" }}>
                    <button onClick={onClose} title="Yopish (Esc)"
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1" />
                    <button onClick={share} title="Ulashish"
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <Share2 className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => setChatOpen(o => !o)} title={chatOpen ? "Chatni yashirish (C)" : "Chatni ochish (C)"}
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition hidden md:flex"
                        style={{ background: chatOpen ? "rgba(0,206,200,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        {chatOpen ? <MessageSquare className="w-4 h-4 text-white" /> : <MessageSquareOff className="w-4 h-4 text-white" />}
                    </button>
                    <button onClick={toggleFullscreen} title={fullscreen ? "Chiqish (F)" : "To'liq ekran (F)"}
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        {fullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                    </button>
                </div>

                {/* Pastki control bar — pause/volume */}
                {(isLive && hasRemoteVideo) && (
                    <div className={`absolute bottom-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)" }}>
                        <button onClick={() => setPaused(p => !p)} title={paused ? "Davom (Space)" : "Pauza (Space)"}
                            className="w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            {paused ? <Play className="w-5 h-5 text-white fill-white" /> : <Pause className="w-5 h-5 text-white fill-white" />}
                        </button>
                        <button onClick={() => setMuted(m => !m)} title={muted ? "Ovozni yoqish (M)" : "Ovozni o'chirish (M)"}
                            className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            <VolIcon className="w-4 h-4 text-white" />
                        </button>
                        <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                            onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                            className="w-24 md:w-32 accent-[#F97316]" />
                        <div className="flex-1" />
                        <span className="hidden md:inline text-[10px] font-black px-2 py-1 rounded-md" style={{ color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.4)" }}>
                            Space · M · F · C
                        </span>
                    </div>
                )}

                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-white/60" />
                ) : !stream ? (
                    <p className="text-sm text-white/60">Efir topilmadi</p>
                ) : hasRemoteVideo && isLive ? null : (
                    <div className="flex flex-col items-center gap-4 px-6 text-center">
                        <div className="relative">
                            <img src={avatarOf(stream.author)} alt="" className="w-24 h-24 rounded-full object-cover bg-white"
                                style={{ border: `3px solid ${isLive ? "#EF4444" : "rgba(100,110,140,0.5)"}` }} />
                            {isLive && (
                                <>
                                    <span className="absolute inset-0 rounded-full animate-ping" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                                    </span>
                                </>
                            )}
                        </div>
                        {stream.status === "UPCOMING" ? (
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-sm font-black text-white flex items-center gap-1.5"><CalendarClock className="w-4 h-4" style={{ color: "#10B981" }} /> Efir hali boshlanmagan</p>
                                {stream.scheduledAt && <p className="text-xs" style={{ color: "rgba(150,170,210,0.75)" }}>Rejada: {new Date(stream.scheduledAt).toLocaleString("uz-UZ")}</p>}
                            </div>
                        ) : stream.status === "ENDED" ? (
                            stream.recordingUrl ? (
                                <div className="w-full">
                                    <video src={stream.recordingUrl} controls playsInline className="w-full max-h-[70vh] bg-black rounded-xl" />
                                    <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(150,170,210,0.65)" }}>
                                        Yozib olingan efir · {stream.recordingDurationSec ? `${Math.floor(stream.recordingDurationSec / 60)}:${String(stream.recordingDurationSec % 60).padStart(2, "0")}` : ""}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm font-black text-white">Efir tugadi</p>
                                    <p className="text-xs flex items-center gap-2" style={{ color: "rgba(150,170,210,0.75)" }}>
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtViewers(stream.peakViewers)} eng yuqori</span>
                                        {stream.startedAt && stream.endedAt && (
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.max(1, Math.round((new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()) / 60000))} daqiqa</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] mt-1" style={{ color: "rgba(150,170,210,0.55)" }}>Yozuv mavjud emas</p>
                                </div>
                            )
                        ) : (
                            <p className="text-xs max-w-xs leading-relaxed" style={{ color: "rgba(150,170,210,0.7)" }}>
                                Video oqimini kutmoqda...
                            </p>
                        )}
                        {stream.isMine && isLive && (
                            <button onClick={() => setEndConfirmOpen(true)} disabled={ending}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-60"
                                style={{ background: "rgba(239,68,68,0.85)" }}>
                                {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Efirni tugatish
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Ma'lumot + chat ── */}
            {chatOpen && (
            <div className="md:w-96 flex flex-col flex-shrink-0 min-h-0" style={{ background: "rgba(8,12,32,0.98)", borderLeft: "1px solid rgba(239,68,68,0.15)", maxHeight: "100vh", height: "55vh" }}>
                <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(239,68,68,0.10)" }}>
                    <h3 className="text-sm font-black text-white leading-snug mb-1.5 pr-8">{stream?.title ?? "..."}</h3>
                    <div className="flex items-center gap-2.5">
                        <img src={avatarOf(stream?.author ?? null)} alt="" className="w-7 h-7 rounded-full object-cover bg-white" style={{ border: "1px solid rgba(239,68,68,0.3)" }} />
                        <span className="text-xs font-bold text-white truncate inline-flex items-center gap-1">
                            {stream?.author?.name || stream?.author?.username || "Streamer"}
                            {stream?.author?.verified && <NxVerifiedBadge category={stream.author.verifiedCategory} size={12} />}
                        </span>
                        {isLive && (
                            <span className="ml-auto flex items-center gap-1 text-[11px] font-black" style={{ color: "#F97316" }}>
                                <Eye className="w-3.5 h-3.5" />{fmtViewers(viewers)}
                            </span>
                        )}
                        {stream?.category && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.12)", color: "rgba(240,160,140,0.9)" }}>#{stream.category}</span>}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0" style={{ scrollbarWidth: "none" }}>
                    {stream?.status === "UPCOMING" ? (
                        <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Chat efir boshlanganda ochiladi</p>
                    ) : msgs.length === 0 ? (
                        <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Birinchi xabarni yozing</p>
                    ) : msgs.map(m => (
                        (m.tipAmount ?? 0) > 0 ? (
                            <div key={m.id} className="my-1.5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.45)", boxShadow: "0 2px 12px rgba(245,158,11,0.2)" }}>
                                <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-white">
                                        <Gift className="w-3 h-3" />{m.author?.name || m.author?.username || "Foydalanuvchi"}
                                        {m.author?.verified && <NxVerifiedBadge category={(m.author as unknown as { verifiedCategory?: string | null })?.verifiedCategory} size={12} />}
                                    </span>
                                    <span className="text-[11px] font-black text-white">{formatMoney(m.tipAmount ?? 0, currency)}</span>
                                </div>
                                {m.text && <p className="px-2.5 py-1.5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.10)", color: "rgba(245,225,190,0.95)" }}>{m.text}</p>}
                            </div>
                        ) : (
                            <div key={m.id} className="flex gap-2 py-1.5">
                                <img src={avatarOf(m.author)} alt="" className="w-6 h-6 rounded-lg object-cover bg-white flex-shrink-0" />
                                <p className="text-xs leading-relaxed min-w-0">
                                    <span className="font-black mr-1.5 inline-flex items-center gap-0.5" style={{ color: "rgba(240,160,140,0.95)" }}>
                                        {m.author?.name || m.author?.username || "Foydalanuvchi"}
                                        {m.author?.verified && <NxVerifiedBadge category={(m.author as unknown as { verifiedCategory?: string | null })?.verifiedCategory} size={12} />}
                                    </span>
                                    <span style={{ color: "rgba(210,220,245,0.9)" }}>{m.text}</span>
                                </p>
                            </div>
                        )
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Yozish */}
                {stream && stream.status !== "ENDED" && stream.status !== "UPCOMING" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(239,68,68,0.10)" }}>
                        {/* Super Chat summa tanlovi */}
                        {scOpen && !stream.isMine && (
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                <span className="text-[10px] font-black inline-flex items-center gap-1 mr-1" style={{ color: "#F59E0B" }}><Gift className="w-3 h-3" />Super Chat:</span>
                                {scPresets(currency).map(p => (
                                    <button key={p} onClick={() => setScAmount(scAmount === p ? 0 : p)}
                                        className="px-2 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                                        style={scAmount === p
                                            ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff" }
                                            : { background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.3)", color: "rgba(245,200,120,0.95)" }}>
                                        {formatMoney(p, currency)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {chatError && <p className="text-[11px] font-bold mb-2" style={{ color: "#EF4444" }}>{chatError}</p>}
                        <div className="flex gap-2">
                            {!stream.isMine && (
                                <button onClick={() => { setScOpen(o => !o); if (scOpen) setScAmount(0); }} title="Super Chat"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95 transition"
                                    style={scOpen
                                        ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)" }
                                        : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                                    <Gift className="w-4 h-4" style={{ color: scOpen ? "#fff" : "#F59E0B" }} />
                                </button>
                            )}
                            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                                placeholder={scAmount > 0 ? `${formatMoney(scAmount, currency)} bilan xabar...` : "Xabar yozing..."} className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", caretColor: "#F97316" }} />
                            <button onClick={send} disabled={busy || (!input.trim() && scAmount === 0)}
                                className="px-3 h-9 flex items-center justify-center gap-1 rounded-xl text-white text-xs font-black disabled:opacity-40"
                                style={{ background: scAmount > 0 ? "linear-gradient(135deg,#F59E0B,#EF4444)" : "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : scAmount > 0 ? <>{formatMoney(scAmount, currency)}</> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                )}
                {stream?.status === "ENDED" && (
                    <div className="px-4 py-3 flex-shrink-0 text-center" style={{ borderTop: "1px solid rgba(239,68,68,0.10)" }}>
                        <p className="text-[11px] font-bold flex items-center justify-center gap-1.5" style={{ color: "rgba(150,150,180,0.7)" }}>
                            <Radio className="w-3.5 h-3.5" /> Efir yakunlangan — chat yopiq
                        </p>
                    </div>
                )}
            </div>
            )}

            {/* Efirni tugatish tasdiqlash */}
            <NxConfirm open={endConfirmOpen} title="Efirni tugatishmi?"
                message="Efir tugatilgach yozuv Nexus platformasida qoladi, ammo qayta boshlash mumkin emas."
                confirmText="Tugatish" tone="danger" busy={ending}
                onCancel={() => !ending && setEndConfirmOpen(false)}
                onConfirm={endStream} />

            {/* Share toast */}
            {shareToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-xl text-xs font-black text-white animate-in fade-in slide-in-from-bottom-2"
                    style={{ background: "linear-gradient(135deg,#00CEC8,#2B3EE8)", boxShadow: "0 8px 24px rgba(0,206,200,0.35)" }}>
                    Havola nusxalandi
                </div>
            )}
        </div>,
        document.body,
    );
}
