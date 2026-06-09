"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, ChevronRight, BadgeCheck, Pause, Play,
    VolumeX, Volume2, Eye, Trash2, Loader2,
} from "lucide-react";

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
const IMG_DURATION = 5000;

interface VAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface VStory { id: string; mediaUrl: string; mediaType: string; caption: string | null; createdAt: string; seen: boolean }
interface VGroup { author: VAuthor | null; isMe: boolean; stories: VStory[]; allSeen: boolean }

function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir";
    if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60);
    return `${h} soat`;
}
function avatarOf(a: VAuthor | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "user")}`;
}

export function NxStoriesViewer() {
    const { storiesViewerOpen, storiesViewerIndex, closeStoriesViewer } = useNxPlayer();
    const [groups, setGroups] = useState<VGroup[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [userIdx, setUserIdx] = useState(0);
    const [itemIdx, setItemIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(true);
    const [viewerCount, setViewerCount] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const viewedRef = useRef<Set<string>>(new Set());

    // Ochilganda yuklash
    useEffect(() => {
        if (!storiesViewerOpen) return;
        setLoaded(false); setPaused(false); setProgress(0); setItemIdx(0);
        fetch("/api/nexus/stories")
            .then(r => r.json())
            .then(d => {
                const g: VGroup[] = d.groups ?? [];
                setGroups(g);
                setUserIdx(Math.min(Math.max(0, storiesViewerIndex), Math.max(0, g.length - 1)));
                setLoaded(true);
                if (g.length === 0) closeStoriesViewer();
            })
            .catch(() => { setLoaded(true); });
    }, [storiesViewerOpen, storiesViewerIndex, closeStoriesViewer]);

    const group = groups[userIdx];
    const story = group?.stories[itemIdx];
    const isVideo = story ? isVid(story.mediaUrl) : false;

    const nextItem = useCallback(() => {
        const g = groups[userIdx];
        if (!g) { closeStoriesViewer(); return; }
        if (itemIdx + 1 < g.stories.length) { setItemIdx(itemIdx + 1); setProgress(0); }
        else if (userIdx + 1 < groups.length) { setUserIdx(userIdx + 1); setItemIdx(0); setProgress(0); }
        else closeStoriesViewer();
    }, [groups, userIdx, itemIdx, closeStoriesViewer]);

    const prevItem = useCallback(() => {
        if (itemIdx > 0) { setItemIdx(itemIdx - 1); setProgress(0); }
        else if (userIdx > 0) {
            const pg = groups[userIdx - 1];
            setUserIdx(userIdx - 1); setItemIdx(Math.max(0, (pg?.stories.length ?? 1) - 1)); setProgress(0);
        }
    }, [groups, userIdx, itemIdx]);

    // Rasm uchun avto-progress (video o'zi boshqaradi)
    useEffect(() => {
        if (!storiesViewerOpen || paused || !story || isVideo) return;
        const step = 100 / (IMG_DURATION / 50);
        timerRef.current = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + step)), 50);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [storiesViewerOpen, paused, story, isVideo]);

    // Progress 100 ga yetganda keyingisi
    useEffect(() => { if (progress >= 100) nextItem(); }, [progress, nextItem]);

    // Ko'rildi deb belgilash (har story uchun bir marta)
    useEffect(() => {
        if (!story || viewedRef.current.has(story.id)) return;
        viewedRef.current.add(story.id);
        fetch(`/api/nexus/stories/${story.id}/view`, { method: "POST" }).catch(() => { });
    }, [story]);

    // O'z storysida — ko'rganlar soni
    useEffect(() => {
        if (!story || !group?.isMe) { setViewerCount(null); return; }
        let cancel = false;
        fetch(`/api/nexus/stories/${story.id}/viewers`).then(r => r.ok ? r.json() : null).then(d => { if (!cancel && d) setViewerCount(d.count); }).catch(() => { });
        return () => { cancel = true; };
    }, [story, group]);

    // Video play/pause/mute
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = muted;
        if (paused) v.pause(); else v.play().catch(() => { });
    }, [paused, muted, story]);

    // Klaviatura
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (!storiesViewerOpen) return;
            if (e.key === "ArrowRight") nextItem();
            if (e.key === "ArrowLeft") prevItem();
            if (e.key === "Escape") closeStoriesViewer();
            if (e.key === " ") setPaused(p => !p);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [storiesViewerOpen, nextItem, prevItem, closeStoriesViewer]);

    async function del() {
        if (!story) return;
        await fetch(`/api/nexus/stories/${story.id}`, { method: "DELETE" }).catch(() => { });
        closeStoriesViewer();
    }

    if (!storiesViewerOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }}>
            <button onClick={closeStoriesViewer} className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <X className="w-5 h-5 text-white" />
            </button>

            {!loaded ? (
                <Loader2 className="w-8 h-8 animate-spin text-white/70" />
            ) : !group || !story ? (
                <p className="text-sm text-white/60">Hikoya yo&apos;q</p>
            ) : (
                <>
                    {userIdx > 0 && (
                        <button onClick={prevItem} className="absolute left-4 z-20 w-10 h-10 hidden sm:flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                    )}
                    {userIdx < groups.length - 1 && (
                        <button onClick={() => { setUserIdx(userIdx + 1); setItemIdx(0); setProgress(0); }} className="absolute right-4 z-20 w-10 h-10 hidden sm:flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    )}

                    <div className="relative overflow-hidden rounded-2xl" style={{ width: "min(380px, 95vw)", height: "min(680px, 90vh)", background: "#000" }}>
                        {/* Media */}
                        {isVideo ? (
                            <video ref={videoRef} key={story.id} src={story.mediaUrl} autoPlay playsInline
                                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration > 0) setProgress(Math.min(99, (v.currentTime / v.duration) * 100)); }}
                                onEnded={nextItem}
                                className="w-full h-full object-cover" />
                        ) : (
                            <img key={story.id} src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                        )}

                        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.80) 100%)" }} />

                        {/* Progress segmentlari */}
                        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                            {group.stories.map((_, i) => (
                                <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.30)" }}>
                                    <div className="h-full rounded-full" style={{ background: "#fff", width: i < itemIdx ? "100%" : i === itemIdx ? `${progress}%` : "0%" }} />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="absolute top-8 left-3 right-3 flex items-center gap-2.5 z-10">
                            <Link href={group.author?.username ? `/nexus/u/${group.author.username}` : "/nexus"} onClick={closeStoriesViewer} className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "2px solid #fff" }}>
                                    <img src={avatarOf(group.author)} alt="" className="w-full h-full object-cover bg-white" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-bold text-white truncate">{group.isMe ? "Siz" : (group.author?.name || group.author?.username || "Foydalanuvchi")}</span>
                                        {group.author?.verified && <BadgeCheck className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-white/70">{timeAgo(story.createdAt)}</p>
                                </div>
                            </Link>
                            <button onClick={() => setPaused(p => !p)} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                                {paused ? <Play className="w-3.5 h-3.5 text-white fill-white" /> : <Pause className="w-3.5 h-3.5 text-white fill-white" />}
                            </button>
                            {isVideo && (
                                <button onClick={() => setMuted(m => !m)} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                                </button>
                            )}
                        </div>

                        {/* Tap zonalari */}
                        <div className="absolute inset-y-0 left-0 w-1/3 z-[5]" onClick={prevItem} />
                        <div className="absolute inset-y-0 right-0 w-1/3 z-[5]" onClick={nextItem} />

                        {/* Caption */}
                        {story.caption && (
                            <div className="absolute bottom-16 left-4 right-4 z-10">
                                <p className="text-sm text-white font-medium text-center" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}>{story.caption}</p>
                            </div>
                        )}

                        {/* O'z storysi — ko'rganlar + o'chirish */}
                        {group.isMe && (
                            <div className="absolute bottom-4 left-3 right-3 flex items-center justify-between z-10">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    <Eye className="w-3.5 h-3.5" /> {viewerCount ?? 0}
                                </span>
                                <button onClick={del} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: "rgba(239,68,68,0.75)" }}>
                                    <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
