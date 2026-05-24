"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, ChevronRight, Heart, Send,
    MoreHorizontal, BadgeCheck, Volume2, VolumeX, Pause, Play,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock stories
// ─────────────────────────────────────────────────────────────────────────────
const STORIES_DATA = [
    {
        user: "Humo Official", handle: "@humo", verified: true,
        items: [
            { image: "https://picsum.photos/seed/st10/800/1400", caption: "Nexus 1.0 — Rasmiy Launch!" },
            { image: "https://picsum.photos/seed/st11/800/1400", caption: "Yangi funksiyalar juda ko'p" },
        ],
    },
    {
        user: "Madina", handle: "@madina_music", verified: true,
        items: [
            { image: "https://picsum.photos/seed/st20/800/1400", caption: "Yangi qo'shiq tayyorlanmoqda..." },
            { image: "https://picsum.photos/seed/st21/800/1400", caption: "Studio da ish jarayoni" },
            { image: "https://picsum.photos/seed/st22/800/1400", caption: "Ertaga chiqadi!" },
        ],
    },
    {
        user: "Sardor Dev", handle: "@sardor_dev", verified: false,
        items: [
            { image: "https://picsum.photos/seed/st30/800/1400", caption: "Yangi loyiha ustida" },
        ],
    },
    {
        user: "Tech UZ", handle: "@tech_uz", verified: true,
        items: [
            { image: "https://picsum.photos/seed/st40/800/1400", caption: "AI Conference 2026" },
            { image: "https://picsum.photos/seed/st41/800/1400", caption: "O'zbekiston Texnologiya Forumi" },
        ],
    },
    {
        user: "Kamola Art", handle: "@kamola_art", verified: false,
        items: [
            { image: "https://picsum.photos/seed/st50/800/1400", caption: "Yangi rasm seriyasi" },
            { image: "https://picsum.photos/seed/st51/800/1400", caption: "Rang-barang dunyo" },
            { image: "https://picsum.photos/seed/st52/800/1400", caption: "Art Exhibition 2026" },
        ],
    },
];

const STORY_DURATION = 5000; // ms

