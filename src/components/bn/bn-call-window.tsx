"use client";

// BN 1:1 qo'ng'iroq oynasi — ovoz + video toggle (WebRTC). Nexus'ning ISHLAYOTGAN
// signaling backend'ini (/api/nexus/calls/*) qayta ishlatadi, lekin BN-native toza
// oyna (emoji/effekt/yozuvsiz). Telefon raqami umuman ishlatilmaydi — yashirin.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Video as CamIcon, VideoOff, PhoneOff, Loader2, SwitchCamera, Volume2, VolumeX, User, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher-client";
import { BN } from "@/lib/bn-theme";

export interface CallPeer { id: string; name: string | null; username: string | null; image: string | null; verified?: boolean }
export interface BnCallProductCtx { title: string; image: string | null }

type Kind = "AUDIO" | "VIDEO";
type Role = "caller" | "callee";
type Phase = "connecting" | "ringing" | "in-call" | "ended";
type VideoSource = "none" | "camera";
type Facing = "user" | "environment";

interface Props {
    callId: string;
    role: Role;
    kind: Kind;
    peer: CallPeer;
    bnProduct?: BnCallProductCtx | null;
    autoAccepted?: boolean;
    onClose: () => void;
}

const FALLBACK_ICE: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const r = await fetch("/api/nexus/calls/ice-servers").then(x => x.json()) as { iceServers?: RTCIceServer[] };
        return r?.iceServers?.length ? r.iceServers : FALLBACK_ICE;
    } catch { return FALLBACK_ICE; }
}

const STATE_POLL_MS = 3000;
const SIGNAL_POLL_MS = 1500;
const cameraConstraints = (facing: Facing): MediaStreamConstraints => ({
    audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facing },
});

function fmtDur(s: number): string {
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
}

