"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { NxPlayerProvider, useNxPlayer, type NxTrack } from "./nx-player-ctx";
import { NxMusicPlayer } from "./nx-music-player";
import { NxShare } from "./nx-share";
import { ArrowLeft, Play, Heart, Share2, Loader2, BadgeCheck, Music2, Clock, Headphones } from "lucide-react";

interface Track {
    id: string; title: string; artist: string | null; audioUrl: string; coverUrl: string | null;
    durationSec: number; kind: string; genre: string | null; plays: number;
    likeCount: number; isLiked: boolean; isMine: boolean;
    uploader: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
}

function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function fmtN(n: number) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n); }

function Inner({ id }: { id: string }) {
    const router = useRouter();
    const { playTrack, openShareSheet } = useNxPlayer();
    const [t, setT] = useState<Track | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    useEffect(() => {
        fetch(`/api/nexus/tracks/${id}`).then(r => r.json()).then(d => {
            if (d.track) { setT(d.track); setLiked(d.track.isLiked); setLikeCount(d.track.likeCount); }
        }).finally(() => setLoading(false));
    }, [id]);

    function play() {
        if (!t) return;
        const nx: NxTrack = {
            id: t.id, title: t.title, artist: t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum",
            image: t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`,
            duration: fmtDur(t.durationSec), durationSec: t.durationSec, src: t.audioUrl,
        };
        playTrack(nx);
    }
    async function toggleLike() {
        if (!t) return;
        setLiked(l => !l); setLikeCount(c => c + (liked ? -1 : 1));
        await fetch(`/api/nexus/tracks/${id}/like`, { method: "POST" }).catch(() => { });
    }

    const cover = t?.coverUrl || (t ? `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}` : "");
    const kindLabel = t?.kind === "PODCAST" ? "Podkast" : t?.kind === "AUDIOBOOK" ? "Audiokitob" : "Musiqa";

    return (
        <div className="h-full overflow-y-auto text-white" style={{ background: "#050818" }}>
            <header className="sticky top-0 z-20 flex items-center gap-3 px-3 h-14 backdrop-blur-xl" style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(16,185,129,0.18)" }}>
                <button onClick={() => router.push("/nexus")} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="flex items-center gap-1.5 min-w-0"><Music2 className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} /><span className="text-base font-black text-white truncate">{kindLabel}</span></div>
            </header>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#10B981" }} /></div>
            ) : !t ? (
                <div className="text-center py-24 px-6"><Headphones className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(16,185,129,0.3)" }} /><p className="text-sm font-bold text-white/60">Trek topilmadi yoki o&apos;chirilgan</p></div>
            ) : (
                <div className="max-w-md mx-auto px-6 pt-8 pb-28 flex flex-col items-center text-center">
                    <div className="w-56 h-56 rounded-3xl overflow-hidden mb-6" style={{ border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 16px 48px rgba(16,185,129,0.18)" }}>
                        <img src={cover} alt={t.title} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-xl font-black text-white mb-1">{t.title}</h1>
                    <p className="text-sm mb-3 flex items-center gap-1.5" style={{ color: "rgba(140,180,160,0.9)" }}>
                        {t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum"}
                        {t.uploader?.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                    </p>
                    <p className="text-xs mb-6 flex items-center gap-3" style={{ color: "rgba(100,130,115,0.85)" }}>
                        <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{fmtN(t.plays)} tinglash</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDur(t.durationSec)}</span>
                        {t.genre && <span>#{t.genre}</span>}
                    </p>

                    <button onClick={play} className="w-full h-13 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 mb-3" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)", boxShadow: "0 8px 24px rgba(16,185,129,0.35)", height: 52 }}>
                        <Play className="w-5 h-5 fill-white" /> Tinglash
                    </button>
                    <div className="flex gap-2 w-full">
                        <button onClick={toggleLike} className="flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: liked ? "#EF4444" : "rgba(160,200,180,0.9)" }}>
                            <Heart className="w-4 h-4" style={{ fill: liked ? "#EF4444" : "none" }} /> {fmtN(likeCount)}
                        </button>
                        <button onClick={() => openShareSheet(t.title, typeof window !== "undefined" ? window.location.href : "")} className="flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "rgba(160,200,180,0.9)" }}>
                            <Share2 className="w-4 h-4" /> Ulash
                        </button>
                    </div>
                    {t.uploader?.username && (
                        <Link href={`/nexus/u/${t.uploader.username}`} className="mt-4 text-xs font-bold" style={{ color: "rgba(0,206,200,0.85)" }}>
                            @{t.uploader.username} profilini ko&apos;rish
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}

export function NexusTrackPermalink({ id }: { id: string }) {
    return (
        <NxPlayerProvider>
            <Inner id={id} />
            <NxMusicPlayer />
            <NxShare />
        </NxPlayerProvider>
    );
}
