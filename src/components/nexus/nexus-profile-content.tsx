"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import { NxSocialFeed } from "./nx-social-feed";
import { NxLiveRoom } from "./nx-live-room";
import { Loader2, Play, Eye, Music2, Radio, FileText, Film, Lock } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";

// ─────────────────────────────────────────────────────────────────────────────
// NexusProfileContent — ijodkor "kanali": Postlar / Videolar / Audio / Jonli.
// NexusProfile ichida ishlatiladi (NxPlayerProvider bilan o'ralgan).
// ─────────────────────────────────────────────────────────────────────────────
type Tab = "posts" | "videos" | "audio" | "live";
interface Counts { posts: number; videos: number; tracks: number; lives: number }

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}

interface VidItem { id: string; title: string; thumbUrl: string | null; videoUrl: string; durationSec: number; orientation: string; views: number; likeCount: number; price: number; priceCurrency?: Currency; locked: boolean; author: { name: string | null; username: string | null; image: string | null } | null }
interface TrackItem { id: string; title: string; artist: string | null; audioUrl: string; coverUrl: string | null; durationSec: number; kind: string; plays: number; uploader: { name: string | null; username: string | null } | null }
interface LiveItem { id: string; title: string; status: string; viewers: number; peakViewers: number; createdAt: string; author: { name: string | null; username: string | null; image: string | null } | null }

