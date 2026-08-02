"use client";

// Guruh chaqiruvni ovoz yozib olish — mahalliy mic + barcha remote audio track'lar
// AudioContext'da mixed, MediaRecorder → Vercel Blob upload.
// LiveKitRoom ichida ishlaydi.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Circle, Square, Loader2 } from "lucide-react";

interface Props { callId: string }

export function NxGroupRecord({ callId }: Props) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [recording, setRecording] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState("");
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const startTsRef = useRef<number>(0);
    const ctxRef = useRef<AudioContext | null>(null);

    // Barcha audio track'larni yig'ish (mahalliy + remote)
    const collectAudioTracks = useCallback((): MediaStreamTrack[] => {
        const tracks: MediaStreamTrack[] = [];
        // Local
        const localMicPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
        const localTrack = localMicPub?.track?.mediaStreamTrack;
        if (localTrack) tracks.push(localTrack);
        // Remote
        for (const p of room.remoteParticipants.values()) {
            for (const pub of p.audioTrackPublications.values()) {
                const t = pub.track?.mediaStreamTrack;
                if (t) tracks.push(t);
            }
        }
        return tracks;
    }, [localParticipant, room]);

    const start = useCallback(async () => {
        if (recording) return;
        const tracks = collectAudioTracks();
        if (!tracks.length) { setToast("Ovoz oqim topilmadi"); return; }
        const AC = typeof window !== "undefined"
            ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
            : null;
        if (!AC) { setToast("Brauzer yozib olishni qo'llab-quvvatlamaydi"); return; }
        try {
            const ctx = new AC();
            ctxRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            for (const t of tracks) {
                const stream = new MediaStream([t]);
                const src = ctx.createMediaStreamSource(stream);
                src.connect(dest);
            }
            const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
                .find(m => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";
            const rec = mime ? new MediaRecorder(dest.stream, { mimeType: mime }) : new MediaRecorder(dest.stream);
            recorderRef.current = rec;
            chunksRef.current = [];
            rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
            rec.start(1000);
            startTsRef.current = Date.now();
            setRecording(true);
            fetch(`/api/nexus/group-calls/${callId}/recording/notify`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            }).catch(() => { });
        } catch (e) {
            setToast(e instanceof Error ? e.message : "Boshlash xatosi");
        }
    }, [recording, collectAudioTracks, callId]);

    const stop = useCallback(async () => {
        const rec = recorderRef.current;
        if (!rec || rec.state === "inactive") return;
        setRecording(false);
        setUploading(true);
        try {
            const durationSec = Math.max(1, Math.round((Date.now() - startTsRef.current) / 1000));
            const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
            rec.stop();
            await stopped;
            const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
            chunksRef.current = [];
            try { ctxRef.current?.close(); } catch { }
            ctxRef.current = null;
            fetch(`/api/nexus/group-calls/${callId}/recording/notify`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "stop" }),
            }).catch(() => { });
            const fd = new FormData();
            const ext = (rec.mimeType || "").includes("mp4") ? "mp4" : (rec.mimeType || "").includes("ogg") ? "ogg" : "webm";
            fd.append("file", new File([blob], `group-${callId}.${ext}`, { type: blob.type }));
            fd.append("durationSec", String(durationSec));
            const r = await fetch(`/api/nexus/group-calls/${callId}/recording`, { method: "POST", body: fd })
                .then(x => x.json()).catch(() => null);
            if (r?.recording) {
                setToast(`Yozildi (${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}) — chaqiruv tarixida`);
            } else {
                setToast(r?.error || "Yuklab bo'lmadi");
            }
        } catch (e) {
            setToast(e instanceof Error ? e.message : "Yakunlash xatosi");
        } finally {
            setUploading(false);
            setTimeout(() => setToast(""), 5000);
        }
    }, [callId]);

    // Tozalash — komponent unmount bo'lganda
    useEffect(() => {
        return () => {
            try { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); } catch { }
            try { ctxRef.current?.close(); } catch { }
        };
    }, []);

    return (
        <>
            <button onClick={recording ? stop : start} disabled={uploading}
                title={recording ? "Yozib olishni to'xtatish" : "Yozib olish"}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${recording ? "bg-rose-600" : "bg-white/10 backdrop-blur-sm"}`}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : recording ? <Square className="h-3.5 w-3.5 fill-current" />
                    : <Circle className="h-3.5 w-3.5" />}
                {recording ? "Yozilyapti" : "Yozish"}
            </button>
            {toast && (
                <div className="fixed left-1/2 top-20 z-[320] -translate-x-1/2 rounded-xl bg-emerald-500/25 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-lg">
                    {toast}
                </div>
            )}
        </>
    );
}
