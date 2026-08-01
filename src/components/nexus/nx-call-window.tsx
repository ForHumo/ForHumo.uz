"use client";

// Nexus 1:1 WebRTC ovoz/video chaqiruv oynasi (Telegram uslubi).
// Boshlanishi: doim ovozli. Kamera chaqiruv davomida qo'shiladi/olib tashlanadi (dinamik renegotiate).
// Signaling: /api/nexus/calls/[id]/signal (polling).
// STUN: Google (bepul). TURN yo'q — 15% NAT'da fail-over qilishi mumkin.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Video as CamIcon, VideoOff, PhoneOff, Loader2, Volume2, VolumeX, BadgeCheck } from "lucide-react";

interface Peer { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean }

type Kind = "AUDIO" | "VIDEO";
type Role = "caller" | "callee";
type Phase = "connecting" | "ringing" | "in-call" | "ended";

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
const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 480 } };

interface Props {
    callId: string;
    role: Role;
    kind: Kind;               // Boshlang'ich rejim (AUDIO odatiy). VIDEO bo'lsa kamera darrov yoqiladi.
    peer: Peer;
    autoAccepted?: boolean;
    onClose: () => void;
}

export default function NxCallWindow({ callId, role, kind: initialKind, peer, autoAccepted, onClose }: Props) {
    const [phase, setPhase] = useState<Phase>(role === "caller" ? "connecting" : autoAccepted ? "connecting" : "ringing");
    const [muted, setMuted] = useState(false);
    const [localVideo, setLocalVideo] = useState(false);       // Menda kamera yoqilganmi
    const [remoteVideo, setRemoteVideo] = useState(false);     // Peer'da kamera yoqilganmi
    const [camBusy, setCamBusy] = useState(false);
    const [speaker, setSpeaker] = useState(true);
    const [duration, setDuration] = useState(0);
    const [err, setErr] = useState<string>("");

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localRef = useRef<HTMLVideoElement>(null);
    const remoteRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const videoSenderRef = useRef<RTCRtpSender | null>(null);
    const sinceRef = useRef<string>(new Date(Date.now() - 60_000).toISOString());
    const startTsRef = useRef<number | null>(null);
    const endedRef = useRef(false);
    const acceptedRef = useRef(role === "callee" && autoAccepted === true);

    // ── Chaqiruvni tugatish ──────────────────────────────────────────────────
    const endCall = useCallback(async (notify = true) => {
        if (endedRef.current) return;
        endedRef.current = true;
        try {
            pcRef.current?.getSenders().forEach(s => { try { s.track?.stop(); } catch { } });
            pcRef.current?.close();
        } catch { }
        pcRef.current = null;
        try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
        localStreamRef.current = null;
        setPhase("ended");
        if (notify) {
            fetch(`/api/nexus/calls/${callId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            }).catch(() => { });
        }
        setTimeout(onClose, 1200);
    }, [callId, onClose]);

    const sendSignal = useCallback(async (sigKind: "offer" | "answer" | "ice", payload: unknown) => {
        await fetch(`/api/nexus/calls/${callId}/signal`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: sigKind, payload }),
        }).catch(() => { });
    }, [callId]);

    // ── PeerConnection + local media (doim ovoz) ─────────────────────────────
    const initPeer = useCallback(async () => {
        if (pcRef.current) return pcRef.current;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Mikrofon ruxsat rad etildi";
            setErr(msg);
            await endCall();
            return null;
        }
        localStreamRef.current = stream;

        const iceServers = await fetchIceServers();
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);

        pc.ontrack = (ev) => {
            const [remote] = ev.streams;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
            if (remoteRef.current) remoteRef.current.srcObject = remote;
            // Peer kamerasini kuzatib boramiz
            const updateRemoteFlag = () => {
                const hasLiveVideo = remote.getVideoTracks().some(t => t.readyState === "live" && !t.muted);
                setRemoteVideo(hasLiveVideo);
            };
            updateRemoteFlag();
            remote.onaddtrack = updateRemoteFlag;
            remote.onremovetrack = updateRemoteFlag;
            for (const t of remote.getVideoTracks()) {
                t.onmute = updateRemoteFlag;
                t.onunmute = updateRemoteFlag;
                t.onended = updateRemoteFlag;
            }
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

    // ── Kamera yoqish (dinamik — chaqiruv davomida) ──────────────────────────
    const enableCamera = useCallback(async () => {
        if (camBusy || localVideo) return;
        const pc = pcRef.current;
        if (!pc || !localStreamRef.current) return;
        setCamBusy(true);
        try {
            const vStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: VIDEO_CONSTRAINTS });
            const [track] = vStream.getVideoTracks();
            if (!track) throw new Error("Video oqim topilmadi");
            localStreamRef.current.addTrack(track);
            if (videoSenderRef.current) {
                await videoSenderRef.current.replaceTrack(track);
            } else {
                videoSenderRef.current = pc.addTrack(track, localStreamRef.current);
            }
            if (localRef.current) localRef.current.srcObject = localStreamRef.current;
            setLocalVideo(true);
            // Renegotiate — yangi offer yuboramiz
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Kamera yoqilmadi";
            setErr(msg);
        } finally {
            setCamBusy(false);
        }
    }, [camBusy, localVideo, sendSignal]);

    // ── Kamera o'chirish (track'ni to'xtatib, sender'ni bo'shatamiz) ─────────
    const disableCamera = useCallback(async () => {
        if (camBusy || !localVideo) return;
        setCamBusy(true);
        try {
            const stream = localStreamRef.current;
            if (stream) {
                for (const t of stream.getVideoTracks()) {
                    try { t.stop(); } catch { }
                    stream.removeTrack(t);
                }
            }
            if (videoSenderRef.current) {
                await videoSenderRef.current.replaceTrack(null).catch(() => { });
            }
            if (localRef.current) localRef.current.srcObject = stream;
            setLocalVideo(false);
            // Renegotiate — peer'ga video ketmayotganini bildiramiz
            const pc = pcRef.current;
            if (pc) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
            }
        } finally {
            setCamBusy(false);
        }
    }, [camBusy, localVideo, sendSignal]);

    // ── Caller: accept'ni kutib, offer yuborish ──────────────────────────────
    // Callee: autoAccepted bo'lgach initPeer, offer signal'idan keladi
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
                        // VIDEO chaqiruv bo'lsa darrov kamerani yoqamiz (renegotiate ichida offer yuboriladi)
                        if (initialKind === "VIDEO") {
                            await enableCamera();
                        } else {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
                        }
                    }
                };
                await poll();
                const iv = setInterval(poll, STATE_POLL_MS);
                return () => clearInterval(iv);
            } else if (acceptedRef.current) {
                await initPeer();
                // VIDEO callee ham darrov kamera qo'ymaydi — o'zi tanlaydi (Telegram uslubi)
            }
        })();
        return () => { stopped = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Signal polling ───────────────────────────────────────────────────────
    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            if (stopped || endedRef.current) return;
            const url = `/api/nexus/calls/${callId}/signal?since=${encodeURIComponent(sinceRef.current)}`;
            const r = await fetch(url).then(x => x.json()).catch(() => null) as { signals?: { id: string; kind: string; payload: unknown; createdAt: string }[] } | null;
            if (!r?.signals?.length) return;
            for (const s of r.signals) {
                sinceRef.current = new Date(new Date(s.createdAt).getTime()).toISOString();
                try {
                    if (s.kind === "offer") {
                        const pc = await initPeer();
                        if (!pc) return;
                        await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await sendSignal("answer", { sdp: answer.sdp, type: answer.type });
                    } else if (s.kind === "answer") {
                        if (pcRef.current && pcRef.current.signalingState !== "stable") {
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                        }
                    } else if (s.kind === "ice") {
                        if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(s.payload as RTCIceCandidateInit)).catch(() => { });
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

    // ── Chaqiruv holati polling (peer end qilsa bilamiz) ─────────────────────
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

    // ── Duration timer ───────────────────────────────────────────────────────
    useEffect(() => {
        const iv = setInterval(() => {
            if (startTsRef.current) setDuration(Math.floor((Date.now() - startTsRef.current) / 1000));
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    // ── Mahalliy video preview'ni yangilash ──────────────────────────────────
    useEffect(() => {
        if (localRef.current) localRef.current.srcObject = localStreamRef.current;
    }, [localVideo]);

    // ── Toggle handlers ──────────────────────────────────────────────────────
    const toggleMute = () => {
        setMuted(m => {
            const next = !m;
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
            return next;
        });
    };
    const toggleCamera = () => {
        if (localVideo) disableCamera();
        else enableCamera();
    };
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

    const showRemoteVideo = remoteVideo && phase === "in-call";

    return (
        <div className="fixed inset-0 z-[300] flex flex-col bg-black text-white">
            {/* Remote video (peer kamerani yoqsa) yoki avatar */}
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
            {/* Remote video element bg'da qoladi (ontrack srcObject uchun) */}
            {!showRemoteVideo && <video ref={remoteRef} autoPlay playsInline className="hidden" />}
            <audio ref={remoteAudioRef} autoPlay />

            {/* Tepa overlay */}
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-5">
                <div className="flex items-center gap-3">
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

            {/* Mahalliy preview (faqat kamera yoqilgan bo'lsa) */}
            {localVideo && (
                <div className="absolute right-4 top-24 z-10 h-40 w-28 overflow-hidden rounded-2xl bg-black/50 ring-1 ring-white/20 shadow-2xl sm:right-6 sm:top-28 sm:h-52 sm:w-40">
                    <video ref={localRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
                </div>
            )}

            {/* Boshqaruv paneli */}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6 pb-10">
                <div className="mx-auto flex max-w-md items-center justify-center gap-3">
                    <CtrlButton onClick={toggleMute} active={!muted}
                        icon={muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />} />
                    <CtrlButton onClick={toggleCamera} active={localVideo}
                        disabled={camBusy || phase !== "in-call"}
                        icon={camBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : localVideo ? <CamIcon className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />} />
                    <CtrlButton onClick={toggleSpeaker} active={speaker}
                        icon={speaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />} />
                    <button onClick={() => endCall()}
                        className="ml-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <PhoneOff className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function CtrlButton({ onClick, active, icon, disabled }: { onClick: () => void; active: boolean; icon: React.ReactNode; disabled?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${active ? "bg-white/15 ring-1 ring-white/25" : "bg-white/45 text-black"}`}>
            {icon}
        </button>
    );
}

function formatDur(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