export function NexusProfileContent({ username, counts }: { username: string; counts: Counts }) {
    const { openVideo, openShorts, playQueue } = useNxPlayer();
    const [tab, setTab] = useState<Tab>("posts");
    const [videos, setVideos] = useState<VidItem[] | null>(null);
    const [tracks, setTracks] = useState<TrackItem[] | null>(null);
    const [lives, setLives] = useState<LiveItem[] | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    const loadVideos = useCallback(() => {
        fetch(`/api/nexus/videos?author=${encodeURIComponent(username)}&limit=60`).then(r => r.json())
            .then(d => setVideos(d.videos ?? [])).catch(() => setVideos([]));
    }, [username]);
    const loadTracks = useCallback(() => {
        fetch(`/api/nexus/tracks?author=${encodeURIComponent(username)}&limit=60`).then(r => r.json())
            .then(d => setTracks(d.tracks ?? [])).catch(() => setTracks([]));
    }, [username]);
    const loadLives = useCallback(() => {
        fetch(`/api/nexus/live?author=${encodeURIComponent(username)}&limit=40`).then(r => r.json())
            .then(d => setLives(d.streams ?? [])).catch(() => setLives([]));
    }, [username]);

    useEffect(() => {
        if (tab === "videos" && videos === null) loadVideos();
        if (tab === "audio" && tracks === null) loadTracks();
        if (tab === "live" && lives === null) loadLives();
    }, [tab, videos, tracks, lives, loadVideos, loadTracks, loadLives]);

    function openVid(v: VidItem) {
        if (v.orientation === "VERTICAL" && !v.locked && videos) {
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
        if (!tracks) return;
        const list: NxTrack[] = tracks.map(t => ({
            id: t.id, title: t.title,
            artist: t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: fmtDur(t.durationSec), durationSec: t.durationSec, src: t.audioUrl,
        }));
        playQueue(list, idx);
    }

    const tabs: { key: Tab; label: string; icon: typeof FileText; count: number }[] = [
        { key: "posts", label: "Postlar", icon: FileText, count: counts.posts },
        { key: "videos", label: "Videolar", icon: Film, count: counts.videos },
        { key: "audio", label: "Audio", icon: Music2, count: counts.tracks },
        { key: "live", label: "Jonli", icon: Radio, count: counts.lives },
    ];

    return (
        <>
            {/* Tab paneli */}
            <div className="mt-5 px-2 flex gap-1 sticky top-14 z-10 backdrop-blur-xl" style={{ background: "rgba(5,8,24,0.85)", borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                {tabs.map(t => {
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className="relative flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-colors"
                            style={{ color: active ? "#fff" : "rgba(120,140,185,0.7)" }}>
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                            {t.count > 0 && <span className="text-[10px] font-bold" style={{ color: active ? "#00CEC8" : "rgba(100,120,170,0.6)" }}>{fmtN(t.count)}</span>}
                            {active && <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />}
                        </button>
                    );
                })}
            </div>

            <div className="pb-28 min-h-[40vh]">
                {tab === "posts" && <NxSocialFeed authorUsername={username} />}

                {tab === "videos" && (
                    videos === null ? <Spinner />
                        : videos.length === 0 ? <Empty icon={Film} text="Video yo'q" />
                            : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 px-3 pt-3">
                                {videos.map(v => (
                                    <button key={v.id} onClick={() => openVid(v)} className="text-left group">
                                        <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                            {v.thumbUrl
                                                ? <img src={v.thumbUrl} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><Play className="w-7 h-7" style={{ color: "rgba(120,140,185,0.4)" }} /></div>}
                                            {v.locked && <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: "rgba(43,62,232,0.9)" }}><Lock className="w-2.5 h-2.5" />{formatMoney(v.price, v.priceCurrency ?? "UZS")}</span>}
                                            {v.durationSec > 0 && <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                                        </div>
                                        <p className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-[#8B5CF6] transition-colors">{v.title}</p>
                                        <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "rgba(120,140,185,0.7)" }}><Eye className="w-2.5 h-2.5" />{fmtN(v.views)}</p>
                                    </button>
                                ))}
                            </div>
                )}

                {tab === "audio" && (
                    tracks === null ? <Spinner />
                        : tracks.length === 0 ? <Empty icon={Music2} text="Audio yo'q" />
                            : <div className="flex flex-col gap-1 px-3 pt-3">
                                {tracks.map((t, i) => (
                                    <button key={t.id} onClick={() => playTrackAt(i)} className="flex items-center gap-3 p-2 rounded-xl text-left active:scale-[0.99] transition" style={{ background: "rgba(11,18,40,0.5)" }}>
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }}>
                                            {t.coverUrl
                                                ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5" style={{ color: "rgba(120,140,185,0.5)" }} /></div>}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition" style={{ background: "rgba(5,8,24,0.5)" }}><Play className="w-5 h-5 text-white" /></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{t.title}</p>
                                            <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.75)" }}>{t.artist || t.uploader?.name || "Noma'lum"}</p>
                                        </div>
                                        <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: "rgba(100,120,170,0.7)" }}><Play className="w-2.5 h-2.5" />{fmtN(t.plays)}</span>
                                    </button>
                                ))}
                            </div>
                )}

                {tab === "live" && (
                    lives === null ? <Spinner />
                        : lives.length === 0 ? <Empty icon={Radio} text="Efir yo'q" />
                            : <div className="flex flex-col gap-2 px-3 pt-3">
                                {lives.map(s => {
                                    const isLive = s.status === "LIVE";
                                    return (
                                        <button key={s.id} onClick={() => setRoomId(s.id)} className="flex items-center gap-3 p-2.5 rounded-2xl text-left active:scale-[0.99] transition" style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))" }}>
                                                <img src={avatarOf(s.author)} alt="" className="w-9 h-9 rounded-full object-cover bg-white" />
                                                {isLive && <span className="absolute top-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black text-white" style={{ background: "#EF4444" }}><span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{s.title}</p>
                                                <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: "rgba(120,140,185,0.75)" }}>
                                                    {isLive
                                                        ? <><Eye className="w-2.5 h-2.5" />{fmtN(s.viewers)} ko&apos;rmoqda</>
                                                        : s.status === "UPCOMING" ? "Tez orada" : "Tugagan"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                )}
            </div>

            {roomId && <NxLiveRoom streamId={roomId} onClose={() => setRoomId(null)} />}
        </>
    );
}

function Spinner() {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>;
}
function Empty({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                <Icon className="w-5 h-5" style={{ color: "rgba(120,140,185,0.45)" }} />
            </div>
            <p className="text-sm font-bold text-white/55">{text}</p>
        </div>
    );
}
