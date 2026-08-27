"use client";

// Guruh/kanal kompozitorida rich media (voice/video-circle/location/contact) qo'shish.
// Plus tugmasi bosilsa 4 opsiya ochiladi.

import { useEffect, useRef, useState } from "react";
import { Paperclip, Mic, Video, MapPin, User, X, Loader2, Square } from "lucide-react";

export type ChannelAttachPayload = {
    mediaType: "audio" | "video-circle" | "location" | "contact";
    mediaUrl?: string;
    mediaMime?: string;
    mediaName?: string;
    mediaSize?: number;
    durationMs?: number;
    locLat?: number;
    locLng?: number;
    contactName?: string;
    contactPhone?: string;
    contactUsername?: string;
};

export function NxChannelRichAttach({
    onAttach, disabled,
}: {
    onAttach: (payload: ChannelAttachPayload) => Promise<void> | void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [recording, setRecording] = useState<null | "voice" | "video">(null);
    const [busy, setBusy] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactUsername, setContactUsername] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const startedAtRef = useRef<number>(0);
    const tickRef = useRef<NodeJS.Timeout | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (open && rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        }
        window.addEventListener("mousedown", onOutside);
        return () => window.removeEventListener("mousedown", onOutside);
    }, [open]);

    async function shareLocation() {
        setOpen(false);
        if (!navigator.geolocation) { alert("Brauzer joylashuvni qo'llamaydi"); return; }
        setBusy(true);
        try {
            await new Promise<void>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        await onAttach({
                            mediaType: "location",
                            locLat: pos.coords.latitude,
                            locLng: pos.coords.longitude,
                        });
                        resolve();
                    } catch (err) { reject(err); }
                }, (err) => reject(err), { enableHighAccuracy: true, timeout: 10000 });
            });
        } catch { alert("Joylashuvni olib bo'lmadi"); }
        finally { setBusy(false); }
    }

    async function uploadBlob(blob: Blob, filename: string): Promise<string | null> {
        try {
            const { upload } = await import("@vercel/blob/client");
            const res = await upload(`nexus/ch/${Date.now()}-${filename}`, blob, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
            });
            return res.url;
        } catch { return null; }
    }

    async function startRecording(kind: "voice" | "video") {
        setOpen(false);
        try {
            const constraints: MediaStreamConstraints = kind === "voice"
                ? { audio: true }
                : { audio: true, video: { facingMode: "user", width: 480, height: 480 } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            const mime = kind === "voice"
                ? (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                    : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "")
                : (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
                    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus"
                        : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            recorderRef.current = rec;
            chunksRef.current = [];
            rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            rec.start(250);
            startedAtRef.current = Date.now();
            setElapsed(0);
            setRecording(kind);
            tickRef.current = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 250);
        } catch { alert("Mikrofon/kamera ochilmadi"); }
    }

    async function stopRecording(cancel: boolean) {
        const rec = recorderRef.current;
        const kind = recording;
        if (!rec || !kind) return;
        return new Promise<void>((resolve) => {
            rec.onstop = async () => {
                if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
                const duration = Date.now() - startedAtRef.current;
                streamRef.current?.getTracks().forEach(t => t.stop());
                streamRef.current = null;
                setRecording(null);
                if (cancel) { chunksRef.current = []; resolve(); return; }
                if (duration < 500) { chunksRef.current = []; resolve(); return; }
                const blob = new Blob(chunksRef.current, { type: rec.mimeType || (kind === "voice" ? "audio/webm" : "video/webm") });
                chunksRef.current = [];
                setBusy(true);
                try {
                    const ext = kind === "voice" ? "webm" : "webm";
                    const url = await uploadBlob(blob, `${kind}.${ext}`);
                    if (url) {
                        await onAttach({
                            mediaType: kind === "voice" ? "audio" : "video-circle",
                            mediaUrl: url,
                            mediaMime: rec.mimeType || (kind === "voice" ? "audio/webm" : "video/webm"),
                            mediaSize: blob.size,
                            durationMs: duration,
                        });
                    }
                } finally { setBusy(false); resolve(); }
            };
            rec.stop();
        });
    }

    async function sendContact() {
        if (!contactName.trim() || !contactPhone.trim()) return;
        setBusy(true);
        try {
            await onAttach({
                mediaType: "contact",
                contactName: contactName.trim().slice(0, 100),
                contactPhone: contactPhone.trim().slice(0, 40),
                contactUsername: contactUsername.trim().replace(/^@/, "").slice(0, 40) || undefined,
            });
            setContactOpen(false);
            setContactName(""); setContactPhone(""); setContactUsername("");
        } finally { setBusy(false); }
    }

    // Recording overlay
    if (recording) {
        const secs = Math.floor(elapsed / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, "0");
        const ss = String(secs % 60).padStart(2, "0");
        return (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                style={{ background: "rgba(255,50,80,0.12)", border: "1px solid rgba(255,50,80,0.35)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF3250" }} />
                <span className="text-xs font-mono text-white">{mm}:{ss}</span>
                <button onClick={() => stopRecording(true)}
                    title="Bekor qilish"
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,80,90,0.2)" }}>
                    <X className="w-3.5 h-3.5" style={{ color: "#FF505A" }} />
                </button>
                <button onClick={() => stopRecording(false)}
                    title="Yuborish"
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Square className="w-3.5 h-3.5 text-white" />
                </button>
            </div>
        );
    }

    return (
        <div ref={rootRef} className="relative flex-shrink-0">
            <button onClick={() => setOpen(v => !v)} disabled={disabled || busy}
                title="Media qo'shish"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.25)" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            {open && (
                <div className="absolute left-0 bottom-full mb-2 min-w-[180px] z-[400] py-1 rounded-2xl"
                    style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
                    <button onClick={() => startRecording("voice")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 text-sm text-white">
                        <Mic className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Ovoz xabar
                    </button>
                    <button onClick={() => startRecording("video")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 text-sm text-white">
                        <Video className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Video-doira
                    </button>
                    <button onClick={shareLocation}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 text-sm text-white">
                        <MapPin className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Joylashuv
                    </button>
                    <button onClick={() => { setOpen(false); setContactOpen(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 text-sm text-white">
                        <User className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Kontakt
                    </button>
                </div>
            )}
            {contactOpen && (
                <>
                    <div className="fixed inset-0 z-[500] bg-black/60" onClick={() => setContactOpen(false)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-[501] p-5 rounded-3xl"
                        style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" style={{ color: "#00CEC8" }} /> Kontakt ulashish
                        </h3>
                        <div className="space-y-2">
                            <input value={contactName} onChange={e => setContactName(e.target.value)}
                                placeholder="Ism (majburiy)"
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                                placeholder="Telefon (majburiy)" inputMode="tel"
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                            <input value={contactUsername} onChange={e => setContactUsername(e.target.value)}
                                placeholder="@username (ixtiyoriy — Humo hisobi)"
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setContactOpen(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                                style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                Bekor
                            </button>
                            <button onClick={sendContact} disabled={!contactName.trim() || !contactPhone.trim() || busy}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Yuborish"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
