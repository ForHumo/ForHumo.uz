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
    src?: string;
}
export interface NxVideo {
    title: string; author: string; avatar: string;
    image: string; views: string; duration: string; category?: string;
}
export interface NxShort {
    image: string; author: string; views: string; likes: string; duration: string;
    videoSrc?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context interfeysi
// ─────────────────────────────────────────────────────────────────────────────
interface PlayerCtx {
    // Musiqa
    track: NxTrack | null;
    isPlaying: boolean;
    progress: number;
    volume: number;
    musicExpanded: boolean;
    queue: NxTrack[];
    queueIndex: number;
    shuffle: boolean;
    repeat: boolean;
    playTrack:        (t: NxTrack) => void;
    playQueue:        (list: NxTrack[], idx: number) => void;
    togglePlay:       () => void;
    seek:             (pct: number) => void;
    setVol:           (v: number) => void;
    setMusicExpanded: (v: boolean) => void;
    nextTrack:        () => void;
    prevTrack:        () => void;
    toggleShuffle:    () => void;
    toggleRepeat:     () => void;

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

    // Kanal
    channelAuthor: string | null;
    openChannel:   (author: string) => void;
    closeChannel:  () => void;

    // Saqlangan (localStorage)
    savedIds:    Set<string>;
    toggleSaved: (id: string) => void;

    // Ko'rish tarixi (localStorage)
    watchHistory: NxVideo[];
    addToHistory: (v: NxVideo) => void;
    clearHistory: () => void;

    // Bildirishnomalar
    notifOpen:    boolean;
    setNotifOpen: (v: boolean) => void;

    // Xabarlar / DM
    messagesOpen:    boolean;
    setMessagesOpen: (v: boolean) => void;

    // Izohlar
    commentsOpen:    boolean;
    commentsFor:     string | null;
    openComments:    (target: string) => void;
    closeComments:   () => void;

    // Jonli efir chat
    liveChatOpen:    boolean;
    setLiveChatOpen: (v: boolean) => void;

    // Explore
    exploreOpen:    boolean;
    setExploreOpen: (v: boolean) => void;

    // Playlist
    playlistsOpen:    boolean;
    setPlaylistsOpen: (v: boolean) => void;

    // Analytics
    analyticsOpen:    boolean;
    setAnalyticsOpen: (v: boolean) => void;

    // Stories viewer
    storiesViewerOpen:  boolean;
    storiesViewerIndex: number;
    openStoriesViewer:  (idx: number) => void;
    closeStoriesViewer: () => void;

    // Saqlangan panel
    savedOpen:    boolean;
    setSavedOpen: (v: boolean) => void;

    // Guruhlar va kanallar
    groupsOpen:    boolean;
    setGroupsOpen: (v: boolean) => void;

    // Qo'ng'iroqlar
    callsOpen:    boolean;
    setCallsOpen: (v: boolean) => void;

    // Obunalar / Followers
    subsOpen:    boolean;
    setSubsOpen: (v: boolean) => void;

    // Audio Spaces
    spacesOpen:    boolean;
    setSpacesOpen: (v: boolean) => void;

    // Bozor (Marketplace)
    marketOpen:    boolean;
    setMarketOpen: (v: boolean) => void;

    // Hamyon (Wallet)
    walletOpen:    boolean;
    setWalletOpen: (v: boolean) => void;

    // Tadbirlar (Events)
    eventsOpen:    boolean;
    setEventsOpen: (v: boolean) => void;

    // Yuklangan (Downloads)
    downloadsOpen:    boolean;
    setDownloadsOpen: (v: boolean) => void;

    // Ish o'rinlari (Jobs)
    jobsOpen:    boolean;
    setJobsOpen: (v: boolean) => void;

    // Trendlar
    trendingOpen:    boolean;
    setTrendingOpen: (v: boolean) => void;

    // AI yordamchi
    aiOpen:    boolean;
    setAiOpen: (v: boolean) => void;

    // Go Live
    goLiveOpen:    boolean;
    setGoLiveOpen: (v: boolean) => void;

