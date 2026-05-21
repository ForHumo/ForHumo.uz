"use client";

import {
    createContext, useContext, useState,
    useCallback, useRef, useEffect, type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
export interface NxTrack {
    title: string; artist: string; image: string;
    duration: string; durationSec: number;
}
export interface NxVideo {
    title: string; author: string; avatar: string;
    image: string; views: string; duration: string; category?: string;
}
export interface NxShort {
    image: string; author: string; views: string; likes: string; duration: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context interfeysi
// ─────────────────────────────────────────────────────────────────────────────
interface PlayerCtx {
    // Musiqa
    track: NxTrack | null;
    isPlaying: boolean;
    progress: number;          // 0–100
    volume: number;            // 0–100
    musicExpanded: boolean;
    playTrack:        (t: NxTrack) => void;
    togglePlay:       () => void;
    seek:             (pct: number) => void;
    setVol:           (v: number) => void;
    setMusicExpanded: (v: boolean) => void;

    // Video
    video: NxVideo | null;
    videoOpen: boolean;
    openVideo:  (v: NxVideo) => void;
    closeVideo: () => void;

    // Shorts
    shorts: NxShort[];
    shortIndex: number;
    shortsOpen: boolean;
    openShorts:  (list: NxShort[], idx: number) => void;
    closeShorts: () => void;
    nextShort:   () => void;
    prevShort:   () => void;

    // Qidiruv
    searchOpen:    boolean;
    setSearchOpen: (v: boolean) => void;

    // Studio
    studioOpen:    boolean;
    setStudioOpen: (v: boolean) => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

export function useNxPlayer(): PlayerCtx {
    const c = useContext(Ctx);
    if (!c) throw new Error("useNxPlayer must be inside NxPlayerProvider");
    return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function NxPlayerProvider({ children }: { children: ReactNode }) {
    /* ── Musiqa ── */
    const [track,          setTrack]         = useState<NxTrack | null>(null);
    const [isPlaying,      setIsPlaying]     = useState(false);
    const [progress,       setProgress]      = useState(0);
    const [volume,         setVolume]        = useState(80);
    const [musicExpanded,  setMusicExpanded] = useState(false);

    /* ── Video ── */
    const [video,     setVideo]    = useState<NxVideo | null>(null);
    const [videoOpen, setVideoOpen] = useState(false);

    /* ── Shorts ── */
    const [shorts,      setShorts]      = useState<NxShort[]>([]);
    const [shortIndex,  setShortIndex]  = useState(0);
    const [shortsOpen,  setShortsOpen]  = useState(false);

    /* ── Boshqalar ── */
    const [searchOpen, setSearchOpen] = useState(false);
    const [studioOpen, setStudioOpen] = useState(false);

    /* ── Progress simulatsiya ── */
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isPlaying && track) {
            timer.current = setInterval(() => {
                setProgress(p => {
                    const next = p + 100 / track.durationSec;
                    if (next >= 100) { setIsPlaying(false); return 0; }
                    return next;
                });
            }, 1000);
        } else {
            if (timer.current) clearInterval(timer.current);
        }
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [isPlaying, track]);

    /* ── Callbacklar ── */
    const playTrack  = useCallback((t: NxTrack) => {
        setTrack(t); setIsPlaying(true); setProgress(0);
    }, []);
    const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
    const seek       = useCallback((pct: number) => setProgress(Math.max(0, Math.min(100, pct))), []);
    const setVol     = useCallback((v: number)   => setVolume(Math.max(0, Math.min(100, v))), []);

    const openVideo  = useCallback((v: NxVideo) => { setVideo(v); setVideoOpen(true); }, []);
    const closeVideo = useCallback(() => setVideoOpen(false), []);

    const openShorts  = useCallback((list: NxShort[], idx: number) => {
        setShorts(list); setShortIndex(idx); setShortsOpen(true);
    }, []);
    const closeShorts = useCallback(() => setShortsOpen(false), []);
    const nextShort   = useCallback(() =>
        setShortIndex(i => Math.min(i + 1, shorts.length - 1)), [shorts.length]);
    const prevShort   = useCallback(() =>
        setShortIndex(i => Math.max(i - 1, 0)), []);

    return (
        <Ctx.Provider value={{
            track, isPlaying, progress, volume, musicExpanded,
            playTrack, togglePlay, seek, setVol, setMusicExpanded,
            video, videoOpen, openVideo, closeVideo,
            shorts, shortIndex, shortsOpen, openShorts, closeShorts, nextShort, prevShort,
            searchOpen, setSearchOpen,
            studioOpen, setStudioOpen,
        }}>
            {children}
        </Ctx.Provider>
    );
}
