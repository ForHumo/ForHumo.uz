"use client";

// Nexus 1:1 WebRTC ovoz/video chaqiruv oynasi (Telegram uslubi).
// - Video transceiver oldindan yaratiladi (sendrecv) → track qo'shishda renegotiate KERAK EMAS
// - Ovozli boshlanadi, kamera/ekran dinamik almashadi (replaceTrack)
// - Kamera aylantirish (front/back) — facingMode toggle
// - Ekran ulashish (getDisplayMedia) — mobil brauzerlarda YO'Q, tugma yashirinadi
// - Perfect Negotiation (glare) + Minimize (kichik pinned oyna)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Video as CamIcon, VideoOff, PhoneOff, Loader2, Volume2, VolumeX, BadgeCheck, Minimize2, Maximize2, ScreenShare, ScreenShareOff, SwitchCamera, SlidersHorizontal, X } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import { VoiceFxPipeline, VOICE_FX_LIST, type VoiceEffect } from "@/lib/nexus-voice-fx";

interface Peer { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean }

type Kind = "AUDIO" | "VIDEO";
type Role = "caller" | "callee";
type Phase = "connecting" | "ringing" | "in-call" | "ended";
type VideoSource = "none" | "camera" | "screen";
type Facing = "user" | "environment";

const FALLBACK_ICE: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const r = await fetch("/api/nexus/calls/ice-servers").then(x => x.json()) as { iceServers?: RTCIceServer[] };
        return r?.iceServers?.length ? r.iceServers : FALLBACK_ICE;
    } catch {
        return FALLBACK_ICE;
    }
}

const SIGNAL_POLL_MS = 1200;
const STATE_POLL_MS = 3000;
const cameraConstraints = (facing: Facing): MediaStreamConstraints => ({
    audio: false,
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facing },
});

const supportsScreenShare = () => typeof navigator !== "undefined"
    && typeof navigator.mediaDevices?.getDisplayMedia === "function";

interface Props {
    callId: string;
    role: Role;
    kind: Kind;
    peer: Peer;
    autoAccepted?: boolean;
    onClose: () => void;
}

