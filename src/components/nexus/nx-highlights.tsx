"use client";

// Story Highlights — profil ostidagi doimo ko'rinadigan story kolleksiyalari
// (Instagram uslubi). 24 soatdan keyin ham ko'rinadi.

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Star } from "lucide-react";
import { NxHighlightCreate } from "./nx-highlight-create";

interface Highlight {
    id: string; title: string; coverUrl: string | null;
    storyIds: string[]; count: number; updatedAt: string;
}

interface Props {
    username: string;
    isMe: boolean;
}

export function NxHighlights({ username, isMe }: Props) {
    const [items, setItems] = useState<Highlight[] | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/nexus/highlights?username=${encodeURIComponent(username)}`)
            .then(r => r.json())
            .then(d => setItems(d.highlights ?? []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [username]);

    useEffect(() => { load(); }, [load]);

    // Hech narsa yo'q va o'zim ham emas — qatorni ko'rsatmaymiz
    if (!loading && (!items || items.length === 0) && !isMe) return null;

    return (
        <>
            <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {isMe && (
                        <button onClick={() => setCreateOpen(true)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px]">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.10)", border: "2px dashed rgba(43,62,232,0.35)" }}>
                                <Plus className="w-5 h-5" style={{ color: "rgba(140,160,210,0.85)" }} />
                            </div>
                            <span className="text-[10px]" style={{ color: "rgba(140,160,210,0.85)" }}>Yangi</span>
                        </button>
                    )}
                    {loading ? (
                        <div className="w-14 h-14 rounded-full flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(140,160,210,0.65)" }} />
                        </div>
                    ) : items?.map(h => (
                        <button key={h.id} onClick={() => setOpenId(h.id)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px]">
                            <div className="w-14 h-14 rounded-full overflow-hidden"
                                style={{ border: "2px solid #EAB308", background: "rgba(234,179,8,0.10)" }}>
                                {h.coverUrl ? (
                                    <img src={h.coverUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Star className="w-5 h-5" style={{ color: "#EAB308" }} />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] max-w-[64px] truncate" style={{ color: "rgba(200,215,245,0.85)" }}>{h.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            {createOpen && (
                <NxHighlightCreate onClose={() => setCreateOpen(false)}
                    onCreated={() => { setCreateOpen(false); load(); }} />
            )}

            {openId && <NxHighlightViewer highlightId={openId} onClose={() => setOpenId(null)} />}
        </>
    );
}

// Highlight viewer — o'z-o'zicha turadigan mini viewer (24s'dan tashqarida ishlaydi)
function NxHighlightViewer({ highlightId, onClose }: { highlightId: string; onClose: () => void }) {
    interface HSlide { id: string; mediaUrl: string; mediaType: "IMAGE" | "VIDEO" | "TEXT"; caption: string | null; bgColor: string | null; filter: string; durationMs: number | null }
    interface HStory { id: string; slides: HSlide[]; caption: string | null; music: { title: string | null; url: string | null } | null }
    const [data, setData] = useState<{ highlight: { title: string; count: number }; stories: HStory[] } | null>(null);
    const [storyIdx, setStoryIdx] = useState(0);
    const [slideIdx, setSlideIdx] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        fetch(`/api/nexus/highlights/${highlightId}`)
            .then(r => r.json())
            .then(d => setData(d)).catch(() => onClose());
    }, [highlightId, onClose]);

    const story = data?.stories[storyIdx];
    const slide = story?.slides[slideIdx];
    const totalSlides = story?.slides.length ?? 0;
    const isVideo = slide?.mediaType === "VIDEO";
    const isText = slide?.mediaType === "TEXT";
    const dur = isVideo ? (slide?.durationMs || 10000) : 5000;

    const next = useCallback(() => {
        if (!data || !story) return;
        if (slideIdx + 1 < story.slides.length) { setSlideIdx(slideIdx + 1); setProgress(0); }
        else if (storyIdx + 1 < data.stories.length) { setStoryIdx(storyIdx + 1); setSlideIdx(0); setProgress(0); }
        else onClose();
    }, [data, story, slideIdx, storyIdx, onClose]);

    const prev = useCallback(() => {
        if (slideIdx > 0) { setSlideIdx(slideIdx - 1); setProgress(0); }
        else if (storyIdx > 0) {
            const s = data?.stories[storyIdx - 1];
            setStoryIdx(storyIdx - 1); setSlideIdx(Math.max(0, (s?.slides.length ?? 1) - 1)); setProgress(0);
        }
    }, [data, storyIdx, slideIdx]);

    useEffect(() => {
        if (!slide || isVideo) return;
        const step = 100 / (dur / 50);
        const iv = setInterval(() => setProgress(p => p >= 100 ? 100 : p + step), 50);
        return () => clearInterval(iv);
    }, [slide, isVideo, dur]);
    useEffect(() => { if (progress >= 100) next(); }, [progress, next]);

    if (!data) {
        return (
            <div className="fixed inset-0 z-[75] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }}>
                <Loader2 className="w-8 h-8 animate-spin text-white/70" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }} onClick={onClose}>
            <div className="relative overflow-hidden rounded-2xl" onClick={e => e.stopPropagation()}
                style={{ width: "min(380px, 95vw)", height: "min(680px, 90vh)", background: slide?.bgColor || "#000" }}>
                {slide && (
                    <>
                        {isText ? (
                            <div className="w-full h-full flex items-center justify-center px-6" style={{ background: slide.bgColor || "#2B3EE8" }}>
                                <p className="text-2xl sm:text-3xl font-black text-white text-center leading-tight">
                                    {slide.caption || "..."}
                                </p>
                            </div>
                        ) : isVideo ? (
                            <video key={slide.id} src={slide.mediaUrl} autoPlay playsInline muted
                                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration > 0) setProgress(Math.min(99, (v.currentTime / v.duration) * 100)); }}
                                onEnded={next}
                                className="w-full h-full object-cover" />
                        ) : (
                            <img key={slide.id} src={slide.mediaUrl} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.75) 100%)" }} />
                    </>
                )}
                <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.30)" }}>
                            <div className="h-full rounded-full" style={{ background: "#fff", width: i < slideIdx ? "100%" : i === slideIdx ? `${progress}%` : "0%" }} />
                        </div>
                    ))}
                </div>
                <div className="absolute top-8 left-3 z-10">
                    <p className="text-sm font-black text-white flex items-center gap-2" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                        <Star className="w-3.5 h-3.5" style={{ color: "#EAB308" }} />
                        {data.highlight.title}
                    </p>
                </div>
                <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full z-20" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <span className="text-xl text-white">×</span>
                </button>
                <div className="absolute inset-y-0 left-0 w-1/3 z-[5]" onClick={prev} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-[5]" onClick={next} />
            </div>
        </div>
    );
}
