"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, ChevronRight, Pause, Play,
    VolumeX, Volume2, Eye, Trash2, Loader2, Send, Music as MusicIcon, Loader,
} from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
const IMG_DURATION = 5000;
const TEXT_DURATION = 5000;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "🔥", "👏", "😢"];

interface VAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface VSlide { id: string; order: number; mediaUrl: string; mediaType: "IMAGE" | "VIDEO" | "TEXT"; durationMs: number | null; caption: string | null; overlays: unknown | null; filter: string; bgColor: string | null }
interface VMusic { title: string | null; url: string | null; trackId: string | null }
interface VStory { id: string; mediaUrl: string; mediaType: string; caption: string | null; createdAt: string; seen: boolean; slides: VSlide[]; music: VMusic | null }
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

// CSS filter map — slide.filter'dan haqiqiy CSS filter'ga
const FILTER_CSS: Record<string, string> = {
    none: "none",
    grayscale: "grayscale(1)",
    sepia: "sepia(0.9)",
    warm: "sepia(0.35) saturate(1.4) hue-rotate(-10deg)",
    cool: "saturate(1.3) hue-rotate(20deg) brightness(1.05)",
    vintage: "sepia(0.5) contrast(1.15) brightness(0.9)",
    bw: "grayscale(1) contrast(1.15)",
};