export default function NxCallWindow({ callId, role, kind: initialKind, peer, autoAccepted, onClose }: Props) {
    const { callMinimized, setCallMinimized } = useNxPlayer();
    const [phase, setPhase] = useState<Phase>(role === "caller" ? "connecting" : autoAccepted ? "connecting" : "ringing");
    const [muted, setMuted] = useState(false);
    const [videoSource, setVideoSource] = useState<VideoSource>("none");
    const [facing, setFacing] = useState<Facing>("user");
    const [remoteVideo, setRemoteVideo] = useState(false);
    const [videoBusy, setVideoBusy] = useState(false);
    const [screenBusy, setScreenBusy] = useState(false);
    const [speaker, setSpeaker] = useState(true);
    const [duration, setDuration] = useState(0);
    const [err, setErr] = useState<string>("");
    const [canScreen, setCanScreen] = useState(true);
    const [voiceFx, setVoiceFx] = useState<VoiceEffect>("none");
    const [fxSheetOpen, setFxSheetOpen] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const voicePipelineRef = useRef<VoiceFxPipeline | null>(null);
    const localRef = useRef<HTMLVideoElement>(null);
    const remoteRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioSenderRef = useRef<RTCRtpSender | null>(null);
    const videoSenderRef = useRef<RTCRtpSender | null>(null);
    const sinceRef = useRef<string>(new Date(Date.now() - 60_000).toISOString());
    const startTsRef = useRef<number | null>(null);
    const endedRef = useRef(false);
    const acceptedRef = useRef(role === "callee" && autoAccepted === true);

    // Perfect Negotiation
    const politeRef = useRef(role === "callee");
    const makingOfferRef = useRef(false);
    const ignoreOfferRef = useRef(false);

    useEffect(() => { setCanScreen(supportsScreenShare()); }, []);

    // ── Chaqiruvni tugatish ──────────────────────────────────────────────────
    const endCall = useCallback(async (notify = true) => {
        if (endedRef.current) return;
        endedRef.current = true;
        try {
            pcRef.current?.getSenders().forEach(s => { try { s.track?.stop(); } catch { } });
            pcRef.current?.close();
        } catch { }
        pcRef.current = null;
        try { voicePipelineRef.current?.dispose(); } catch { }
        voicePipelineRef.current = null;
        try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
        localStreamRef.current = null;
        setPhase("ended");
        setCallMinimized(false);
        if (notify) {
            fetch(`/api/nexus/calls/${callId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            }).catch(() => { });
        }
        setTimeout(onClose, 1200);
    }, [callId, onClose, setCallMinimized]);

    const sendSignal = useCallback(async (sigKind: "offer" | "answer" | "ice", payload: unknown) => {
        await fetch(`/api/nexus/calls/${callId}/signal`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: sigKind, payload }),
        }).catch(() => { });
    }, [callId]);

    // ── PeerConnection + audio track + video transceiver (sendrecv, track'siz) ─
    // Transceiver oldindan yaratilishi renegotiate zaruratini yo'q qiladi:
    // ikkala tomon ham m-line'ga ega, replaceTrack(track) darrov peer'da ontrack chaqiradi.
    const initPeer = useCallback(async () => {
        if (pcRef.current) return pcRef.current;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Mikrofon ruxsat rad etildi");
            await endCall();
            return null;
        }
        localStreamRef.current = stream;

        const iceServers = await fetchIceServers();
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        // Audio transceiver — voice FX pipeline orqali o'tadi (effektsiz bo'lsa asl track)
        voicePipelineRef.current = new VoiceFxPipeline();
        const fxStream = await voicePipelineRef.current.setInput(stream);
        const [audioTrack] = fxStream.getAudioTracks();
        audioSenderRef.current = pc.addTrack(audioTrack, fxStream);
        // Video transceiver (sendrecv, track'siz — replaceTrack orqali qo'shiladi)
        const vTx = pc.addTransceiver("video", { direction: "sendrecv" });
        videoSenderRef.current = vTx.sender;

        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current = true;
                await pc.setLocalDescription();
                if (pc.localDescription) {
                    await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
                }
            } catch (e) {
                console.warn("negotiationneeded:", e);
            } finally {
                makingOfferRef.current = false;
            }
        };

        pc.ontrack = (ev) => {
            const [remote] = ev.streams;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
            if (remoteRef.current) remoteRef.current.srcObject = remote;
            const updateFlag = () => {
                const has = remote.getVideoTracks().some(t => t.readyState === "live" && !t.muted);
                setRemoteVideo(has);
            };
            updateFlag();
            remote.onaddtrack = updateFlag;
            remote.onremovetrack = updateFlag;
            for (const t of remote.getVideoTracks()) {
                t.onmute = updateFlag; t.onunmute = updateFlag; t.onended = updateFlag;
            }
            // Yangi track e'lonida ham (ev.track) mute holatini kuzat
            ev.track.onmute = updateFlag;
            ev.track.onunmute = updateFlag;
            ev.track.onended = updateFlag;
        };
        pc.onicecandidate = (ev) => {
            if (ev.candidate) sendSignal("ice", ev.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if (st === "connected") {
                setPhase("in-call");
                if (!startTsRef.current) startTsRef.current = Date.now();
            } else if (st === "failed" || st === "closed" || st === "disconnected") {
                endCall();
            }
        };
        return pc;
    }, [sendSignal, endCall]);

    // ── Video track almashtirish (renegotiate SHART EMAS — transceiver bor) ──
    const applyVideoTrack = useCallback(async (track: MediaStreamTrack | null, source: VideoSource) => {
        const sender = videoSenderRef.current;
        const stream = localStreamRef.current;
        if (!sender || !stream) return;
        // Eski video track'ni to'xtatish
        for (const t of stream.getVideoTracks()) {
            try { t.stop(); } catch { }
            stream.removeTrack(t);
        }
        if (track) stream.addTrack(track);
        try {
            await sender.replaceTrack(track);
        } catch (e) {
            console.warn("replaceTrack:", e);
        }
        if (localRef.current) localRef.current.srcObject = stream;
        setVideoSource(source);
    }, []);

    const enableCamera = useCallback(async (facingOverride?: Facing) => {
        if (videoBusy) return;
        setVideoBusy(true);
        try {
            const f = facingOverride ?? facing;
            const v = await navigator.mediaDevices.getUserMedia(cameraConstraints(f));
            const [t] = v.getVideoTracks();
            if (!t) throw new Error("Kamera oqim topilmadi");
            await applyVideoTrack(t, "camera");
            if (facingOverride) setFacing(facingOverride);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Kamera yoqilmadi");
        } finally {
            setVideoBusy(false);
        }
    }, [videoBusy, facing, applyVideoTrack]);

    const disableVideo = useCallback(async () => {
        if (videoBusy || videoSource === "none") return;
        setVideoBusy(true);
        try { await applyVideoTrack(null, "none"); }
        finally { setVideoBusy(false); }
    }, [videoBusy, videoSource, applyVideoTrack]);

    const toggleCamera = useCallback(() => {
        if (videoSource === "camera") disableVideo();
        else enableCamera();
    }, [videoSource, disableVideo, enableCamera]);

    // Kamerani front↔back aylantirish (mobil qurilma uchun)
    const flipCamera = useCallback(async () => {
        if (videoBusy || videoSource !== "camera") return;
        const next: Facing = facing === "user" ? "environment" : "user";
        await enableCamera(next);
    }, [videoBusy, videoSource, facing, enableCamera]);

    // Ekran ulashish (faqat kompyuter brauzerlari)
    const enableScreen = useCallback(async () => {
        if (screenBusy || !canScreen) return;
        setScreenBusy(true);
        try {
            const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const [t] = s.getVideoTracks();
            if (!t) throw new Error("Ekran oqim topilmadi");
            t.onended = () => { disableVideo(); };
            await applyVideoTrack(t, "screen");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg && !msg.toLowerCase().includes("permission") && !msg.toLowerCase().includes("denied")) setErr(msg);
        } finally {
            setScreenBusy(false);
        }
    }, [screenBusy, canScreen, applyVideoTrack, disableVideo]);

    const toggleScreen = useCallback(() => {
        if (videoSource === "screen") disableVideo();
        else enableScreen();
    }, [videoSource, disableVideo, enableScreen]);

    // ── Caller: accept'ni kutib, birinchi offer ─────────────────────────────
    useEffect(() => {
        let stopped = false;
        (async () => {
            if (role === "caller") {
                const poll = async () => {
                    if (stopped || endedRef.current) return;
                    const r = await fetch(`/api/nexus/calls/${callId}`).then(x => x.json()).catch(() => null);
                    if (!r?.call) return;
                    if (r.call.status === "REJECTED" || r.call.status === "MISSED" || r.call.status === "ENDED") {
                        setErr(r.call.status === "REJECTED" ? "Rad etildi" : r.call.status === "MISSED" ? "Javob berilmadi" : "");
                        endCall(false);
                        return;
                    }
                    if (r.call.status === "ACCEPTED" && !pcRef.current) {
                        const pc = await initPeer();
                        if (!pc) return;
                        // Birinchi offer — audio + video transceiver'lar bilan
                        makingOfferRef.current = true;
                        try {
                            await pc.setLocalDescription();
                            if (pc.localDescription) {
                                await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
                            }
                        } finally {
                            makingOfferRef.current = false;
                        }
                        // Video chaqiruv bo'lsa kamerani darrov yoqamiz (replaceTrack — renegotiate yo'q)
                        if (initialKind === "VIDEO") await enableCamera();
                    }
                };
                await poll();
                const iv = setInterval(poll, STATE_POLL_MS);
                return () => clearInterval(iv);
            } else if (acceptedRef.current) {
                await initPeer();
                if (initialKind === "VIDEO") await enableCamera();
            }
        })();
        return () => { stopped = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Signal polling (Perfect Negotiation) ─────────────────────────────────
    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            if (stopped || endedRef.current) return;
            const url = `/api/nexus/calls/${callId}/signal?since=${encodeURIComponent(sinceRef.current)}`;
            const r = await fetch(url).then(x => x.json()).catch(() => null) as { signals?: { id: string; kind: string; payload: unknown; createdAt: string }[] } | null;
            if (!r?.signals?.length) return;
            for (const s of r.signals) {
                sinceRef.current = new Date(new Date(s.createdAt).getTime()).toISOString();
                const pc = pcRef.current || await initPeer();
                if (!pc) return;
                try {
                    if (s.kind === "offer") {
                        const readyForOffer = !makingOfferRef.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
                        const offerCollision = !readyForOffer;
                        ignoreOfferRef.current = !politeRef.current && offerCollision;
                        if (ignoreOfferRef.current) continue;
                        if (offerCollision) {
                            await Promise.all([
                                pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit).catch(() => { }),
                                pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit)),
                            ]);
                        } else {
                            await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                        }
                        await pc.setLocalDescription();
                        if (pc.localDescription) {
                            await sendSignal("answer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
                        }
                    } else if (s.kind === "answer") {
                        if (pc.signalingState === "have-local-offer") {
                            await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                        }
                    } else if (s.kind === "ice") {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(s.payload as RTCIceCandidateInit));
                        } catch (err) {
                            if (!ignoreOfferRef.current) console.warn("addIceCandidate:", err);
                        }
                    }
                } catch (e) {
                    console.warn("Signal xatosi:", e);
                }
            }
        };
        const iv = setInterval(tick, SIGNAL_POLL_MS);
        tick();
        return () => { stopped = true; clearInterval(iv); };
    }, [callId, initPeer, sendSignal]);

    // ── Chaqiruv holati polling ──────────────────────────────────────────────
    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            if (stopped || endedRef.current) return;
            const r = await fetch(`/api/nexus/calls/${callId}`).then(x => x.json()).catch(() => null);
            if (r?.call?.status === "ENDED" || r?.call?.status === "REJECTED" || r?.call?.status === "MISSED" || r?.call?.status === "FAILED") {
                endCall(false);
            }
        };
        const iv = setInterval(tick, STATE_POLL_MS * 2);
        return () => { stopped = true; clearInterval(iv); };
    }, [callId, endCall]);

    useEffect(() => {
        const iv = setInterval(() => {
            if (startTsRef.current) setDuration(Math.floor((Date.now() - startTsRef.current) / 1000));
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (localRef.current) localRef.current.srcObject = localStreamRef.current;
    }, [videoSource]);

    const toggleMute = () => {
        setMuted(m => {
            const next = !m;
            // Original mikrofon track'ni o'chiramiz — pipeline'ga input'ni to'xtatadi (effekt bo'lsa ham jim)
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
            return next;
        });
    };

    // Ovoz effektini almashtirish — pipeline yangi stream qaytaradi, audio sender'ga replaceTrack
    const applyVoiceFx = useCallback(async (effect: VoiceEffect) => {
        setVoiceFx(effect);
        const pipeline = voicePipelineRef.current;
        const sender = audioSenderRef.current;
        if (!pipeline || !sender) return;
        const outStream = await pipeline.setEffect(effect);
        const [track] = outStream?.getAudioTracks() ?? [];
        if (track) {
            try { await sender.replaceTrack(track); } catch (e) { console.warn("audio replaceTrack:", e); }
        }
    }, []);
    const toggleSpeaker = () => {
        setSpeaker(s => {
            const next = !s;
            if (remoteAudioRef.current) remoteAudioRef.current.muted = !next;
            if (remoteRef.current) remoteRef.current.muted = !next;
            return next;
        });
    };

    useEffect(() => {
        const off = () => { endCall(); };
        window.addEventListener("beforeunload", off);
        return () => window.removeEventListener("beforeunload", off);
    }, [endCall]);

    const peerLabel = peer.name || (peer.username ? `@${peer.username}` : peer.humoId || "Peer");
    const phaseLabel = useMemo(() => {
        if (phase === "connecting") return role === "caller" ? "Chaqirilyapti…" : "Ulanmoqda…";
        if (phase === "ringing") return "Kelayotgan chaqiruv";
        if (phase === "in-call") return formatDur(duration);
        return "Yakunlandi";
    }, [phase, role, duration]);

    // ── Minimize: kichik pinned kartochka ────────────────────────────────────
    if (callMinimized && phase !== "ended") {
        return (
            <>
                <audio ref={remoteAudioRef} autoPlay />
                <button onClick={() => setCallMinimized(false)}
                    className="fixed bottom-4 right-4 z-[300] flex max-w-[220px] items-center gap-3 rounded-2xl bg-black/85 p-2.5 pr-4 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95 sm:bottom-6 sm:right-6"
                    aria-label="Chaqiruvni kengaytirish">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/15">
                        {peer.image
                            ? <Image src={peer.image} alt="" width={40} height={40} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center text-xs font-black">{peerLabel.slice(0, 2).toUpperCase()}</div>}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-black/85 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-black">{peerLabel}</p>
                        <p className="text-[10px] font-semibold tabular-nums text-emerald-400">{phaseLabel}</p>
                    </div>
                    <Maximize2 className="h-4 w-4 shrink-0 text-white/70" />
                </button>
            </>
        );
    }

    const showRemoteVideo = remoteVideo && phase === "in-call";

    return (
        <div className="fixed inset-0 z-[300] flex flex-col bg-black text-white">
            {showRemoteVideo ? (
                <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-black">
                    <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/30">
                        {peer.image
                            ? <Image src={peer.image} alt="" width={160} height={160} className="h-full w-full object-cover" />
                            : <span className="text-4xl font-black">{peerLabel.slice(0, 2).toUpperCase()}</span>}
                    </div>
                </div>
            )}
            {!showRemoteVideo && <video ref={remoteRef} autoPlay playsInline className="hidden" />}
            <audio ref={remoteAudioRef} autoPlay />

            {/* Tepa overlay + minimize */}
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCallMinimized(true)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
                        aria-label="Kichraytirish">
                        <Minimize2 className="h-4 w-4" />
                    </button>
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/15">
                        {peer.image
                            ? <Image src={peer.image} alt="" width={44} height={44} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center text-sm font-black">{peerLabel.slice(0, 2).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-base font-black">{peerLabel}</p>
                            {peer.verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                            {phase === "connecting" && <Loader2 className="h-3 w-3 animate-spin" />}
                            {phaseLabel}
                        </p>
                    </div>
                </div>
                {err && <p className="mt-3 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100">{err}</p>}
            </div>

            {/* Mahalliy preview + kamera flip */}
            {videoSource !== "none" && (
                <div className="absolute right-4 top-24 z-10 h-40 w-28 overflow-hidden rounded-2xl bg-black/50 ring-1 ring-white/20 shadow-2xl sm:right-6 sm:top-28 sm:h-52 sm:w-40">
                    <video ref={localRef} autoPlay playsInline muted
                        className={`h-full w-full object-cover ${videoSource === "camera" && facing === "user" ? "scale-x-[-1]" : ""}`} />
                    {videoSource === "camera" && (
                        <button onClick={flipCamera} disabled={videoBusy}
                            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                            aria-label="Kamerani aylantirish">
                            <SwitchCamera className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Boshqaruv paneli */}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6 pb-10">
                <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-3">
                    <CtrlButton onClick={toggleMute} active={!muted}
                        icon={muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />} />
                    <CtrlButton onClick={toggleCamera} active={videoSource === "camera"}
                        disabled={videoBusy || phase !== "in-call"}
                        icon={videoBusy && videoSource !== "screen" ? <Loader2 className="h-6 w-6 animate-spin" /> : videoSource === "camera" ? <CamIcon className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />} />
                    {canScreen && (
                        <CtrlButton onClick={toggleScreen} active={videoSource === "screen"}
                            disabled={screenBusy || phase !== "in-call"}
                            icon={screenBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : videoSource === "screen" ? <ScreenShareOff className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />} />
                    )}
                    <CtrlButton onClick={toggleSpeaker} active={speaker}
                        icon={speaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />} />
                    <CtrlButton onClick={() => setFxSheetOpen(v => !v)} active={voiceFx !== "none"}
                        icon={<SlidersHorizontal className="h-6 w-6" />} />
                    <button onClick={() => endCall()}
                        className="ml-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <PhoneOff className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Ovoz effektlari bottom sheet */}
            {fxSheetOpen && (
                <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-black/90 p-5 pb-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-white">Ovoz effekti</p>
                        <button onClick={() => setFxSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                            <X className="h-4 w-4 text-white" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {VOICE_FX_LIST.map(fx => {
                            const active = voiceFx === fx.id;
                            return (
                                <button key={fx.id} onClick={() => applyVoiceFx(fx.id)}
                                    style={active ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.45)" } : undefined}
                                    className={`flex flex-col items-center gap-0.5 rounded-2xl p-3 text-center transition-transform hover:scale-105 active:scale-95 ${active ? "text-white" : "bg-white/10 text-white/90 ring-1 ring-white/15"}`}>
                                    <span className="text-sm font-black">{fx.label}</span>
                                    <span className="text-[10px] opacity-70">{fx.hint}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Active — Nexus accent gradient (#2B3EE8 → #00CEC8). Inactive — kulrang shishasimon.
function CtrlButton({ onClick, active, icon, disabled }: { onClick: () => void; active: boolean; icon: React.ReactNode; disabled?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled}
            style={active ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.45)" } : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${active ? "" : "bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"}`}>
            {icon}
        </button>
    );
}

function formatDur(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
