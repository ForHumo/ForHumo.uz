"use client";

// Asosiy sahifa row-based dizayn (foydalanuvchi tartibi):
//   Kinolar → Musiqalar (kliplar) → G.Video → V.Video → G.Stream → V.Stream
//   → Podkast → Audiokitob → Kitoblar → Kanallar → BN cross-promo
// Har qator gorizontal scroll; bo'sh qator yashirinadi.

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import {
    Radio, Play, Eye, Film, Music2, Clock, TrendingDown,
    Mic2, Headphones, BookOpen, Hash, Users, Scissors, Heart,
} from "lucide-react";
import { NxLiveRoom } from "./nx-live-room";

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
interface HBnItem {
    slug: string; title: string; image: string | null;
    price: number; marketAvg: number; savedPct: number; shopName: string;
}
interface HChannel {
    id: string; name: string; handle: string | null; avatarUrl: string | null; memberCount: number;
}
interface HClip {
    id: string; title: string; startSec: number; endSec: number; plays: number; likes: number;
    streamId: string; streamTitle: string; recordingUrl: string | null;
    streamer: { name: string | null; username: string | null; image: string | null } | null;
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
    const { openVideo, openShorts, playQueue, track: nowPlaying, isPlaying } = useNxPlayer();
    // Bir necha row uchun state:
    const [kino, setKino] = useState<HVid[]>([]);
    const [musicVideos, setMusicVideos] = useState<HVid[]>([]);   // musiqa kliplari
    const [gvideo, setGvideo] = useState<HVid[]>([]);              // gorizontal (LONG)
    const [vvideo, setVvideo] = useState<HVid[]>([]);              // vertikal (SHORT)
    const [gStream, setGstream] = useState<HLive[]>([]);           // hozircha barcha live gorizontal
    const [vStream, setVstream] = useState<HLive[]>([]);           // hozircha bo'sh (vertikal live keyingi ish)
    const [podcasts, setPodcasts] = useState<HTrack[]>([]);
    const [audiobooks, setAudiobooks] = useState<HTrack[]>([]);
    const [tracks, setTracks] = useState<HTrack[]>([]);            // musiqa audio
    const [channels, setChannels] = useState<HChannel[]>([]);
    const [bnItems, setBnItems] = useState<HBnItem[]>([]);
    const [clips, setClips] = useState<HClip[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        // Video kategoriyalar
        fetch("/api/nexus/videos?category=kino&sort=trend&limit=10").then(r => r.json()).then(d => setKino(d.videos ?? [])).catch(() => { });
        fetch("/api/nexus/videos?category=musiqa&sort=trend&limit=10").then(r => r.json()).then(d => setMusicVideos(d.videos ?? [])).catch(() => { });
        fetch("/api/nexus/videos?orientation=HORIZONTAL&sort=new&limit=12").then(r => r.json()).then(d => setGvideo(d.videos ?? [])).catch(() => { });
        fetch("/api/nexus/videos?orientation=VERTICAL&sort=new&limit=12").then(r => r.json()).then(d => setVvideo(d.videos ?? [])).catch(() => { });
        // Live
        fetch("/api/nexus/live?status=live&limit=10").then(r => r.json()).then(d => {
            const streams: HLive[] = d.streams ?? [];
            // Hozircha barcha stream'lar gorizontal — vertikal stream turi kelajakda
            setGstream(streams);
            setVstream([]);
        }).catch(() => { });
        // Audio turlari
        fetch("/api/nexus/tracks?kind=MUSIC&sort=new&limit=12").then(r => r.json()).then(d => setTracks(d.tracks ?? [])).catch(() => { });
        fetch("/api/nexus/tracks?kind=PODCAST&sort=top&limit=10").then(r => r.json()).then(d => setPodcasts(d.tracks ?? [])).catch(() => { });
        fetch("/api/nexus/tracks?kind=AUDIOBOOK&sort=top&limit=10").then(r => r.json()).then(d => setAudiobooks(d.tracks ?? [])).catch(() => { });
        // Kanallar (DM'dagi) — trending channels
        fetch("/api/nexus/channels?scope=discover&type=CHANNEL")
            .then(r => r.json())
            .then(d => setChannels(Array.isArray(d.channels) ? d.channels.slice(0, 10) : []))
            .catch(() => { });
        // BN cross-promo
        fetch("/api/bn/cross-promo/nexus-row").then(r => r.json()).then(d => setBnItems(d.items ?? [])).catch(() => { });
        // Clips (Batch AN2)
        fetch("/api/nexus/live/clips-feed?days=7&limit=15").then(r => r.json()).then(d => setClips(d.clips ?? [])).catch(() => { });
    }, []);

    // Live real-time refresh — 30s polling
    useEffect(() => {
        const tick = () => {
            if (document.hidden) return;
            fetch("/api/nexus/live?status=live&limit=10").then(r => r.json()).then(d => setGstream(d.streams ?? [])).catch(() => { });
        };
        const iv = setInterval(tick, 30_000);
        return () => clearInterval(iv);
    }, []);

    function bnHref(slug: string): string {
        return `https://bozornarxida.uz/p/${slug}?utm_source=nexus&utm_medium=cross_promo&utm_campaign=home_row`;
    }
    function fmtSom(n: number): string { return new Intl.NumberFormat("uz-UZ").format(n); }

    function openVid(v: HVid, list: HVid[]) {
        if (v.orientation === "VERTICAL" && !v.locked) {
            const verts = list.filter(x => x.orientation === "VERTICAL" && !x.locked);
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

    function playTrackAt(list: HTrack[], idx: number) {
        const q: NxTrack[] = list.map(t => ({
            id: t.id, title: t.title,
            artist: t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: fmtDur(t.durationSec), durationSec: t.durationSec, src: t.audioUrl,
        }));
        playQueue(q, idx);
    }

    const anyContent = kino.length || musicVideos.length || gvideo.length || vvideo.length
        || gStream.length || vStream.length || podcasts.length || audiobooks.length
        || tracks.length || channels.length || bnItems.length || clips.length;
    if (!anyContent) return null;

    return (
        <div className="mt-2">
            {/* 1. Kinolar */}
            {kino.length > 0 && (
                <Row title="Kinolar" accent="#F97316" Icon={Film}>
                    {kino.map(v => <VidCard key={v.id} v={v} onOpen={() => openVid(v, kino)} accent="#F97316" />)}
                </Row>
            )}

            {/* 2. Musiqalar (musiqa kliplari + audio) */}
            {(musicVideos.length > 0 || tracks.length > 0) && (
                <Row title="Musiqalar" accent="#10B981" Icon={Music2}>
                    {musicVideos.map(v => <VidCard key={"mv-" + v.id} v={v} onOpen={() => openVid(v, musicVideos)} accent="#10B981" badge="Klip" />)}
                    {tracks.map((t, i) => {
                        const isCur = nowPlaying?.id === t.id;
                        return (
                            <button key={"tr-" + t.id} onClick={() => playTrackAt(tracks, i)} className="w-28 flex-shrink-0 text-left group">
                                <div className="relative w-28 h-28 rounded-xl overflow-hidden mb-1.5"
                                    style={{ border: isCur ? "1.5px solid #10B981" : "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.06)",
                                        boxShadow: isCur ? "0 0 16px rgba(16,185,129,0.45)" : undefined }}>
                                    <img src={t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`} alt={t.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    {isCur ? (
                                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(5,8,24,0.55)" }}>
                                            <SoundBars playing={isPlaying} />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.40)" }}>
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    )}
                                    <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-0.5" style={{ background: "rgba(5,8,24,0.8)" }}>
                                        <Clock className="w-2 h-2" />{fmtDur(t.durationSec)}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold truncate" style={{ color: isCur ? "#10B981" : "#fff" }}>{t.title}</p>
                                <p className="text-[9px] truncate" style={{ color: "rgba(120,150,135,0.8)" }}>{t.artist || t.uploader?.name || ""}</p>
                            </button>
                        );
                    })}
                </Row>
            )}

            {/* 3. G. Video (gorizontal) */}
            {gvideo.length > 0 && (
                <Row title="G. Video" accent="#8B5CF6" Icon={Film}>
                    {gvideo.map(v => <VidCard key={v.id} v={v} onOpen={() => openVid(v, gvideo)} accent="#8B5CF6" />)}
                </Row>
            )}

            {/* 4. V. Video (vertikal / shorts) */}
            {vvideo.length > 0 && (
                <Row title="V. Video" accent="#EC4899" Icon={Film}>
                    {vvideo.map(v => (
                        <button key={v.id} onClick={() => openVid(v, vvideo)}
                            className="w-24 flex-shrink-0 group text-left">
                            <div className="relative aspect-[9/16] rounded-xl overflow-hidden mb-1.5"
                                style={{ border: "1px solid rgba(236,72,153,0.22)", background: "rgba(236,72,153,0.06)" }}>
                                {v.thumbUrl
                                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    : <div className="w-full h-full flex items-center justify-center"><Play className="w-5 h-5 text-white/30" /></div>}
                                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,8,24,0.9) 0%, transparent 55%)" }} />
                                <div className="absolute bottom-1 left-1 right-1">
                                    <p className="text-[9px] font-bold text-white line-clamp-2 leading-tight">{v.title}</p>
                                    <p className="text-[8px] flex items-center gap-0.5 mt-0.5" style={{ color: "rgba(220,200,220,0.85)" }}>
                                        <Eye className="w-2 h-2" />{fmtN(v.views)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </Row>
            )}

            {/* 5. G. Stream (jonli) */}
            {gStream.length > 0 && (
                <Row title="G. Stream" accent="#EF4444" Icon={Radio}>
                    {gStream.map(s => (
                        <button key={s.id} onClick={() => setRoomId(s.id)} className="w-44 flex-shrink-0 text-left group">
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 flex items-center justify-center"
                                style={{ border: "1px solid rgba(239,68,68,0.30)", background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))" }}>
                                <img src={avatarOf(s.author)} alt="" className="w-12 h-12 rounded-full object-cover bg-white" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: "#EF4444" }}>
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                                </span>
                                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.8)" }}>
                                    <Eye className="w-2.5 h-2.5" />{fmtN(s.viewers)}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white truncate">{s.title}</p>
                            <p className="text-[9px] truncate" style={{ color: "rgba(150,130,150,0.85)" }}>{s.author?.name || s.author?.username || "Streamer"}</p>
                        </button>
                    ))}
                </Row>
            )}

            {/* 6. V. Stream (kelajakda vertikal live) */}
            {vStream.length > 0 && (
                <Row title="V. Stream" accent="#DC2626" Icon={Radio}>
                    {vStream.map(s => (
                        <button key={s.id} onClick={() => setRoomId(s.id)} className="w-24 flex-shrink-0 text-left">
                            <div className="relative aspect-[9/16] rounded-xl overflow-hidden mb-1"
                                style={{ border: "1px solid rgba(220,38,38,0.30)", background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))" }}>
                                <img src={avatarOf(s.author)} alt="" className="w-full h-full object-cover" />
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-black text-white" style={{ background: "#DC2626" }}>
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                                </span>
                            </div>
                            <p className="text-[9px] font-bold text-white truncate">{s.title}</p>
                        </button>
                    ))}
                </Row>
            )}

            {/* 6.5. Qirqimlar (Batch AN2) */}
            {clips.length > 0 && (
                <Row title="Trend qirqimlar" accent="#8B5CF6" Icon={Scissors}>
                    {clips.map(c => (
                        <a key={c.id} href={`/nexus/live/${c.streamId}?clip=${c.id}`} className="w-44 flex-shrink-0 text-left group block">
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5"
                                style={{ border: "1px solid rgba(139,92,246,0.35)", background: "linear-gradient(135deg, rgba(30,10,50,0.9), rgba(60,10,80,0.9))" }}>
                                <video src={c.recordingUrl || undefined} muted playsInline preload="metadata"
                                    className="w-full h-full object-cover"
                                    onMouseEnter={e => { const v = e.currentTarget; v.currentTime = c.startSec; v.play().catch(() => { }); }}
                                    onMouseLeave={e => { const v = e.currentTarget; v.pause(); v.currentTime = c.startSec; }}
                                    onLoadedMetadata={e => { e.currentTarget.currentTime = c.startSec; }} />
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                                    <Scissors className="w-2.5 h-2.5" />CLIP
                                </span>
                                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.8)" }}>
                                    {fmtDur(c.endSec - c.startSec)}
                                </span>
                                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 text-[9px] font-bold text-white">
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ background: "rgba(5,8,24,0.8)" }}>
                                        <Heart className="w-2.5 h-2.5" fill="currentColor" />{fmtN(c.likes)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[11px] font-bold text-white truncate">{c.title}</p>
                            <p className="text-[9px] truncate flex items-center gap-1" style={{ color: "rgba(200,180,230,0.75)" }}>
                                <img src={avatarOf(c.streamer)} alt="" className="w-3 h-3 rounded-full object-cover" />
                                {c.streamer?.name || c.streamer?.username || "Streamer"} · {fmtN(c.plays)} ko&apos;rish
                            </p>
                        </a>
                    ))}
                </Row>
            )}

            {/* 7. Podkast */}
            {podcasts.length > 0 && (
                <Row title="Podkast" accent="#F59E0B" Icon={Mic2}>
                    {podcasts.map((t, i) => <TrackCard key={t.id} t={t} accent="#F59E0B" onPlay={() => playTrackAt(podcasts, i)} />)}
                </Row>
            )}

            {/* 8. Audiokitoblar */}
            {audiobooks.length > 0 && (
                <Row title="Audiokitoblar" accent="#0891B2" Icon={Headphones}>
                    {audiobooks.map((t, i) => <TrackCard key={t.id} t={t} accent="#0891B2" onPlay={() => playTrackAt(audiobooks, i)} />)}
                </Row>
            )}

            {/* 9. Kitoblar — hozircha "tez kunda" ma'lumot varianti */}
            {/* Bo'sh chunki e-kitob API hali yo'q — silent hide */}

            {/* 10. Kanallar (DM'dagi) */}
            {channels.length > 0 && (
                <Row title="Kanallar" accent="#2B3EE8" Icon={Hash}>
                    {channels.map(c => (
                        <Link key={c.id} href={`/nexus/c/${c.id}`} className="w-32 flex-shrink-0 flex flex-col items-center gap-1.5 text-center group">
                            {c.avatarUrl
                                ? <img src={c.avatarUrl} alt={c.name} className="w-16 h-16 rounded-2xl object-cover" style={{ border: "2px solid rgba(43,62,232,0.30)" }} />
                                : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", border: "2px solid rgba(43,62,232,0.30)" }}>{c.name[0]?.toUpperCase() ?? "K"}</div>}
                            <p className="text-[11px] font-bold text-white truncate w-full group-hover:text-[#00CEC8] transition-colors">{c.name}</p>
                            <p className="text-[9px] flex items-center gap-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>
                                <Users className="w-2.5 h-2.5" />{fmtN(c.memberCount)}
                            </p>
                        </Link>
                    ))}
                </Row>
            )}

            {/* BN cross-promo (bozor arzon narxlari) */}
            {bnItems.length > 0 && (
                <Row title="Bozorda arzon" accent="#F5B301" Icon={TrendingDown}>
                    {bnItems.map(p => (
                        <a key={p.slug} href={bnHref(p.slug)} target="_blank" rel="noopener noreferrer"
                            className="w-32 flex-shrink-0 text-left group">
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden mb-1.5"
                                style={{ border: "1px solid rgba(245,179,1,0.28)", background: "rgba(245,179,1,0.06)" }}>
                                {p.image
                                    ? <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    : <div className="w-full h-full flex items-center justify-center"><TrendingDown className="w-6 h-6 text-white/30" /></div>}
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black leading-none"
                                    style={{ background: "#22C55E", color: "#0A0A0A" }}>−{p.savedPct}%</span>
                            </div>
                            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#F5B301] transition-colors">{p.title}</p>
                            <p className="text-[11px] font-black tabular-nums mt-0.5" style={{ color: "#F5B301" }}>{fmtSom(p.price)} so&apos;m</p>
                            <p className="text-[9px] line-through tabular-nums" style={{ color: "rgba(150,150,150,0.7)" }}>{fmtSom(p.marketAvg)}</p>
                        </a>
                    ))}
                </Row>
            )}

            {roomId && <NxLiveRoom streamId={roomId} onClose={() => setRoomId(null)} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable komponentlar
function Row({ title, accent, Icon, children }: { title: string; accent: string; Icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <div className="px-4 mb-2 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                <span className="text-sm font-black text-white">{title}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>{children}</div>
        </div>
    );
}

function VidCard({ v, onOpen, accent, badge }: { v: HVid; onOpen: () => void; accent: string; badge?: string }) {
    return (
        <button onClick={onOpen} className="w-44 flex-shrink-0 text-left group">
            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5"
                style={{ border: `1px solid ${accent}30`, background: `${accent}10` }}>
                {v.thumbUrl
                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-white/30" /></div>}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.35)" }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}>
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
                {badge && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black text-white uppercase" style={{ background: accent }}>{badge}</span>
                )}
                {v.durationSec > 0 && <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
            </div>
            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug">{v.title}</p>
            <p className="text-[9px] flex items-center gap-1" style={{ color: "rgba(100,120,170,0.75)" }}>
                <span className="truncate">{v.author?.name || v.author?.username || ""}</span>
                <span>·</span><Eye className="w-2.5 h-2.5" />{fmtN(v.views)}
            </p>
        </button>
    );
}

function TrackCard({ t, accent, onPlay }: { t: HTrack; accent: string; onPlay: () => void }) {
    return (
        <button onClick={onPlay} className="w-28 flex-shrink-0 text-left group">
            <div className="relative w-28 h-28 rounded-xl overflow-hidden mb-1.5"
                style={{ border: `1px solid ${accent}30`, background: `${accent}10` }}>
                <img src={t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`} alt={t.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.40)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}>
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                </div>
            </div>
            <p className="text-[11px] font-bold text-white truncate">{t.title}</p>
            <p className="text-[9px] truncate" style={{ color: "rgba(120,150,135,0.8)" }}>{t.artist || t.uploader?.name || ""}</p>
        </button>
    );
}

// Now-playing sound bars
function SoundBars({ playing }: { playing: boolean }) {
    return (
        <div className="flex items-end gap-0.5" style={{ height: 22 }}>
            {[0, 1, 2].map(i => (
                <span key={i} className="w-1 rounded-sm" style={{
                    background: "#10B981",
                    height: playing ? undefined : 8,
                    animation: playing ? `nxbar 900ms ${i * 120}ms ease-in-out infinite` : "none",
                }} />
            ))}
            <style>{`@keyframes nxbar { 0%,100% { height: 6px } 50% { height: 22px } }`}</style>
        </div>
    );
}