export function NxStoriesViewer() {
    const { storiesViewerOpen, storiesViewerIndex, closeStoriesViewer } = useNxPlayer();
    const [groups, setGroups] = useState<VGroup[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [userIdx, setUserIdx] = useState(0);
    const [itemIdx, setItemIdx] = useState(0);
    const [slideIdx, setSlideIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(true);
    const [viewerCount, setViewerCount] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replySending, setReplySending] = useState(false);
    const [replySent, setReplySent] = useState(false);
    const [reactSent, setReactSent] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const viewedRef = useRef<Set<string>>(new Set());

    // Ochilganda yuklash
    useEffect(() => {
        if (!storiesViewerOpen) return;
        setLoaded(false); setPaused(false); setProgress(0); setItemIdx(0); setSlideIdx(0);
        setReplyText(""); setReplySent(false); setReactSent(null);
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
    const slide = story?.slides[slideIdx];
    const isVideo = slide?.mediaType === "VIDEO" || (slide ? isVid(slide.mediaUrl) : false);
    const isText = slide?.mediaType === "TEXT";
    const totalSlides = story?.slides.length ?? 1;
    const slideDurationMs = isVideo ? (slide?.durationMs || 10000) : isText ? TEXT_DURATION : IMG_DURATION;

    const nextSlide = useCallback(() => {
        const g = groups[userIdx];
        if (!g) { closeStoriesViewer(); return; }
        const s = g.stories[itemIdx];
        if (!s) return;
        // Slidelar orasida navigatsiya
        if (slideIdx + 1 < s.slides.length) {
            setSlideIdx(slideIdx + 1);
            setProgress(0); setReactSent(null); setReplySent(false); setReplyText("");
            return;
        }
        // Bu story tugadi — keyingi story yoki keyingi user
        if (itemIdx + 1 < g.stories.length) {
            setItemIdx(itemIdx + 1); setSlideIdx(0); setProgress(0);
            setReactSent(null); setReplySent(false); setReplyText("");
        }
        else if (userIdx + 1 < groups.length) {
            setUserIdx(userIdx + 1); setItemIdx(0); setSlideIdx(0); setProgress(0);
            setReactSent(null); setReplySent(false); setReplyText("");
        }
        else closeStoriesViewer();
    }, [groups, userIdx, itemIdx, slideIdx, closeStoriesViewer]);

    const prevSlide = useCallback(() => {
        if (slideIdx > 0) { setSlideIdx(slideIdx - 1); setProgress(0); return; }
        if (itemIdx > 0) {
            const s = groups[userIdx]?.stories[itemIdx - 1];
            setItemIdx(itemIdx - 1); setSlideIdx(Math.max(0, (s?.slides.length ?? 1) - 1)); setProgress(0);
            return;
        }
        if (userIdx > 0) {
            const pg = groups[userIdx - 1];
            const lastStory = pg?.stories[pg.stories.length - 1];
            setUserIdx(userIdx - 1);
            setItemIdx(Math.max(0, (pg?.stories.length ?? 1) - 1));
            setSlideIdx(Math.max(0, (lastStory?.slides.length ?? 1) - 1));
            setProgress(0);
        }
    }, [groups, userIdx, itemIdx, slideIdx]);

    // Rasm/TEXT uchun avto-progress (video o'zi boshqaradi)
    useEffect(() => {
        if (!storiesViewerOpen || paused || !slide || isVideo) return;
        const step = 100 / (slideDurationMs / 50);
        timerRef.current = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + step)), 50);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [storiesViewerOpen, paused, slide, isVideo, slideDurationMs]);

    // Progress 100 ga yetganda keyingisi
    useEffect(() => { if (progress >= 100) nextSlide(); }, [progress, nextSlide]);

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
    }, [paused, muted, slide]);

    // Musiqa (story-level, story o'zgarganda audio manba yangilanadi)
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        if (!story?.music?.url) { a.pause(); return; }
        // Yangi story bo'lsa manbani yangilaymiz
        if (a.src !== story.music.url) a.src = story.music.url;
        a.volume = 0.6;
        a.muted = muted;
        if (paused) a.pause(); else a.play().catch(() => { });
    }, [story, paused, muted]);

    // Klaviatura
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (!storiesViewerOpen) return;
            // Reply input ochilib turgan bo'lsa harakat qilmaymiz
            if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
            if (e.key === "ArrowRight") nextSlide();
            if (e.key === "ArrowLeft") prevSlide();
            if (e.key === "Escape") closeStoriesViewer();
            if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [storiesViewerOpen, nextSlide, prevSlide, closeStoriesViewer]);

    async function del() {
        if (!story) return;
        await fetch(`/api/nexus/stories/${story.id}`, { method: "DELETE" }).catch(() => { });
        closeStoriesViewer();
    }

    async function sendReact(emoji: string) {
        if (!story || group?.isMe) return;
        setReactSent(emoji);
        setPaused(true);
        await fetch(`/api/nexus/stories/${story.id}/react`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji, slideId: slide?.id }),
        }).catch(() => { });
        // 1.5s ko'rsatib pauza tugatiladi
        setTimeout(() => { setReactSent(null); setPaused(false); }, 1500);
    }

    async function sendReply() {
        if (!story || !replyText.trim() || replySending || group?.isMe) return;
        setReplySending(true);
        try {
            const res = await fetch(`/api/nexus/stories/${story.id}/reply`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: replyText.trim(), slideId: slide?.id }),
            });
            if (res.ok) {
                setReplyText(""); setReplySent(true);
                setTimeout(() => setReplySent(false), 2000);
            }
        } finally { setReplySending(false); }
    }

    if (!storiesViewerOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }}>
            <audio ref={audioRef} loop playsInline className="hidden" />

            <button onClick={closeStoriesViewer} className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <X className="w-5 h-5 text-white" />
            </button>

            {!loaded ? (
                <Loader2 className="w-8 h-8 animate-spin text-white/70" />
            ) : !group || !story || !slide ? (
                <p className="text-sm text-white/60">Hikoya yo&apos;q</p>
            ) : (
                <>
                    {(userIdx > 0 || itemIdx > 0 || slideIdx > 0) && (
                        <button onClick={prevSlide} className="absolute left-4 z-20 w-10 h-10 hidden sm:flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                    )}
                    <button onClick={nextSlide} className="absolute right-4 z-20 w-10 h-10 hidden sm:flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>

                    <div className="relative overflow-hidden rounded-2xl" style={{ width: "min(380px, 95vw)", height: "min(680px, 90vh)", background: slide.bgColor || "#000" }}>
                        {/* Media / Text */}
                        {isVideo ? (
                            <video ref={videoRef} key={slide.id} src={slide.mediaUrl} autoPlay playsInline
                                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration > 0) setProgress(Math.min(99, (v.currentTime / v.duration) * 100)); }}
                                onEnded={nextSlide}
                                style={{ filter: FILTER_CSS[slide.filter] ?? "none" }}
                                className="w-full h-full object-cover" />
                        ) : isText ? (
                            <div className="w-full h-full flex items-center justify-center px-6"
                                style={{ background: slide.bgColor || "#2B3EE8" }}>
                                <p className="text-2xl sm:text-3xl font-black text-white text-center leading-tight"
                                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
                                    {slide.caption || "..."}
                                </p>
                            </div>
                        ) : (
                            <img key={slide.id} src={slide.mediaUrl} alt="" className="w-full h-full object-cover"
                                style={{ filter: FILTER_CSS[slide.filter] ?? "none" }} />
                        )}

                        {/* Overlays (matn/sticker) — asosiy render kelajakda; hozircha bo'sh */}
                        {/* Kelajakda: slide.overlays JSON'ni parse qilib absolute pozitsiyada matn/sticker chizamiz */}

                        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.85) 100%)" }} />

                        {/* Slide progress bar'lari (bir story ichida) */}
                        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                            {Array.from({ length: totalSlides }, (_, i) => (
                                <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.30)" }}>
                                    <div className="h-full rounded-full" style={{ background: "#fff", width: i < slideIdx ? "100%" : i === slideIdx ? `${progress}%` : "0%" }} />
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
                                        {group.author?.verified && <NxVerifiedBadge category={group.author?.verifiedCategory} size={14} />}
                                    </div>
                                    <p className="text-[10px] text-white/70">{timeAgo(story.createdAt)}{totalSlides > 1 && ` · ${slideIdx + 1}/${totalSlides}`}</p>
                                </div>
                            </Link>
                            {/* Musiqa indikatori */}
                            {story.music?.url && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    <MusicIcon className="w-3 h-3 text-white" />
                                    <span className="text-[10px] text-white/90 max-w-[100px] truncate">{story.music.title || "Musiqa"}</span>
                                </div>
                            )}
                            <button onClick={() => setPaused(p => !p)} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                                {paused ? <Play className="w-3.5 h-3.5 text-white fill-white" /> : <Pause className="w-3.5 h-3.5 text-white fill-white" />}
                            </button>
                            {(isVideo || story.music?.url) && (
                                <button onClick={() => setMuted(m => !m)} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                                </button>
                            )}
                        </div>

                        {/* Tap zonalari */}
                        <div className="absolute inset-y-0 left-0 w-1/3 z-[5]" onClick={prevSlide} />
                        <div className="absolute inset-y-0 right-0 w-1/3 z-[5]" onClick={nextSlide} />

                        {/* Caption (media slide uchun) */}
                        {!isText && slide.caption && (
                            <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-none">
                                <p className="text-sm text-white font-medium text-center" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}>{slide.caption}</p>
                            </div>
                        )}

                        {/* Reaction toast (yuborilgach) */}
                        {reactSent && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <span className="text-8xl animate-ping-slow" style={{ animation: "reactPop 1.5s ease-out" }}>{reactSent}</span>
                            </div>
                        )}
                        {/* Reply sent toast */}
                        {replySent && (
                            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-bold text-white pointer-events-none"
                                style={{ background: "rgba(0,206,200,0.90)" }}>
                                Javob yuborildi
                            </div>
                        )}

                        {/* O'z storysi — ko'rganlar + o'chirish */}
                        {group.isMe ? (
                            <div className="absolute bottom-4 left-3 right-3 flex items-center justify-between z-10">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    <Eye className="w-3.5 h-3.5" /> {viewerCount ?? 0}
                                </span>
                                <button onClick={del} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: "rgba(239,68,68,0.75)" }}>
                                    <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                                </button>
                            </div>
                        ) : (
                            /* Boshqaning storysi — reply input + reaction bar */
                            <div className="absolute bottom-3 left-3 right-3 z-10 space-y-2">
                                {/* Reaction emojis */}
                                <div className="flex items-center justify-center gap-1.5">
                                    {REACTION_EMOJIS.map(em => (
                                        <button key={em} onClick={() => sendReact(em)}
                                            className="w-9 h-9 flex items-center justify-center rounded-full text-lg active:scale-125 transition-transform hover:scale-110"
                                            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
                                            {em}
                                        </button>
                                    ))}
                                </div>
                                {/* Reply input */}
                                <div className="flex items-center gap-2">
                                    <input value={replyText} onChange={e => setReplyText(e.target.value)}
                                        onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
                                        onKeyDown={e => e.key === "Enter" && sendReply()}
                                        placeholder="Javob yozing..."
                                        maxLength={2000}
                                        className="flex-1 h-10 rounded-full px-4 text-sm text-white outline-none"
                                        style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.20)", backdropFilter: "blur(8px)" }} />
                                    {replyText.trim() && (
                                        <button onClick={sendReply} disabled={replySending}
                                            className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                            {replySending ? <Loader className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
            <style>{`@keyframes reactPop { 0% { transform: scale(0.3); opacity: 0; } 30% { transform: scale(1.4); opacity: 1; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }`}</style>
        </div>
    );
}