// ─────────────────────────────────────────────────────────────────────────────
// NxStoriesViewer
// ─────────────────────────────────────────────────────────────────────────────
export function NxStoriesViewer() {
    const { storiesViewerOpen, storiesViewerIndex, closeStoriesViewer } = useNxPlayer();

    const [userIdx, setUserIdx]   = useState(storiesViewerIndex);
    const [itemIdx, setItemIdx]   = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused]     = useState(false);
    const [muted, setMuted]       = useState(true);
    const [replyText, setReplyText] = useState("");
    const [liked, setLiked]       = useState<Record<string, boolean>>({});

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const storyUser = STORIES_DATA[userIdx];
    const totalItems = storyUser?.items.length ?? 0;
    const likeKey = `${userIdx}-${itemIdx}`;

    // Update userIdx when external index changes
    useEffect(() => {
        if (storiesViewerOpen) {
            setUserIdx(storiesViewerIndex);
            setItemIdx(0);
            setProgress(0);
        }
    }, [storiesViewerOpen, storiesViewerIndex]);

    const nextItem = useCallback(() => {
        if (itemIdx + 1 < totalItems) {
            setItemIdx(i => i + 1);
            setProgress(0);
        } else if (userIdx + 1 < STORIES_DATA.length) {
            setUserIdx(u => u + 1);
            setItemIdx(0);
            setProgress(0);
        } else {
            closeStoriesViewer();
        }
    }, [itemIdx, totalItems, userIdx, closeStoriesViewer]);

    const prevItem = useCallback(() => {
        if (itemIdx > 0) {
            setItemIdx(i => i - 1);
            setProgress(0);
        } else if (userIdx > 0) {
            setUserIdx(u => u - 1);
            setItemIdx(0);
            setProgress(0);
        }
    }, [itemIdx, userIdx]);

    // Auto-progress
    useEffect(() => {
        if (!storiesViewerOpen || paused) return;
        const step = 100 / (STORY_DURATION / 50);
        timerRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    nextItem();
                    return 0;
                }
                return prev + step;
            });
        }, 50);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [storiesViewerOpen, paused, nextItem, userIdx, itemIdx]);

    // Keyboard nav
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!storiesViewerOpen) return;
            if (e.key === "ArrowRight") nextItem();
            if (e.key === "ArrowLeft")  prevItem();
            if (e.key === "Escape")     closeStoriesViewer();
            if (e.key === " ")          setPaused(p => !p);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [storiesViewerOpen, nextItem, prevItem, closeStoriesViewer]);

    if (!storiesViewerOpen || !storyUser) return null;

    const currentItem = storyUser.items[itemIdx];

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.95)" }}
        >
            {/* Yopish tugmasi */}
            <button
                onClick={closeStoriesViewer}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
            >
                <X className="w-5 h-5 text-white" />
            </button>

            {/* Prev user */}
            {userIdx > 0 && (
                <button onClick={() => { setUserIdx(u => u - 1); setItemIdx(0); setProgress(0); }}
                    className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
            )}
            {/* Next user */}
            {userIdx < STORIES_DATA.length - 1 && (
                <button onClick={() => { setUserIdx(u => u + 1); setItemIdx(0); setProgress(0); }}
                    className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            )}

            {/* Story card */}
            <div
                className="relative overflow-hidden rounded-2xl"
                style={{ width: "min(380px, 95vw)", height: "min(680px, 90vh)" }}
            >
                {/* Image */}
                <img
                    key={`${userIdx}-${itemIdx}`}
                    src={currentItem.image}
                    alt=""
                    className="w-full h-full object-cover"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.75) 100%)" }} />

                {/* Progress bars */}
                <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                    {storyUser.items.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.30)" }}>
                            <div
                                className="h-full rounded-full transition-none"
                                style={{
                                    background: "#fff",
                                    width: i < itemIdx ? "100%" : i === itemIdx ? `${progress}%` : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-8 left-3 right-3 flex items-center gap-2.5 z-10">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ border: "2px solid #fff" }}>
                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${storyUser.user}`}
                            alt={storyUser.user} className="w-full h-full object-cover bg-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-white">{storyUser.user}</span>
                            {storyUser.verified && <BadgeCheck className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className="text-[10px] text-white/70">{storyUser.handle}</p>
                    </div>
                    <button onClick={() => setPaused(p => !p)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}>
                        {paused ? <Play className="w-3.5 h-3.5 text-white fill-white" /> : <Pause className="w-3.5 h-3.5 text-white fill-white" />}
                    </button>
                    <button onClick={() => setMuted(p => !p)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}>
                        {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}>
                        <MoreHorizontal className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Nav zones (invisible) */}
                <div className="absolute inset-y-0 left-0 w-1/2 z-[5]" onClick={prevItem} />
                <div className="absolute inset-y-0 right-0 w-1/2 z-[5]" onClick={nextItem} />

                {/* Caption */}
                <div className="absolute bottom-16 left-4 right-4 z-10">
                    <p className="text-sm text-white font-medium text-center"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.80)" }}>
                        {currentItem.caption}
                    </p>
                </div>

                {/* Bottom actions */}
                <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2 z-10">
                    <input
                        type="text" value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onFocus={() => setPaused(true)}
                        onBlur={() => setPaused(false)}
                        placeholder="Javob yozing..."
                        className="flex-1 h-9 rounded-full px-4 text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.30)", caretColor: "#00CEC8" }}
                    />
                    <button
                        onClick={() => { setLiked(prev => ({ ...prev, [likeKey]: !prev[likeKey] })); }}
                        className="w-9 h-9 flex items-center justify-center rounded-full"
                        style={{ background: liked[likeKey] ? "rgba(239,68,68,0.80)" : "rgba(255,255,255,0.15)" }}>
                        <Heart className={`w-4 h-4 text-white ${liked[likeKey] ? "fill-white" : ""}`} />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}>
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
