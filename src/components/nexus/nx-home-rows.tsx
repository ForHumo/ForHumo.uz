"use client";

import { useState, useEffect } from "react";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import { Radio, Play, Eye, Film, Music2, Clock } from "lucide-react";
import { NxLiveRoom } from "./nx-live-room";

// ─────────────────────────────────────────────────────────────────────────────
// NxHomeRows — Asosiy tab uchun REAL kontent qatorlari:
// jonli efirlar + yangi videolar + yangi treklar. Bo'sh qatorlar ko'rinmaydi.
// ─────────────────────────────────────────────────────────────────────────────

interface HVid {
    id: string; title: string; thumbUrl: string | null; videoUrl: string;
    durationSec: number; views: number; orientation: "HORIZONTAL" | "VERTICAL";
    locked: boolean; likeCount: number;
    author: { name: string | null; username: string | null; image: string | null } | null;
}
interface HTrack {
    id: string; title: string; artist: string | null; audioUrl: string; coverUrl: string | null;
    durationSec: number; plays: number;
    uploader: { name: string | null; username: string | null } | null;
}
interface HLive {
    id: string; title: string; viewers: number; category: string | null;
    author: { name: string | null; username: string | null; image: string | null } | null;
}

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}

export function NxHomeRows() {
    const { openVideo, openShorts, playQueue } = useNxPlayer();
    const [live, setLive] = useState<HLive[]>([]);
    const [videos, setVideos] = useState<HVid[]>([]);
    const [tracks, setTracks] = useState<HTrack[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/nexus/live?status=live&limit=10").then(r => r.json()).then(d => setLive(d.streams ?? [])).catch(() => { });
        fetch("/api/nexus/videos?sort=new&limit=12").then(r => r.json()).then(d => setVideos(d.videos ?? [])).catch(() => { });
        fetch("/api/nexus/tracks?kind=MUSIC&sort=new&limit=12").then(r => r.json()).then(d => setTracks(d.tracks ?? [])).catch(() => { });
    }, []);

    function openVid(v: HVid) {
        if (v.orientation === "VERTICAL" && !v.locked) {
            const verts = videos.filter(x => x.orientation === "VERTICAL" && !x.locked);
            const idx = Math.max(0, verts.findIndex(x => x.id === v.id));
            openShorts(verts.map(s => ({
                id: s.id, image: s.thumbUrl || "", author: s.author?.name || s.author?.username || "Foydalanuvchi",
                views: fmtN(s.views), likes: fmtN(s.likeCount), duration: fmtDur(s.durationSec), videoSrc: s.videoUrl,
            })), idx);
            return;
        }
        openVideo({
            id: v.id, title: v.title, image: v.thumbUrl || "",
            author: v.author?.name || v.author?.username || "Foydalanuvchi",
            avatar: avatarOf(v.author), views: fmtN(v.views), duration: fmtDur(v.durationSec),
        });
    }

    function playTrackAt(idx: number) {
        const list: NxTrack[] = tracks.map(t => ({
            id: t.id, title: t.title,
            artist: t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: fmtDur(t.durationSec), durationSec: t.durationSec, src: t.audioUrl,
        }));
        playQueue(list, idx);
    }

    if (!live.length && !videos.length && !tracks.length) return null;

    return (
        <div className="mt-2">
            {/* Jonli efirlar */}
            {live.length > 0 && (
                <Row title="Hozir jonli" accent="#EF4444">
                    {live.map(s => (
                        <button key={s.id} onClick={() => setRoomId(s.id)} className="w-44 flex-shrink-0 text-left group">
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 flex items-center justify-center"
                                style={{ border: "1px solid rgba(239,68,68,0.25)", background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))" }}>
                                <img src={avatarOf(s.author)} alt="" className="w-12 h-12 rounded-full object-cover bg-white" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: "#EF4444" }}>
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                                </span>
                                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.8)" }}>
                                    <Eye className="w-2.5 h-2.5" />{fmtN(s.viewers)}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white truncate group-hover:text-[#F97316] transition-colors">{s.title}</p>
                            <p className="text-[9px] truncate" style={{ color: "rgba(150,130,150,0.85)" }}>{s.author?.name || s.author?.username || "Streamer"}</p>
                        </button>
                    ))}
                </Row>
            )}

            {/* Yangi videolar */}
            {videos.length > 0 && (
                <Row title="Yangi videolar" accent="#8B5CF6">
                    {videos.map(v => (
                        <button key={v.id} onClick={() => openVid(v)} className="w-44 flex-shrink-0 text-left group">
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5" style={{ border: "1px solid rgba(43,62,232,0.18)", background: "rgba(43,62,232,0.08)" }}>
                                {v.thumbUrl
                                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-white/30" /></div>}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.35)" }}>
                                    <Play className="w-6 h-6 text-white fill-white" />
                                </div>
                                {v.durationSec > 0 && <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                            </div>
                            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#00CEC8] transition-colors">{v.title}</p>
                            <p className="text-[9px] flex items-center gap-1" style={{ color: "rgba(100,120,170,0.75)" }}>
                                <span className="truncate">{v.author?.name || v.author?.username || ""}</span>
                                <span>·</span><Eye className="w-2.5 h-2.5" />{fmtN(v.views)}
                            </p>
                        </button>
                    ))}
                </Row>
            )}

            {/* Yangi treklar */}
            {tracks.length > 0 && (
                <Row title="Yangi musiqa" accent="#10B981">
                    {tracks.map((t, i) => (
                        <button key={t.id} onClick={() => playTrackAt(i)} className="w-28 flex-shrink-0 text-left group">
                            <div className="relative w-28 h-28 rounded-xl overflow-hidden mb-1.5" style={{ border: "1px solid rgba(16,185,129,0.20)", background: "rgba(16,185,129,0.06)" }}>
                                <img src={t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`} alt={t.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.40)" }}>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                    </div>
                                </div>
                                <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-0.5" style={{ background: "rgba(5,8,24,0.8)" }}>
                                    <Clock className="w-2 h-2" />{fmtDur(t.durationSec)}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white truncate group-hover:text-[#10B981] transition-colors">{t.title}</p>
                            <p className="text-[9px] truncate" style={{ color: "rgba(120,150,135,0.8)" }}>{t.artist || t.uploader?.name || ""}</p>
                        </button>
                    ))}
                </Row>
            )}

            {roomId && <NxLiveRoom streamId={roomId} onClose={() => setRoomId(null)} />}
        </div>
    );
}

function Row({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <div className="px-4 mb-2 flex items-center gap-2">
                {accent === "#EF4444" ? <Radio className="w-3.5 h-3.5" style={{ color: accent }} /> : accent === "#10B981" ? <Music2 className="w-3.5 h-3.5" style={{ color: accent }} /> : <Film className="w-3.5 h-3.5" style={{ color: accent }} />}
                <span className="text-sm font-black text-white">{title}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                {children}
            </div>
        </div>
    );
}
