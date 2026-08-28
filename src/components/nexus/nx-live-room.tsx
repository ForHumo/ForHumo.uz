"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X, Radio, Eye, Send, Loader2, StopCircle, Clock, CalendarClock, Gift,
    Volume2, VolumeX, Volume1, Play, Pause, Maximize2, Minimize2,
    MessageSquare, MessageSquareOff, Share2, Settings, Check, ChevronLeft, ChevronRight,
    Camera, EyeOff, Move,
    Heart, Flame, Laugh, ThumbsUp, PartyPopper, Sparkles, Zap, Smile, UserPlus, UserCheck,
} from "lucide-react";
import { Room, RoomEvent, Track, VideoQuality, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant, type RemoteVideoTrack } from "livekit-client";
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
    const videoElRef = useRef<HTMLVideoElement>(null);       // Asosiy — screen (yoki solo camera)
    const camPipElRef = useRef<HTMLVideoElement>(null);      // PiP — kamera
    const audioElRef = useRef<HTMLAudioElement>(null);
    const roomRef = useRef<Room | null>(null);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
    const [hasScreen, setHasScreen] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    // Viewer PiP tartibi (Batch A + D: viewer o'zi joylashtiradi)
    type PipCorner = "br" | "bl" | "tr" | "tl";
    type PipSize = "sm" | "md" | "lg";
    const [pipVisible, setPipVisible] = useState(true);
    const [pipCorner, setPipCorner] = useState<PipCorner>("br");
    const [pipSize, setPipSize] = useState<PipSize>("md");
    const [pipDrag, setPipDrag] = useState<{ x: number; y: number; corner: PipCorner } | null>(null);
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

    // Quality selector
    type QLevel = "auto" | "1080" | "720" | "480" | "240";
    const [quality, setQuality] = useState<QLevel>("auto");
    const [qualityOpen, setQualityOpen] = useState(false);
    const remoteVideoTrackRef = useRef<RemoteVideoTrack | null>(null);
    const remoteVideoPubRef = useRef<RemoteTrackPublication | null>(null);
    const [availableRes, setAvailableRes] = useState<{ w: number; h: number } | null>(null);

    // Swipe navigation
    const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; t: number } | null>(null);
    const [nextStreamId, setNextStreamId] = useState<string | null>(null);
    const [prevStreamId, setPrevStreamId] = useState<string | null>(null);
    const [swipeHint, setSwipeHint] = useState<"left" | "right" | null>(null);

    // VOD (recording) progress
    const [vodCur, setVodCur] = useState(0);
    const [vodDur, setVodDur] = useState(0);
    const [vodSpeed, setVodSpeed] = useState(1);
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

    // Batch E — Engagement suite
    type ReactionIcon = "heart" | "fire" | "laugh" | "thumbs" | "party" | "sparkle" | "wow";
    interface FloatingReaction { key: string; icon: ReactionIcon; x: number; delay: number; }
    interface TipAlert { key: string; author: LAuthor | null; amount: number; text?: string; }
    const [floating, setFloating] = useState<FloatingReaction[]>([]);
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
    const [reactionBusy, setReactionBusy] = useState(false);
    const [tipAlert, setTipAlert] = useState<TipAlert | null>(null);
    const tipQueueRef = useRef<TipAlert[]>([]);
    const seenReactionsRef = useRef<Set<string>>(new Set());
    const seenTipsRef = useRef<Set<string>>(new Set());
    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [followBusy, setFollowBusy] = useState(false);
    const [meUsername, setMeUsername] = useState<string | null>(null);

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
                if (stop) return;
                let latest: string | null = null;
                if (d.messages?.length) {
                    setMsgs(prev => {
                        const seen = new Set(prev.map((m: ChatMsg) => m.id));
                        const fresh = d.messages.filter((m: ChatMsg) => !seen.has(m.id));
                        return fresh.length ? [...prev, ...fresh].slice(-200) : prev;
                    });
                    latest = d.messages[d.messages.length - 1].createdAt;

                    // Batch E — Tip alertlar navbatga qo'shish (yangilar)
                    for (const m of d.messages as ChatMsg[]) {
                        if ((m.tipAmount ?? 0) > 0 && !seenTipsRef.current.has(m.id)) {
                            seenTipsRef.current.add(m.id);
                            tipQueueRef.current.push({ key: m.id, author: m.author, amount: m.tipAmount!, text: m.text });
                        }
                    }
                }
                // Batch E — floating reactions
                if (d.reactions?.length) {
                    const now = Date.now();
                    for (const r of d.reactions as { id: string; icon: ReactionIcon; at: string }[]) {
                        if (seenReactionsRef.current.has(r.id)) continue;
                        seenReactionsRef.current.add(r.id);
                        // Faqat oxirgi 6 sekunddagilarni ko'rsatamiz (eski poll'da qolganlarga ko'rinmasin)
                        if (now - new Date(r.at).getTime() > 6_000) continue;
                        const key = `${r.id}-${Math.random()}`;
                        const x = Math.random() * 60 + 20;
                        setFloating(prev => [...prev, { key, icon: r.icon, x, delay: 0 }].slice(-40));
                        // 3.5s dan keyin o'chirish
                        setTimeout(() => setFloating(prev => prev.filter(f => f.key !== key)), 3600);
                    }
                    if (latest) latest = d.reactions[d.reactions.length - 1].at;
                }
                if (latest) lastTsRef.current = latest;
            } catch { /* tarmoq */ }
        };
        poll();
        const iv = setInterval(poll, 3_500);
        return () => { stop = true; clearInterval(iv); };
    }, [stream, streamId]);

    // Batch E — Tip alert queue processor (bittalab, 6s ko'rsatib)
    useEffect(() => {
        if (tipAlert) return;
        const iv = setInterval(() => {
            const next = tipQueueRef.current.shift();
            if (next) {
                setTipAlert(next);
                setTimeout(() => setTipAlert(null), 6000);
            }
        }, 400);
        return () => clearInterval(iv);
    }, [tipAlert]);

    // Batch E — Follow state (kirgan tomoshabin muallif'ni kuzatadimi?)
    useEffect(() => {
        if (!stream?.author?.username) return;
        fetch(`/api/nexus/profile?username=${encodeURIComponent(stream.author.username)}`)
            .then(r => r.json())
            .then(d => {
                setIsFollowing(!!d.isFollowing);
                if (d.isMe) setMeUsername(d.username);
            })
            .catch(() => { });
    }, [stream?.author?.username]);

    async function toggleFollow() {
        if (!stream?.author?.username || followBusy || isFollowing === null) return;
        setFollowBusy(true);
        try {
            // /api/nexus/follow — yagona toggle endpoint (POST)
            const r = await fetch(`/api/nexus/follow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: stream.author.username }),
            });
            if (r.ok) {
                const d = await r.json();
                setIsFollowing(!!d.following);
            }
        } finally { setFollowBusy(false); }
    }

    async function sendReaction(icon: ReactionIcon) {
        if (reactionBusy || !isLive) return;
        setReactionBusy(true);
        // Optimistic — o'zim ko'raman
        const key = `me-${Date.now()}-${Math.random()}`;
        setFloating(prev => [...prev, { key, icon, x: Math.random() * 60 + 20, delay: 0 }].slice(-40));
        setTimeout(() => setFloating(prev => prev.filter(f => f.key !== key)), 3600);
        try {
            await fetch(`/api/nexus/live/${streamId}/react`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ icon }),
            });
        } finally { setReactionBusy(false); }
    }

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

                // Batch A: Screen va Camera alohida track'lar sifatida keladi.
                // Screen → asosiy videoElRef, Camera → camPipElRef (agar screen ham bor bo'lsa) yoki asosiy (solo).
                const attachVideoTo = (track: RemoteTrack, el: HTMLVideoElement | null, pub: RemoteTrackPublication) => {
                    if (!el) return;
                    track.attach(el);
                    remoteVideoTrackRef.current = track as RemoteVideoTrack;
                    remoteVideoPubRef.current = pub;
                    const applyRes = () => {
                        const w = el.videoWidth, h = el.videoHeight;
                        if (w && h) setAvailableRes({ w, h });
                    };
                    el.addEventListener("loadedmetadata", applyRes);
                    el.addEventListener("resize", applyRes);
                    applyRes();
                };
                const onTrackSubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, _p: RemoteParticipant) => {
                    if (track.kind === Track.Kind.Video) {
                        setHasRemoteVideo(true);
                        if (pub.source === Track.Source.ScreenShare) {
                            attachVideoTo(track, videoElRef.current, pub);
                            setHasScreen(true);
                        } else {
                            // Camera — agar screen ham keladigan bo'lsa PiP element'ga,
                            // aks holda main element'ga
                            const hasScr = !!videoElRef.current?.srcObject;
                            if (hasScr) attachVideoTo(track, camPipElRef.current, pub);
                            else attachVideoTo(track, videoElRef.current, pub);
                            setHasCamera(true);
                        }
                    } else if (track.kind === Track.Kind.Audio && audioElRef.current) {
                        track.attach(audioElRef.current);
                    }
                };
                const onTrackUnsubscribed = (track: RemoteTrack, pub: RemoteTrackPublication) => {
                    if (track.kind === Track.Kind.Video) {
                        if (pub.source === Track.Source.ScreenShare) {
                            if (videoElRef.current) track.detach(videoElRef.current);
                            setHasScreen(false);
                        } else {
                            if (camPipElRef.current) track.detach(camPipElRef.current);
                            if (videoElRef.current) track.detach(videoElRef.current);
                            setHasCamera(false);
                        }
                        remoteVideoTrackRef.current = null;
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
            setHasScreen(false);
            setHasCamera(false);
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
            else if (e.key === "v" || e.key === "V") { setPipVisible(v => !v); pokeControls(); }
            else if (e.key === "Escape" && !fullscreen) { onClose(); }
            else if (e.key === "ArrowUp") { setVolume(v => Math.min(1, v + 0.05)); pokeControls(); }
            else if (e.key === "ArrowDown") { setVolume(v => Math.max(0, v - 0.05)); pokeControls(); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullscreen]);

    // ── Quality apply — LiveKit simulcast layer (RemoteTrackPublication'da) ──
    useEffect(() => {
        const pub = remoteVideoPubRef.current;
        if (!pub) return;
        const map: Record<QLevel, VideoQuality> = {
            auto: VideoQuality.HIGH, "1080": VideoQuality.HIGH, "720": VideoQuality.HIGH, "480": VideoQuality.MEDIUM, "240": VideoQuality.LOW,
        };
        try { pub.setVideoQuality(map[quality]); } catch { /* ignore */ }
    }, [quality]);

    // ── Keyingi/oldingi jonli efirni yuklash (swipe nav uchun) ──
    useEffect(() => {
        if (stream?.status !== "LIVE") { setNextStreamId(null); setPrevStreamId(null); return; }
        let cancelled = false;
        fetch(`/api/nexus/live?status=live&limit=40`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                const list: { id: string }[] = d.streams ?? [];
                const idx = list.findIndex(s => s.id === streamId);
                if (idx === -1) return;
                setPrevStreamId(idx > 0 ? list[idx - 1].id : null);
                setNextStreamId(idx < list.length - 1 ? list[idx + 1].id : null);
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [streamId, stream?.status]);

    function swipeStartHandler(e: React.TouchEvent) {
        const t = e.touches[0];
        setSwipeStart({ x: t.clientX, y: t.clientY, t: Date.now() });
    }
    function swipeMoveHandler(e: React.TouchEvent) {
        if (!swipeStart) return;
        const t = e.touches[0];
        const dx = t.clientX - swipeStart.x;
        const dy = t.clientY - swipeStart.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            setSwipeHint(dx < 0 ? "left" : "right");
        } else setSwipeHint(null);
    }
    function swipeEndHandler(e: React.TouchEvent) {
        if (!swipeStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeStart.x;
        const dy = t.clientY - swipeStart.y;
        const dt = Date.now() - swipeStart.t;
        setSwipeStart(null); setSwipeHint(null);
        if (dt > 800) return;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // Chap swipe → next, o'ng swipe → prev
        const target = dx < 0 ? nextStreamId : prevStreamId;
        if (target) navToStream(target);
    }
    function navToStream(id: string) {
        // Room-scoped state'ni tozalash — parent onClose+re-open bilan
        // clean qilish o'rniga bu yerda o'zimiz ham qila olamiz.
        // NxLiveRoom streamId prop bo'yicha useEffect'lar avto yangilanadi.
        // Lekin subscribed video track'ni ham qayta boshlash uchun stream'ni reset qilamiz.
        onClose();
        // Kichik delay bilan yangi room ochish uchun window event
        setTimeout(() => window.dispatchEvent(new CustomEvent("nexus:open-live", { detail: { streamId: id } })), 60);
    }

    // ── VOD (recording) — <video> holatidan progress ushlash ──
    useEffect(() => {
        const v = videoElRef.current;
        if (!v || stream?.status !== "ENDED" || !stream?.recordingUrl) return;
        const onTime = () => setVodCur(v.currentTime);
        const onMeta = () => { setVodDur(v.duration || 0); };
        v.addEventListener("timeupdate", onTime);
        v.addEventListener("loadedmetadata", onMeta);
        return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
    }, [stream?.status, stream?.recordingUrl]);
    useEffect(() => {
        const v = videoElRef.current;
        if (v) v.playbackRate = vodSpeed;
    }, [vodSpeed]);

    function seekTo(sec: number) {
        const v = videoElRef.current;
        if (v && stream?.status === "ENDED") { v.currentTime = Math.max(0, Math.min(vodDur, sec)); }
    }
    function fmtT(s: number) {
        if (!isFinite(s)) return "0:00";
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${String(sec).padStart(2, "0")}`;
    }

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
                onMouseMove={pokeControls}
                onTouchStart={e => { pokeControls(); swipeStartHandler(e); }}
                onTouchMove={swipeMoveHandler}
                onTouchEnd={swipeEndHandler}
                className="flex-1 bg-black flex items-center justify-center min-h-0 relative group/stage select-none">
                {/* Asosiy video (Screen — pip mode, yoki Solo camera) */}
                <video ref={videoElRef}
                    autoPlay playsInline
                    src={stream?.status === "ENDED" && stream?.recordingUrl ? stream.recordingUrl : undefined}
                    onClick={() => { if (stream?.status === "ENDED") setPaused(p => !p); }}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ display: (isLive && hasRemoteVideo) || (stream?.status === "ENDED" && !!stream?.recordingUrl) ? "block" : "none" }} />
                <audio ref={audioElRef} autoPlay />

                {/* PiP kamera — faqat screen + camera bo'lganda, viewer o'zi joylashtiradi */}
                {isLive && hasScreen && hasCamera && pipVisible && (
                    <div
                        onPointerDown={e => {
                            const target = e.currentTarget as HTMLElement;
                            target.setPointerCapture(e.pointerId);
                            setPipDrag({ x: e.clientX, y: e.clientY, corner: pipCorner });
                        }}
                        onPointerMove={e => {
                            if (!pipDrag) return;
                            const dx = e.clientX - pipDrag.x;
                            const dy = e.clientY - pipDrag.y;
                            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
                            // Snap to nearest corner based on final pointer position within stage
                            const stage = stageRef.current;
                            if (!stage) return;
                            const rect = stage.getBoundingClientRect();
                            const relX = e.clientX - rect.left, relY = e.clientY - rect.top;
                            const nx = relX < rect.width / 2 ? "l" : "r";
                            const ny = relY < rect.height / 2 ? "t" : "b";
                            setPipCorner((ny + nx) as PipCorner);
                        }}
                        onPointerUp={() => setPipDrag(null)}
                        onDoubleClick={() => setPipSize(s => s === "sm" ? "md" : s === "md" ? "lg" : "sm")}
                        className={`absolute z-20 rounded-xl overflow-hidden cursor-move transition-all duration-200 animate-in fade-in ${
                            pipCorner === "br" ? "bottom-20 right-4" :
                            pipCorner === "bl" ? "bottom-20 left-4" :
                            pipCorner === "tr" ? "top-20 right-4" :
                            "top-20 left-4"
                        } ${pipSize === "sm" ? "w-32 h-20" : pipSize === "md" ? "w-48 h-28" : "w-64 h-40"}`}
                        style={{
                            border: "2px solid rgba(255,255,255,0.35)",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,206,200,0.25)",
                            background: "#000",
                            touchAction: "none",
                        }}
                        title="Sudrab joylashtiring · 2× bosing — o'lcham"
                    >
                        <video ref={camPipElRef} autoPlay playsInline muted
                            className="w-full h-full object-cover pointer-events-none" />
                        {/* PiP mini controls (hover'da) */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); setPipVisible(false); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md"
                                style={{ background: "rgba(0,0,0,0.75)" }} title="Yashirish (V)">
                                <EyeOff className="w-3 h-3 text-white" />
                            </button>
                        </div>
                        <div className="absolute bottom-1 left-1 opacity-0 group-hover/stage:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.75)" }}>
                            <Move className="w-2.5 h-2.5 text-white/70" />
                            <span className="text-[8px] font-black text-white/85">SUDRAB</span>
                        </div>
                    </div>
                )}

                {/* PiP yashirilgan bo'lsa — qayta ko'rsatish tugmasi */}
                {isLive && hasScreen && hasCamera && !pipVisible && (
                    <button onClick={() => setPipVisible(true)}
                        className="absolute bottom-20 right-4 z-20 h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,206,200,0.30)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,206,200,0.55)" }}>
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-black text-white">Kamerani ko&apos;rsat</span>
                    </button>
                )}

                {/* Batch E — Keyframes (inline) */}
                <style>{`
                    @keyframes nxFloatUp {
                        0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
                        12% { opacity: 1; transform: translateY(-40px) scale(1.1) rotate(-8deg); }
                        50% { opacity: 1; transform: translateY(-220px) scale(1) rotate(8deg); }
                        100% { opacity: 0; transform: translateY(-460px) scale(1.15) rotate(-4deg); }
                    }
                    @keyframes nxTipSlide {
                        0% { opacity: 0; transform: translateY(-120%); }
                        8% { opacity: 1; transform: translateY(0); }
                        90% { opacity: 1; transform: translateY(0); }
                        100% { opacity: 0; transform: translateY(-120%); }
                    }
                    @keyframes nxConfetti {
                        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
                        100% { opacity: 0; transform: translateY(80px) rotate(720deg); }
                    }
                `}</style>

                {/* Floating reactions overlay (Batch E) */}
                {isLive && floating.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
                        {floating.map(f => {
                            const Icon = f.icon === "heart" ? Heart : f.icon === "fire" ? Flame : f.icon === "laugh" ? Laugh : f.icon === "thumbs" ? ThumbsUp : f.icon === "party" ? PartyPopper : f.icon === "sparkle" ? Sparkles : Zap;
                            const color = f.icon === "heart" ? "#EF4444" : f.icon === "fire" ? "#F97316" : f.icon === "laugh" ? "#F59E0B" : f.icon === "thumbs" ? "#00CEC8" : f.icon === "party" ? "#8B5CF6" : f.icon === "sparkle" ? "#EC4899" : "#F59E0B";
                            return (
                                <div key={f.key}
                                    className="absolute bottom-24"
                                    style={{
                                        right: `${f.x}%`,
                                        animation: "nxFloatUp 3.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                                        filter: `drop-shadow(0 4px 12px ${color}66)`,
                                    }}>
                                    <Icon className="w-9 h-9" style={{ color, fill: color }} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tip alert banner (Batch E) */}
                {tipAlert && (
                    <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md"
                        style={{ animation: "nxTipSlide 6s ease-in-out forwards" }}>
                        <div className="rounded-2xl overflow-hidden relative"
                            style={{
                                background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)",
                                boxShadow: "0 20px 60px rgba(245,158,11,0.55), 0 0 40px rgba(239,68,68,0.35)",
                            }}>
                            {/* Confetti particles */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="absolute w-1.5 h-3 rounded-sm"
                                    style={{
                                        left: `${(i * 8.5) + 4}%`,
                                        top: "0px",
                                        background: i % 3 === 0 ? "#FFF" : i % 3 === 1 ? "#00CEC8" : "#8B5CF6",
                                        animation: `nxConfetti ${1.6 + (i % 3) * 0.4}s ${(i * 0.1).toFixed(1)}s ease-out infinite`,
                                    }} />
                            ))}
                            <div className="px-4 py-3 flex items-center gap-3 relative">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(10px)" }}>
                                    <Gift className="w-6 h-6 text-white fill-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white/90 flex items-center gap-1">
                                        {tipAlert.author?.name || tipAlert.author?.username || "Foydalanuvchi"}
                                        {tipAlert.author?.verified && <NxVerifiedBadge category={tipAlert.author.verifiedCategory} size={12} />}
                                    </p>
                                    <p className="text-lg font-black text-white leading-tight tracking-tight">
                                        {formatMoney(tipAlert.amount, currency)} sovg&apos;a
                                    </p>
                                    {tipAlert.text && <p className="text-[11px] text-white/95 truncate mt-0.5">{tipAlert.text}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Swipe hint arrows */}
                {swipeHint && (
                    <div className={`pointer-events-none absolute inset-y-0 ${swipeHint === "left" ? "right-6" : "left-6"} flex items-center z-20 animate-in fade-in duration-150`}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
                            {swipeHint === "left"
                                ? (nextStreamId ? <ChevronRight className="w-8 h-8 text-white" /> : <X className="w-6 h-6 text-white/50" />)
                                : (prevStreamId ? <ChevronLeft className="w-8 h-8 text-white" /> : <X className="w-6 h-6 text-white/50" />)}
                        </div>
                    </div>
                )}

                {/* Yuqori control bar — X yopish, chat toggle, share */}
                <div className={`absolute top-0 left-0 right-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)" }}>
                    <button onClick={onClose} title="Yopish (Esc)"
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1" />
                    {/* Quality selector — faqat video oqim bor bo'lganda */}
                    {((isLive && hasRemoteVideo) || (stream?.status === "ENDED" && stream?.recordingUrl)) && (
                        <div className="relative">
                            <button onClick={() => { setQualityOpen(o => !o); setSpeedMenuOpen(false); }} title="Sifat"
                                className="h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                                style={{ background: qualityOpen ? "rgba(0,206,200,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <Settings className="w-3.5 h-3.5 text-white" />
                                <span className="text-[10px] font-black text-white">
                                    {isLive
                                        ? (quality === "auto" ? "Avto" : quality === "1080" ? "1080p" : quality === "720" ? "720p" : quality === "480" ? "480p" : "240p")
                                        : (availableRes?.h ? `${availableRes.h}p` : "Original")}
                                </span>
                            </button>
                            {qualityOpen && (
                                <div className="absolute top-full right-0 mt-2 min-w-[220px] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(0,206,200,0.30)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                                    {stream?.status === "ENDED" ? (
                                        <>
                                            <div className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase" style={{ color: "rgba(0,206,200,0.85)" }}>Tezlik</div>
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(sp => (
                                                <button key={sp} onClick={() => { setVodSpeed(sp); setQualityOpen(false); }}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-white transition"
                                                    style={{ background: vodSpeed === sp ? "rgba(0,206,200,0.12)" : "transparent" }}>
                                                    <span>{sp === 1 ? "Oddiy" : `${sp}x`}</span>
                                                    {vodSpeed === sp && <Check className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </button>
                                            ))}
                                            <div className="px-4 py-2 text-[9px] text-center" style={{ color: "rgba(150,170,210,0.55)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                Yozuv sifati — {availableRes?.h ? `${availableRes.h}p` : "asl"}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase" style={{ color: "rgba(0,206,200,0.85)" }}>Video sifati</div>
                                            {([
                                                { v: "auto", l: "Avto", hint: "tarmoqqa moslashadi" },
                                                { v: "1080", l: "1080p", hint: "Full HD" },
                                                { v: "720", l: "720p", hint: "HD" },
                                                { v: "480", l: "480p", hint: "O'rtacha" },
                                                { v: "240", l: "240p", hint: "Sekin tarmoq" },
                                            ] as { v: QLevel; l: string; hint: string }[]).map(o => (
                                                <button key={o.v} onClick={() => { setQuality(o.v); setQualityOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-white transition"
                                                    style={{ background: quality === o.v ? "rgba(0,206,200,0.12)" : "transparent" }}>
                                                    <span className="w-14">{o.l}</span>
                                                    <span className="flex-1 text-left text-[10px]" style={{ color: "rgba(150,170,210,0.7)" }}>{o.hint}</span>
                                                    {quality === o.v && <Check className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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

                {/* Pastki control bar — pause/volume/progress */}
                {((isLive && hasRemoteVideo) || (stream?.status === "ENDED" && stream?.recordingUrl)) && (
                    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)" }}>
                        {/* Progress bar — faqat VOD */}
                        {stream?.status === "ENDED" && vodDur > 0 && (
                            <div className="px-4 pt-3 pb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-white/85 tabular-nums w-10 text-right">{fmtT(vodCur)}</span>
                                    <input type="range" min={0} max={vodDur} step={0.1} value={vodCur}
                                        onChange={e => seekTo(parseFloat(e.target.value))}
                                        className="flex-1 accent-[#F97316] h-1"
                                        style={{ height: 4 }} />
                                    <span className="text-[10px] font-black text-white/85 tabular-nums w-10">{fmtT(vodDur)}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
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
                            {isLive && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                                </span>
                            )}
                            {stream?.status === "ENDED" && vodSpeed !== 1 && (
                                <span className="px-2 py-1 rounded-md text-[10px] font-black text-white" style={{ background: "rgba(0,206,200,0.30)" }}>
                                    {vodSpeed}x
                                </span>
                            )}
                            <div className="flex-1" />
                            <span className="hidden md:inline text-[10px] font-black px-2 py-1 rounded-md" style={{ color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.4)" }}>
                                Space · M · F · C{hasScreen && hasCamera ? " · V" : ""}
                            </span>
                        </div>
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
                            stream.recordingUrl ? null : (
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
                    {/* Batch E — Follow button (o'zim emas + auth mavjud) */}
                    {stream && !stream.isMine && isFollowing !== null && meUsername !== stream.author?.username && (
                        <button onClick={toggleFollow} disabled={followBusy}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition active:scale-95 disabled:opacity-60"
                            style={isFollowing
                                ? { background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }
                                : { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff", boxShadow: "0 4px 16px rgba(239,68,68,0.30)" }}>
                            {isFollowing ? <><UserCheck className="w-3.5 h-3.5" />Kuzatilyapti</> : <><UserPlus className="w-3.5 h-3.5" />Kuzatish</>}
                        </button>
                    )}
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
                        {/* Batch E — Reactions picker (chat input tepasida) */}
                        {isLive && reactionPickerOpen && (
                            <div className="flex items-center gap-1.5 mb-2 p-2 rounded-xl animate-in fade-in slide-in-from-bottom-1 duration-200" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)" }}>
                                {([
                                    { i: "heart" as const, I: Heart, c: "#EF4444" },
                                    { i: "fire" as const, I: Flame, c: "#F97316" },
                                    { i: "laugh" as const, I: Laugh, c: "#F59E0B" },
                                    { i: "thumbs" as const, I: ThumbsUp, c: "#00CEC8" },
                                    { i: "party" as const, I: PartyPopper, c: "#8B5CF6" },
                                    { i: "sparkle" as const, I: Sparkles, c: "#EC4899" },
                                    { i: "wow" as const, I: Zap, c: "#F59E0B" },
                                ]).map(r => (
                                    <button key={r.i} onClick={() => sendReaction(r.i)} disabled={reactionBusy}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 transition-transform disabled:opacity-40 hover:scale-110"
                                        style={{ background: `${r.c}15`, border: `1px solid ${r.c}45` }}>
                                        <r.I className="w-4 h-4" style={{ color: r.c, fill: r.c }} />
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
                            {/* Batch E — Reactions toggle */}
                            {isLive && (
                                <button onClick={() => setReactionPickerOpen(o => !o)} title="Reaksiya"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95 transition"
                                    style={reactionPickerOpen
                                        ? { background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }
                                        : { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.30)" }}>
                                    <Smile className="w-4 h-4" style={{ color: reactionPickerOpen ? "#fff" : "#8B5CF6" }} />
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