    // Virtual sovg'alar
    giftsOpen:    boolean;
    setGiftsOpen: (v: boolean) => void;

    // Leaderboard
    leaderboardOpen:    boolean;
    setLeaderboardOpen: (v: boolean) => void;

    // Post yaratish
    createPostOpen:    boolean;
    setCreatePostOpen: (v: boolean) => void;

    // Kim kuzatish kerak
    suggestionsOpen:    boolean;
    setSuggestionsOpen: (v: boolean) => void;

    // Watch Party
    watchPartyOpen:    boolean;
    setWatchPartyOpen: (v: boolean) => void;

    // Highlights
    highlightsOpen:    boolean;
    setHighlightsOpen: (v: boolean) => void;

    // Lyrics
    lyricsOpen:    boolean;
    setLyricsOpen: (v: boolean) => void;

    // QR Share
    qrShareOpen:    boolean;
    setQrShareOpen: (v: boolean) => void;

    // Community posts
    communityOpen:    boolean;
    setCommunityOpen: (v: boolean) => void;

    // Kliplar
    clipsOpen:    boolean;
    setClipsOpen: (v: boolean) => void;

    // Super Chat
    superChatOpen:    boolean;
    setSuperChatOpen: (v: boolean) => void;

    // Yutuqlar (Achievements)
    achievementsOpen:    boolean;
    setAchievementsOpen: (v: boolean) => void;

    // Mini Ilovalar
    miniAppsOpen:    boolean;
    setMiniAppsOpen: (v: boolean) => void;

    // Kontent jadvali (Schedule)
    scheduleOpen:    boolean;
    setScheduleOpen: (v: boolean) => void;

    // Do'kon (Shop)
    shopOpen:    boolean;
    setShopOpen: (v: boolean) => void;

    // Maqolalar (Reader)
    readerOpen:    boolean;
    setReaderOpen: (v: boolean) => void;

    // Moliyalashtirish (Fundraiser)
    fundraiserOpen:    boolean;
    setFundraiserOpen: (v: boolean) => void;

    // Forum (Reddit uslubi muhokama)
    forumOpen:    boolean;
    setForumOpen: (v: boolean) => void;

    // Podkastlar
    podcastsOpen:    boolean;
    setPodcastsOpen: (v: boolean) => void;

