"use client";

// Nexus 1:1 WebRTC ovoz/video chaqiruv oynasi (Telegram uslubi).
// - Video transceiver oldindan yaratiladi (sendrecv) → track qo'shishda renegotiate KERAK EMAS
// - Ovozli boshlanadi, kamera/ekran dinamik almashadi (replaceTrack)
// - Kamera aylantirish (front/back) — facingMode toggle
// - Ekran ulashish (getDisplayMedia) — mobil brauzerlarda YO'Q, tugma yashirinadi
// - Perfect Negotiation (glare) + Minimize (kichik pinned oyna)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Video as CamIcon, VideoOff, PhoneOff, Loader2, Volume2, VolumeX, BadgeCheck, Minimize2, Maximize2, ScreenShare, ScreenShareOff, SwitchCamera, SlidersHorizontal, X, ImagePlus, Smile, Circle, Square } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import { VoiceFxPipeline, VOICE_FX_LIST, type VoiceEffect } from "@/lib/nexus-voice-fx";
import { BackgroundFxPipeline, type BgEffect } from "@/lib/nexus-bg-fx";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher-client";

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

// Emoji reaksiya — 8 ta xavfsiz variant (cho'chqasiz, spirtsiz)
const REACTIONS: { id: string; char: string }[] = [
    { id: "heart",  char: "❤️" },
    { id: "thumbs", char: "👍" },
    { id: "laugh",  char: "😂" },
    { id: "wow",    char: "😮" },
    { id: "clap",   char: "👏" },
    { id: "party",  char: "🎉" },
    { id: "fire",   char: "🔥" },
    { id: "cry",    char: "😢" },
];
const REACTION_CHAR: Record<string, string> = Object.fromEntries(REACTIONS.map(r => [r.id, r.char]));

interface FloatingReaction { key: number; char: string; x: number; }

