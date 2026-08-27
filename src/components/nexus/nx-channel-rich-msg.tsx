"use client";

// Rich media xabar render — voice/video-circle/location/contact turlarini ko'rsatadi.

import { useRef, useState } from "react";
import { Play, Pause, MapPin, User, Phone, ExternalLink } from "lucide-react";

type Props = {
    mediaType: string | null;
    mediaUrl?: string | null;
    media?: string[];
    durationMs?: number | null;
    locLat?: number | null;
    locLng?: number | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactUsername?: string | null;
};

function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(1, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

export function NxChannelRichMsg(props: Props) {
    const { mediaType, mediaUrl, media, durationMs, locLat, locLng, contactName, contactPhone, contactUsername } = props;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!mediaType) return null;

    const url = mediaUrl || (media && media[0]) || null;

    // Voice (audio)
    if (mediaType === "audio" && url) {
        const toggle = () => {
            const a = audioRef.current;
            if (!a) return;
            if (playing) { a.pause(); setPlaying(false); }
            else { a.play(); setPlaying(true); }
        };
        return (
            <div className="flex items-center gap-2 min-w-[180px] max-w-[280px] p-2 rounded-2xl"
                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}>
                <button onClick={toggle}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="h-1 rounded-full overflow-hidden mb-1"
                        style={{ background: "rgba(0,206,200,0.15)" }}>
                        <div className="h-full transition-all"
                            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                    </div>
                    <p className="text-[10px]" style={{ color: "rgba(180,195,235,0.8)" }}>
                        {durationMs ? formatDuration(durationMs) : "0:00"}
                    </p>
                </div>
                <audio ref={audioRef} src={url}
                    onTimeUpdate={e => {
                        const el = e.currentTarget;
                        if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
                    }}
                    onEnded={() => { setPlaying(false); setProgress(0); }} />
            </div>
        );
    }

    // Video circle — dumaloq video
    if (mediaType === "video-circle" && url) {
        return (
            <div className="relative">
                <video src={url} controls playsInline
                    className="w-56 h-56 rounded-full object-cover"
                    style={{ border: "2px solid rgba(43,62,232,0.35)" }} />
            </div>
        );
    }

    // Location
    if (mediaType === "location" && typeof locLat === "number" && typeof locLng === "number") {
        const d = 0.005;
        const bbox = `${locLng - d},${locLat - d},${locLng + d},${locLat + d}`;
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${locLat},${locLng}`;
        const gmapsUrl = `https://www.google.com/maps?q=${locLat},${locLng}`;
        return (
            <div className="rounded-2xl overflow-hidden w-64 max-w-full"
                style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.22)" }}>
                <iframe src={mapUrl} className="w-full h-40 border-0" title="Xarita" />
                <a href={gmapsUrl} target="_blank" rel="noopener"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/5">
                    <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                    <span className="flex-1">Xaritada ochish</span>
                    <ExternalLink className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.7)" }} />
                </a>
            </div>
        );
    }

    // Contact card
    if (mediaType === "contact" && contactName) {
        return (
            <div className="flex items-center gap-3 min-w-[220px] max-w-[300px] p-3 rounded-2xl"
                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{contactName}</p>
                    {contactPhone && (
                        <a href={`tel:${contactPhone}`}
                            className="flex items-center gap-1 text-xs" style={{ color: "#00CEC8" }}>
                            <Phone className="w-3 h-3" /> {contactPhone}
                        </a>
                    )}
                    {contactUsername && (
                        <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>@{contactUsername}</p>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