export function BnCallWindow({ callId, role, kind: initialKind, peer, bnProduct, autoAccepted, onClose }: Props) {
    const [phase, setPhase] = useState<Phase>(role === "caller" ? "connecting" : autoAccepted ? "connecting" : "ringing");
    const [muted, setMuted] = useState(false);
    const [videoSource, setVideoSource] = useState<VideoSource>("none");
    const [facing, setFacing] = useState<Facing>("user");
    const [remoteVideo, setRemoteVideo] = useState(false);
    const [speaker, setSpeaker] = useState(true);
    const [duration, setDuration] = useState(0);
    const [err, setErr] = useState("");

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localRef = useRef<HTMLVideoElement>(null);
    const remoteRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const videoSenderRef = useRef<RTCRtpSender | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const sinceRef = useRef<string>(new Date(Date.now() - 60_000).toISOString());
    const startTsRef = useRef<number | null>(null);
    const endedRef = useRef(false);
    const acceptedRef = useRef(role === "callee" && autoAccepted === true);

    // Perfect Negotiation
    const politeRef = useRef(role === "callee");
    const makingOfferRef = useRef(false);
    const ignoreOfferRef = useRef(false);
    const pendingRenegotiateRef = useRef(false);

    // ── Tugatish ─────────────────────────────────────────────────────────────
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
        remoteStreamRef.current = null;
        setPhase("ended");
        if (notify) {
            fetch(`/api/nexus/calls/${callId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            }).catch(() => { });
        }
        setTimeout(onClose, 1000);
    }, [callId, onClose]);

    const sendSignal = useCallback(async (sigKind: "offer" | "answer" | "ice", payload: unknown) => {
        await fetch(`/api/nexus/calls/${callId}/signal`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: sigKind, payload }),
        }).catch(() => { });
    }, [callId]);

    const triggerRenegotiate = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.signalingState !== "stable" || makingOfferRef.current) { pendingRenegotiateRef.current = true; return; }
        try {
            makingOfferRef.current = true;
            await pc.setLocalDescription();
            if (pc.localDescription) await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
        } catch { /* noop */ } finally { makingOfferRef.current = false; }
    }, [sendSignal]);

    // ── PeerConnection + audio track ─────────────────────────────────────────
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
        const [audioTrack] = stream.getAudioTracks();
        if (audioTrack) pc.addTrack(audioTrack, stream);

        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current = true;
                await pc.setLocalDescription();
                if (pc.localDescription) await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
            } catch { /* noop */ } finally { makingOfferRef.current = false; }
        };
        pc.ontrack = () => {
            const combined = remoteStreamRef.current ?? new MediaStream();
            for (const r of pc.getReceivers()) {
                if (r.track && !combined.getTracks().includes(r.track)) combined.addTrack(r.track);
            }
            remoteStreamRef.current = combined;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = combined;
            if (remoteRef.current) remoteRef.current.srcObject = combined;
            const has = combined.getVideoTracks().some(t => t.readyState === "live" && !t.muted);
            setRemoteVideo(has);
        };
        pc.onicecandidate = (ev) => { if (ev.candidate) sendSignal("ice", ev.candidate.toJSON()); };
        pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if (st === "connected") { setPhase("in-call"); if (!startTsRef.current) startTsRef.current = Date.now(); }
            else if (st === "failed" || st === "closed" || st === "disconnected") endCall();
        };
        pc.onsignalingstatechange = () => {
            if (pc.signalingState === "stable" && pendingRenegotiateRef.current) {
                pendingRenegotiateRef.current = false;
                setTimeout(() => { void triggerRenegotiate(); }, 0);
            }
        };
        return pc;
    }, [sendSignal, endCall, triggerRenegotiate]);

    // ── Video (kamera) qo'shish/o'chirish ────────────────────────────────────
    const applyVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
        const pc = pcRef.current;
        const stream = localStreamRef.current;
        if (!pc || !stream) return;
        for (const t of stream.getVideoTracks()) { try { t.stop(); } catch { } stream.removeTrack(t); }
        if (track) {
            stream.addTrack(track);
            if (videoSenderRef.current) {
                await videoSenderRef.current.replaceTrack(track).catch(() => { });
            } else {
                videoSenderRef.current = pc.addTrack(track, stream);
                await new Promise(r => setTimeout(r, 60));
                if (pc.signalingState === "stable") void triggerRenegotiate();
            }
            if (localRef.current) localRef.current.srcObject = stream;
        } else if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(null).catch(() => { });
        }
    }, [triggerRenegotiate]);

    const enableCamera = useCallback(async () => {
        if (!pcRef.current) return;
        try {
            const s = await navigator.mediaDevices.getUserMedia(cameraConstraints(facing));
            const [t] = s.getVideoTracks();
            await applyVideoTrack(t);
            setVideoSource("camera");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg && !/permission|denied/i.test(msg)) setErr(msg);
        }
    }, [facing, applyVideoTrack]);

    const disableCamera = useCallback(async () => {
        await applyVideoTrack(null);
        setVideoSource("none");
    }, [applyVideoTrack]);

    const toggleCamera = useCallback(() => {
        if (videoSource === "camera") disableCamera(); else enableCamera();
    }, [videoSource, enableCamera, disableCamera]);

    const flipCamera = useCallback(async () => {
        if (videoSource !== "camera") return;
        const next: Facing = facing === "user" ? "environment" : "user";
        setFacing(next);
        try {
            const s = await navigator.mediaDevices.getUserMedia(cameraConstraints(next));
            await applyVideoTrack(s.getVideoTracks()[0]);
        } catch { /* noop */ }
    }, [videoSource, facing, applyVideoTrack]);

    // ── Signal ishlash — Perfect Negotiation ─────────────────────────────────
    const processedIdsRef = useRef<Set<string>>(new Set());
    const processSignal = useCallback(async (s: { id?: string; kind: string; payload: unknown }) => {
        if (s.id) { if (processedIdsRef.current.has(s.id)) return; processedIdsRef.current.add(s.id); }
        const pc = pcRef.current || await initPeer();
        if (!pc) return;
        try {
            if (s.kind === "offer") {
                const readyForOffer = !makingOfferRef.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
                const offerCollision = !readyForOffer;
                ignoreOfferRef.current = !politeRef.current && offerCollision;
                if (ignoreOfferRef.current) return;
                if (offerCollision) {
                    await Promise.all([
                        pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit).catch(() => { }),
                        pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit)),
                    ]);
                } else {
                    await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                }
                await pc.setLocalDescription();
                if (pc.localDescription) await sendSignal("answer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
            } else if (s.kind === "answer") {
                if (pc.signalingState === "have-local-offer") {
                    await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
                }
            } else if (s.kind === "ice") {
                try { await pc.addIceCandidate(new RTCIceCandidate(s.payload as RTCIceCandidateInit)); } catch { /* noop */ }
            }
        } catch { /* noop */ }
    }, [initPeer, sendSignal]);

    // Caller: accept'ni kutib birinchi offer / Callee: autoAccept → initPeer
    useEffect(() => {
        let stopped = false;
        (async () => {
            if (role === "caller") {
                const poll = async () => {
                    if (stopped || endedRef.current) return;
                    const r = await fetch(`/api/nexus/calls/${callId}`).then(x => x.json()).catch(() => null);
                    if (!r?.call) return;
                    if (["REJECTED", "MISSED", "ENDED", "FAILED"].includes(r.call.status)) {
                        setErr(r.call.status === "REJECTED" ? "Rad etildi" : r.call.status === "MISSED" ? "Javob berilmadi" : "");
                        endCall(false);
                        return;
                    }
                    if (r.call.status === "ACCEPTED" && !pcRef.current) {
                        const pc = await initPeer();
                        if (!pc) return;
                        makingOfferRef.current = true;
                        try {
                            await pc.setLocalDescription();
                            if (pc.localDescription) await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
                        } finally { makingOfferRef.current = false; }
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

    // Pusher real-time
    const { data: session } = useSession();
    // @ts-expect-error profileId sessiyaga runtime'da qo'shiladi
    const myProfileId: string | null = session?.user?.profileId ?? null;
    useEffect(() => {
        if (!myProfileId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-user-${myProfileId}`);
        const onSignal = (data: { callId: string; kind: string; payload: unknown }) => {
            if (data.callId !== callId) return;
            void processSignal({ kind: data.kind, payload: data.payload });
        };
        const onAccepted = async (data: { callId: string }) => {
            if (data.callId !== callId || role !== "caller" || pcRef.current) return;
            const pc = await initPeer();
            if (!pc) return;
            makingOfferRef.current = true;
            try {
                await pc.setLocalDescription();
                if (pc.localDescription) await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
            } finally { makingOfferRef.current = false; }
            if (initialKind === "VIDEO") await enableCamera();
        };
        const onEnded = (data: { callId: string }) => { if (data.callId === callId) endCall(false); };
        channel.bind("signal:offer", onSignal);
        channel.bind("signal:answer", onSignal);
        channel.bind("signal:ice", onSignal);
        channel.bind("call:accepted", onAccepted);
        channel.bind("call:rejected", onEnded);
        channel.bind("call:ended", onEnded);
        return () => {
            channel.unbind("signal:offer", onSignal);
            channel.unbind("signal:answer", onSignal);
            channel.unbind("signal:ice", onSignal);
            channel.unbind("call:accepted", onAccepted);
            channel.unbind("call:rejected", onEnded);
            channel.unbind("call:ended", onEnded);
        };
    }, [myProfileId, callId, role, initialKind, processSignal, initPeer, sendSignal, enableCamera, endCall]);

    // Signal polling fallback
    useEffect(() => {
        let stopped = false;
        const pollMs = getPusherClient() ? 5000 : SIGNAL_POLL_MS;
        const tick = async () => {
            if (stopped || endedRef.current) return;
            const url = `/api/nexus/calls/${callId}/signal?since=${encodeURIComponent(sinceRef.current)}`;
            const r = await fetch(url).then(x => x.json()).catch(() => null) as { signals?: { id: string; kind: string; payload: unknown; createdAt: string }[] } | null;
            if (!r?.signals?.length) return;
            for (const s of r.signals) {
                sinceRef.current = new Date(new Date(s.createdAt).getTime()).toISOString();
                await processSignal(s);
            }
        };
        const iv = setInterval(tick, pollMs);
        tick();
        return () => { stopped = true; clearInterval(iv); };
    }, [callId, processSignal]);

    // Holat polling (ENDED/REJECTED/MISSED)
    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            if (stopped || endedRef.current) return;
            const r = await fetch(`/api/nexus/calls/${callId}`).then(x => x.json()).catch(() => null);
            if (r?.call?.status && ["ENDED", "REJECTED", "MISSED", "FAILED"].includes(r.call.status)) endCall(false);
        };
        const iv = setInterval(tick, STATE_POLL_MS * 2);
        return () => { stopped = true; clearInterval(iv); };
    }, [callId, endCall]);

    // Davomiylik timeri
    useEffect(() => {
        if (phase !== "in-call") return;
        const iv = setInterval(() => {
            if (startTsRef.current) setDuration(Math.floor((Date.now() - startTsRef.current) / 1000));
        }, 1000);
        return () => clearInterval(iv);
    }, [phase]);

    // Mute toggle
    useEffect(() => {
        const s = localStreamRef.current;
        if (s) s.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }, [muted, phase]);

    // Speaker (remote audio) toggle
    useEffect(() => {
        if (remoteAudioRef.current) remoteAudioRef.current.muted = !speaker;
    }, [speaker]);

    const statusText = err || (phase === "connecting" ? (role === "caller" ? "Qo'ng'iroq qilinyapti..." : "Ulanmoqda...")
        : phase === "in-call" ? fmtDur(duration)
        : phase === "ended" ? "Tugadi" : "");

    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: "#0b0a07" }}>
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {/* Remote video (video bo'lsa) yoki avatar */}
            <div className="relative flex-1 overflow-hidden">
                {remoteVideo ? (
                    <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-28 h-28 rounded-full overflow-hidden grid place-items-center" style={{ background: BN.surfaceUp, border: `2px solid ${BN.borderGold}` }}>
                            {peer.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={peer.image} alt="" className="w-full h-full object-cover" />
                            ) : <User className="w-12 h-12" style={{ color: BN.text3 }} />}
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="text-[20px] font-black text-white">{peer.name || (peer.username ? `@${peer.username}` : "Foydalanuvchi")}</span>
                                {peer.verified && <ShieldCheck className="w-4 h-4" style={{ color: BN.gold }} />}
                            </div>
                            <div className="text-[14px] mt-1" style={{ color: err ? BN.err : BN.text3 }}>{statusText}</div>
                        </div>
                    </div>
                )}

                {/* Yuqorida — mahsulot konteksti + status (video rejimida) */}
                <div className="absolute top-0 inset-x-0 p-4 flex items-start justify-between gap-3" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)", paddingTop: "max(16px, env(safe-area-inset-top))" }}>
                    <div className="min-w-0">
                        {remoteVideo && <div className="text-[15px] font-black text-white truncate">{peer.name || peer.username}</div>}
                        {remoteVideo && <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>{statusText}</div>}
                    </div>
                    {bnProduct && (
                        <div className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BN.borderGold}` }}>
                            {bnProduct.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={bnProduct.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                            )}
                            <span className="text-[12px] font-bold text-white truncate max-w-[140px]">{bnProduct.title}</span>
                        </div>
                    )}
                </div>

                {/* Local video PiP */}
                {videoSource === "camera" && (
                    <div className="absolute bottom-4 right-4 w-24 h-32 rounded-2xl overflow-hidden shadow-2xl" style={{ border: `1px solid ${BN.border}` }}>
                        <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
                    </div>
                )}
            </div>

            {/* Boshqaruv paneli */}
            <div className="p-5 flex items-center justify-center gap-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
                <CtrlBtn active={!muted} onClick={() => setMuted(m => !m)} label={muted ? "Yoqish" : "O'chirish"}>
                    {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </CtrlBtn>
                <CtrlBtn active={videoSource === "camera"} onClick={toggleCamera} label="Kamera">
                    {videoSource === "camera" ? <CamIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </CtrlBtn>
                {videoSource === "camera" && (
                    <CtrlBtn active onClick={flipCamera} label="Almashtirish">
                        <SwitchCamera className="w-6 h-6" />
                    </CtrlBtn>
                )}
                <CtrlBtn active={speaker} onClick={() => setSpeaker(s => !s)} label="Ovoz">
                    {speaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </CtrlBtn>
                <button
                    onClick={() => endCall()}
                    aria-label="Tugatish"
                    className="w-16 h-16 grid place-items-center rounded-full transition-transform active:scale-95"
                    style={{ background: BN.err, color: "#fff" }}
                >
                    <PhoneOff className="w-7 h-7" />
                </button>
            </div>
        </div>,
        document.body,
    );
}

function CtrlBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-14 h-14 grid place-items-center rounded-full transition-transform active:scale-95"
            style={{ background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.9)", color: active ? "#fff" : "#111" }}
        >
            {children}
        </button>
    );
}