// Preset fon rasmlari (Picsum — CORS-enabled, barqaror seed)
const BG_PRESETS: { id: string; url: string; label: string }[] = [
    { id: "office", url: "https://picsum.photos/seed/nx-office/960/540", label: "Ofis" },
    { id: "sky",    url: "https://picsum.photos/seed/nx-sky/960/540", label: "Osmon" },
    { id: "forest", url: "https://picsum.photos/seed/nx-forest/960/540", label: "O'rmon" },
    { id: "ocean",  url: "https://picsum.photos/seed/nx-ocean/960/540", label: "Dengiz" },
    { id: "city",   url: "https://picsum.photos/seed/nx-city/960/540", label: "Shahar" },
    { id: "abstract", url: "https://picsum.photos/seed/nx-abstract/960/540", label: "Abstract" },
];

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
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);
    const [reactionSheetOpen, setReactionSheetOpen] = useState(false);
    const reactionKeyRef = useRef(0);
    const [recording, setRecording] = useState(false);
    const [recordUploading, setRecordUploading] = useState(false);
    const [peerRecording, setPeerRecording] = useState(false);
    const [recToast, setRecToast] = useState<string>("");
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recChunksRef = useRef<BlobPart[]>([]);
    const recStartTsRef = useRef<number>(0);
    const recAudioCtxRef = useRef<AudioContext | null>(null);
    const [bgFx, setBgFx] = useState<BgEffect>("none");
    const [bgBusy, setBgBusy] = useState(false);
    const [fxSheetOpen, setFxSheetOpen] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const voicePipelineRef = useRef<VoiceFxPipeline | null>(null);
    const bgPipelineRef = useRef<BackgroundFxPipeline | null>(null);
    const cameraRawTrackRef = useRef<MediaStreamTrack | null>(null);
    const bgFxRef = useRef<BgEffect>("none");
    const bgImageUrlRef = useRef<string | null>(null);
    const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
    const [bgUploading, setBgUploading] = useState(false);
    const bgFileRef = useRef<HTMLInputElement>(null);
    const levelAudioCtxRef = useRef<AudioContext | null>(null);
    const [localLevel, setLocalLevel] = useState(0);
    const [remoteLevel, setRemoteLevel] = useState(0);
    const localRef = useRef<HTMLVideoElement>(null);
    const remoteRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioSenderRef = useRef<RTCRtpSender | null>(null);
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
        try { bgPipelineRef.current?.dispose(); } catch { }
        bgPipelineRef.current = null;
        try { cameraRawTrackRef.current?.stop(); } catch { }
        cameraRawTrackRef.current = null;
        try { levelAudioCtxRef.current?.close(); } catch { }
        levelAudioCtxRef.current = null;
        remoteStreamRef.current = null;
        try { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); } catch { }
        recorderRef.current = null;
        try { recAudioCtxRef.current?.close(); } catch { }
        recAudioCtxRef.current = null;
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

    // Chaqiruvni yozib olish (mahalliy mic + remote audio mixed → MediaRecorder)
    const startRecording = useCallback(async () => {
        if (recording || phase !== "in-call") return;
        const localStream = localStreamRef.current;
        const remoteObj = remoteAudioRef.current?.srcObject as MediaStream | null;
        if (!localStream || !remoteObj) { setRecToast("Ovoz oqim topilmadi"); return; }
        const AC = typeof window !== "undefined"
            ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
            : null;
        if (!AC) { setRecToast("Brauzer yozib olishni qo'llab-quvvatlamaydi"); return; }
        try {
            const ctx = new AC();
            recAudioCtxRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            // Mahalliy mic
            if (localStream.getAudioTracks().length) {
                const src1 = ctx.createMediaStreamSource(localStream);
                src1.connect(dest);
            }
            // Peer audio
            if (remoteObj.getAudioTracks().length) {
                const src2 = ctx.createMediaStreamSource(remoteObj);
                src2.connect(dest);
            }
            // MediaRecorder mimeType tanlash
            const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
            const mime = mimeCandidates.find(m => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";
            const rec = mime ? new MediaRecorder(dest.stream, { mimeType: mime }) : new MediaRecorder(dest.stream);
            recorderRef.current = rec;
            recChunksRef.current = [];
            rec.ondataavailable = (ev) => { if (ev.data.size > 0) recChunksRef.current.push(ev.data); };
            rec.start(1000); // har 1s'da chunk
            recStartTsRef.current = Date.now();
            setRecording(true);
            // Peer'ga xabar
            fetch(`/api/nexus/calls/${callId}/recording/notify`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            }).catch(() => { });
        } catch (e) {
            setRecToast(e instanceof Error ? e.message : "Yozib olishni boshlash xatosi");
        }
    }, [recording, phase, callId]);

    const stopRecording = useCallback(async () => {
        const rec = recorderRef.current;
        if (!rec || rec.state === "inactive") return;
        setRecording(false);
        setRecordUploading(true);
        try {
            const durationSec = Math.max(1, Math.round((Date.now() - recStartTsRef.current) / 1000));
            const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
            rec.stop();
            await stopped;
            const blob = new Blob(recChunksRef.current, { type: rec.mimeType || "audio/webm" });
            recChunksRef.current = [];
            try { recAudioCtxRef.current?.close(); } catch { }
            recAudioCtxRef.current = null;
            // Peer'ga xabar
            fetch(`/api/nexus/calls/${callId}/recording/notify`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "stop" }),
            }).catch(() => { });
            // Upload
            const fd = new FormData();
            const ext = (rec.mimeType || "").includes("mp4") ? "mp4" : (rec.mimeType || "").includes("ogg") ? "ogg" : "webm";
            fd.append("file", new File([blob], `call-${callId}.${ext}`, { type: blob.type }));
            fd.append("durationSec", String(durationSec));
            const r = await fetch(`/api/nexus/calls/${callId}/recording`, { method: "POST", body: fd })
                .then(x => x.json()).catch(() => null);
            if (r?.recording) {
                setRecToast(`Yozildi (${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}) — chaqiruv tarixida`);
            } else {
                setRecToast("Yuklab bo'lmadi");
            }
        } catch (e) {
            setRecToast(e instanceof Error ? e.message : "Yozuvni yakunlash xatosi");
        } finally {
            setRecordUploading(false);
            setTimeout(() => setRecToast(""), 5000);
        }
    }, [callId]);

    const toggleRecording = useCallback(() => {
        if (recording) stopRecording();
        else startRecording();
    }, [recording, startRecording, stopRecording]);

    // Emoji reaksiya — mahalliy ko'rsatish + Pusher orqali peer'ga yuborish
    const spawnReaction = useCallback((char: string) => {
        const key = ++reactionKeyRef.current;
        const x = 15 + Math.random() * 70; // 15%..85% horizontally
        setReactions(prev => [...prev, { key, char, x }]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.key !== key));
        }, 2800);
    }, []);

    const sendReaction = useCallback(async (id: string) => {
        const char = REACTION_CHAR[id];
        if (!char) return;
        spawnReaction(char);              // O'zim darrov ko'raman
        setReactionSheetOpen(false);
        try {
            await fetch(`/api/nexus/calls/${callId}/reaction`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji: id }),
            });
        } catch { }
    }, [callId, spawnReaction]);

    // Ovoz kuchi o'lchagichi — AnalyserNode RMS bo'yicha, RAF 15fps
    const setupLevelMeter = useCallback((who: "local" | "remote", stream: MediaStream) => {
        if (!stream.getAudioTracks().length) return;
        const AC = typeof window !== "undefined"
            ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
            : null;
        if (!AC) return;
        try {
            if (!levelAudioCtxRef.current) levelAudioCtxRef.current = new AC();
            const ctx = levelAudioCtxRef.current;
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.75;
            src.connect(analyser);
            const buf = new Uint8Array(analyser.frequencyBinCount);
            let last = 0;
            const loop = () => {
                if (endedRef.current) return;
                const now = performance.now();
                if (now - last > 66) { // ~15fps
                    last = now;
                    analyser.getByteFrequencyData(buf);
                    let sum = 0;
                    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
                    const rms = Math.sqrt(sum / buf.length);
                    const pct = Math.min(100, Math.round((rms / 128) * 100));
                    if (who === "local") setLocalLevel(pct); else setRemoteLevel(pct);
                }
                requestAnimationFrame(loop);
            };
            loop();
        } catch (e) {
            console.warn("level meter:", e);
        }
    }, []);

    const sendSignal = useCallback(async (sigKind: "offer" | "answer" | "ice", payload: unknown) => {
        await fetch(`/api/nexus/calls/${callId}/signal`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: sigKind, payload }),
        }).catch(() => { });
    }, [callId]);

    // Renegotiate — stable bo'lsa darrov, aks holda pending flag qo'yib kutamiz
    const triggerRenegotiate = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.signalingState !== "stable" || makingOfferRef.current) {
            pendingRenegotiateRef.current = true;
            return;
        }
        try {
            makingOfferRef.current = true;
            await pc.setLocalDescription();
            if (pc.localDescription) {
                await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
            }
        } catch (e) {
            console.warn("renegotiate:", e);
        } finally {
            makingOfferRef.current = false;
        }
    }, [sendSignal]);

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
        // Ovoz kuchi indikatori — mahalliy mikrofon (FX'gacha)
        setupLevelMeter("local", stream);
        // Video: dinamik qo'shiladi (applyVideoTrack pc.addTrack chaqiradi) — bu ishonchli
        // onnegotiationneeded triggerni ta'minlaydi (transceiver pre-yaratish iOS + Chrome'da muammo edi).

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
            // Barcha receiver'lardan birlashtirilgan remote stream quramiz (msid'ga tayanmaymiz)
            const combined = remoteStreamRef.current ?? new MediaStream();
            for (const r of pc.getReceivers()) {
                if (r.track && !combined.getTracks().includes(r.track)) {
                    combined.addTrack(r.track);
                }
            }
            remoteStreamRef.current = combined;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = combined;
            if (remoteRef.current) remoteRef.current.srcObject = combined;
            // Remote ovoz kuchi indikatori (audio track paydo bo'lganda)
            if (ev.track.kind === "audio") setupLevelMeter("remote", combined);
            const updateFlag = () => {
                const stream = remoteStreamRef.current;
                const has = !!stream && stream.getVideoTracks().some(t => t.readyState === "live" && !t.muted);
                setRemoteVideo(has);
            };
            updateFlag();
            // Track holati o'zgarganda (mute/unmute/ended) yangilaymiz
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
        // Signaling state stable bo'lganda, kutayotgan renegotiate bor bo'lsa ishga tushiramiz
        pc.onsignalingstatechange = () => {
            if (pc.signalingState === "stable" && pendingRenegotiateRef.current) {
                pendingRenegotiateRef.current = false;
                // Micro-task: hozirgi call stack tugagach
                setTimeout(() => { void triggerRenegotiate(); }, 0);
            }
        };
        return pc;
    }, [sendSignal, endCall, triggerRenegotiate]);

    // ── Video track qo'shish/almashtirish ────────────────────────────────────
    // Sender yo'q bo'lsa addTrack (onnegotiationneeded avtomatik fire),
    // bor bo'lsa replaceTrack (seamless).
    const applyVideoTrack = useCallback(async (track: MediaStreamTrack | null, source: VideoSource) => {
        const pc = pcRef.current;
        const stream = localStreamRef.current;
        if (!pc || !stream) return;
        // Eski video track'ni to'xtatish
        for (const t of stream.getVideoTracks()) {
            try { t.stop(); } catch { }
            stream.removeTrack(t);
        }
        if (track) stream.addTrack(track);
        try {
            if (videoSenderRef.current) {
                // Sender allaqachon bor — track'ni almashtirish (yoki null qilish)
                await videoSenderRef.current.replaceTrack(track);
            } else if (track) {
                // Birinchi marta video — addTrack (bu onnegotiationneeded'ni ishga tushiradi)
                videoSenderRef.current = pc.addTrack(track, stream);
            }
        } catch (e) {
            console.warn("video track qo'shish:", e);
        }
        if (localRef.current) localRef.current.srcObject = stream;
        setVideoSource(source);

        // Safety net — onnegotiationneeded fire bo'lmasa qo'lda trigger
        await triggerRenegotiate();
    }, [triggerRenegotiate]);

    const enableCamera = useCallback(async (facingOverride?: Facing) => {
        if (videoBusy) return;
        setVideoBusy(true);
        try {
            const f = facingOverride ?? facing;
            const v = await navigator.mediaDevices.getUserMedia(cameraConstraints(f));
            const [rawTrack] = v.getVideoTracks();
            if (!rawTrack) throw new Error("Kamera oqim topilmadi");
            // Eski raw track'ni to'xtatamiz
            try { cameraRawTrackRef.current?.stop(); } catch { }
            cameraRawTrackRef.current = rawTrack;
            // BG effekt qo'llash (yoki asl track)
            let outTrack = rawTrack;
            if (bgFxRef.current !== "none") {
                if (!bgPipelineRef.current) bgPipelineRef.current = new BackgroundFxPipeline();
                const outStream = await bgPipelineRef.current.apply(rawTrack, bgFxRef.current, bgImageUrlRef.current ?? undefined);
                outTrack = outStream.getVideoTracks()[0] ?? rawTrack;
            }
            await applyVideoTrack(outTrack, "camera");
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
        try {
            await applyVideoTrack(null, "none");
            try { bgPipelineRef.current?.dispose(); } catch { }
            bgPipelineRef.current = null;
            try { cameraRawTrackRef.current?.stop(); } catch { }
            cameraRawTrackRef.current = null;
        }
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

    // Signal ishlash — Perfect Negotiation (polling ham, Pusher ham foydalanadi)
    const processedIdsRef = useRef<Set<string>>(new Set());
    const processSignal = useCallback(async (s: { id?: string; kind: string; payload: unknown }) => {
        if (s.id) {
            if (processedIdsRef.current.has(s.id)) return;
            processedIdsRef.current.add(s.id);
        }
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
    }, [initPeer, sendSignal]);

    // ── Pusher real-time signal + call-state event'lar ───────────────────────
    const { data: session } = useSession();
    // @ts-ignore
    const myProfileId: string | null = session?.user?.profileId ?? null;
    useEffect(() => {
        if (!myProfileId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-user-${myProfileId}`);
        const onSignal = (data: { callId: string; kind: string; payload: unknown; fromId: string }) => {
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
                if (pc.localDescription) {
                    await sendSignal("offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
                }
            } finally { makingOfferRef.current = false; }
            if (initialKind === "VIDEO") await enableCamera();
        };
        const onRejectedOrEnded = (data: { callId: string }) => {
            if (data.callId !== callId) return;
            endCall(false);
        };
        const onReaction = (data: { callId: string; emoji: string }) => {
            if (data.callId !== callId) return;
            const char = REACTION_CHAR[data.emoji];
            if (char) spawnReaction(char);
        };
        const onRecStart = (data: { callId: string }) => {
            if (data.callId === callId) setPeerRecording(true);
        };
        const onRecStop = (data: { callId: string }) => {
            if (data.callId === callId) setPeerRecording(false);
        };
        channel.bind("signal:offer", onSignal);
        channel.bind("signal:answer", onSignal);
        channel.bind("signal:ice", onSignal);
        channel.bind("call:accepted", onAccepted);
        channel.bind("call:rejected", onRejectedOrEnded);
        channel.bind("call:ended", onRejectedOrEnded);
        channel.bind("reaction:emoji", onReaction);
        channel.bind("recording:start", onRecStart);
        channel.bind("recording:stop", onRecStop);
        return () => {
            channel.unbind("signal:offer", onSignal);
            channel.unbind("signal:answer", onSignal);
            channel.unbind("signal:ice", onSignal);
            channel.unbind("call:accepted", onAccepted);
            channel.unbind("call:rejected", onRejectedOrEnded);
            channel.unbind("call:ended", onRejectedOrEnded);
            channel.unbind("reaction:emoji", onReaction);
            channel.unbind("recording:start", onRecStart);
            channel.unbind("recording:stop", onRecStop);
        };
    }, [myProfileId, callId, role, initialKind, processSignal, initPeer, sendSignal, enableCamera, endCall, spawnReaction]);

    // ── Signal polling fallback (Pusher yo'q/uzilgan bo'lsa) ─────────────────
    useEffect(() => {
        let stopped = false;
        // Pusher ulangan bo'lsa polling faqat safety net — 5s'da bir marta yetadi
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

    // Remote video element remount bo'lsa (showRemoteVideo o'zgarsa), srcObject qayta biriktir
    useEffect(() => {
        if (remoteRef.current && remoteStreamRef.current) {
            remoteRef.current.srcObject = remoteStreamRef.current;
        }
    }, [remoteVideo]);

    const toggleMute = () => {
        setMuted(m => {
            const next = !m;
            // Original mikrofon track'ni o'chiramiz — pipeline'ga input'ni to'xtatadi (effekt bo'lsa ham jim)
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
            return next;
        });
    };

    // Fon effektini almashtirish (faqat kamera yoqilgan bo'lsa amal qiladi)
    const applyBgFx = useCallback(async (effect: BgEffect, imageUrl?: string) => {
        setBgFx(effect);
        bgFxRef.current = effect;
        if (effect === "image" && imageUrl) {
            setBgImageUrl(imageUrl);
            bgImageUrlRef.current = imageUrl;
        }
        const raw = cameraRawTrackRef.current;
        const sender = videoSenderRef.current;
        if (!raw || !sender || videoSource !== "camera") return;
        setBgBusy(true);
        try {
            if (effect === "none") {
                try { bgPipelineRef.current?.dispose(); } catch { }
                bgPipelineRef.current = null;
                await sender.replaceTrack(raw);
                if (localRef.current) localRef.current.srcObject = localStreamRef.current;
                return;
            }
            if (!bgPipelineRef.current) bgPipelineRef.current = new BackgroundFxPipeline();
            const outStream = await bgPipelineRef.current.apply(raw, effect, effect === "image" ? (imageUrl ?? bgImageUrlRef.current ?? undefined) : undefined);
            const [outTrack] = outStream.getVideoTracks();
            if (outTrack) {
                await sender.replaceTrack(outTrack);
                // Mahalliy preview'ni yangi (qayta ishlangan) oqim bilan yangilash
                const localStream = localStreamRef.current;
                if (localStream) {
                    for (const t of localStream.getVideoTracks()) { try { localStream.removeTrack(t); } catch { } }
                    localStream.addTrack(outTrack);
                    if (localRef.current) localRef.current.srcObject = localStream;
                }
            }
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Fon effekti xatosi");
        } finally {
            setBgBusy(false);
        }
    }, [videoSource]);

    // O'z rasmni yuklab, fon sifatida qo'llash
    const uploadBgImage = useCallback(async (file: File) => {
        setBgUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "brand");
            const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({}));
            if (r?.url) await applyBgFx("image", r.url);
        } finally {
            setBgUploading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/15"
                        style={remoteLevel > 8 ? { boxShadow: `0 0 ${10 + remoteLevel * 0.25}px rgba(0,206,200,${0.4 + remoteLevel / 300})` } : undefined}>
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
            {/* Remote video element — DOIMO mount qilingan (ref stabil qoladi), CSS bilan yashirinadi */}
            <video ref={remoteRef} autoPlay playsInline
                className={showRemoteVideo ? "absolute inset-0 h-full w-full object-cover" : "hidden"} />
            {!showRemoteVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-black">
                    <div className="relative">
                        {/* Jonli ovoz halqasi (remoteLevel bo'yicha kengayadi) */}
                        <div className="pointer-events-none absolute inset-0 rounded-full transition-all duration-100"
                            style={{
                                transform: `scale(${1 + remoteLevel / 200})`,
                                boxShadow: `0 0 ${40 + remoteLevel * 0.6}px ${remoteLevel * 0.3}px rgba(0,206,200,${0.15 + remoteLevel / 300})`,
                            }} />
                        <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/30">
                            {peer.image
                                ? <Image src={peer.image} alt="" width={160} height={160} className="h-full w-full object-cover" />
                                : <span className="text-4xl font-black">{peerLabel.slice(0, 2).toUpperCase()}</span>}
                        </div>
                    </div>
                </div>
            )}
            <audio ref={remoteAudioRef} autoPlay />

            {/* Tepa overlay + minimize */}
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCallMinimized(true)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
                        aria-label="Kichraytirish">
                        <Minimize2 className="h-4 w-4" />
                    </button>
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/15"
                        style={remoteLevel > 8 ? { boxShadow: `0 0 ${12 + remoteLevel * 0.25}px rgba(0,206,200,${0.4 + remoteLevel / 300})` } : undefined}>
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
                {(recording || peerRecording) && (
                    <div className="mt-3 flex items-center gap-2 rounded-full bg-rose-600/85 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        {recording ? "Yozib olyapman" : `${peerLabel} yozib olyapti`}
                    </div>
                )}
                {recToast && (
                    <p className="mt-3 rounded-xl bg-emerald-500/25 px-3 py-2 text-xs font-semibold text-emerald-100">{recToast}</p>
                )}
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
                    <div className="relative">
                        {!muted && localLevel > 8 && (
                            <span className="pointer-events-none absolute inset-0 rounded-full transition-all duration-100"
                                style={{
                                    transform: `scale(${1 + localLevel / 220})`,
                                    boxShadow: `0 0 ${8 + localLevel * 0.4}px rgba(0,206,200,${0.35 + localLevel / 300})`,
                                }} />
                        )}
                        <CtrlButton onClick={toggleMute} active={!muted}
                            icon={muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />} />
                    </div>
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
                    <CtrlButton onClick={() => setReactionSheetOpen(v => !v)} active={reactionSheetOpen}
                        icon={<Smile className="h-6 w-6" />} />
                    <CtrlButton onClick={toggleRecording} active={recording}
                        disabled={phase !== "in-call" || recordUploading}
                        icon={recordUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : recording ? <Square className="h-6 w-6 fill-current" /> : <Circle className="h-6 w-6" />} />
                    <CtrlButton onClick={() => setFxSheetOpen(v => !v)} active={voiceFx !== "none"}
                        icon={<SlidersHorizontal className="h-6 w-6" />} />
                    <button onClick={() => endCall()}
                        className="ml-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <PhoneOff className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Emoji reaksiya — floating layer (pastdan tepaga uchadi) */}
            {reactions.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-[15]">
                    {reactions.map(r => (
                        <div key={r.key}
                            className="nx-reaction absolute text-5xl sm:text-6xl"
                            style={{ left: `${r.x}%`, bottom: "180px" }}>
                            {r.char}
                        </div>
                    ))}
                </div>
            )}

            {/* Emoji tanlash paneli (kichik yopishqoq) */}
            {reactionSheetOpen && (
                <div className="absolute inset-x-0 bottom-32 z-[18] flex justify-center px-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-black/85 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                        {REACTIONS.map(r => (
                            <button key={r.id} onClick={() => sendReaction(r.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125 active:scale-95">
                                {r.char}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Effektlar bottom sheet */}
            {fxSheetOpen && (
                <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-black/90 p-5 pb-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-white">Effektlar</p>
                        <button onClick={() => setFxSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                            <X className="h-4 w-4 text-white" />
                        </button>
                    </div>
                    <p className="mb-2 text-[10px] font-bold uppercase text-white/50">Ovoz</p>
                    <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                    <p className="mb-2 text-[10px] font-bold uppercase text-white/50">
                        Fon {videoSource !== "camera" && <span className="ml-1 normal-case text-white/40">(kamerani yoqing)</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(["none", "blur"] as const).map(id => {
                            const active = bgFx === id;
                            const disabled = videoSource !== "camera" || bgBusy;
                            const label = id === "none" ? "Yo'q" : "Xiralashtirish";
                            const hint = id === "none" ? "Asl fon" : "MediaPipe segmentatsiya";
                            return (
                                <button key={id} onClick={() => applyBgFx(id)} disabled={disabled}
                                    style={active ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.45)" } : undefined}
                                    className={`flex flex-col items-center gap-0.5 rounded-2xl p-3 text-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${active ? "text-white" : "bg-white/10 text-white/90 ring-1 ring-white/15"}`}>
                                    <span className="text-sm font-black">{label}</span>
                                    <span className="text-[10px] opacity-70">{bgBusy && active ? "Yuklanmoqda…" : hint}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Fon rasm galereyasi */}
                    <p className="mt-3 mb-2 text-[10px] font-bold uppercase text-white/50">Fon rasm</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {BG_PRESETS.map(p => {
                            const active = bgFx === "image" && bgImageUrl === p.url;
                            const disabled = videoSource !== "camera" || bgBusy;
                            return (
                                <button key={p.id} onClick={() => applyBgFx("image", p.url)} disabled={disabled} title={p.label}
                                    className={`relative aspect-square overflow-hidden rounded-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${active ? "ring-2 ring-[#00CEC8]" : "ring-1 ring-white/15"}`}>
                                    <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                                    {active && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className="h-2 w-2 rounded-full bg-[#00CEC8]" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        <button onClick={() => bgFileRef.current?.click()} disabled={videoSource !== "camera" || bgUploading}
                            title="O'z rasmingiz"
                            className="flex aspect-square items-center justify-center rounded-xl bg-white/10 text-white/70 ring-1 ring-white/15 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
                            {bgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        </button>
                        <input ref={bgFileRef} type="file" accept="image/*" hidden
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadBgImage(f); e.target.value = ""; }} />
                    </div>
                    <p className="mt-3 text-[10px] text-white/40">Fon effekti birinchi marta yoqilganda MediaPipe modeli (~4MB) yuklanadi.</p>
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
