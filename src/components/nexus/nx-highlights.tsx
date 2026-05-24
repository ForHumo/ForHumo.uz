"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface HighlightStory {
    image: string;
    caption: string;
}
interface Highlight {
    id: string;
    title: string;
    cover: string;
    stories: HighlightStory[];
}

const HIGHLIGHTS: Highlight[] = [
    {
        id: "h1", title: "Sayohat", cover: "https://picsum.photos/seed/hl1/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs1/400/700", caption: "Samarqand — go'zal shahar" },
            { image: "https://picsum.photos/seed/hs2/400/700", caption: "Registon maydoni" },
            { image: "https://picsum.photos/seed/hs3/400/700", caption: "Shaxrisabz shahri" },
        ],
    },
    {
        id: "h2", title: "Ovqat", cover: "https://picsum.photos/seed/hl2/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs4/400/700", caption: "O'zbek oshxonasi" },
            { image: "https://picsum.photos/seed/hs5/400/700", caption: "Somsa va non" },
        ],
    },
    {
        id: "h3", title: "Ish", cover: "https://picsum.photos/seed/hl3/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs6/400/700", caption: "Yangi loyiha boshlandi" },
            { image: "https://picsum.photos/seed/hs7/400/700", caption: "Jamoa bilan yig'ilish" },
            { image: "https://picsum.photos/seed/hs8/400/700", caption: "Muvaffaqiyat!" },
            { image: "https://picsum.photos/seed/hs9/400/700", caption: "Yangi ofis" },
        ],
    },
    {
        id: "h4", title: "Oila", cover: "https://picsum.photos/seed/hl4/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs10/400/700", caption: "Oilaviy dam olish" },
            { image: "https://picsum.photos/seed/hs11/400/700", caption: "Bayram kechasi" },
        ],
    },
    {
        id: "h5", title: "Sport", cover: "https://picsum.photos/seed/hl5/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs12/400/700", caption: "Ertalabki yugurish" },
            { image: "https://picsum.photos/seed/hs13/400/700", caption: "Gym session" },
            { image: "https://picsum.photos/seed/hs14/400/700", caption: "Natija!" },
        ],
    },
    {
        id: "h6", title: "Texno", cover: "https://picsum.photos/seed/hl6/120/120",
        stories: [
            { image: "https://picsum.photos/seed/hs15/400/700", caption: "Yangi qurilmam" },
            { image: "https://picsum.photos/seed/hs16/400/700", caption: "Setup tayyor" },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// HighlightCircle — profile page inline component
// ─────────────────────────────────────────────────────────────────────────────
export function NxHighlightCircles() {
    const [activeHl, setActiveHl] = useState<Highlight | null>(null);
    const [storyIdx, setStoryIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const DURATION = 5000; // ms per story
    const TICK = 50;

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(0);
        timerRef.current = setInterval(() => {
            setProgress(p => {
                const next = p + (TICK / DURATION) * 100;
                return next >= 100 ? 100 : next;
            });
        }, TICK);
    };

    useEffect(() => {
        if (!activeHl) return;
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeHl, storyIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (progress >= 100 && activeHl) {
            const next = storyIdx + 1;
            if (next < activeHl.stories.length) {
                setStoryIdx(next);
            } else {
                setActiveHl(null);
            }
        }
    }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

    const open = (hl: Highlight) => {
        setActiveHl(hl);
        setStoryIdx(0);
        setProgress(0);
    };

    const goNext = () => {
        if (!activeHl) return;
        if (storyIdx + 1 < activeHl.stories.length) {
            setStoryIdx(i => i + 1);
        } else {
            setActiveHl(null);
        }
    };

    const goPrev = () => {
        if (storyIdx > 0) setStoryIdx(i => i - 1);
    };

    return (
        <>
            {/* ── Highlight circles row ─────────────────────────────── */}
            <div className="flex gap-4 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
                {HIGHLIGHTS.map(hl => (
                    <button key={hl.id} onClick={() => open(hl)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full p-[2px]"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8,#8B5CF6)" }}>
                                <img src={hl.cover} alt={hl.title}
                                    className="w-full h-full rounded-full object-cover border-2"
                                    style={{ borderColor: "#050818" }} />
                            </div>
                        </div>
                        <span className="text-[9px] text-center font-semibold truncate max-w-[60px]"
                            style={{ color: "rgba(180,200,240,0.85)" }}>{hl.title}</span>
                    </button>
                ))}
                {/* Add new highlight */}
                <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)", border: "2px dashed rgba(43,62,232,0.40)" }}>
                        <Plus className="w-5 h-5" style={{ color: "rgba(43,62,232,0.70)" }} />
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(43,62,232,0.70)" }}>Yangi</span>
                </button>
            </div>

            {/* ── Fullscreen Viewer ─────────────────────────────────── */}
            {activeHl && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.95)" }}>

                    {/* Progress bars */}
                    <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                        {activeHl.stories.map((_, i) => (
                            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.25)" }}>
                                <div className="h-full rounded-full transition-none"
                                    style={{
                                        background: "white",
                                        width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                                        transition: i === storyIdx ? `width ${TICK}ms linear` : "none",
                                    }} />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="absolute top-10 left-4 right-4 flex items-center gap-2 z-10">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
                            <img src={activeHl.cover} alt={activeHl.title} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm font-bold text-white">{activeHl.title}</span>
                        <button onClick={() => setActiveHl(null)}
                            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(255,255,255,0.15)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Story image */}
                    <img
                        src={activeHl.stories[storyIdx].image}
                        alt={activeHl.stories[storyIdx].caption}
                        className="max-w-sm w-full h-full object-contain"
                    />

                    {/* Caption */}
                    <div className="absolute bottom-8 left-4 right-4 text-center">
                        <p className="text-sm font-semibold text-white"
                            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.80)" }}>
                            {activeHl.stories[storyIdx].caption}
                        </p>
                    </div>

                    {/* Tap zones */}
                    <button className="absolute left-0 top-0 w-1/2 h-full z-10"
                        onClick={goPrev} />
                    <button className="absolute right-0 top-0 w-1/2 h-full z-10"
                        onClick={goNext} />
                </div>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxHighlights — standalone modal (opened from sidebar or profile)
// ─────────────────────────────────────────────────────────────────────────────
export function NxHighlights() {
    const { highlightsOpen, setHighlightsOpen } = useNxPlayer();
    if (!highlightsOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setHighlightsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:max-h-[80vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "85vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                    <h2 className="text-base font-black text-white">Mening hikoyalarim</h2>
                    <button onClick={() => setHighlightsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    <div className="grid grid-cols-3 gap-3">
                        {HIGHLIGHTS.map(hl => (
                            <div key={hl.id}
                                className="flex flex-col items-center gap-2">
                                <div className="w-full aspect-square rounded-2xl overflow-hidden relative"
                                    style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                                    <img src={hl.cover} alt={hl.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-end p-2"
                                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.70), transparent)" }}>
                                        <span className="text-[10px] font-bold text-white">{hl.stories.length} ta</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-semibold text-center"
                                    style={{ color: "rgba(180,200,240,0.85)" }}>{hl.title}</span>
                            </div>
                        ))}
                        {/* Add new */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-full aspect-square rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.08)", border: "2px dashed rgba(43,62,232,0.30)" }}>
                                <Plus className="w-6 h-6" style={{ color: "rgba(43,62,232,0.60)" }} />
                            </div>
                            <span className="text-[10px] font-semibold"
                                style={{ color: "rgba(43,62,232,0.70)" }}>Yangi</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
