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
    src?: string;        // haqiqiy MP3/audio URL
}
export interface NxVideo {
    title: string; author: string; avatar: string;
    image: string; views: string; duration: string; category?: string;
}
export interface NxShort {
    image: string; author: string; views: string; likes: string; duration: string;
    videoSrc?: string;   // haqiqiy MP4 URL
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

    // Pro obuna
    proOpen:    boolean;
    setProOpen: (v: boolean) => void;
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
    /* ── Musiqa state ── */
    const [track,         setTrack]        = useState<NxTrack | null>(null);
    const [isPlaying,     setIsPlaying]    = useState(false);
    const [progress,      setProgress]     = useState(0);
    const [volume,        setVolume]       = useState(80);
    const [musicExpanded, setMusicExpanded] = useState(false);

    /* ── Video ── */
    const [video,     setVideo]    = useState<NxVideo | null>(null);
    const [videoOpen, setVideoOpen] = useState(false);

    /* ── Shorts ── */
    const [shorts,     setShorts]    = useState<NxShort[]>([]);
    const [shortIndex, setShortIndex] = useState(0);
    const [shortsOpen, setShortsOpen] = useState(false);

    /* ── Boshqalar ── */
    const [searchOpen, setSearchOpen] = useState(false);
    const [studioOpen, setStudioOpen] = useState(false);
    const [proOpen,    setProOpen]    = useState(false);

    /* ── Haqiqiy Audio engine (client-only, imperative) ── */
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // SSR-safe: faqat brauzerda ishga tushadi
        const audio = new Audio();
        audio.volume = 0.8;
        audio.preload = "auto";
        audioRef.current = audio;

        const onTimeUpdate = () => {
            if (audio.duration > 0) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };
        const onEnded = () => { setIsPlaying(false); setProgress(0); };

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended", onEnded);
            audio.pause();
            audio.src = "";
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Callbacklar ── */
    const playTrack = useCallback((t: NxTrack) => {
        setTrack(t);
        setProgress(0);
        setIsPlaying(true);
        const audio = audioRef.current;
        if (!audio) return;
        if (t.src) {
            audio.src = t.src;
            audio.currentTime = 0;
            audio.play().catch(e => console.warn("[NxAudio] play:", e));
        } else {
            audio.src = "";
            audio.pause();
        }
    }, []);

    const togglePlay = useCallback(() => {
        setIsPlaying(prev => {
            const next = !prev;
            const audio = audioRef.current;
            if (audio) {
                if (next) audio.play().catch(e => console.warn("[NxAudio] resume:", e));
                else      audio.pause();
            }
            return next;
        });
    }, []);

    const seek = useCallback((pct: number) => {
        const clamped = Math.max(0, Math.min(100, pct));
        setProgress(clamped);
        const audio = audioRef.current;
        if (audio && audio.duration > 0) {
            audio.currentTime = (clamped / 100) * audio.duration;
        }
    }, []);

    const setVol = useCallback((v: number) => {
        const clamped = Math.max(0, Math.min(100, v));
        setVolume(clamped);
        if (audioRef.current) audioRef.current.volume = clamped / 100;
    }, []);

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
            proOpen, setProOpen,
        }}>
            {children}
        </Ctx.Provider>
    );
}