    // Hamkorlik (Collab)
    collabOpen:    boolean;
    setCollabOpen: (v: boolean) => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

export function useNxPlayer(): PlayerCtx {
    const c = useContext(Ctx);
    if (!c) throw new Error("useNxPlayer must be inside NxPlayerProvider");
    return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage yordamchilari
// ─────────────────────────────────────────────────────────────────────────────
const LS_SAVED   = "nx_saved_ids";
const LS_HISTORY = "nx_watch_history";

function loadSaved(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(LS_SAVED) ?? "[]")); }
    catch { return new Set(); }
}
function saveSavedLS(s: Set<string>) {
    localStorage.setItem(LS_SAVED, JSON.stringify([...s]));
}
function loadHistory(): NxVideo[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? "[]"); }
    catch { return []; }
}
function saveHistoryLS(h: NxVideo[]) {
    localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(0, 50)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function NxPlayerProvider({ children }: { children: ReactNode }) {
    /* ── Musiqa state ── */
    const [track,         setTrack]         = useState<NxTrack | null>(null);
    const [isPlaying,     setIsPlaying]     = useState(false);
    const [progress,      setProgress]      = useState(0);
    const [volume,        setVolume]        = useState(80);
    const [musicExpanded, setMusicExpanded] = useState(false);
    const [queue,         setQueue]         = useState<NxTrack[]>([]);
    const [queueIndex,    setQueueIndex]    = useState(0);
    const [shuffle,       setShuffle]       = useState(false);
    const [repeat,        setRepeat]        = useState(false);

    /* ── Refs — audio callbacklar uchun "live" qiymatlar ── */
    const queueRef      = useRef<NxTrack[]>([]);
    const queueIndexRef = useRef(0);
    const shuffleRef    = useRef(false);
    const repeatRef     = useRef(false);

    useEffect(() => { queueRef.current = queue; },         [queue]);
    useEffect(() => { queueIndexRef.current = queueIndex; },[queueIndex]);
    useEffect(() => { shuffleRef.current = shuffle; },      [shuffle]);
    useEffect(() => { repeatRef.current = repeat; },        [repeat]);

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

    /* ── Bildirishnomalar ── */
    const [notifOpen, setNotifOpen] = useState(false);

    /* ── Xabarlar / DM ── */
    const [messagesOpen, setMessagesOpen] = useState(false);

    /* ── Izohlar ── */
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsFor,  setCommentsFor]  = useState<string | null>(null);
    const openComments  = useCallback((target: string) => { setCommentsFor(target); setCommentsOpen(true); }, []);
    const closeComments = useCallback(() => setCommentsOpen(false), []);

    /* ── Jonli efir chat ── */
    const [liveChatOpen, setLiveChatOpen] = useState(false);

    /* ── Explore ── */
    const [exploreOpen, setExploreOpen] = useState(false);

    /* ── Playlist ── */
    const [playlistsOpen, setPlaylistsOpen] = useState(false);

    /* ── Analytics ── */
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    /* ── Stories viewer ── */
    const [storiesViewerOpen,  setStoriesViewerOpen]  = useState(false);
    const [storiesViewerIndex, setStoriesViewerIndex] = useState(0);
    const openStoriesViewer  = useCallback((idx: number) => { setStoriesViewerIndex(idx); setStoriesViewerOpen(true); }, []);
    const closeStoriesViewer = useCallback(() => setStoriesViewerOpen(false), []);

    /* ── Saqlangan panel ── */
    const [savedOpen, setSavedOpen] = useState(false);

    /* ── Guruhlar va kanallar ── */
    const [groupsOpen, setGroupsOpen] = useState(false);

    /* ── Qo'ng'iroqlar ── */
    const [callsOpen, setCallsOpen] = useState(false);

    /* ── Obunalar ── */
    const [subsOpen, setSubsOpen] = useState(false);

    /* ── Spaces ── */
    const [spacesOpen, setSpacesOpen] = useState(false);

    /* ── Marketplace ── */
    const [marketOpen, setMarketOpen] = useState(false);

    /* ── Wallet ── */
    const [walletOpen, setWalletOpen] = useState(false);

    /* ── Events ── */
    const [eventsOpen, setEventsOpen] = useState(false);

    /* ── Downloads ── */
    const [downloadsOpen, setDownloadsOpen] = useState(false);

    /* ── Jobs ── */
    const [jobsOpen, setJobsOpen] = useState(false);

    /* ── Trending ── */
    const [trendingOpen, setTrendingOpen] = useState(false);

    /* ── AI ── */
    const [aiOpen, setAiOpen] = useState(false);

    /* ── Go Live ── */
    const [goLiveOpen, setGoLiveOpen] = useState(false);

    /* ── Gifts ── */
    const [giftsOpen, setGiftsOpen] = useState(false);

    /* ── Leaderboard ── */
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);

    /* ── Post yaratish ── */
    const [createPostOpen, setCreatePostOpen] = useState(false);

    /* ── Tavsiyalar ── */
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);

    /* ── Watch Party ── */
    const [watchPartyOpen, setWatchPartyOpen] = useState(false);

    /* ── Highlights ── */
    const [highlightsOpen, setHighlightsOpen] = useState(false);

    /* ── Lyrics ── */
    const [lyricsOpen, setLyricsOpen] = useState(false);

    /* ── QR Share ── */
    const [qrShareOpen, setQrShareOpen] = useState(false);

    /* ── Community ── */
    const [communityOpen, setCommunityOpen] = useState(false);

    /* ── Clips ── */
    const [clipsOpen, setClipsOpen] = useState(false);

    /* ── Super Chat ── */
    const [superChatOpen, setSuperChatOpen] = useState(false);

    /* ── Achievements ── */
    const [achievementsOpen, setAchievementsOpen] = useState(false);

    /* ── Mini Apps ── */
    const [miniAppsOpen, setMiniAppsOpen] = useState(false);

    /* ── Schedule ── */
    const [scheduleOpen, setScheduleOpen] = useState(false);

    /* ── Shop ── */
    const [shopOpen, setShopOpen] = useState(false);

    /* ── Reader ── */
    const [readerOpen, setReaderOpen] = useState(false);

    /* ── Fundraiser ── */
    const [fundraiserOpen, setFundraiserOpen] = useState(false);

    /* ── Forum ── */
    const [forumOpen, setForumOpen] = useState(false);

    /* ── Podcasts ── */
    const [podcastsOpen, setPodcastsOpen] = useState(false);

    /* ── Collab ── */
    const [collabOpen, setCollabOpen] = useState(false);

    /* ── Kanal ── */
    const [channelAuthor, setChannelAuthor] = useState<string | null>(null);

    /* ── Saqlangan ── */
    const [savedIds, setSavedIds] = useState<Set<string>>(() => loadSaved());

    /* ── Tarix ── */
    const [watchHistory, setWatchHistory] = useState<NxVideo[]>(() => loadHistory());

    /* ── Haqiqiy Audio engine ── */
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio();
        audio.volume = 0.8;
        audio.preload = "auto";
        audioRef.current = audio;

        const onTimeUpdate = () => {
            if (audio.duration > 0) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const onEnded = () => {
            const q     = queueRef.current;
            const idx   = queueIndexRef.current;
            const rep   = repeatRef.current;
            const shuf  = shuffleRef.current;

            if (rep) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
                return;
            }

            let nextIdx: number;
            if (shuf && q.length > 1) {
                do { nextIdx = Math.floor(Math.random() * q.length); }
                while (nextIdx === idx);
            } else {
                nextIdx = idx + 1;
            }

            if (nextIdx < q.length) {
                const next = q[nextIdx];
                queueIndexRef.current = nextIdx;
                setQueueIndex(nextIdx);
                setTrack(next);
                setProgress(0);
                setIsPlaying(true);
                if (next.src) {
                    audio.src = next.src;
                    audio.currentTime = 0;
                    audio.play().catch(() => {});
                }
            } else {
                setIsPlaying(false);
                setProgress(0);
            }
        };

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended",      onEnded);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended",      onEnded);
            audio.pause();
            audio.src = "";
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Callbacklar ── */
    const _playAt = useCallback((list: NxTrack[], idx: number) => {
        const t = list[idx];
        if (!t) return;
        setQueue(list);
        setQueueIndex(idx);
        queueRef.current      = list;
        queueIndexRef.current = idx;
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

    const playTrack = useCallback((t: NxTrack) => _playAt([t], 0), [_playAt]);
    const playQueue = useCallback((list: NxTrack[], idx: number) => _playAt(list, idx), [_playAt]);

    const nextTrack = useCallback(() => {
        const q    = queueRef.current;
        const idx  = queueIndexRef.current;
        const shuf = shuffleRef.current;
        let nextIdx = shuf && q.length > 1
            ? (() => { let r; do { r = Math.floor(Math.random() * q.length); } while (r === idx); return r; })()
            : idx + 1;
        if (nextIdx < q.length) _playAt(q, nextIdx);
    }, [_playAt]);

    const prevTrack = useCallback(() => {
        const q   = queueRef.current;
        const idx = queueIndexRef.current;
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        if (idx > 0) _playAt(q, idx - 1);
    }, [_playAt]);

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

    const toggleShuffle = useCallback(() => setShuffle(p => !p), []);
    const toggleRepeat  = useCallback(() => setRepeat(p => !p),  []);

    const openVideo  = useCallback((v: NxVideo) => {
        setVideo(v);
        setVideoOpen(true);
        // Tarixga qo'shish
        setWatchHistory(prev => {
            const filtered = prev.filter(h => h.title !== v.title);
            const updated  = [v, ...filtered].slice(0, 50);
            saveHistoryLS(updated);
            return updated;
        });
    }, []);
    const closeVideo = useCallback(() => setVideoOpen(false), []);

    const openShorts  = useCallback((list: NxShort[], idx: number) => {
        setShorts(list); setShortIndex(idx); setShortsOpen(true);
    }, []);
    const closeShorts = useCallback(() => setShortsOpen(false), []);
    const nextShort   = useCallback(() =>
        setShortIndex(i => Math.min(i + 1, queueRef.current.length - 1 > 0 ? i + 1 : i + 1)), []);
    const prevShort   = useCallback(() =>
        setShortIndex(i => Math.max(i - 1, 0)), []);

    const openChannel  = useCallback((author: string) => setChannelAuthor(author), []);
    const closeChannel = useCallback(() => setChannelAuthor(null), []);

    const toggleSaved = useCallback((id: string) => {
        setSavedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            saveSavedLS(next);
            return next;
        });
    }, []);

    const addToHistory = useCallback((v: NxVideo) => {
        setWatchHistory(prev => {
            const filtered = prev.filter(h => h.title !== v.title);
            const updated  = [v, ...filtered].slice(0, 50);
            saveHistoryLS(updated);
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setWatchHistory([]);
        localStorage.removeItem(LS_HISTORY);
    }, []);

    // nextShort needs to know shorts.length — fix the closure
    const nextShortFn = useCallback(() =>
        setShortIndex(i => Math.min(i + 1, shorts.length - 1)), [shorts.length]);
    const prevShortFn = useCallback(() =>
        setShortIndex(i => Math.max(i - 1, 0)), []);

    return (
        <Ctx.Provider value={{
            track, isPlaying, progress, volume, musicExpanded,
            queue, queueIndex, shuffle, repeat,
            playTrack, playQueue, togglePlay, seek, setVol, setMusicExpanded,
            nextTrack, prevTrack, toggleShuffle, toggleRepeat,
            video, videoOpen, openVideo, closeVideo,
            shorts, shortIndex, shortsOpen,
            openShorts, closeShorts,
            nextShort: nextShortFn, prevShort: prevShortFn,
            searchOpen, setSearchOpen,
            studioOpen, setStudioOpen,
            proOpen, setProOpen,
            channelAuthor, openChannel, closeChannel,
            savedIds, toggleSaved,
            watchHistory, addToHistory, clearHistory,
            notifOpen, setNotifOpen,
            messagesOpen, setMessagesOpen,
            commentsOpen, commentsFor, openComments, closeComments,
            liveChatOpen, setLiveChatOpen,
            exploreOpen, setExploreOpen,
            playlistsOpen, setPlaylistsOpen,
            analyticsOpen, setAnalyticsOpen,
            storiesViewerOpen, storiesViewerIndex, openStoriesViewer, closeStoriesViewer,
            savedOpen, setSavedOpen,
            groupsOpen, setGroupsOpen,
            callsOpen, setCallsOpen,
            subsOpen, setSubsOpen,
            spacesOpen, setSpacesOpen,
            marketOpen, setMarketOpen,
            walletOpen, setWalletOpen,
            eventsOpen, setEventsOpen,
            downloadsOpen, setDownloadsOpen,
            jobsOpen, setJobsOpen,
            trendingOpen, setTrendingOpen,
            aiOpen, setAiOpen,
            goLiveOpen, setGoLiveOpen,
            giftsOpen, setGiftsOpen,
            leaderboardOpen, setLeaderboardOpen,
            createPostOpen, setCreatePostOpen,
            suggestionsOpen, setSuggestionsOpen,
            watchPartyOpen, setWatchPartyOpen,
            highlightsOpen, setHighlightsOpen,
            lyricsOpen, setLyricsOpen,
            qrShareOpen, setQrShareOpen,
            communityOpen, setCommunityOpen,
            clipsOpen, setClipsOpen,
            superChatOpen, setSuperChatOpen,
            achievementsOpen, setAchievementsOpen,
            miniAppsOpen, setMiniAppsOpen,
            scheduleOpen, setScheduleOpen,
            shopOpen, setShopOpen,
            readerOpen, setReaderOpen,
            fundraiserOpen, setFundraiserOpen,
            forumOpen, setForumOpen,
            podcastsOpen, setPodcastsOpen,
            collabOpen, setCollabOpen,
        }}>
            {children}
        </Ctx.Provider>
    );
}
