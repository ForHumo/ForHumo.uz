"use client";

// Karaoke performance feed — foydalanuvchilar kuylagan variantlar
// Horizontal scroll (gorizontal ustunlar) yoki full grid variant

import { useEffect, useState, useRef } from "react";
import { Link } from "@/i18n/routing";
import { Mic2, Play, Pause, Heart, Trophy, Trash2, Loader2, Users } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";
import { NxKaraokePlayer } from "./nx-karaoke-player";

export interface KaraokePerformance {
    id: string; audioUrl: string; durationSec: number; score: number;
    caption: string | null; plays: number; createdAt: string;
    likeCount: number; isLiked: boolean; isMine: boolean;
    duetOfId: string | null;
    performer: { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null } | null;
    track: { id: string; title: string; artist: string | null; coverUrl: string | null } | null;
}

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function scoreColor(score: number): string {
    if (score >= 80) return "linear-gradient(135deg,#F5B301,#F97316)";
    if (score >= 60) return "linear-gradient(135deg,#00CEC8,#10B981)";
    if (score >= 40) return "linear-gradient(135deg,#8B5CF6,#EC4899)";
    return "linear-gradient(135deg,#6B7280,#4B5563)";
}
function avatarOf(a: KaraokePerformance["performer"]) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PerformanceCard — kartochka
export function KaraokePerformanceCard({ p, onDeleted }: { p: KaraokePerformance; onDeleted?: (id: string) => void }) {
    const [playing, setPlaying] = useState(false);
    const [liked, setLiked] = useState(p.isLiked);
    const [likeCount, setLikeCount] = useState(p.likeCount);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [deleting, setDeleting] = useState(false);
    const [duetOpen, setDuetOpen] = useState(false);
    const [trackAudio, setTrackAudio] = useState<{ audioUrl: string; instrumentalUrl: string | null } | null>(null);

    async function toggle() {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            a.play().catch(() => { });
            setPlaying(true);
            // Play counter
            fetch(`/api/nexus/karaoke/performances/${p.id}/play`, { method: "POST" }).catch(() => { });
        } else { a.pause(); setPlaying(false); }
    }
    async function toggleLike() {
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikeCount(c => c + (wasLiked ? -1 : 1));
        try {
            const r = await fetch(`/api/nexus/karaoke/performances/${p.id}/like`, { method: "POST" });
            if (r.ok) {
                const d = await r.json();
                setLiked(d.liked); setLikeCount(d.count);
            }
        } catch { /* silent revert next load */ }
    }
    async function del() {
        if (deleting || !confirm("Bu karaoke ijrongizni o'chirasizmi?")) return;
        setDeleting(true);
        try {
            const r = await fetch(`/api/nexus/karaoke/performances/${p.id}`, { method: "DELETE" });
            if (r.ok) onDeleted?.(p.id);
        } finally { setDeleting(false); }
    }

    async function startDuet() {
        if (!p.track) return;
        // Trek audio+instrumental URL'larni olamiz (agar hali yo'q bo'lsa)
        if (!trackAudio) {
            try {
                const d = await fetch(`/api/nexus/karaoke/performances/${p.id}`).then(r => r.json());
                setTrackAudio({
                    audioUrl: d.performance.track.audioUrl,
                    instrumentalUrl: d.performance.track.instrumentalUrl,
                });
            } catch { return; }
        }
        setDuetOpen(true);
    }

    return (
        <div className="w-full rounded-2xl p-4 flex flex-col gap-3 relative"
            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(236,72,153,0.06))",
                border: "1px solid rgba(236,72,153,0.25)" }}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <img src={avatarOf(p.performer)} alt="" className="w-10 h-10 rounded-2xl object-cover bg-white flex-shrink-0"
                    style={{ border: "1.5px solid rgba(236,72,153,0.30)" }} />
                <div className="flex-1 min-w-0">
                    <Link href={p.performer?.username ? `/nexus/u/${p.performer.username}` : "/nexus"}
                        className="flex items-center gap-1 min-w-0">
                        <span className="text-sm font-black text-white truncate">{p.performer?.name || p.performer?.username || "Foydalanuvchi"}</span>
                        {p.performer?.verified && <NxVerifiedBadge category={p.performer?.verifiedCategory} size={12} />}
                    </Link>
                    {p.track && (
                        <Link href={`/nexus/t/${p.track.id}`}
                            className="text-[10px] flex items-center gap-1 truncate hover:text-white transition-colors"
                            style={{ color: "rgba(180,150,220,0.75)" }}>
                            <Mic2 className="w-2.5 h-2.5" />
                            {p.track.title}{p.track.artist ? ` — ${p.track.artist}` : ""}
                        </Link>
                    )}
                    <Link href={`/nexus/karaoke/${p.id}`}
                        className="text-[9px] hover:underline"
                        style={{ color: "rgba(236,72,153,0.75)" }}>
                        Havolani ochish →
                    </Link>
                </div>
                {/* Score badge */}
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center flex-col"
                    style={{ background: scoreColor(p.score), boxShadow: `0 4px 12px ${p.score >= 60 ? "rgba(0,206,200,0.35)" : "rgba(139,92,246,0.35)"}` }}>
                    <span className="text-sm font-black text-white leading-none">{p.score}</span>
                    <span className="text-[7px] font-black text-white/85 uppercase mt-0.5">Ball</span>
                </div>
            </div>

            {/* Caption */}
            {p.caption && (
                <p className="text-xs leading-relaxed" style={{ color: "rgba(200,215,245,0.85)" }}>{p.caption}</p>
            )}

            {/* Audio player */}
            <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "rgba(5,8,24,0.60)" }}>
                <button onClick={toggle}
                    className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 12px rgba(236,72,153,0.45)" }}>
                    {playing ? <Pause className="w-5 h-5 text-white fill-white" /> : <Play className="w-5 h-5 text-white fill-white ml-0.5" />}
                </button>
                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(236,72,153,0.20)" }}>
                        <div className="h-full transition-all" style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg,#8B5CF6,#EC4899)",
                        }} />
                    </div>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: "rgba(180,150,220,0.70)" }}>
                        {fmtDur(p.durationSec)}
                    </p>
                </div>
                <audio ref={audioRef} src={p.audioUrl} preload="metadata"
                    onEnded={() => { setPlaying(false); setProgress(0); }}
                    onTimeUpdate={e => {
                        const a = e.currentTarget;
                        if (a.duration > 0) setProgress((a.currentTime / a.duration) * 100);
                    }} />
            </div>

            {/* Statistika */}
            <div className="flex items-center gap-4 text-[11px]" style={{ color: "rgba(140,160,210,0.75)" }}>
                <button onClick={toggleLike} className="flex items-center gap-1 active:scale-95 transition">
                    <Heart className="w-3.5 h-3.5" style={{ color: liked ? "#EF4444" : "currentColor", fill: liked ? "#EF4444" : "none" }} />
                    <span style={{ color: liked ? "#EF4444" : "currentColor" }}>{fmtN(likeCount)}</span>
                </button>
                <span className="flex items-center gap-1"><Play className="w-3 h-3 fill-current" />{fmtN(p.plays)}</span>
                {p.duetOfId && <span className="flex items-center gap-1" style={{ color: "#EC4899" }}><Users className="w-3 h-3" />Duet</span>}
                {/* Duet tugma — o'ziniki bo'lmasa */}
                {!p.isMine && p.track && (
                    <button onClick={startDuet}
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black active:scale-95 transition"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", color: "#fff" }}>
                        <Users className="w-3 h-3" /> Duet
                    </button>
                )}
                {p.isMine && (
                    <button onClick={del} disabled={deleting} className="ml-auto flex items-center gap-1 text-red-400 active:scale-95">
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* Duet karaoke player */}
            {duetOpen && trackAudio && p.track && (
                <NxKaraokePlayer
                    open={true}
                    onClose={() => setDuetOpen(false)}
                    trackId={p.track.id}
                    title={p.track.title}
                    artist={p.track.artist}
                    cover={p.track.coverUrl}
                    audioUrl={trackAudio.audioUrl}
                    duetOfPerformanceId={p.id}
                    duetOfAudioUrl={p.audioUrl}
                    duetOfPerformerName={p.performer?.name || p.performer?.username || null}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// KaraokePerformancesFeed — MediaView Musiqa tabida qator
export function KaraokePerformancesFeed({ scope = "trending" }: { scope?: "trending" | "new" | "mine" }) {
    const [items, setItems] = useState<KaraokePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        fetch(`/api/nexus/karaoke/performances?scope=${scope}&limit=12`)
            .then(r => r.json())
            .then(d => setItems(d.performances ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [scope]);

    if (loading) {
        return (
            <div className="mb-6">
                <div className="px-4 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4" style={{ color: "#EC4899" }} />
                    <span className="text-sm font-black text-white">Top karaoke ijrolari</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
                    {[0,1].map(i => (
                        <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(236,72,153,0.08)" }} />
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="px-4 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" style={{ color: "#EC4899" }} />
                <span className="text-sm font-black text-white">
                    {scope === "mine" ? "Mening karaoke ijrolarim" : scope === "new" ? "Yangi karaoke" : "Top karaoke ijrolari"}
                </span>
                <span className="text-[11px] font-bold" style={{ color: "rgba(180,150,220,0.75)" }}>{items.length}</span>
                <Link href="/nexus/karaoke" className="ml-auto text-[10px] font-black active:scale-95"
                    style={{ color: "#EC4899" }}>Barchasi →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
                {items.map(p => (
                    <KaraokePerformanceCard key={p.id} p={p} onDeleted={id => setItems(prev => prev.filter(x => x.id !== id))} />
                ))}
            </div>
        </div>
    );
}
