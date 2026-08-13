"use client";

import {
    createContext, useContext, useState,
    useCallback, useRef, useEffect, type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
export interface NxTrack {
    id?: string;                                    // real trek id (tinglash hisobi shu bo'yicha)
    title: string; artist: string; image: string;
    duration: string; durationSec: number;
    src?: string;
}

// Tinglashni hisoblash — fire-and-forget (foydalanuvchi bo'yicha dedup server tomonda)
function countTrackPlay(t: NxTrack | null | undefined) {
    if (t?.id) fetch(`/api/nexus/tracks/${t.id}/play`, { method: "POST" }).catch(() => { });
}
export interface NxVideo {
    id?: string;                                    // real video id (NxVideoPlayer shu bo'yicha yuklaydi)
    title: string; author: string; avatar: string;
    image: string; views: string; duration: string; category?: string;
}
export interface NxShort {
    id?: string;                                    // real video id (like/view shu bo'yicha)
    image: string; author: string; views: string; likes: string; duration: string;
    videoSrc?: string;
}

// ─── Chaqiruv ────────────────────────────────────────────────────────────────
export interface CallPeer { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean }
export interface ActiveCallState { callId: string; role: "caller" | "callee"; kind: "AUDIO" | "VIDEO"; peer: CallPeer; autoAccepted?: boolean }
export interface IncomingCall { id: string; kind: "AUDIO" | "VIDEO"; caller: CallPeer }
export interface IncomingGroupInvite { callId: string; roomName: string; title: string | null; inviter: CallPeer }

// ─────────────────────────────────────────────────────────────────────────────
// Context interfeysi — faqat REAL komponentlar uchun state
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
    dmTarget:        string | null;
    openDM:          (username: string) => void;

    // Chaqiruv (WebRTC 1:1)
    activeCall:      ActiveCallState | null;
    startCall:       (peerId: string, kind: "AUDIO" | "VIDEO") => Promise<void>;
    acceptIncoming:  (callId: string) => Promise<void>;
    rejectIncoming:  (callId: string) => Promise<void>;
    closeActiveCall: () => void;
    incoming:        IncomingCall | null;
    setIncoming:     (v: IncomingCall | null) => void;
    callMinimized:   boolean;
    setCallMinimized:(v: boolean) => void;

    // Guruh chaqiruv (LiveKit)
    groupCallOpen:   boolean;
    setGroupCallOpen:(v: boolean) => void;
    joinGroupCallId: string | null;
    openGroupCall:   (id: string) => void;
    consumeJoinGroupCallId: () => string | null;
    incomingGroup:   IncomingGroupInvite | null;
    setIncomingGroup:(v: IncomingGroupInvite | null) => void;

    // Jonli efir chat
    liveChatOpen:    boolean;
    setLiveChatOpen: (v: boolean) => void;

    // Explore / Kashfiyot
    exploreOpen:    boolean;
    setExploreOpen: (v: boolean) => void;

    // Playlist
    playlistsOpen:    boolean;
    setPlaylistsOpen: (v: boolean) => void;

    // Stories viewer
    storiesViewerOpen:  boolean;
    storiesViewerIndex: number;
    openStoriesViewer:  (idx: number) => void;
    closeStoriesViewer: () => void;

    // Saqlangan panel
    savedOpen:    boolean;
    setSavedOpen: (v: boolean) => void;

    // Qo'ng'iroqlar jurnali
    callsOpen:    boolean;
    setCallsOpen: (v: boolean) => void;

    // Obunalar
    subsOpen:    boolean;
    setSubsOpen: (v: boolean) => void;

    // Go Live
    goLiveOpen:    boolean;
    setGoLiveOpen: (v: boolean) => void;

    // Post yaratish
    createPostOpen:    boolean;
    setCreatePostOpen: (v: boolean) => void;

    // Story yaratish
    storyCreateOpen:    boolean;
    setStoryCreateOpen: (v: boolean) => void;

    // Shikoyat
    reportOpen:    boolean;
    setReportOpen: (v: boolean) => void;

    // Saqlangan default tab
    savedDefaultTab: "all" | "history";
    openSavedHistory: () => void;

    // Ulashish (Share Sheet)
    shareSheetOpen:  boolean;
    shareSheetTitle: string;
    shareSheetUrl:   string;
    openShareSheet:  (title: string, url?: string) => void;
    closeShareSheet: () => void;
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

    /* ── Qidiruv ── */
    const [searchOpen, setSearchOpen] = useState(false);

    /* ── Bildirishnomalar ── */
    const [notifOpen, setNotifOpen] = useState(false);

    /* ── Xabarlar / DM ── */
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [dmTarget, setDmTarget] = useState<string | null>(null);
    const openDM = useCallback((username: string) => { setDmTarget(username); setMessagesOpen(true); }, []);

    /* ── Chat + Call birga: chat ochilsa call avto-minimize ── */
    // (activeCall va callMinimized quyida e'lon qilinadi — effect useEffect pastda)

    /* ── Chaqiruv (WebRTC 1:1) ── */
    const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
    const [incoming, setIncoming] = useState<IncomingCall | null>(null);
    const [callMinimized, setCallMinimized] = useState(false);
    const [groupCallOpen, setGroupCallOpen] = useState(false);
    const [joinGroupCallId, setJoinGroupCallId] = useState<string | null>(null);
    const [incomingGroup, setIncomingGroup] = useState<IncomingGroupInvite | null>(null);
    const openGroupCall = useCallback((id: string) => {
        setJoinGroupCallId(id);
        setGroupCallOpen(true);
    }, []);

    // Chat ochilsa: aktiv call bo'lsa avto-minimize (foydalanuvchi chat bilan
    // parallel ishlashi uchun). Chat yopilsa call kengaytiriladi.
    useEffect(() => {
        if (messagesOpen && activeCall && !callMinimized) setCallMinimized(true);
        else if (!messagesOpen && activeCall && callMinimized) setCallMinimized(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messagesOpen, activeCall]);
    const consumeJoinGroupCallId = useCallback(() => {
        const id = joinGroupCallId;
        setJoinGroupCallId(null);
        return id;
    }, [joinGroupCallId]);

    const startCall = useCallback(async (peerId: string, kind: "AUDIO" | "VIDEO") => {
        const r = await fetch("/api/nexus/calls", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerId, kind }),
        }).then(x => x.json()).catch(() => null);
        if (!r?.call) {
            if (r?.error) alert(r.error);
            return;
        }
        const det = await fetch(`/api/nexus/calls/${r.call.id}`).then(x => x.json()).catch(() => null);
        if (!det?.call) return;
        setActiveCall({ callId: r.call.id, role: "caller", kind, peer: det.call.peer });
    }, []);

    const acceptIncoming = useCallback(async (callId: string) => {
        const r = await fetch(`/api/nexus/calls/${callId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "accept" }),
        }).then(x => x.json()).catch(() => null);
        if (!r?.ok) { setIncoming(null); return; }
        const det = await fetch(`/api/nexus/calls/${callId}`).then(x => x.json()).catch(() => null);
        if (!det?.call) { setIncoming(null); return; }
        setActiveCall({ callId, role: "callee", kind: det.call.kind, peer: det.call.peer, autoAccepted: true });
        setIncoming(null);
    }, []);

    const rejectIncoming = useCallback(async (callId: string) => {
        await fetch(`/api/nexus/calls/${callId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject" }),
        }).catch(() => { });
        setIncoming(null);
    }, []);

    const closeActiveCall = useCallback(() => { setActiveCall(null); setCallMinimized(false); }, []);

    /* ── Jonli efir chat ── */
    const [liveChatOpen, setLiveChatOpen] = useState(false);

    /* ── Explore ── */
    const [exploreOpen, setExploreOpen] = useState(false);

    /* ── Playlist ── */
    const [playlistsOpen, setPlaylistsOpen] = useState(false);

    /* ── Stories viewer ── */
    const [storiesViewerOpen,  setStoriesViewerOpen]  = useState(false);
    const [storiesViewerIndex, setStoriesViewerIndex] = useState(0);
    const openStoriesViewer  = useCallback((idx: number) => { setStoriesViewerIndex(idx); setStoriesViewerOpen(true); }, []);
    const closeStoriesViewer = useCallback(() => setStoriesViewerOpen(false), []);

    /* ── Saqlangan panel ── */
    const [savedOpen, setSavedOpen] = useState(false);

    /* ── Qo'ng'iroqlar jurnali ── */
    const [callsOpen, setCallsOpen] = useState(false);

    /* ── Obunalar ── */
    const [subsOpen, setSubsOpen] = useState(false);

    /* ── Go Live ── */
    const [goLiveOpen, setGoLiveOpen] = useState(false);

    /* ── Post yaratish ── */
    const [createPostOpen, setCreatePostOpen] = useState(false);

    /* ── Story yaratish ── */
    const [storyCreateOpen, setStoryCreateOpen] = useState(false);

    /* ── Shikoyat ── */
    const [reportOpen, setReportOpen] = useState(false);

    /* ── Saqlangan default tab ── */
    const [savedDefaultTab, setSavedDefaultTab] = useState<"all" | "history">("all");
    const openSavedHistory = useCallback(() => {
        setSavedDefaultTab("history");
        setSavedOpen(true);
    }, []);

    /* ── Share Sheet ── */
    const [shareSheetOpen,  setShareSheetOpen]  = useState(false);
    const [shareSheetTitle, setShareSheetTitle] = useState("");
    const [shareSheetUrl,   setShareSheetUrl]   = useState("");
    const openShareSheet  = useCallback((title: string, url?: string) => {
        setShareSheetTitle(title);
        setShareSheetUrl(url || (typeof window !== "undefined" ? window.location.href : ""));
        setShareSheetOpen(true);
    }, []);
    const closeShareSheet = useCallback(() => setShareSheetOpen(false), []);

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
                countTrackPlay(next);
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
        countTrackPlay(t);
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
        const nextIdx = shuf && q.length > 1
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

    const toggleSaved = useCallback((id: string) => {
        setSavedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
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

    const nextShort = useCallback(() =>
        setShortIndex(i => Math.min(i + 1, shorts.length - 1)), [shorts.length]);
    const prevShort = useCallback(() =>
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
            nextShort, prevShort,
            searchOpen, setSearchOpen,
            savedIds, toggleSaved,
            watchHistory, addToHistory, clearHistory,
            notifOpen, setNotifOpen,
            messagesOpen, setMessagesOpen, dmTarget, openDM,
            activeCall, startCall, acceptIncoming, rejectIncoming, closeActiveCall,
            incoming, setIncoming, callMinimized, setCallMinimized,
            groupCallOpen, setGroupCallOpen,
            joinGroupCallId, openGroupCall, consumeJoinGroupCallId,
            incomingGroup, setIncomingGroup,
            liveChatOpen, setLiveChatOpen,
            exploreOpen, setExploreOpen,
            playlistsOpen, setPlaylistsOpen,
            storiesViewerOpen, storiesViewerIndex, openStoriesViewer, closeStoriesViewer,
            savedOpen, setSavedOpen,
            callsOpen, setCallsOpen,
            subsOpen, setSubsOpen,
            goLiveOpen, setGoLiveOpen,
            createPostOpen, setCreatePostOpen,
            storyCreateOpen, setStoryCreateOpen,
            reportOpen, setReportOpen,
            savedDefaultTab, openSavedHistory,
            shareSheetOpen, shareSheetTitle, shareSheetUrl, openShareSheet, closeShareSheet,
        }}>
            {children}
        </Ctx.Provider>
    );
}
