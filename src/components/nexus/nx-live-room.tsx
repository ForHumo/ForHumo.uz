"use client";

// Batch V — Web Speech Recognition tipi (non-standard, browser prefix)
type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEvent = { resultIndex: number; results: { length: number; [i: number]: SpeechRecognitionResult } };
interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: unknown) => void) | null;
    onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;
declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
    }
}

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X, Radio, Eye, Send, Loader2, StopCircle, Clock, CalendarClock, Gift,
    Volume2, VolumeX, Volume1, Play, Pause, Maximize2, Minimize2,
    MessageSquare, MessageSquareOff, Share2, Settings, Check, ChevronLeft, ChevronRight,
    Camera, EyeOff, Move,
    Heart, Flame, Laugh, ThumbsUp, PartyPopper, Sparkles, Zap, Smile, UserPlus, UserCheck,
    BarChart3, Trash2, MoreVertical, Plus,
    Scissors, Rocket, Image as ImageIcon, Megaphone, Captions, Languages, Target, Terminal,
    Users, UserMinus, Info, LayoutList, Music, Wifi, WifiOff, Save, Crown, MessageCircle, Pin,
} from "lucide-react";
import { Room, RoomEvent, Track, VideoQuality, ConnectionQuality, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant, type RemoteVideoTrack } from "livekit-client";
import { formatMoney, type Currency } from "@/lib/money";
import { NxVerifiedBadge } from "./nx-verified-badge";
import { NxConfirm } from "./nx-confirm";

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface RoomStream {
    id: string; title: string; category: string | null; privacy: string;
    status: "UPCOMING" | "LIVE" | "ENDED";
    scheduledAt: string | null; startedAt: string | null; endedAt: string | null;
    viewers: number; peakViewers: number; likes: number; isMine: boolean;
    author: LAuthor | null;
    description?: string | null; recordingUrl?: string | null; recordingDurationSec?: number | null;
    raidToUsername?: string | null; watermarkUrl?: string | null;
    donationGoal?: number | null; donationGoalLabel?: string | null; totalTips?: number;
    soundAlertUrl?: string | null;
}
interface ChatMsg { id: string; text: string; tipAmount?: number; createdAt: string; profileId?: string; subTier?: string | null; author: LAuthor | null }

function scPresets(c: Currency) { return c === "USD" ? [1, 5, 10, 50] : [5000, 10000, 50000, 100000]; }

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }
function fmtViewers(n: number) {
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// NxLiveRoom — tomoshabin xonasi: real chat (polling) + heartbeat ko'ruvchi soni.
// Video oqimi Faza 3'da professional provayder bilan ulanadi (foydalanuvchi qarori).
// ─────────────────────────────────────────────────────────────────────────────
export function NxLiveRoom({ streamId, onClose }: { streamId: string; onClose: () => void }) {
    const [stream, setStream] = useState<RoomStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewers, setViewers] = useState(0);
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [ending, setEnding] = useState(false);
    const [scOpen, setScOpen] = useState(false);       // Super Chat summa tanlovi ochiqmi
    const [scAmount, setScAmount] = useState(0);        // 0 = oddiy xabar
    const [chatError, setChatError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<Currency>("UZS");
    const lastTsRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const videoElRef = useRef<HTMLVideoElement>(null);       // Asosiy — screen (yoki solo camera)
    const camPipElRef = useRef<HTMLVideoElement>(null);      // PiP — kamera
    const audioElRef = useRef<HTMLAudioElement>(null);
    const roomRef = useRef<Room | null>(null);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
    const [hasScreen, setHasScreen] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    // Viewer PiP tartibi (Batch A + D: viewer o'zi joylashtiradi)
    type PipCorner = "br" | "bl" | "tr" | "tl";
    type PipSize = "sm" | "md" | "lg";
    const [pipVisible, setPipVisible] = useState(true);
    const [pipCorner, setPipCorner] = useState<PipCorner>("br");
    const [pipSize, setPipSize] = useState<PipSize>("md");
    const [pipDrag, setPipDrag] = useState<{ x: number; y: number; corner: PipCorner } | null>(null);
    // Player controls
    const [volume, setVolume] = useState(1);         // 0..1
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [chatOpen, setChatOpen] = useState(true);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [endConfirmOpen, setEndConfirmOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [shareToast, setShareToast] = useState(false);
    const controlsTimerRef = useRef<number | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    // Quality selector
    type QLevel = "auto" | "1080" | "720" | "480" | "240";
    const [quality, setQuality] = useState<QLevel>("auto");
    const [qualityOpen, setQualityOpen] = useState(false);
    const remoteVideoTrackRef = useRef<RemoteVideoTrack | null>(null);
    const remoteVideoPubRef = useRef<RemoteTrackPublication | null>(null);
    const [availableRes, setAvailableRes] = useState<{ w: number; h: number } | null>(null);

    // Swipe navigation
    const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; t: number } | null>(null);
    const [nextStreamId, setNextStreamId] = useState<string | null>(null);
    const [prevStreamId, setPrevStreamId] = useState<string | null>(null);
    const [swipeHint, setSwipeHint] = useState<"left" | "right" | null>(null);

    // VOD (recording) progress
    const [vodCur, setVodCur] = useState(0);
    const [vodDur, setVodDur] = useState(0);
    const [vodSpeed, setVodSpeed] = useState(1);
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

    // Batch E — Engagement suite
    type ReactionIcon = "heart" | "fire" | "laugh" | "thumbs" | "party" | "sparkle" | "wow";
    interface FloatingReaction { key: string; icon: ReactionIcon; x: number; delay: number; }
    interface TipAlert { key: string; author: LAuthor | null; amount: number; text?: string; }
    const [floating, setFloating] = useState<FloatingReaction[]>([]);
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
    const [reactionBusy, setReactionBusy] = useState(false);
    const [tipAlert, setTipAlert] = useState<TipAlert | null>(null);
    const tipQueueRef = useRef<TipAlert[]>([]);
    const seenReactionsRef = useRef<Set<string>>(new Set());
    const seenTipsRef = useRef<Set<string>>(new Set());
    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [followBusy, setFollowBusy] = useState(false);
    const [meUsername, setMeUsername] = useState<string | null>(null);

    // Batch M — moderation settings
    interface ModSettings { slowSeconds: number; followersOnly: boolean; bannedWords: string[]; donationGoal?: number | null; donationGoalLabel?: string | null; }
    const [modSettings, setModSettings] = useState<ModSettings>({ slowSeconds: 0, followersOnly: false, bannedWords: [], donationGoal: null, donationGoalLabel: null });
    const [goalDraft, setGoalDraft] = useState({ amount: "", label: "" });
    const [modPanelOpen, setModPanelOpen] = useState(false);
    const [modBusy, setModBusy] = useState(false);
    const [bannedWordsDraft, setBannedWordsDraft] = useState("");
    // Batch G/K/F/J
    interface LivePoll { id: string; question: string; options: string[]; endsAt: string; }
    const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
    const [pollVotes, setPollVotes] = useState<Record<string, number[]>>({}); // pollId → [count per idx]
    const [myVoteIdx, setMyVoteIdx] = useState<number | null>(null);
    const [pollBusy, setPollBusy] = useState(false);
    const [ticker, setTicker] = useState<string | null>(null);
    const [pinnedMsg, setPinnedMsg] = useState<string | null>(null);
    // Batch BU — Chat rules
    const [chatRules, setChatRules] = useState<string | null>(null);
    const [rulesEditOpen, setRulesEditOpen] = useState(false);
    const [rulesDraft, setRulesDraft] = useState("");
    const [rulesDismissed, setRulesDismissed] = useState(false);
    // Batch S — chapters
    interface Chapter { id: string; sec: number; label: string; }
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [chapterEditOpen, setChapterEditOpen] = useState(false);
    const [chapterDraft, setChapterDraft] = useState("");
    const [hoverChapter, setHoverChapter] = useState<Chapter | null>(null);
    // Streamer poll creator
    const [pollComposerOpen, setPollComposerOpen] = useState(false);
    const [pollQ, setPollQ] = useState("");
    const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);
    const [pollDur, setPollDur] = useState(60);
    // Streamer ticker composer
    const [tickerEditOpen, setTickerEditOpen] = useState(false);
    const [tickerDraft, setTickerDraft] = useState("");
    // Chat msg menu
    const [msgMenuId, setMsgMenuId] = useState<string | null>(null);
    // Analytics (ENDED)
    interface Analytics {
        totals: { peakViewers: number; uniqueViewers: number; avgWatchSec: number; chatMessages: number; reactions: number; polls: number; tipCount: number; totalTips: number; };
        topChatters: { author: LAuthor | null; count: number }[];
        topTippers: { author: LAuthor | null; amount: number }[];
        stream: { durationSec: number };
    }
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

    // Batch I — Clips
    interface Clip { id: string; title: string; startSec: number; endSec: number; plays: number; likes: number; createdAt: string; author: LAuthor | null; }
    const [clips, setClips] = useState<Clip[]>([]);
    const [clipComposerOpen, setClipComposerOpen] = useState(false);
    const [clipStart, setClipStart] = useState(0);
    const [clipEnd, setClipEnd] = useState(30);
    const [clipTitle, setClipTitle] = useState("");
    const [clipBusy, setClipBusy] = useState(false);
    // Batch T — Raid
    const [raidComposerOpen, setRaidComposerOpen] = useState(false);
    const [raidUsername, setRaidUsername] = useState("");
    const [raidCountdown, setRaidCountdown] = useState<number | null>(null);
    // Batch U — TTS tips (viewer-side, opt-in)
    const [ttsEnabled, setTtsEnabled] = useState(false);
    useEffect(() => {
        try { setTtsEnabled(localStorage.getItem("nx-tts-tips") === "1"); } catch { /* jim */ }
    }, []);
    // Batch W — Watermark upload (streamer)
    const [watermarkBusy, setWatermarkBusy] = useState(false);
    // Batch H — Co-host (guests)
    interface LiveGuest { profileId: string; joined: boolean; author: LAuthor | null; invitedAt: string; }
    const [guests, setGuests] = useState<LiveGuest[]>([]);
    const [guestInvite, setGuestInvite] = useState("");
    const [guestBusy, setGuestBusy] = useState(false);
    // Batch AB — Clip likes (client-side toggle)
    const [clipLikes, setClipLikes] = useState<Record<string, boolean>>({});
    // Batch AM — Streamer panels
    interface StreamerPanel { id: string; kind: string; title: string; content: string; imageUrl?: string | null; linkUrl?: string | null; order: number; }
    const [panels, setPanels] = useState<StreamerPanel[]>([]);
    const [panelsOpen, setPanelsOpen] = useState(false);
    // Batch AI — Custom emotes
    interface Emote { id: string; name: string; imageUrl: string; }
    const [emotes, setEmotes] = useState<Emote[]>([]);
    // Batch CR — Custom commands
    interface LiveCommand { id: string; name: string; response: string; }
    const [customCmds, setCustomCmds] = useState<LiveCommand[]>([]);
    const [emotePickerOpen, setEmotePickerOpen] = useState(false);
    const [emoteAdmin, setEmoteAdmin] = useState(false);
    const [emoteName, setEmoteName] = useState("");
    const [emoteBusy, setEmoteBusy] = useState(false);
    // Batch AL — Sound alert (viewer side plays)
    const soundAlertRef = useRef<HTMLAudioElement | null>(null);
    // Batch AO — Stream health (viewer)
    // 0..3: 0=lost, 1=poor, 2=good, 3=excellent
    const [healthLevel, setHealthLevel] = useState<0 | 1 | 2 | 3>(3);
    // Batch AK — Poll templates
    interface PollTemplate { id: string; question: string; options: string[]; durationSec: number; usedCount: number; }
    const [pollTemplates, setPollTemplates] = useState<PollTemplate[]>([]);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    // Batch H2 — Extra guest camera tracks (multi-participant grid)
    // Map<participantIdentity, RemoteVideoTrack>
    const [extraCams, setExtraCams] = useState<Map<string, RemoteVideoTrack>>(new Map());
    const extraCamRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());
    // Batch AJ — Subscription
    interface MySub { tier: string; monthlyPrice: number; currency: string; expiresAt: string; active: boolean; }
    const [subCount, setSubCount] = useState(0);
    const [mySub, setMySub] = useState<MySub | null>(null);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [subBusy, setSubBusy] = useState(false);
    // Batch V — Live captions
    const [captionOn, setCaptionOn] = useState(false);        // viewer: display
    const [captionStreamerOn, setCaptionStreamerOn] = useState(false); // streamer: SpeechRecognition
    const [currentCaption, setCurrentCaption] = useState<string | null>(null);
    const captionTimerRef = useRef<number | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const lastSentCaptionRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
    const seenCaptionIdsRef = useRef<Set<string>>(new Set());
    // Batch X — Chat auto-translate
    const [translateOn, setTranslateOn] = useState(false);
    const [translateLang, setTranslateLang] = useState<"uz" | "ru" | "en" | "tr" | "ar" | "es" | "fr">("uz");
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const translateBusyRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        try {
            setTranslateOn(localStorage.getItem("nx-translate") === "1");
            const l = localStorage.getItem("nx-translate-lang");
            if (l) setTranslateLang(l as typeof translateLang);
        } catch { /* jim */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { setMounted(true); }, []);

    // Tafsilot — ochilishda + har 15s (status o'zgarishini ushlash uchun)
    const loadDetail = useCallback(() => {
        fetch(`/api/nexus/live/${streamId}`)
            .then(r => r.json())
            .then(d => { if (d.stream) { setStream(d.stream); setViewers(d.stream.viewers); } })
            .finally(() => setLoading(false));
    }, [streamId]);
    useEffect(() => {
        loadDetail();
        const iv = setInterval(loadDetail, 15_000);
        return () => clearInterval(iv);
    }, [loadDetail]);

    // Tomoshabin valyutasi (Super Chat uchun)
    useEffect(() => {
        fetch("/api/pay/wallet").then(r => r.json()).then(d => setCurrency(d.currency === "USD" ? "USD" : "UZS")).catch(() => { });
    }, []);

    // Heartbeat — faqat LIVE paytida, har 10s
    useEffect(() => {
        if (stream?.status !== "LIVE") return;
        const beat = () => fetch(`/api/nexus/live/${streamId}/heartbeat`, { method: "POST" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d && typeof d.viewers === "number") setViewers(d.viewers); })
            .catch(() => { });
        beat();
        const iv = setInterval(beat, 10_000);
        return () => clearInterval(iv);
    }, [stream?.status, streamId]);

    // Chat polling — har 3.5s, since kursori bilan
    useEffect(() => {
        if (!stream || stream.status === "UPCOMING") return;
        let stop = false;
        const poll = async () => {
            try {
                const qs = lastTsRef.current ? `?since=${encodeURIComponent(lastTsRef.current)}` : "";
                const d = await fetch(`/api/nexus/live/${streamId}/chat${qs}`).then(r => r.json());
                if (stop) return;
                let latest: string | null = null;
                if (d.messages?.length) {
                    setMsgs(prev => {
                        const seen = new Set(prev.map((m: ChatMsg) => m.id));
                        const fresh = d.messages.filter((m: ChatMsg) => !seen.has(m.id));
                        return fresh.length ? [...prev, ...fresh].slice(-200) : prev;
                    });
                    latest = d.messages[d.messages.length - 1].createdAt;

                    // Batch E — Tip alertlar navbatga qo'shish (yangilar)
                    for (const m of d.messages as ChatMsg[]) {
                        if ((m.tipAmount ?? 0) > 0 && !seenTipsRef.current.has(m.id)) {
                            seenTipsRef.current.add(m.id);
                            tipQueueRef.current.push({ key: m.id, author: m.author, amount: m.tipAmount!, text: m.text });
                        }
                    }
                }
                // Batch K — ticker (latest wins)
                if (d.ticker !== undefined && d.ticker !== null) {
                    setTicker(d.ticker || null);
                }
                // Batch BI — pin (latest wins, empty = unpin)
                if (d.pin !== undefined) {
                    setPinnedMsg(d.pin || null);
                }
                // Batch BU — chat rules
                if (d.rules !== undefined) {
                    setChatRules(d.rules || null);
                }
                // Batch V — captions (5s window)
                if (d.captions?.length) {
                    const now = Date.now();
                    for (const c of d.captions as { id: string; text: string; at: string }[]) {
                        if (seenCaptionIdsRef.current.has(c.id)) continue;
                        seenCaptionIdsRef.current.add(c.id);
                        if (now - new Date(c.at).getTime() > 5000) continue;
                        if (captionOn) {
                            setCurrentCaption(c.text);
                            if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
                            captionTimerRef.current = window.setTimeout(() => setCurrentCaption(null), 5000);
                        }
                    }
                }
                // Batch S — chapters (merge unique by id)
                if (d.chapters?.length) {
                    setChapters(prev => {
                        const seen = new Set(prev.map(c => c.id));
                        const fresh = (d.chapters as Chapter[]).filter(c => !seen.has(c.id));
                        return fresh.length ? [...prev, ...fresh].sort((a, b) => a.sec - b.sec) : prev;
                    });
                }
                // Batch G — polls (aktiv: endsAt > now)
                if (d.polls?.length) {
                    const now = Date.now();
                    for (const p of d.polls as { id: string; payload: LivePoll }[]) {
                        if (new Date(p.payload.endsAt).getTime() > now) {
                            setActivePoll(prev => prev?.id === p.payload.id ? prev : p.payload);
                        }
                    }
                }
                // Batch G — votes aggregate
                if (d.votes?.length) {
                    setPollVotes(prev => {
                        const next = { ...prev };
                        for (const v of d.votes as { id: string; pollId: string; idx: number; profileId: string }[]) {
                            const arr = next[v.pollId] ?? [];
                            while (arr.length <= v.idx) arr.push(0);
                            arr[v.idx] = (arr[v.idx] || 0) + 1;
                            next[v.pollId] = arr;
                        }
                        return next;
                    });
                    // O'z ovozimni belgilash
                    // (Backend duplicate check qiladi — birinchi marta yozilganidan boshqasi bloklanadi)
                }
                // Batch E — floating reactions
                if (d.reactions?.length) {
                    const now = Date.now();
                    for (const r of d.reactions as { id: string; icon: ReactionIcon; at: string }[]) {
                        if (seenReactionsRef.current.has(r.id)) continue;
                        seenReactionsRef.current.add(r.id);
                        // Faqat oxirgi 6 sekunddagilarni ko'rsatamiz (eski poll'da qolganlarga ko'rinmasin)
                        if (now - new Date(r.at).getTime() > 6_000) continue;
                        const key = `${r.id}-${Math.random()}`;
                        const x = Math.random() * 60 + 20;
                        setFloating(prev => [...prev, { key, icon: r.icon, x, delay: 0 }].slice(-40));
                        // 3.5s dan keyin o'chirish
                        setTimeout(() => setFloating(prev => prev.filter(f => f.key !== key)), 3600);
                    }
                    if (latest) latest = d.reactions[d.reactions.length - 1].at;
                }
                if (latest) lastTsRef.current = latest;
            } catch { /* tarmoq */ }
        };
        poll();
        const iv = setInterval(poll, 3_500);
        return () => { stop = true; clearInterval(iv); };
    }, [stream, streamId]);

    // Batch E — Tip alert queue processor (bittalab, 6s ko'rsatib)
    useEffect(() => {
        if (tipAlert) return;
        const iv = setInterval(() => {
            const next = tipQueueRef.current.shift();
            if (next) {
                setTipAlert(next);
                // Batch U — TTS (agar yoqilgan bo'lsa)
                if (ttsEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                    try {
                        const name = next.author?.name || next.author?.username || "Foydalanuvchi";
                        const text = `${name} ${formatMoney(next.amount, currency)} yubordi${next.text ? ". " + next.text : ""}`;
                        const u = new SpeechSynthesisUtterance(text);
                        u.lang = "uz-UZ"; u.rate = 1.05; u.volume = 0.8;
                        window.speechSynthesis.speak(u);
                    } catch { /* jim */ }
                }
                setTimeout(() => setTipAlert(null), 6000);
            }
        }, 400);
        return () => clearInterval(iv);
    }, [tipAlert, ttsEnabled, currency]);

    // Batch I — Clips fetch (ENDED holatida)
    useEffect(() => {
        if (stream?.status !== "ENDED" || !stream?.recordingUrl) return;
        fetch(`/api/nexus/live/${streamId}/clip`).then(r => r.json()).then(d => setClips(d.clips || [])).catch(() => { });
    }, [stream?.status, stream?.recordingUrl, streamId]);

    // Batch T — Raid: ENDED holatida raidToUsername bo'lsa 10s countdown va navigate
    useEffect(() => {
        if (stream?.status !== "ENDED" || !stream?.raidToUsername || stream?.isMine) return;
        setRaidCountdown(10);
        const iv = setInterval(() => setRaidCountdown(c => (c === null ? null : c - 1)), 1000);
        return () => clearInterval(iv);
    }, [stream?.status, stream?.raidToUsername, stream?.isMine]);
    useEffect(() => {
        if (raidCountdown !== null && raidCountdown <= 0 && stream?.raidToUsername) {
            window.location.href = `/nexus/u/${stream.raidToUsername}`;
        }
    }, [raidCountdown, stream?.raidToUsername]);

    // Batch E — Follow state (kirgan tomoshabin muallif'ni kuzatadimi?)
    useEffect(() => {
        if (!stream?.author?.username) return;
        fetch(`/api/nexus/profile?username=${encodeURIComponent(stream.author.username)}`)
            .then(r => r.json())
            .then(d => {
                setIsFollowing(!!d.isFollowing);
                if (d.isMe) setMeUsername(d.username);
            })
            .catch(() => { });
    }, [stream?.author?.username]);

    async function toggleFollow() {
        if (!stream?.author?.username || followBusy || isFollowing === null) return;
        setFollowBusy(true);
        try {
            // /api/nexus/follow — yagona toggle endpoint (POST)
            const r = await fetch(`/api/nexus/follow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: stream.author.username }),
            });
            if (r.ok) {
                const d = await r.json();
                setIsFollowing(!!d.following);
            }
        } finally { setFollowBusy(false); }
    }

    // Batch G — poll aktiv muddati tugasa avto-yashirish (natijalar 8s ko'rsatiladi)
    useEffect(() => {
        if (!activePoll) return;
        const remaining = new Date(activePoll.endsAt).getTime() - Date.now();
        if (remaining <= 0) {
            const t = setTimeout(() => { setActivePoll(null); setMyVoteIdx(null); }, 8000);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setActivePoll(prev => prev), remaining + 100);
        return () => clearTimeout(t);
    }, [activePoll]);

    // Batch J — ENDED bo'lsa analytics yuklash (streamer uchun)
    useEffect(() => {
        if (stream?.status !== "ENDED" || !stream?.isMine) return;
        fetch(`/api/nexus/live/${streamId}/analytics`)
            .then(r => r.json())
            .then(d => setAnalytics(d))
            .catch(() => { });
    }, [stream?.status, stream?.isMine, streamId]);

    async function voteForOption(idx: number) {
        if (!activePoll || myVoteIdx !== null || pollBusy) return;
        setPollBusy(true);
        setMyVoteIdx(idx); // optimistic
        // Optimistic votes ++
        setPollVotes(prev => {
            const arr = [...(prev[activePoll.id] ?? [])];
            while (arr.length <= idx) arr.push(0);
            arr[idx] = (arr[idx] || 0) + 1;
            return { ...prev, [activePoll.id]: arr };
        });
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/poll/vote`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pollId: activePoll.id, optionIdx: idx }),
            });
            if (!r.ok) setMyVoteIdx(null);
        } catch { setMyVoteIdx(null); }
        finally { setPollBusy(false); }
    }

    async function createPoll() {
        const opts = pollOpts.map(o => o.trim()).filter(Boolean);
        if (!pollQ.trim() || opts.length < 2) return;
        setPollBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/poll`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: pollQ.trim(), options: opts, durationSec: pollDur }),
            });
            if (r.ok) {
                setPollComposerOpen(false); setPollQ(""); setPollOpts(["", ""]);
            }
        } finally { setPollBusy(false); }
    }

    // Batch M — Load mod settings (streamer paneli ochilganda)
    useEffect(() => {
        if (!stream?.isMine || stream?.status !== "LIVE") return;
        fetch(`/api/nexus/live/${streamId}/settings`).then(r => r.json()).then(d => {
            if (d.settings) {
                setModSettings(d.settings);
                setBannedWordsDraft((d.settings.bannedWords || []).join(", "));
                setGoalDraft({
                    amount: d.settings.donationGoal ? String(d.settings.donationGoal) : "",
                    label: d.settings.donationGoalLabel || "",
                });
            }
        }).catch(() => { });
    }, [stream?.isMine, stream?.status, streamId]);

    // Batch AM/AI — Panels + emotes (streamer profil'i asosida)
    useEffect(() => {
        if (!stream?.author?.username) return;
        const u = stream.author.username;
        fetch(`/api/nexus/panels?username=${u}`).then(r => r.json()).then(d => setPanels(d.panels || [])).catch(() => { });
        fetch(`/api/nexus/emotes?username=${u}`).then(r => r.json()).then(d => setEmotes(d.emotes || [])).catch(() => { });
        fetch(`/api/nexus/live-commands?username=${u}`).then(r => r.json()).then(d => setCustomCmds(d.commands || [])).catch(() => { });
    }, [stream?.author?.username]);

    // Batch AL — Sound alert: tip alert paydo bo'lganda audio ijro etadi
    useEffect(() => {
        if (!tipAlert || !stream?.soundAlertUrl) return;
        try {
            if (!soundAlertRef.current) soundAlertRef.current = new Audio(stream.soundAlertUrl);
            soundAlertRef.current.currentTime = 0;
            soundAlertRef.current.volume = 0.7;
            soundAlertRef.current.play().catch(() => { });
        } catch { /* jim */ }
    }, [tipAlert, stream?.soundAlertUrl]);

    // Batch AK — Poll templates
    useEffect(() => {
        if (!stream?.isMine) return;
        fetch(`/api/nexus/poll-templates`).then(r => r.json()).then(d => setPollTemplates(d.templates || [])).catch(() => { });
    }, [stream?.isMine]);

    // Batch AV — VOD chat replay: playback vaqti bilan chat sinxron
    const [chatReplay, setChatReplay] = useState(true);        // ENDED bo'lsa default yoqilgan
    const displayedMsgs = (() => {
        if (stream?.status !== "ENDED" || !chatReplay || !stream?.startedAt) return msgs;
        const startedMs = new Date(stream.startedAt).getTime();
        const cutMs = startedMs + vodCur * 1000;
        return msgs.filter(m => new Date(m.createdAt).getTime() <= cutMs);
    })();

    // Batch AJ — My sub + count
    useEffect(() => {
        if (!stream?.author?.username) return;
        fetch(`/api/nexus/live/sub?username=${stream.author.username}`).then(r => r.json())
            .then(d => { setSubCount(d.count || 0); if (d.mySub) setMySub(d.mySub); })
            .catch(() => { });
    }, [stream?.author?.username]);

    async function subscribe(tier: string) {
        if (!stream?.author?.username || subBusy) return;
        setSubBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/sub`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: stream.author.username, tier }),
            });
            const d = await r.json();
            if (r.ok) {
                setMySub(d.sub);
                setSubCount(c => c + 1);
                setSubModalOpen(false);
            } else {
                alert(d.error || "Xato");
            }
        } finally { setSubBusy(false); }
    }

    async function saveCurrentAsTemplate() {
        const opts = pollOpts.map(o => o.trim()).filter(Boolean);
        if (!pollQ.trim() || opts.length < 2) return;
        try {
            const r = await fetch(`/api/nexus/poll-templates`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: pollQ.trim(), options: opts, durationSec: pollDur }),
            });
            if (r.ok) {
                const d = await r.json();
                setPollTemplates(prev => [d.template, ...prev]);
            }
        } catch { /* ignore */ }
    }
    function loadTemplate(t: PollTemplate) {
        setPollQ(t.question);
        setPollOpts(t.options.length >= 2 ? t.options : [...t.options, ""]);
        setPollDur(t.durationSec);
        setTemplatesOpen(false);
        // Usage count increment
        fetch(`/api/nexus/poll-templates`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: t.id }),
        }).catch(() => { });
    }
    async function deleteTemplate(id: string) {
        try {
            await fetch(`/api/nexus/poll-templates?id=${id}`, { method: "DELETE" });
            setPollTemplates(prev => prev.filter(t => t.id !== id));
        } catch { /* ignore */ }
    }

    // Emote CRUD
    async function uploadEmote(file: File) {
        if (!emoteName || emoteBusy) return;
        setEmoteBusy(true);
        try {
            const { upload } = await import("@vercel/blob/client");
            const key = `nexus/emotes/${streamId}-${emoteName}-${Date.now()}.${file.type.includes("png") ? "png" : "jpg"}`;
            const up = await upload(key, file, { access: "public", handleUploadUrl: "/api/market/upload/client-token" });
            const r = await fetch(`/api/nexus/emotes`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: emoteName, imageUrl: up.url }),
            });
            if (r.ok) {
                const d = await r.json();
                setEmotes(prev => [...prev, d.emote]);
                setEmoteName("");
            }
        } finally { setEmoteBusy(false); }
    }
    async function deleteEmote(id: string) {
        try {
            await fetch(`/api/nexus/emotes?id=${id}`, { method: "DELETE" });
            setEmotes(prev => prev.filter(e => e.id !== id));
        } catch { /* ignore */ }
    }
    async function uploadSoundAlert(file: File) {
        try {
            const { upload } = await import("@vercel/blob/client");
            const ext = file.type.includes("mp3") ? "mp3" : file.type.includes("wav") ? "wav" : "audio";
            const key = `nexus/live/${streamId}-alert-${Date.now()}.${ext}`;
            const up = await upload(key, file, { access: "public", handleUploadUrl: "/api/market/upload/client-token" });
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update", soundAlertUrl: up.url }),
            });
            loadDetail();
        } catch { /* ignore */ }
    }
    async function removeSoundAlert() {
        try {
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update", soundAlertUrl: "" }),
            });
            loadDetail();
        } catch { /* ignore */ }
    }

    // Batch BX — Stream title hashtag parsing (#tag → clickable)
    function renderTitleTags(text: string): React.ReactNode {
        const parts: React.ReactNode[] = [];
        let last = 0;
        const rx = /#([a-zA-Z0-9_]{2,30})/g;
        let match: RegExpExecArray | null;
        while ((match = rx.exec(text)) !== null) {
            if (match.index > last) parts.push(text.slice(last, match.index));
            const tag = match[1].toLowerCase();
            parts.push(
                <a key={match.index} href={`/nexus/live/category/${tag}`}
                    className="font-black hover:underline"
                    style={{ color: "#00CEC8" }}
                    onClick={e => e.stopPropagation()}>
                    #{match[1]}
                </a>
            );
            last = match.index + match[0].length;
        }
        if (last < text.length) parts.push(text.slice(last));
        return parts.length > 0 ? parts : text;
    }

    // Batch AI — Emote inline replace (:name: → <img>)
    function renderChatText(text: string): React.ReactNode {
        if (!emotes.length || !text) return text;
        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        const rx = /:([a-z0-9_]{2,20}):/g;
        let match;
        while ((match = rx.exec(text)) !== null) {
            const em = emotes.find(e => e.name === match![1]);
            if (em) {
                if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
                parts.push(<img key={`${match.index}-${em.id}`} src={em.imageUrl} alt={em.name} className="inline-block w-5 h-5 align-middle" />);
                lastIdx = match.index + match[0].length;
            }
        }
        if (lastIdx < text.length) parts.push(text.slice(lastIdx));
        return parts.length > 0 ? parts : text;
    }

    // Batch H — Co-host list polling (LIVE'da har 15s)
    useEffect(() => {
        if (stream?.status !== "LIVE") return;
        let stopped = false;
        const load = () => fetch(`/api/nexus/live/${streamId}/guest`).then(r => r.json())
            .then(d => { if (!stopped && d.guests) setGuests(d.guests); }).catch(() => { });
        load();
        const iv = setInterval(load, 15_000);
        return () => { stopped = true; clearInterval(iv); };
    }, [stream?.status, streamId]);

    async function inviteGuest() {
        const uname = guestInvite.trim().replace(/^@/, "");
        if (!uname || guestBusy) return;
        setGuestBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/guest`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: uname }),
            });
            if (r.ok) { setGuestInvite(""); fetch(`/api/nexus/live/${streamId}/guest`).then(r2 => r2.json()).then(d => d.guests && setGuests(d.guests)); }
        } finally { setGuestBusy(false); }
    }
    async function kickGuest(profileId: string) {
        try {
            await fetch(`/api/nexus/live/${streamId}/guest`, {
                method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }),
            });
            setGuests(prev => prev.filter(g => g.profileId !== profileId));
        } catch { /* ignore */ }
    }

    // Batch AB — Clip like
    async function likeClip(clipId: string) {
        const wasLiked = !!clipLikes[clipId];
        setClipLikes(prev => ({ ...prev, [clipId]: !wasLiked }));
        setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: (c.likes || 0) + (wasLiked ? -1 : 1) } : c));
        try {
            const r = await fetch(`/api/nexus/live/clip/${clipId}/like`, { method: "POST" });
            if (!r.ok) {
                setClipLikes(prev => ({ ...prev, [clipId]: wasLiked }));
                setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: (c.likes || 0) + (wasLiked ? 1 : -1) } : c));
            }
        } catch { /* ignore */ }
    }

    // Batch V — Streamer Speech Recognition (captionStreamerOn)
    useEffect(() => {
        if (!stream?.isMine || stream?.status !== "LIVE") return;
        if (!captionStreamerOn) {
            try { recognitionRef.current?.abort(); } catch { /* jim */ }
            recognitionRef.current = null;
            return;
        }
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Ctor) { setCaptionStreamerOn(false); return; }
        let stopped = false;
        const rec = new Ctor();
        rec.lang = "uz-UZ";
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e: SpeechRecognitionEvent) => {
            let final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) final += r[0].transcript + " ";
            }
            final = final.trim();
            if (!final) return;
            const now = Date.now();
            if (final === lastSentCaptionRef.current.text && now - lastSentCaptionRef.current.at < 3000) return;
            lastSentCaptionRef.current = { text: final, at: now };
            fetch(`/api/nexus/live/${streamId}/caption`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: final }),
            }).catch(() => { });
        };
        rec.onerror = () => { /* jim */ };
        rec.onend = () => { if (!stopped && captionStreamerOn) { try { rec.start(); } catch { /* jim */ } } };
        try { rec.start(); recognitionRef.current = rec; } catch { setCaptionStreamerOn(false); }
        return () => { stopped = true; try { rec.abort(); } catch { /* jim */ } };
    }, [captionStreamerOn, stream?.isMine, stream?.status, streamId]);

    // Batch X — Auto-translate yangi chat msg'lar
    useEffect(() => {
        if (!translateOn) return;
        // Yangi msg'lar uchun trigger
        for (const m of msgs) {
            const key = m.id;
            if (translations[key] || translateBusyRef.current.has(key)) continue;
            const t = (m.text || "").trim();
            if (!t || t.length < 3 || t.startsWith("__nx_")) continue;
            translateBusyRef.current.add(key);
            fetch(`/api/nexus/translate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: t, targetLang: translateLang }),
            }).then(r => r.json()).then(d => {
                if (d.translated && d.translated !== t) {
                    setTranslations(prev => ({ ...prev, [key]: d.translated }));
                }
            }).catch(() => { }).finally(() => translateBusyRef.current.delete(key));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [msgs, translateOn, translateLang]);

    function toggleTranslate() {
        setTranslateOn(prev => {
            const nx = !prev;
            try { localStorage.setItem("nx-translate", nx ? "1" : "0"); } catch { /* jim */ }
            return nx;
        });
    }
    function changeTranslateLang(l: typeof translateLang) {
        setTranslateLang(l);
        try { localStorage.setItem("nx-translate-lang", l); } catch { /* jim */ }
    }

    async function updateModSettings(patch: Partial<ModSettings>) {
        setModBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/settings`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
            });
            if (r.ok) {
                const d = await r.json();
                setModSettings(d.settings);
            }
        } finally { setModBusy(false); }
    }

    async function saveBannedWords() {
        const list = bannedWordsDraft.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 200);
        await updateModSettings({ bannedWords: list });
    }

    async function banUser(profileId: string) {
        setMsgMenuId(null);
        try {
            await fetch(`/api/nexus/live/${streamId}/ban`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }),
            });
            // Chat'dan ushbu foydalanuvchining xabarlarini olib tashlash
            const bannedProfile = profileId;
            setMsgs(prev => prev.filter(m => {
                // Note: msg.author yo'q bo'lishi mumkin — biz author.username bilan solishtira olmaymiz
                // Server tomondan hidden qilingan, keyingi pollingda avto tozalanadi
                return true; // Optimistic — polling yangilaydi
            }));
            void bannedProfile;
        } catch { /* ignore */ }
    }

    async function saveTicker() {
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/ticker`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: tickerDraft }),
            });
            if (r.ok) { setTicker(tickerDraft || null); setTickerEditOpen(false); }
        } catch { /* ignore */ }
    }

    // Batch I — Clip create
    async function createClip() {
        if (clipBusy || !clipTitle.trim()) return;
        setClipBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/clip`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: clipTitle.trim(), startSec: Math.floor(clipStart), endSec: Math.floor(clipEnd) }),
            });
            if (r.ok) {
                const d = await r.json();
                setClips(prev => [{ ...d.clip, author: null }, ...prev]);
                setClipComposerOpen(false); setClipTitle("");
            }
        } finally { setClipBusy(false); }
    }

    // Batch T — End with raid
    async function endWithRaid() {
        if (!raidUsername.trim()) return;
        try {
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end", raidToUsername: raidUsername.trim().replace(/^@/, "") }),
            });
            setRaidComposerOpen(false);
            loadDetail();
        } catch { /* ignore */ }
    }

    // Batch U — TTS toggle (localStorage persist)
    function toggleTts() {
        setTtsEnabled(prev => {
            const nx = !prev;
            try { localStorage.setItem("nx-tts-tips", nx ? "1" : "0"); } catch { /* jim */ }
            return nx;
        });
    }

    // Batch W — Watermark upload (streamer)
    async function uploadWatermark(file: File) {
        if (watermarkBusy) return;
        setWatermarkBusy(true);
        try {
            const { upload } = await import("@vercel/blob/client");
            const key = `nexus/live/${streamId}-wm-${Date.now()}.${file.type.includes("png") ? "png" : file.type.includes("svg") ? "svg" : "jpg"}`;
            const up = await upload(key, file, { access: "public", handleUploadUrl: "/api/market/upload/client-token" });
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update", watermarkUrl: up.url }),
            });
            loadDetail();
        } catch { /* ignore */ }
        finally { setWatermarkBusy(false); }
    }

    async function removeWatermark() {
        try {
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update", watermarkUrl: "" }),
            });
            loadDetail();
        } catch { /* ignore */ }
    }

    async function saveChapter() {
        const label = chapterDraft.trim();
        if (!label) return;
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/chapter`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }),
            });
            if (r.ok) {
                const d = await r.json();
                setChapters(prev => [...prev, { id: `local-${Date.now()}`, sec: d.sec, label: d.label }].sort((a, b) => a.sec - b.sec));
                setChapterEditOpen(false); setChapterDraft("");
            }
        } catch { /* ignore */ }
    }

    async function saveRules() {
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/rules`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: rulesDraft }),
            });
            if (r.ok) { setChatRules(rulesDraft || null); setRulesEditOpen(false); }
        } catch { /* ignore */ }
    }

    async function pinMessage(msgId: string) {
        setMsgMenuId(null);
        try {
            await fetch(`/api/nexus/live/${streamId}/pin`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msgId }),
            });
        } catch { /* ignore */ }
    }
    async function unpinMessage() {
        try {
            await fetch(`/api/nexus/live/${streamId}/pin`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "" }),
            });
            setPinnedMsg(null);
        } catch { /* ignore */ }
    }

    async function deleteMessage(msgId: string) {
        setMsgMenuId(null);
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/message/${msgId}`, { method: "DELETE" });
            if (r.ok) setMsgs(prev => prev.filter(m => m.id !== msgId));
        } catch { /* ignore */ }
    }

    function fmtSec(s: number) { const m = Math.floor(s / 60); return m > 0 ? `${m}d ${s % 60}s` : `${s}s`; }

    async function sendReaction(icon: ReactionIcon) {
        if (reactionBusy || !isLive) return;
        setReactionBusy(true);
        // Optimistic — o'zim ko'raman
        const key = `me-${Date.now()}-${Math.random()}`;
        setFloating(prev => [...prev, { key, icon, x: Math.random() * 60 + 20, delay: 0 }].slice(-40));
        setTimeout(() => setFloating(prev => prev.filter(f => f.key !== key)), 3600);
        try {
            await fetch(`/api/nexus/live/${streamId}/react`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ icon }),
            });
        } finally { setReactionBusy(false); }
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    // ── LiveKit subscribe — video oqimini olish ──
    useEffect(() => {
        if (stream?.status !== "LIVE") return;
        let cancelled = false;
        (async () => {
            try {
                const tk = await fetch(`/api/nexus/live/${streamId}/token`).then(r => r.json());
                if (cancelled || !tk?.token || !tk?.url) return;
                const room = new Room({ adaptiveStream: true, dynacast: true });

                // Batch A: Screen va Camera alohida track'lar sifatida keladi.
                // Screen → asosiy videoElRef, Camera → camPipElRef (agar screen ham bor bo'lsa) yoki asosiy (solo).
                const attachVideoTo = (track: RemoteTrack, el: HTMLVideoElement | null, pub: RemoteTrackPublication) => {
                    if (!el) return;
                    track.attach(el);
                    remoteVideoTrackRef.current = track as RemoteVideoTrack;
                    remoteVideoPubRef.current = pub;
                    const applyRes = () => {
                        const w = el.videoWidth, h = el.videoHeight;
                        if (w && h) setAvailableRes({ w, h });
                    };
                    el.addEventListener("loadedmetadata", applyRes);
                    el.addEventListener("resize", applyRes);
                    applyRes();
                };
                // Batch H2 — Multi-participant video tracks
                // Streamer camera → main PiP; Guest cameras → extraCams grid
                const streamerId = stream?.author?.username;
                let mainCameraAttached = false; // birinchi camera track main slotga
                const onTrackSubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
                    if (track.kind === Track.Kind.Video) {
                        setHasRemoteVideo(true);
                        if (pub.source === Track.Source.ScreenShare) {
                            attachVideoTo(track, videoElRef.current, pub);
                            setHasScreen(true);
                        } else {
                            // Camera source — kim publish qildi?
                            // Identity == streamer.profileId (LiveKit token identity=profileId)
                            const isStreamerCam = !mainCameraAttached; // birinchi kelgan main
                            const hasScr = !!videoElRef.current?.srcObject;
                            if (isStreamerCam) {
                                if (hasScr) attachVideoTo(track, camPipElRef.current, pub);
                                else attachVideoTo(track, videoElRef.current, pub);
                                mainCameraAttached = true;
                                setHasCamera(true);
                            } else {
                                // Guest camera → extra tile
                                setExtraCams(prev => {
                                    const nx = new Map(prev);
                                    nx.set(p.identity, track as RemoteVideoTrack);
                                    return nx;
                                });
                                // Attach after render (setTimeout for ref)
                                setTimeout(() => {
                                    const el = extraCamRefs.current.get(p.identity);
                                    if (el) track.attach(el);
                                }, 100);
                            }
                        }
                    } else if (track.kind === Track.Kind.Audio && audioElRef.current) {
                        track.attach(audioElRef.current);
                    }
                };
                const onTrackUnsubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
                    if (track.kind === Track.Kind.Video) {
                        if (pub.source === Track.Source.ScreenShare) {
                            if (videoElRef.current) track.detach(videoElRef.current);
                            setHasScreen(false);
                        } else {
                            // Guest camera'nimi?
                            if (extraCams.has(p.identity)) {
                                const el = extraCamRefs.current.get(p.identity);
                                if (el) track.detach(el);
                                setExtraCams(prev => {
                                    const nx = new Map(prev);
                                    nx.delete(p.identity);
                                    return nx;
                                });
                            } else {
                                if (camPipElRef.current) track.detach(camPipElRef.current);
                                if (videoElRef.current) track.detach(videoElRef.current);
                                setHasCamera(false);
                                mainCameraAttached = false;
                            }
                        }
                        remoteVideoTrackRef.current = null;
                    } else if (track.kind === Track.Kind.Audio && audioElRef.current) {
                        track.detach(audioElRef.current);
                    }
                };
                void streamerId;

                room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
                room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
                // Batch AO — Stream health (ConnectionQuality)
                room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
                    // Faqat streamer'ning ulanish sifati
                    if (participant?.identity && !stream?.isMine) {
                        const map: Record<string, 0 | 1 | 2 | 3> = {
                            [ConnectionQuality.Excellent]: 3,
                            [ConnectionQuality.Good]: 2,
                            [ConnectionQuality.Poor]: 1,
                            [ConnectionQuality.Lost]: 0,
                            [ConnectionQuality.Unknown]: 2,
                        };
                        setHealthLevel(map[quality] ?? 2);
                    }
                });
                await room.connect(tk.url, tk.token);
                if (cancelled) { room.disconnect(); return; }
                roomRef.current = room;

                // Xonaga kirganda mavjud publisher (streamer) tracks'larini olish
                room.remoteParticipants.forEach(p => {
                    p.trackPublications.forEach(pub => {
                        if (pub.isSubscribed && pub.track) onTrackSubscribed(pub.track, pub, p);
                    });
                });
            } catch (e) {
                console.warn("[NxLiveRoom] LiveKit subscribe xato:", e);
            }
        })();
        return () => {
            cancelled = true;
            try { roomRef.current?.disconnect(); } catch { /* ignore */ }
            roomRef.current = null;
            setHasRemoteVideo(false);
            setHasScreen(false);
            setHasCamera(false);
        };
    }, [stream?.status, streamId]);

    // Batch FF + CR — Slash + custom commands parser
    function expandSlashCommand(raw: string): string {
        const t = raw.trim();
        // Batch CR — Custom commands (!name)
        if (t.startsWith("!") && customCmds.length > 0) {
            const cmdName = t.slice(1).split(/\s+/)[0].toLowerCase();
            const cmd = customCmds.find(c => c.name === cmdName);
            if (cmd) return cmd.response;
        }
        if (!t.startsWith("/")) return t;
        const [cmd, ...rest] = t.slice(1).split(/\s+/);
        const arg = rest.join(" ");
        switch (cmd.toLowerCase()) {
            case "me": return arg ? `* ${arg}` : t;
            case "shrug": return "¯\\_(ツ)_/¯";
            case "roll": {
                const max = Math.max(2, Math.min(1000, parseInt(arg) || 6));
                return `🎲 ${1 + Math.floor(Math.random() * max)}/${max}`;
            }
            case "flip": return Math.random() < 0.5 ? "🪙 Yeg'ir" : "🪙 O'ng";
            case "8ball": {
                const answers = ["Ha", "Yo'q", "Balki", "Aniq ha", "Aniq yo'q", "Keyinroq so'rang", "Aynan shunday", "Shubhali"];
                return `🎱 ${answers[Math.floor(Math.random() * answers.length)]}${arg ? " — " + arg : ""}`;
            }
            case "clear": return t; // faqat display effect
            default: return t;
        }
    }

    async function send() {
        const isSC = scAmount > 0;
        if ((!input.trim() && !isSC) || busy) return;
        setBusy(true); setChatError(null);
        const text = expandSlashCommand(input.trim());
        try {
            const r = await fetch(`/api/nexus/live/${streamId}/chat`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, ...(isSC ? { tipAmount: scAmount } : {}) }),
            });
            const d = await r.json();
            if (r.ok) {
                setInput(""); setScAmount(0); setScOpen(false);
                setMsgs(prev => [...prev, d.message].slice(-200));
                lastTsRef.current = d.message.createdAt;
            } else {
                setChatError(d.error || "Yuborilmadi");
            }
        } catch {
            setChatError("Tarmoq xatosi");
        } finally { setBusy(false); }
    }

    async function endStream() {
        if (!stream?.isMine || ending) return;
        setEnding(true);
        try {
            await fetch(`/api/nexus/live/${streamId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }),
            });
            loadDetail();
            setEndConfirmOpen(false);
        } finally { setEnding(false); }
    }

    // ── Player controls: volume/muted/paused ──
    useEffect(() => {
        const v = videoElRef.current; const a = audioElRef.current;
        if (v) { v.volume = volume; v.muted = muted; }
        if (a) { a.volume = volume; a.muted = muted; }
    }, [volume, muted]);
    useEffect(() => {
        const v = videoElRef.current; const a = audioElRef.current;
        if (paused) { v?.pause(); a?.pause(); }
        else { v?.play().catch(() => {}); a?.play().catch(() => {}); }
    }, [paused]);

    // Fullscreen event
    useEffect(() => {
        const h = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", h);
        return () => document.removeEventListener("fullscreenchange", h);
    }, []);

    async function toggleFullscreen() {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await stageRef.current?.requestFullscreen();
        } catch { /* ruxsat yo'q */ }
    }

    // Auto-hide controls in fullscreen
    function pokeControls() {
        setControlsVisible(true);
        if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
        if (fullscreen || !chatOpen) {
            controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
        }
    }
    useEffect(() => { pokeControls(); }, [fullscreen, chatOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
            if (e.key === " ") { e.preventDefault(); setPaused(p => !p); pokeControls(); }
            else if (e.key === "m" || e.key === "M") { setMuted(m => !m); pokeControls(); }
            else if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
            else if (e.key === "c" || e.key === "C") { setChatOpen(o => !o); }
            else if (e.key === "v" || e.key === "V") { setPipVisible(v => !v); pokeControls(); }
            else if (e.key === "Escape" && !fullscreen) { onClose(); }
            else if (e.key === "ArrowUp") { setVolume(v => Math.min(1, v + 0.05)); pokeControls(); }
            else if (e.key === "ArrowDown") { setVolume(v => Math.max(0, v - 0.05)); pokeControls(); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullscreen]);

    // ── Quality apply — LiveKit simulcast layer (RemoteTrackPublication'da) ──
    useEffect(() => {
        const pub = remoteVideoPubRef.current;
        if (!pub) return;
        const map: Record<QLevel, VideoQuality> = {
            auto: VideoQuality.HIGH, "1080": VideoQuality.HIGH, "720": VideoQuality.HIGH, "480": VideoQuality.MEDIUM, "240": VideoQuality.LOW,
        };
        try { pub.setVideoQuality(map[quality]); } catch { /* ignore */ }
    }, [quality]);

    // ── Keyingi/oldingi jonli efirni yuklash (swipe nav uchun) ──
    useEffect(() => {
        if (stream?.status !== "LIVE") { setNextStreamId(null); setPrevStreamId(null); return; }
        let cancelled = false;
        fetch(`/api/nexus/live?status=live&limit=40`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                const list: { id: string }[] = d.streams ?? [];
                const idx = list.findIndex(s => s.id === streamId);
                if (idx === -1) return;
                setPrevStreamId(idx > 0 ? list[idx - 1].id : null);
                setNextStreamId(idx < list.length - 1 ? list[idx + 1].id : null);
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [streamId, stream?.status]);

    function swipeStartHandler(e: React.TouchEvent) {
        const t = e.touches[0];
        setSwipeStart({ x: t.clientX, y: t.clientY, t: Date.now() });
    }
    function swipeMoveHandler(e: React.TouchEvent) {
        if (!swipeStart) return;
        const t = e.touches[0];
        const dx = t.clientX - swipeStart.x;
        const dy = t.clientY - swipeStart.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            setSwipeHint(dx < 0 ? "left" : "right");
        } else setSwipeHint(null);
    }
    function swipeEndHandler(e: React.TouchEvent) {
        if (!swipeStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeStart.x;
        const dy = t.clientY - swipeStart.y;
        const dt = Date.now() - swipeStart.t;
        setSwipeStart(null); setSwipeHint(null);
        if (dt > 800) return;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // Chap swipe → next, o'ng swipe → prev
        const target = dx < 0 ? nextStreamId : prevStreamId;
        if (target) navToStream(target);
    }
    function navToStream(id: string) {
        // Room-scoped state'ni tozalash — parent onClose+re-open bilan
        // clean qilish o'rniga bu yerda o'zimiz ham qila olamiz.
        // NxLiveRoom streamId prop bo'yicha useEffect'lar avto yangilanadi.
        // Lekin subscribed video track'ni ham qayta boshlash uchun stream'ni reset qilamiz.
        onClose();
        // Kichik delay bilan yangi room ochish uchun window event
        setTimeout(() => window.dispatchEvent(new CustomEvent("nexus:open-live", { detail: { streamId: id } })), 60);
    }

    // ── VOD (recording) — <video> holatidan progress ushlash ──
    useEffect(() => {
        const v = videoElRef.current;
        if (!v || stream?.status !== "ENDED" || !stream?.recordingUrl) return;
        const onTime = () => setVodCur(v.currentTime);
        const onMeta = () => { setVodDur(v.duration || 0); };
        v.addEventListener("timeupdate", onTime);
        v.addEventListener("loadedmetadata", onMeta);
        return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
    }, [stream?.status, stream?.recordingUrl]);
    useEffect(() => {
        const v = videoElRef.current;
        if (v) v.playbackRate = vodSpeed;
    }, [vodSpeed]);

    function seekTo(sec: number) {
        const v = videoElRef.current;
        if (v && stream?.status === "ENDED") { v.currentTime = Math.max(0, Math.min(vodDur, sec)); }
    }
    function fmtT(s: number) {
        if (!isFinite(s)) return "0:00";
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${String(sec).padStart(2, "0")}`;
    }

    async function share() {
        const url = `${location.origin}/nexus/live/${streamId}`;
        try {
            if (navigator.share) await navigator.share({ title: stream?.title || "Jonli efir", url });
            else { await navigator.clipboard.writeText(url); setShareToast(true); setTimeout(() => setShareToast(false), 2000); }
        } catch { /* rad etildi */ }
    }

    const isLive = stream?.status === "LIVE";
    const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row" style={{ background: "rgba(5,8,24,0.98)" }}>

            {/* ── Sahna (video maydoni) ── */}
            <div ref={stageRef}
                onMouseMove={pokeControls}
                onTouchStart={e => { pokeControls(); swipeStartHandler(e); }}
                onTouchMove={swipeMoveHandler}
                onTouchEnd={swipeEndHandler}
                className="flex-1 bg-black flex items-center justify-center min-h-0 relative group/stage select-none">
                {/* Asosiy video (Screen — pip mode, yoki Solo camera) */}
                <video ref={videoElRef}
                    autoPlay playsInline
                    src={stream?.status === "ENDED" && stream?.recordingUrl ? stream.recordingUrl : undefined}
                    onClick={() => { if (stream?.status === "ENDED") setPaused(p => !p); }}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ display: (isLive && hasRemoteVideo) || (stream?.status === "ENDED" && !!stream?.recordingUrl) ? "block" : "none" }} />
                <audio ref={audioElRef} autoPlay />

                {/* PiP kamera — faqat screen + camera bo'lganda, viewer o'zi joylashtiradi */}
                {isLive && hasScreen && hasCamera && pipVisible && (
                    <div
                        onPointerDown={e => {
                            const target = e.currentTarget as HTMLElement;
                            target.setPointerCapture(e.pointerId);
                            setPipDrag({ x: e.clientX, y: e.clientY, corner: pipCorner });
                        }}
                        onPointerMove={e => {
                            if (!pipDrag) return;
                            const dx = e.clientX - pipDrag.x;
                            const dy = e.clientY - pipDrag.y;
                            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
                            // Snap to nearest corner based on final pointer position within stage
                            const stage = stageRef.current;
                            if (!stage) return;
                            const rect = stage.getBoundingClientRect();
                            const relX = e.clientX - rect.left, relY = e.clientY - rect.top;
                            const nx = relX < rect.width / 2 ? "l" : "r";
                            const ny = relY < rect.height / 2 ? "t" : "b";
                            setPipCorner((ny + nx) as PipCorner);
                        }}
                        onPointerUp={() => setPipDrag(null)}
                        onDoubleClick={() => setPipSize(s => s === "sm" ? "md" : s === "md" ? "lg" : "sm")}
                        className={`absolute z-20 rounded-xl overflow-hidden cursor-move transition-all duration-200 animate-in fade-in ${
                            pipCorner === "br" ? "bottom-20 right-4" :
                            pipCorner === "bl" ? "bottom-20 left-4" :
                            pipCorner === "tr" ? "top-20 right-4" :
                            "top-20 left-4"
                        } ${pipSize === "sm" ? "w-32 h-20" : pipSize === "md" ? "w-48 h-28" : "w-64 h-40"}`}
                        style={{
                            border: "2px solid rgba(255,255,255,0.35)",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,206,200,0.25)",
                            background: "#000",
                            touchAction: "none",
                        }}
                        title="Sudrab joylashtiring · 2× bosing — o'lcham"
                    >
                        <video ref={camPipElRef} autoPlay playsInline muted
                            className="w-full h-full object-cover pointer-events-none" />
                        {/* PiP mini controls (hover'da) */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); setPipVisible(false); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md"
                                style={{ background: "rgba(0,0,0,0.75)" }} title="Yashirish (V)">
                                <EyeOff className="w-3 h-3 text-white" />
                            </button>
                        </div>
                        <div className="absolute bottom-1 left-1 opacity-0 group-hover/stage:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.75)" }}>
                            <Move className="w-2.5 h-2.5 text-white/70" />
                            <span className="text-[8px] font-black text-white/85">SUDRAB</span>
                        </div>
                    </div>
                )}

                {/* Batch H2 — Extra guest camera tiles (streamer emas, boshqa co-hostlar) */}
                {isLive && extraCams.size > 0 && (
                    <div className="absolute left-4 bottom-24 z-20 flex gap-2 max-w-[60%] flex-wrap">
                        {[...extraCams.entries()].slice(0, 4).map(([identity]) => (
                            <div key={identity} className="w-32 h-20 rounded-lg overflow-hidden bg-black animate-in fade-in duration-200"
                                style={{ border: "2px solid rgba(139,92,246,0.55)", boxShadow: "0 6px 20px rgba(139,92,246,0.35)" }}>
                                <video ref={el => { extraCamRefs.current.set(identity, el); }}
                                    autoPlay playsInline muted
                                    className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 text-[8px] font-black text-white truncate" style={{ background: "linear-gradient(0deg,rgba(0,0,0,0.85),rgba(0,0,0,0))" }}>
                                    Guest
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PiP yashirilgan bo'lsa — qayta ko'rsatish tugmasi */}
                {isLive && hasScreen && hasCamera && !pipVisible && (
                    <button onClick={() => setPipVisible(true)}
                        className="absolute bottom-20 right-4 z-20 h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,206,200,0.30)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,206,200,0.55)" }}>
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-black text-white">Kamerani ko&apos;rsat</span>
                    </button>
                )}

                {/* Batch E — Keyframes (inline) */}
                <style>{`
                    @keyframes nxFloatUp {
                        0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
                        12% { opacity: 1; transform: translateY(-40px) scale(1.1) rotate(-8deg); }
                        50% { opacity: 1; transform: translateY(-220px) scale(1) rotate(8deg); }
                        100% { opacity: 0; transform: translateY(-460px) scale(1.15) rotate(-4deg); }
                    }
                    @keyframes nxTipSlide {
                        0% { opacity: 0; transform: translateY(-120%); }
                        8% { opacity: 1; transform: translateY(0); }
                        90% { opacity: 1; transform: translateY(0); }
                        100% { opacity: 0; transform: translateY(-120%); }
                    }
                    @keyframes nxConfetti {
                        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
                        100% { opacity: 0; transform: translateY(80px) rotate(720deg); }
                    }
                    @keyframes nxMarquee {
                        0% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                `}</style>

                {/* Batch K — Ticker overlay (pastda scrolling matn) */}
                {isLive && ticker && (
                    <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-25 py-2 overflow-hidden"
                        style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.30) 0%, rgba(236,72,153,0.30) 100%)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(139,92,246,0.35)", borderBottom: "1px solid rgba(236,72,153,0.35)" }}>
                        <div className="whitespace-nowrap text-sm font-black text-white flex items-center gap-4"
                            style={{ animation: "nxMarquee 22s linear infinite", willChange: "transform" }}>
                            <span className="inline-block px-4">✦ {ticker}</span>
                            <span className="inline-block px-4 opacity-70">✦ {ticker}</span>
                            <span className="inline-block px-4 opacity-40">✦ {ticker}</span>
                        </div>
                    </div>
                )}

                {/* Batch G — Poll overlay (yuqori-o'ng, 320px) */}
                {isLive && activePoll && (() => {
                    const votes = pollVotes[activePoll.id] ?? [];
                    const total = votes.reduce((a, b) => a + b, 0);
                    const now = Date.now();
                    const ended = new Date(activePoll.endsAt).getTime() <= now;
                    const remSec = Math.max(0, Math.floor((new Date(activePoll.endsAt).getTime() - now) / 1000));
                    return (
                        <div className="absolute top-16 right-4 z-25 w-[320px] max-w-[calc(100vw-32px)] p-4 rounded-2xl animate-in fade-in slide-in-from-right-2 duration-300"
                            style={{ background: "rgba(5,8,24,0.92)", border: "1px solid rgba(139,92,246,0.55)", boxShadow: "0 12px 40px rgba(139,92,246,0.35)", backdropFilter: "blur(12px)" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-4 h-4" style={{ color: "#EC4899" }} />
                                <span className="text-[10px] font-black uppercase" style={{ color: "#EC4899" }}>{ended ? "Yakunlandi" : "Poll ochiq"}</span>
                                {!ended && <span className="ml-auto text-[11px] font-black text-white/85 tabular-nums">{remSec}s</span>}
                            </div>
                            <p className="text-sm font-black text-white mb-3 leading-snug">{activePoll.question}</p>
                            <div className="space-y-1.5">
                                {activePoll.options.map((opt, i) => {
                                    const count = votes[i] ?? 0;
                                    const pct = total > 0 ? Math.round(count / total * 100) : 0;
                                    const chosen = myVoteIdx === i;
                                    const showResults = myVoteIdx !== null || ended;
                                    return (
                                        <button key={i} onClick={() => voteForOption(i)} disabled={myVoteIdx !== null || ended || pollBusy}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-white relative overflow-hidden transition disabled:cursor-default active:scale-[0.98]"
                                            style={{ background: chosen ? "rgba(236,72,153,0.20)" : "rgba(139,92,246,0.10)", border: `1px solid ${chosen ? "#EC4899" : "rgba(139,92,246,0.30)"}` }}>
                                            {showResults && (
                                                <div className="absolute inset-y-0 left-0 transition-all duration-500"
                                                    style={{ width: `${pct}%`, background: chosen ? "linear-gradient(90deg,rgba(139,92,246,0.35),rgba(236,72,153,0.35))" : "rgba(139,92,246,0.20)" }} />
                                            )}
                                            <span className="relative flex items-center justify-between gap-2">
                                                <span className="flex-1 truncate">{opt}</span>
                                                {showResults && <span className="text-[10px] tabular-nums font-black text-white/85">{pct}% · {count}</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(200,180,230,0.65)" }}>
                                {total} ovoz{myVoteIdx === null && !ended ? " · variantni tanlang" : ""}
                            </p>
                        </div>
                    );
                })()}

                {/* Floating reactions overlay (Batch E) */}
                {isLive && floating.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
                        {floating.map(f => {
                            const Icon = f.icon === "heart" ? Heart : f.icon === "fire" ? Flame : f.icon === "laugh" ? Laugh : f.icon === "thumbs" ? ThumbsUp : f.icon === "party" ? PartyPopper : f.icon === "sparkle" ? Sparkles : Zap;
                            const color = f.icon === "heart" ? "#EF4444" : f.icon === "fire" ? "#F97316" : f.icon === "laugh" ? "#F59E0B" : f.icon === "thumbs" ? "#00CEC8" : f.icon === "party" ? "#8B5CF6" : f.icon === "sparkle" ? "#EC4899" : "#F59E0B";
                            return (
                                <div key={f.key}
                                    className="absolute bottom-24"
                                    style={{
                                        right: `${f.x}%`,
                                        animation: "nxFloatUp 3.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                                        filter: `drop-shadow(0 4px 12px ${color}66)`,
                                    }}>
                                    <Icon className="w-9 h-9" style={{ color, fill: color }} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tip alert banner (Batch E) */}
                {tipAlert && (
                    <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md"
                        style={{ animation: "nxTipSlide 6s ease-in-out forwards" }}>
                        <div className="rounded-2xl overflow-hidden relative"
                            style={{
                                background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)",
                                boxShadow: "0 20px 60px rgba(245,158,11,0.55), 0 0 40px rgba(239,68,68,0.35)",
                            }}>
                            {/* Confetti particles */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="absolute w-1.5 h-3 rounded-sm"
                                    style={{
                                        left: `${(i * 8.5) + 4}%`,
                                        top: "0px",
                                        background: i % 3 === 0 ? "#FFF" : i % 3 === 1 ? "#00CEC8" : "#8B5CF6",
                                        animation: `nxConfetti ${1.6 + (i % 3) * 0.4}s ${(i * 0.1).toFixed(1)}s ease-out infinite`,
                                    }} />
                            ))}
                            <div className="px-4 py-3 flex items-center gap-3 relative">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(10px)" }}>
                                    <Gift className="w-6 h-6 text-white fill-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white/90 flex items-center gap-1">
                                        {tipAlert.author?.name || tipAlert.author?.username || "Foydalanuvchi"}
                                        {tipAlert.author?.verified && <NxVerifiedBadge category={tipAlert.author.verifiedCategory} size={12} />}
                                    </p>
                                    <p className="text-lg font-black text-white leading-tight tracking-tight">
                                        {formatMoney(tipAlert.amount, currency)} sovg&apos;a
                                    </p>
                                    {tipAlert.text && <p className="text-[11px] text-white/95 truncate mt-0.5">{tipAlert.text}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch V — Live captions overlay (viewer, pastda video ustida) */}
                {isLive && captionOn && currentCaption && (
                    <div className="pointer-events-none absolute left-1/2 bottom-32 -translate-x-1/2 z-25 max-w-[90%] px-4 py-2 rounded-lg animate-in fade-in duration-200"
                        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <p className="text-sm md:text-base font-bold text-white text-center leading-snug">{currentCaption}</p>
                    </div>
                )}

                {/* Batch AA — Donation goal progress bar (yuqori-chap, X ostida) */}
                {isLive && stream?.donationGoal && stream.donationGoal > 0 && (
                    <div className="absolute top-16 left-4 z-15 max-w-[240px] p-3 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300"
                        style={{ background: "rgba(8,12,32,0.85)", border: "1px solid rgba(245,158,11,0.45)", boxShadow: "0 8px 24px rgba(245,158,11,0.25)", backdropFilter: "blur(10px)" }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Target className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                            <p className="text-[10px] font-black text-white truncate flex-1">{stream.donationGoalLabel || "Maqsad"}</p>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "rgba(245,158,11,0.15)" }}>
                            <div className="h-full transition-all duration-500 rounded-full"
                                style={{
                                    width: `${Math.min(100, ((stream.totalTips || 0) / stream.donationGoal) * 100)}%`,
                                    background: "linear-gradient(90deg,#F59E0B,#EF4444,#EC4899)",
                                    boxShadow: "0 0 12px rgba(245,158,11,0.65)",
                                }} />
                        </div>
                        <p className="text-[9px] tabular-nums text-center" style={{ color: "rgba(255,220,180,0.85)" }}>
                            {formatMoney(stream.totalTips || 0, currency)} / {formatMoney(stream.donationGoal, currency)}
                            {" · "}
                            <span className="font-black" style={{ color: "#F59E0B" }}>{Math.floor(((stream.totalTips || 0) / stream.donationGoal) * 100)}%</span>
                        </p>
                    </div>
                )}

                {/* Swipe hint arrows */}
                {swipeHint && (
                    <div className={`pointer-events-none absolute inset-y-0 ${swipeHint === "left" ? "right-6" : "left-6"} flex items-center z-20 animate-in fade-in duration-150`}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
                            {swipeHint === "left"
                                ? (nextStreamId ? <ChevronRight className="w-8 h-8 text-white" /> : <X className="w-6 h-6 text-white/50" />)
                                : (prevStreamId ? <ChevronLeft className="w-8 h-8 text-white" /> : <X className="w-6 h-6 text-white/50" />)}
                        </div>
                    </div>
                )}

                {/* Yuqori control bar — X yopish, chat toggle, share */}
                <div className={`absolute top-0 left-0 right-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)" }}>
                    <button onClick={onClose} title="Yopish (Esc)"
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1" />
                    {/* Batch I — Clip tugma (VOD holatida) */}
                    {stream?.status === "ENDED" && stream?.recordingUrl && (
                        <button onClick={() => { setClipStart(Math.floor(vodCur)); setClipEnd(Math.min(vodDur, Math.floor(vodCur) + 30)); setClipComposerOpen(true); }} title="Qirqim yaratish"
                            className="h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                            style={{ background: "rgba(139,92,246,0.30)", backdropFilter: "blur(8px)", border: "1px solid rgba(139,92,246,0.55)" }}>
                            <Scissors className="w-3.5 h-3.5 text-white" />
                            <span className="text-[10px] font-black text-white">Qirqim</span>
                        </button>
                    )}
                    {/* Batch U — TTS toggle (viewer, non-mine) */}
                    {isLive && !stream?.isMine && (
                        <button onClick={toggleTts} title={ttsEnabled ? "Tips o'qilishi yoqilgan" : "Tips'ni ovozli eshiting"}
                            className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                            style={{ background: ttsEnabled ? "rgba(245,158,11,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            <Megaphone className="w-4 h-4 text-white" />
                        </button>
                    )}
                    {/* Batch AO — Stream health indicator (viewer, LIVE) */}
                    {isLive && hasRemoteVideo && !stream?.isMine && (
                        <div title={healthLevel === 3 ? "A'lo" : healthLevel === 2 ? "Yaxshi" : healthLevel === 1 ? "Sekin" : "Uzilgan"}
                            className="h-10 px-2.5 flex items-center gap-1 rounded-full transition"
                            style={{
                                background: "rgba(0,0,0,0.55)",
                                backdropFilter: "blur(8px)",
                                border: `1px solid ${healthLevel === 3 ? "rgba(16,185,129,0.55)" : healthLevel === 2 ? "rgba(59,130,246,0.55)" : healthLevel === 1 ? "rgba(245,158,11,0.55)" : "rgba(239,68,68,0.55)"}`,
                            }}>
                            {healthLevel === 0 ? <WifiOff className="w-3.5 h-3.5 text-red-400" /> : <Wifi className="w-3.5 h-3.5" style={{ color: healthLevel === 3 ? "#10B981" : healthLevel === 2 ? "#3B82F6" : "#F59E0B" }} />}
                            <div className="flex items-end gap-0.5">
                                {[1, 2, 3].map(bar => (
                                    <div key={bar} className="w-0.5 rounded-full transition-all" style={{
                                        height: `${bar * 3 + 3}px`,
                                        background: healthLevel >= bar ? (healthLevel === 3 ? "#10B981" : healthLevel === 2 ? "#3B82F6" : "#F59E0B") : "rgba(255,255,255,0.15)",
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Batch AM — Panels button (bio/socials/schedule) */}
                    {panels.length > 0 && (
                        <button onClick={() => setPanelsOpen(o => !o)} title="Streamer haqida"
                            className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                            style={{ background: panelsOpen ? "rgba(139,92,246,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            <LayoutList className="w-4 h-4 text-white" />
                        </button>
                    )}
                    {/* Batch V — Captions display toggle (viewer) */}
                    {isLive && (
                        <button onClick={() => setCaptionOn(o => !o)} title={captionOn ? "Subtitrlarni yashirish" : "Subtitrlarni ko'rsatish"}
                            className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                            style={{ background: captionOn ? "rgba(0,206,200,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            <Captions className="w-4 h-4 text-white" />
                        </button>
                    )}
                    {/* Batch X — Translate toggle (viewer chat) */}
                    {(isLive || stream?.status === "ENDED") && (
                        <div className="relative">
                            <button onClick={toggleTranslate} title={translateOn ? `Tarjima yoqilgan (${translateLang.toUpperCase()})` : "Chat'ni tarjima qilish"}
                                className="h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                                style={{ background: translateOn ? "rgba(59,130,246,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <Languages className="w-4 h-4 text-white" />
                                {translateOn && <span className="text-[10px] font-black text-white">{translateLang.toUpperCase()}</span>}
                            </button>
                            {translateOn && (
                                <div className="absolute top-full right-0 mt-2 rounded-xl p-1 flex gap-0.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(59,130,246,0.35)" }}>
                                    {(["uz", "ru", "en", "tr", "ar"] as const).map(l => (
                                        <button key={l} onClick={() => changeTranslateLang(l)}
                                            className="px-2 py-1 rounded-md text-[10px] font-black transition"
                                            style={translateLang === l
                                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                                : { color: "rgba(180,190,220,0.85)" }}>
                                            {l.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Quality selector — faqat video oqim bor bo'lganda */}
                    {((isLive && hasRemoteVideo) || (stream?.status === "ENDED" && stream?.recordingUrl)) && (
                        <div className="relative">
                            <button onClick={() => { setQualityOpen(o => !o); setSpeedMenuOpen(false); }} title="Sifat"
                                className="h-10 px-3 flex items-center gap-1.5 rounded-full active:scale-95 transition"
                                style={{ background: qualityOpen ? "rgba(0,206,200,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <Settings className="w-3.5 h-3.5 text-white" />
                                <span className="text-[10px] font-black text-white">
                                    {isLive
                                        ? (quality === "auto" ? "Avto" : quality === "1080" ? "1080p" : quality === "720" ? "720p" : quality === "480" ? "480p" : "240p")
                                        : (availableRes?.h ? `${availableRes.h}p` : "Original")}
                                </span>
                            </button>
                            {qualityOpen && (
                                <div className="absolute top-full right-0 mt-2 min-w-[220px] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                                    style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(0,206,200,0.30)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                                    {stream?.status === "ENDED" ? (
                                        <>
                                            <div className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase" style={{ color: "rgba(0,206,200,0.85)" }}>Tezlik</div>
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(sp => (
                                                <button key={sp} onClick={() => { setVodSpeed(sp); setQualityOpen(false); }}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-white transition"
                                                    style={{ background: vodSpeed === sp ? "rgba(0,206,200,0.12)" : "transparent" }}>
                                                    <span>{sp === 1 ? "Oddiy" : `${sp}x`}</span>
                                                    {vodSpeed === sp && <Check className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </button>
                                            ))}
                                            <div className="px-4 py-2 text-[9px] text-center" style={{ color: "rgba(150,170,210,0.55)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                Yozuv sifati — {availableRes?.h ? `${availableRes.h}p` : "asl"}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase" style={{ color: "rgba(0,206,200,0.85)" }}>Video sifati</div>
                                            {([
                                                { v: "auto", l: "Avto", hint: "tarmoqqa moslashadi" },
                                                { v: "1080", l: "1080p", hint: "Full HD" },
                                                { v: "720", l: "720p", hint: "HD" },
                                                { v: "480", l: "480p", hint: "O'rtacha" },
                                                { v: "240", l: "240p", hint: "Sekin tarmoq" },
                                            ] as { v: QLevel; l: string; hint: string }[]).map(o => (
                                                <button key={o.v} onClick={() => { setQuality(o.v); setQualityOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-white transition"
                                                    style={{ background: quality === o.v ? "rgba(0,206,200,0.12)" : "transparent" }}>
                                                    <span className="w-14">{o.l}</span>
                                                    <span className="flex-1 text-left text-[10px]" style={{ color: "rgba(150,170,210,0.7)" }}>{o.hint}</span>
                                                    {quality === o.v && <Check className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={share} title="Ulashish"
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <Share2 className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => setChatOpen(o => !o)} title={chatOpen ? "Chatni yashirish (C)" : "Chatni ochish (C)"}
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition hidden md:flex"
                        style={{ background: chatOpen ? "rgba(0,206,200,0.35)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        {chatOpen ? <MessageSquare className="w-4 h-4 text-white" /> : <MessageSquareOff className="w-4 h-4 text-white" />}
                    </button>
                    <button onClick={toggleFullscreen} title={fullscreen ? "Chiqish (F)" : "To'liq ekran (F)"}
                        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        {fullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                    </button>
                </div>

                {/* Pastki control bar — pause/volume/progress */}
                {((isLive && hasRemoteVideo) || (stream?.status === "ENDED" && stream?.recordingUrl)) && (
                    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)" }}>
                        {/* Progress bar — faqat VOD (Batch S: chapter markers) */}
                        {stream?.status === "ENDED" && vodDur > 0 && (
                            <div className="px-4 pt-3 pb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-white/85 tabular-nums w-10 text-right">{fmtT(vodCur)}</span>
                                    <div className="flex-1 relative">
                                        <input type="range" min={0} max={vodDur} step={0.1} value={vodCur}
                                            onChange={e => seekTo(parseFloat(e.target.value))}
                                            className="w-full accent-[#F97316] h-1 relative z-10"
                                            style={{ height: 4 }} />
                                        {/* Chapter markers */}
                                        {chapters.map(c => c.sec > 0 && c.sec < vodDur && (
                                            <button key={c.id} onClick={() => seekTo(c.sec)}
                                                onMouseEnter={() => setHoverChapter(c)}
                                                onMouseLeave={() => setHoverChapter(null)}
                                                title={`${fmtT(c.sec)} — ${c.label}`}
                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-3 rounded-sm hover:scale-125 transition-transform z-20"
                                                style={{ left: `${(c.sec / vodDur) * 100}%`, background: "#00CEC8", boxShadow: "0 0 6px rgba(0,206,200,0.7)" }} />
                                        ))}
                                        {/* Hover tooltip */}
                                        {hoverChapter && (
                                            <div className="absolute -top-8 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap z-30 pointer-events-none"
                                                style={{ left: `${(hoverChapter.sec / vodDur) * 100}%`, background: "rgba(0,0,0,0.85)", border: "1px solid rgba(0,206,200,0.35)" }}>
                                                {hoverChapter.label}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black text-white/85 tabular-nums w-10">{fmtT(vodDur)}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
                            <button onClick={() => setPaused(p => !p)} title={paused ? "Davom (Space)" : "Pauza (Space)"}
                                className="w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition"
                                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                {paused ? <Play className="w-5 h-5 text-white fill-white" /> : <Pause className="w-5 h-5 text-white fill-white" />}
                            </button>
                            <button onClick={() => setMuted(m => !m)} title={muted ? "Ovozni yoqish (M)" : "Ovozni o'chirish (M)"}
                                className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
                                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <VolIcon className="w-4 h-4 text-white" />
                            </button>
                            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                                onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                                className="w-24 md:w-32 accent-[#F97316]" />
                            {isLive && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                                </span>
                            )}
                            {stream?.status === "ENDED" && vodSpeed !== 1 && (
                                <span className="px-2 py-1 rounded-md text-[10px] font-black text-white" style={{ background: "rgba(0,206,200,0.30)" }}>
                                    {vodSpeed}x
                                </span>
                            )}
                            <div className="flex-1" />
                            <span className="hidden md:inline text-[10px] font-black px-2 py-1 rounded-md" style={{ color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.4)" }}>
                                Space · M · F · C{hasScreen && hasCamera ? " · V" : ""}
                            </span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-white/60" />
                ) : !stream ? (
                    <p className="text-sm text-white/60">Efir topilmadi</p>
                ) : hasRemoteVideo && isLive ? null : (
                    <div className="flex flex-col items-center gap-4 px-6 text-center">
                        <div className="relative">
                            <img src={avatarOf(stream.author)} alt="" className="w-24 h-24 rounded-full object-cover bg-white"
                                style={{ border: `3px solid ${isLive ? "#EF4444" : "rgba(100,110,140,0.5)"}` }} />
                            {isLive && (
                                <>
                                    <span className="absolute inset-0 rounded-full animate-ping" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                                    </span>
                                </>
                            )}
                        </div>
                        {stream.status === "UPCOMING" ? (
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-sm font-black text-white flex items-center gap-1.5"><CalendarClock className="w-4 h-4" style={{ color: "#10B981" }} /> Efir hali boshlanmagan</p>
                                {stream.scheduledAt && <p className="text-xs" style={{ color: "rgba(150,170,210,0.75)" }}>Rejada: {new Date(stream.scheduledAt).toLocaleString("uz-UZ")}</p>}
                            </div>
                        ) : stream.status === "ENDED" ? (
                            stream.recordingUrl ? (
                                analytics && stream.isMine ? (
                                    <div className="absolute top-16 left-4 max-w-sm z-15 p-4 rounded-2xl animate-in fade-in slide-in-from-left-2 duration-300"
                                        style={{ background: "rgba(8,12,32,0.92)", border: "1px solid rgba(0,206,200,0.35)", boxShadow: "0 12px 40px rgba(0,206,200,0.25)", backdropFilter: "blur(10px)" }}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <BarChart3 className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            <span className="text-sm font-black text-white">Efir statistikasi</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {[
                                                { l: "Eng yuqori", v: analytics.totals.peakViewers, c: "#EF4444" },
                                                { l: "Unikal", v: analytics.totals.uniqueViewers, c: "#00CEC8" },
                                                { l: "O'rt tomosha", v: fmtSec(analytics.totals.avgWatchSec), c: "#8B5CF6" },
                                                { l: "Xabar", v: analytics.totals.chatMessages, c: "#F97316" },
                                                { l: "Reaction", v: analytics.totals.reactions, c: "#EC4899" },
                                                { l: "Poll", v: analytics.totals.polls, c: "#10B981" },
                                            ].map(s => (
                                                <div key={s.l} className="p-2 rounded-lg" style={{ background: "rgba(5,8,24,0.65)", border: `1px solid ${s.c}30` }}>
                                                    <p className="text-sm font-black text-white tabular-nums">{s.v}</p>
                                                    <p className="text-[9px] mt-0.5" style={{ color: "rgba(150,170,210,0.65)" }}>{s.l}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {analytics.totals.totalTips > 0 && (
                                            <div className="p-3 rounded-lg mb-3" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.12))", border: "1px solid rgba(245,158,11,0.35)" }}>
                                                <div className="flex items-center gap-2">
                                                    <Gift className="w-4 h-4" style={{ color: "#F59E0B" }} />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-white">{formatMoney(analytics.totals.totalTips, currency)}</p>
                                                        <p className="text-[9px]" style={{ color: "rgba(245,225,190,0.75)" }}>{analytics.totals.tipCount} ta sovg&apos;a</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {analytics.topChatters.length > 0 && (
                                            <div className="mb-2">
                                                <p className="text-[10px] font-black uppercase mb-1.5" style={{ color: "rgba(0,206,200,0.85)" }}>Top chatterlar</p>
                                                <div className="space-y-1">
                                                    {analytics.topChatters.slice(0, 3).map((c, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "rgba(0,206,200,0.06)" }}>
                                                            <span className="text-[9px] font-black w-4" style={{ color: "#00CEC8" }}>{i + 1}</span>
                                                            <img src={avatarOf(c.author)} alt="" className="w-5 h-5 rounded-full object-cover bg-white" />
                                                            <span className="flex-1 text-[11px] font-bold text-white truncate">{c.author?.name || c.author?.username || "..."}</span>
                                                            <span className="text-[10px] tabular-nums font-black text-white/85">{c.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {analytics.topTippers.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase mb-1.5" style={{ color: "rgba(245,158,11,0.85)" }}>Top tipperlar</p>
                                                <div className="space-y-1">
                                                    {analytics.topTippers.slice(0, 3).map((t, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "rgba(245,158,11,0.06)" }}>
                                                            <span className="text-[9px] font-black w-4" style={{ color: "#F59E0B" }}>{i + 1}</span>
                                                            <img src={avatarOf(t.author)} alt="" className="w-5 h-5 rounded-full object-cover bg-white" />
                                                            <span className="flex-1 text-[11px] font-bold text-white truncate">{t.author?.name || t.author?.username || "..."}</span>
                                                            <span className="text-[10px] tabular-nums font-black text-white/85">{formatMoney(t.amount, currency)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm font-black text-white">Efir tugadi</p>
                                    <p className="text-xs flex items-center gap-2" style={{ color: "rgba(150,170,210,0.75)" }}>
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtViewers(stream.peakViewers)} eng yuqori</span>
                                        {stream.startedAt && stream.endedAt && (
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.max(1, Math.round((new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()) / 60000))} daqiqa</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] mt-1" style={{ color: "rgba(150,170,210,0.55)" }}>Yozuv mavjud emas</p>
                                </div>
                            )
                        ) : (
                            <p className="text-xs max-w-xs leading-relaxed" style={{ color: "rgba(150,170,210,0.7)" }}>
                                Video oqimini kutmoqda...
                            </p>
                        )}
                        {stream.isMine && isLive && (
                            <div className="flex gap-2">
                                <button onClick={() => setRaidComposerOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                    <Rocket className="w-3.5 h-3.5" />Raid
                                </button>
                                <button onClick={() => setEndConfirmOpen(true)} disabled={ending}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-60"
                                    style={{ background: "rgba(239,68,68,0.85)" }}>
                                    {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Tugatish
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Ma'lumot + chat ── */}
            {chatOpen && (
            <div className="md:w-96 flex flex-col flex-shrink-0 min-h-0" style={{ background: "rgba(8,12,32,0.98)", borderLeft: "1px solid rgba(239,68,68,0.15)", maxHeight: "100vh", height: "55vh" }}>
                <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(239,68,68,0.10)" }}>
                    <h3 className="text-sm font-black text-white leading-snug mb-1.5 pr-8">{stream?.title ? renderTitleTags(stream.title) : "..."}</h3>
                    <div className="flex items-center gap-2.5">
                        <img src={avatarOf(stream?.author ?? null)} alt="" className="w-7 h-7 rounded-full object-cover bg-white" style={{ border: "1px solid rgba(239,68,68,0.3)" }} />
                        <span className="text-xs font-bold text-white truncate inline-flex items-center gap-1">
                            {stream?.author?.name || stream?.author?.username || "Streamer"}
                            {stream?.author?.verified && <NxVerifiedBadge category={stream.author.verifiedCategory} size={12} />}
                        </span>
                        {isLive && (
                            <span className="ml-auto flex items-center gap-1 text-[11px] font-black" style={{ color: "#F97316" }}>
                                <Eye className="w-3.5 h-3.5" />{fmtViewers(viewers)}
                            </span>
                        )}
                        {isLive && guests.length > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                                <Users className="w-3 h-3" />+{guests.length}
                            </span>
                        )}
                        {stream?.category && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.12)", color: "rgba(240,160,140,0.9)" }}>#{stream.category}</span>}
                    </div>
                    {/* Batch G/K/M/S — Streamer controls (o'zi efirida) */}
                    {stream?.isMine && isLive && (
                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                            <button onClick={() => setPollComposerOpen(true)}
                                className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] font-black transition active:scale-95"
                                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", color: "#C4B5FD" }}>
                                <BarChart3 className="w-3 h-3" />Poll
                            </button>
                            <button onClick={() => { setTickerDraft(ticker || ""); setTickerEditOpen(true); }}
                                className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] font-black transition active:scale-95"
                                style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.35)", color: "#F9A8D4" }}>
                                <Zap className="w-3 h-3" />Ticker
                            </button>
                            <button onClick={() => setChapterEditOpen(true)}
                                className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] font-black transition active:scale-95"
                                style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)", color: "#67E8F9" }}>
                                <Plus className="w-3 h-3" />Bo&apos;lim
                            </button>
                            <button onClick={() => setModPanelOpen(true)}
                                className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] font-black transition active:scale-95"
                                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5" }}>
                                <Settings className="w-3 h-3" />Mod
                            </button>
                        </div>
                    )}
                    {/* Batch E — Follow button (o'zim emas + auth mavjud) */}
                    {stream && !stream.isMine && isFollowing !== null && meUsername !== stream.author?.username && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button onClick={toggleFollow} disabled={followBusy}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition active:scale-95 disabled:opacity-60"
                                style={isFollowing
                                    ? { background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }
                                    : { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff", boxShadow: "0 4px 16px rgba(239,68,68,0.30)" }}>
                                {isFollowing ? <><UserCheck className="w-3.5 h-3.5" />Kuzatilyapti</> : <><UserPlus className="w-3.5 h-3.5" />Kuzatish</>}
                            </button>
                            {/* Batch AJ — Sub tugma */}
                            <button onClick={() => setSubModalOpen(true)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition active:scale-95"
                                style={mySub
                                    ? { background: "linear-gradient(135deg,#F59E0B,#EC4899)", color: "#fff", boxShadow: "0 4px 16px rgba(245,158,11,0.30)" }
                                    : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", color: "#F59E0B" }}>
                                <Crown className="w-3.5 h-3.5" />{mySub ? mySub.tier : "Obuna"}
                            </button>
                        </div>
                    )}
                    {/* Sub count chip (streamer + boshqalar) */}
                    {subCount > 0 && (
                        <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(245,158,11,0.75)" }}>
                            <Crown className="w-3 h-3 inline mr-1" />{subCount} obunachi
                        </p>
                    )}
                </div>

                {/* Chat */}
                {/* Batch BU — Chat rules banner (dismissible per session) */}
                {chatRules && !rulesDismissed && (
                    <div className="px-3 py-2 flex-shrink-0 flex items-start gap-2" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.10))", borderBottom: "1px solid rgba(139,92,246,0.30)" }}>
                        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#C4B5FD" }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase mb-0.5" style={{ color: "rgba(196,181,253,0.75)" }}>Chat qoidalari</p>
                            <p className="text-[11px] font-bold whitespace-pre-wrap" style={{ color: "rgba(220,200,240,0.95)" }}>{chatRules}</p>
                        </div>
                        <button onClick={() => setRulesDismissed(true)} title="Yopish"
                            className="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0"
                            style={{ background: "rgba(139,92,246,0.15)" }}>
                            <X className="w-2.5 h-2.5" style={{ color: "#C4B5FD" }} />
                        </button>
                    </div>
                )}
                {/* Batch BI — Pinned msg banner (sticky above chat) */}
                {pinnedMsg && (
                    <div className="px-3 py-2 flex-shrink-0 flex items-start gap-2" style={{ background: "linear-gradient(135deg, rgba(0,206,200,0.12), rgba(43,62,232,0.12))", borderBottom: "1px solid rgba(0,206,200,0.30)" }}>
                        <Pin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#00CEC8" }} />
                        <p className="flex-1 text-[11px] font-bold min-w-0" style={{ color: "rgba(200,240,240,0.95)" }}>{pinnedMsg}</p>
                        {stream?.isMine && (
                            <button onClick={unpinMessage} title="Unpin"
                                className="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ background: "rgba(0,206,200,0.15)" }}>
                                <X className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0" style={{ scrollbarWidth: "none" }}>
                    {stream?.status === "UPCOMING" ? (
                        <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Chat efir boshlanganda ochiladi</p>
                    ) : displayedMsgs.length === 0 ? (
                        <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>
                            {stream?.status === "ENDED" && chatReplay ? "Playback bu vaqtida chat bo'sh edi" : "Birinchi xabarni yozing"}
                        </p>
                    ) : displayedMsgs.map(m => (
                        m.text.startsWith("__nx_system:") ? (
                            <div key={m.id} className="my-1.5 px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)" }}>
                                <Info className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <span className="text-[11px] font-bold" style={{ color: "rgba(160,220,215,0.9)" }}>{m.text.slice("__nx_system:".length)}</span>
                            </div>
                        ) : (m.tipAmount ?? 0) > 0 ? (
                            <div key={m.id} className="my-1.5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.45)", boxShadow: "0 2px 12px rgba(245,158,11,0.2)" }}>
                                <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-white">
                                        <Gift className="w-3 h-3" />{m.author?.name || m.author?.username || "Foydalanuvchi"}
                                        {m.author?.verified && <NxVerifiedBadge category={(m.author as unknown as { verifiedCategory?: string | null })?.verifiedCategory} size={12} />}
                                    </span>
                                    <span className="text-[11px] font-black text-white">{formatMoney(m.tipAmount ?? 0, currency)}</span>
                                </div>
                                {m.text && <p className="px-2.5 py-1.5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.10)", color: "rgba(245,225,190,0.95)" }}>{m.text}</p>}
                            </div>
                        ) : (
                            <div key={m.id} className="flex gap-2 py-1.5 group/msg relative">
                                <img src={avatarOf(m.author)} alt="" className="w-6 h-6 rounded-lg object-cover bg-white flex-shrink-0" />
                                <div className="text-xs leading-relaxed min-w-0 flex-1">
                                    <p>
                                        <span className="font-black mr-1.5 inline-flex items-center gap-0.5" style={{ color: "rgba(240,160,140,0.95)" }}>
                                            {m.subTier && (
                                                <Crown className="w-3 h-3 mr-0.5" style={{
                                                    color: m.subTier === "PLATINUM" ? "#8B5CF6" : m.subTier === "GOLD" ? "#F59E0B" : "#F59E0B",
                                                    fill: m.subTier === "PLATINUM" ? "#8B5CF6" : m.subTier === "GOLD" ? "#F59E0B" : "transparent",
                                                }} />
                                            )}
                                            {m.author?.name || m.author?.username || "Foydalanuvchi"}
                                            {m.author?.verified && <NxVerifiedBadge category={(m.author as unknown as { verifiedCategory?: string | null })?.verifiedCategory} size={12} />}
                                        </span>
                                        <span style={{ color: "rgba(210,220,245,0.9)" }}>{renderChatText(m.text)}</span>
                                    </p>
                                    {/* Batch X — Tarjima */}
                                    {translateOn && translations[m.id] && (
                                        <p className="mt-0.5 flex items-start gap-1 text-[11px] italic" style={{ color: "rgba(147,197,253,0.85)" }}>
                                            <Languages className="w-2.5 h-2.5 flex-shrink-0 mt-1" style={{ color: "rgba(59,130,246,0.7)" }} />
                                            <span>{translations[m.id]}</span>
                                        </p>
                                    )}
                                </div>
                                {/* Batch F — Delete menu (streamer, xabar egasi) */}
                                {(stream?.isMine || m.author?.username === meUsername) && (
                                    <button onClick={() => setMsgMenuId(o => o === m.id ? null : m.id)}
                                        className="opacity-0 group-hover/msg:opacity-100 w-6 h-6 flex items-center justify-center rounded-md transition"
                                        style={{ background: "rgba(255,255,255,0.05)" }}>
                                        <MoreVertical className="w-3 h-3 text-white/60" />
                                    </button>
                                )}
                                {msgMenuId === m.id && (
                                    <div className="absolute right-0 top-6 z-10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[140px]"
                                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                                        {stream?.isMine && (
                                            <button onClick={() => pinMessage(m.id)}
                                                className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-white w-full text-left hover:bg-cyan-500/20 transition">
                                                <Pin className="w-3 h-3" style={{ color: "#00CEC8" }} />Pin qilish
                                            </button>
                                        )}
                                        <button onClick={() => deleteMessage(m.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-white w-full text-left hover:bg-red-500/20 transition border-t border-white/5">
                                            <Trash2 className="w-3 h-3 text-red-400" />O&apos;chirish
                                        </button>
                                        {stream?.isMine && m.profileId && m.profileId !== meUsername && (
                                            <button onClick={() => banUser(m.profileId!)}
                                                className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-white w-full text-left hover:bg-red-500/20 transition border-t border-white/5">
                                                <UserPlus className="w-3 h-3 text-red-400 rotate-45" />Ban qilish
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Yozish */}
                {stream && stream.status !== "ENDED" && stream.status !== "UPCOMING" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(239,68,68,0.10)" }}>
                        {/* Super Chat summa tanlovi */}
                        {scOpen && !stream.isMine && (
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                <span className="text-[10px] font-black inline-flex items-center gap-1 mr-1" style={{ color: "#F59E0B" }}><Gift className="w-3 h-3" />Super Chat:</span>
                                {scPresets(currency).map(p => (
                                    <button key={p} onClick={() => setScAmount(scAmount === p ? 0 : p)}
                                        className="px-2 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                                        style={scAmount === p
                                            ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff" }
                                            : { background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.3)", color: "rgba(245,200,120,0.95)" }}>
                                        {formatMoney(p, currency)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Batch E — Reactions picker (chat input tepasida) */}
                        {isLive && reactionPickerOpen && (
                            <div className="flex items-center gap-1.5 mb-2 p-2 rounded-xl animate-in fade-in slide-in-from-bottom-1 duration-200" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)" }}>
                                {([
                                    { i: "heart" as const, I: Heart, c: "#EF4444" },
                                    { i: "fire" as const, I: Flame, c: "#F97316" },
                                    { i: "laugh" as const, I: Laugh, c: "#F59E0B" },
                                    { i: "thumbs" as const, I: ThumbsUp, c: "#00CEC8" },
                                    { i: "party" as const, I: PartyPopper, c: "#8B5CF6" },
                                    { i: "sparkle" as const, I: Sparkles, c: "#EC4899" },
                                    { i: "wow" as const, I: Zap, c: "#F59E0B" },
                                ]).map(r => (
                                    <button key={r.i} onClick={() => sendReaction(r.i)} disabled={reactionBusy}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 transition-transform disabled:opacity-40 hover:scale-110"
                                        style={{ background: `${r.c}15`, border: `1px solid ${r.c}45` }}>
                                        <r.I className="w-4 h-4" style={{ color: r.c, fill: r.c }} />
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Batch AI — Emote picker */}
                        {emotePickerOpen && emotes.length > 0 && (
                            <div className="mb-2 p-2 rounded-xl flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200 max-h-[120px] overflow-y-auto"
                                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
                                {emotes.map(em => (
                                    <button key={em.id} onClick={() => { setInput(prev => prev + `:${em.name}:`); setEmotePickerOpen(false); }}
                                        title={`:${em.name}:`}
                                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:scale-110 active:scale-95 transition"
                                        style={{ background: "rgba(245,158,11,0.10)" }}>
                                        <img src={em.imageUrl} alt={em.name} className="w-7 h-7 object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {chatError && <p className="text-[11px] font-bold mb-2" style={{ color: "#EF4444" }}>{chatError}</p>}
                        {/* Batch FF + CR — Command hint (/ or !) */}
                        {(input.startsWith("/") || input.startsWith("!")) && input.length >= 1 && (
                            <div className="mb-2 p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 flex-wrap"
                                style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.20)", color: "rgba(160,220,215,0.85)" }}>
                                <Terminal className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                {input.startsWith("!") ? (
                                    <span>{customCmds.length > 0 ? customCmds.slice(0, 5).map(c => `!${c.name}`).join(" · ") : "Streamer'da custom buyruq yo'q"}</span>
                                ) : (
                                    <span>/me · /roll [N] · /flip · /8ball [savol] · /shrug</span>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            {!stream.isMine && (
                                <button onClick={() => { setScOpen(o => !o); if (scOpen) setScAmount(0); }} title="Super Chat"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95 transition"
                                    style={scOpen
                                        ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)" }
                                        : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                                    <Gift className="w-4 h-4" style={{ color: scOpen ? "#fff" : "#F59E0B" }} />
                                </button>
                            )}
                            {/* Batch E — Reactions toggle */}
                            {isLive && (
                                <button onClick={() => setReactionPickerOpen(o => !o)} title="Reaksiya"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95 transition"
                                    style={reactionPickerOpen
                                        ? { background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }
                                        : { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.30)" }}>
                                    <Smile className="w-4 h-4" style={{ color: reactionPickerOpen ? "#fff" : "#8B5CF6" }} />
                                </button>
                            )}
                            {/* Batch AI — Emote picker */}
                            {emotes.length > 0 && (
                                <button onClick={() => setEmotePickerOpen(o => !o)} title="Emote"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95 transition"
                                    style={emotePickerOpen
                                        ? { background: "linear-gradient(135deg,#F59E0B,#F97316)" }
                                        : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)" }}>
                                    <span className="text-sm font-black" style={{ color: emotePickerOpen ? "#fff" : "#F59E0B" }}>:D</span>
                                </button>
                            )}
                            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                                placeholder={scAmount > 0 ? `${formatMoney(scAmount, currency)} bilan xabar...` : "Xabar yozing..."} className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", caretColor: "#F97316" }} />
                            <button onClick={send} disabled={busy || (!input.trim() && scAmount === 0)}
                                className="px-3 h-9 flex items-center justify-center gap-1 rounded-xl text-white text-xs font-black disabled:opacity-40"
                                style={{ background: scAmount > 0 ? "linear-gradient(135deg,#F59E0B,#EF4444)" : "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : scAmount > 0 ? <>{formatMoney(scAmount, currency)}</> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                )}
                {stream?.status === "ENDED" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(239,68,68,0.10)" }}>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: "rgba(150,150,180,0.7)" }}>
                                <Radio className="w-3.5 h-3.5" /> Efir yakunlangan
                            </p>
                            {stream?.recordingUrl && (
                                <button onClick={() => setChatReplay(o => !o)}
                                    title="Chat playback bilan sinxron"
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black transition"
                                    style={chatReplay
                                        ? { background: "rgba(0,206,200,0.20)", border: "1px solid rgba(0,206,200,0.40)", color: "#00CEC8" }
                                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(200,200,220,0.75)" }}>
                                    <MessageCircle className="w-3 h-3" />{chatReplay ? "Replay ON" : "Barcha chat"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Efirni tugatish tasdiqlash */}
            <NxConfirm open={endConfirmOpen} title="Efirni tugatishmi?"
                message="Efir tugatilgach yozuv Nexus platformasida qoladi, ammo qayta boshlash mumkin emas."
                confirmText="Tugatish" tone="danger" busy={ending}
                onCancel={() => !ending && setEndConfirmOpen(false)}
                onConfirm={endStream} />

            {/* Batch G — Poll composer modal (streamer) */}
            {pollComposerOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setPollComposerOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(139,92,246,0.45)", boxShadow: "0 24px 80px rgba(139,92,246,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5" style={{ color: "#EC4899" }} />
                            <h3 className="text-base font-black text-white">Yangi poll</h3>
                            <button onClick={() => setPollComposerOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        {/* Batch AK — Templates */}
                        {pollTemplates.length > 0 && (
                            <div className="mb-3">
                                <button onClick={() => setTemplatesOpen(o => !o)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-black transition"
                                    style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)", color: "#C4B5FD" }}>
                                    <span>Shablonlar · {pollTemplates.length}</span>
                                    <span>{templatesOpen ? "▲" : "▼"}</span>
                                </button>
                                {templatesOpen && (
                                    <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                                        {pollTemplates.map(t => (
                                            <div key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg group" style={{ background: "rgba(139,92,246,0.06)" }}>
                                                <button onClick={() => loadTemplate(t)} className="flex-1 text-left min-w-0">
                                                    <p className="text-[11px] font-bold text-white truncate">{t.question}</p>
                                                    <p className="text-[9px]" style={{ color: "rgba(200,180,230,0.65)" }}>{t.options.length} variant · {t.durationSec}s · {t.usedCount}× ishlatilgan</p>
                                                </button>
                                                <button onClick={() => deleteTemplate(t.id)} className="w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition"
                                                    style={{ background: "rgba(239,68,68,0.20)" }}>
                                                    <X className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <input value={pollQ} onChange={e => setPollQ(e.target.value.slice(0, 200))} placeholder="Savolingiz..."
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none mb-3"
                            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)", caretColor: "#EC4899" }} />
                        <p className="text-[10px] font-bold mb-1.5 px-1" style={{ color: "rgba(200,180,230,0.75)" }}>Variantlar (2-4)</p>
                        <div className="space-y-2 mb-3">
                            {pollOpts.map((o, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={o} onChange={e => { const n = [...pollOpts]; n[i] = e.target.value.slice(0, 80); setPollOpts(n); }}
                                        placeholder={`Variant ${i + 1}`}
                                        className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none"
                                        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }} />
                                    {pollOpts.length > 2 && (
                                        <button onClick={() => setPollOpts(pollOpts.filter((_, j) => j !== i))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg"
                                            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                            <X className="w-3 h-3 text-red-400" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pollOpts.length < 4 && (
                                <button onClick={() => setPollOpts([...pollOpts, ""])}
                                    className="w-full flex items-center gap-1.5 justify-center py-2 rounded-lg text-[10px] font-black transition active:scale-95"
                                    style={{ background: "rgba(139,92,246,0.06)", border: "1px dashed rgba(139,92,246,0.30)", color: "rgba(200,180,230,0.85)" }}>
                                    <Plus className="w-3 h-3" />Variant qo&apos;shish
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] font-bold mb-1.5 px-1" style={{ color: "rgba(200,180,230,0.75)" }}>Muddat</p>
                        <div className="grid grid-cols-4 gap-1.5 mb-4">
                            {[30, 60, 120, 300].map(s => (
                                <button key={s} onClick={() => setPollDur(s)}
                                    className="py-1.5 rounded-lg text-[10px] font-black transition active:scale-95"
                                    style={pollDur === s
                                        ? { background: "linear-gradient(135deg,#8B5CF6,#EC4899)", color: "#fff" }
                                        : { background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(200,180,230,0.85)" }}>
                                    {s < 60 ? `${s}s` : `${s / 60} daq`}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveCurrentAsTemplate} disabled={!pollQ.trim() || pollOpts.filter(o => o.trim()).length < 2 || pollTemplates.length >= 20}
                                title="Shablon sifatida saqlash"
                                className="w-11 h-11 flex items-center justify-center rounded-xl disabled:opacity-40"
                                style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.35)" }}>
                                <Save className="w-4 h-4" style={{ color: "#C4B5FD" }} />
                            </button>
                            <button onClick={createPoll} disabled={pollBusy || !pollQ.trim() || pollOpts.filter(o => o.trim()).length < 2}
                                className="flex-1 h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
                                {pollBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BarChart3 className="w-4 h-4" />Poll boshlash</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Batch K — Ticker composer */}
            {tickerEditOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setTickerEditOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(236,72,153,0.45)", boxShadow: "0 24px 80px rgba(236,72,153,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5" style={{ color: "#EC4899" }} />
                            <h3 className="text-base font-black text-white">Ticker (scroll matn)</h3>
                            <button onClick={() => setTickerEditOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <textarea value={tickerDraft} onChange={e => setTickerDraft(e.target.value.slice(0, 200))} rows={2}
                            placeholder="Efirdagi barchaga ko'ringan matn... (bo'sh — o'chirish)"
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none mb-2"
                            style={{ background: "rgba(236,72,153,0.10)", border: "1px solid rgba(236,72,153,0.30)", caretColor: "#EC4899" }} />
                        <p className="text-[10px] mb-4" style={{ color: "rgba(200,180,230,0.60)" }}>{tickerDraft.length}/200 · Pastda scroll bo&apos;lib chiqadi</p>
                        <button onClick={saveTicker}
                            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 20px rgba(236,72,153,0.35)" }}>
                            <Zap className="w-4 h-4" />{tickerDraft.trim() ? "Saqlash" : "O'chirish"}
                        </button>
                    </div>
                </>
            )}

            {/* Batch AJ — Subscription modal */}
            {subModalOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(10px)" }} onClick={() => setSubModalOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(245,158,11,0.45)", boxShadow: "0 24px 80px rgba(245,158,11,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Crown className="w-5 h-5" style={{ color: "#F59E0B" }} />
                            <h3 className="text-base font-black text-white">Obuna bo&apos;lish</h3>
                            <button onClick={() => setSubModalOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        {mySub && (
                            <div className="mb-4 p-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(245,158,11,0.35)" }}>
                                <p className="text-[11px] font-black text-white mb-0.5 flex items-center gap-1.5">
                                    <Crown className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />{mySub.tier} — faol
                                </p>
                                <p className="text-[10px]" style={{ color: "rgba(255,220,180,0.75)" }}>
                                    {new Date(mySub.expiresAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })} gacha
                                </p>
                            </div>
                        )}
                        <p className="text-[11px] mb-3" style={{ color: "rgba(255,220,180,0.65)" }}>Streamer'ni har oy qo&apos;llab-quvvatlang. Obunachi badge chat'da chiqadi.</p>
                        <div className="space-y-2">
                            {([
                                { tier: "SUPPORTER", price: 25000, label: "Supporter", desc: "Chat obunachi badge", color: "#F59E0B" },
                                { tier: "GOLD", price: 100000, label: "Gold", desc: "Gold badge + priorityed chat", color: "#EC4899" },
                                { tier: "PLATINUM", price: 500000, label: "Platinum", desc: "Platinum badge + shaxsiy DM ustuvorligi", color: "#8B5CF6" },
                            ]).map(t => (
                                <button key={t.tier} onClick={() => subscribe(t.tier)} disabled={subBusy}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition active:scale-95 disabled:opacity-50"
                                    style={{ background: `${t.color}15`, border: `1px solid ${t.color}40` }}>
                                    <Crown className="w-4 h-4 flex-shrink-0" style={{ color: t.color }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-white">{t.label}</p>
                                        <p className="text-[10px]" style={{ color: "rgba(220,220,240,0.65)" }}>{t.desc}</p>
                                    </div>
                                    <span className="text-xs font-black tabular-nums" style={{ color: t.color }}>
                                        {formatMoney(t.price, currency)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] mt-4 text-center" style={{ color: "rgba(180,180,220,0.55)" }}>
                            30 kunlik obuna · avto-yangilanmaydi · For Pay hamyoningizdan yechiladi
                        </p>
                    </div>
                </>
            )}

            {/* Batch BU — Chat rules editor modal */}
            {rulesEditOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setRulesEditOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(139,92,246,0.45)", boxShadow: "0 24px 80px rgba(139,92,246,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                            <h3 className="text-base font-black text-white">Chat qoidalari</h3>
                            <button onClick={() => setRulesEditOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <textarea value={rulesDraft} onChange={e => setRulesDraft(e.target.value.slice(0, 500))} rows={5}
                            placeholder="Masalan:&#10;• Reklama yozmang&#10;• Boshqalarni hurmat qiling&#10;• Faqat o'zbek/rus/ingliz"
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-y mb-2"
                            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)", caretColor: "#EC4899" }} />
                        <p className="text-[10px] mb-4" style={{ color: "rgba(200,180,230,0.60)" }}>{rulesDraft.length}/500 · Chat panel'da barcha viewerlarga chiqadi</p>
                        <button onClick={saveRules}
                            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
                            <Info className="w-4 h-4" />{rulesDraft.trim() ? "Saqlash" : "O'chirish"}
                        </button>
                    </div>
                </>
            )}

            {/* Batch AM — Streamer panels drawer */}
            {panelsOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setPanelsOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(139,92,246,0.45)", boxShadow: "0 24px 80px rgba(139,92,246,0.35)", scrollbarWidth: "thin" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutList className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                            <h3 className="text-base font-black text-white">Streamer haqida</h3>
                            <button onClick={() => setPanelsOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {panels.map(p => (
                                <div key={p.id} className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)" }}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {p.kind === "BIO" ? <Info className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                                            : p.kind === "SOCIALS" ? <Languages className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                            : p.kind === "SPONSOR" ? <Target className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                                            : p.kind === "SCHEDULE" ? <Clock className="w-3.5 h-3.5" style={{ color: "#EC4899" }} />
                                            : <Sparkles className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />}
                                        <p className="text-xs font-black text-white">{p.title}</p>
                                    </div>
                                    {p.imageUrl && (
                                        <img src={p.imageUrl} alt="" className="w-full rounded-lg mb-2 object-cover" style={{ maxHeight: 160 }} />
                                    )}
                                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(200,180,230,0.85)" }}>{p.content}</p>
                                    {p.linkUrl && (
                                        <a href={p.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[10px] font-black hover:underline" style={{ color: "#00CEC8" }}>
                                            Ochish →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Batch I — Clip composer modal */}
            {clipComposerOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setClipComposerOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(139,92,246,0.45)", boxShadow: "0 24px 80px rgba(139,92,246,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Scissors className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                            <h3 className="text-base font-black text-white">Qirqim yaratish</h3>
                            <button onClick={() => setClipComposerOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <input value={clipTitle} onChange={e => setClipTitle(e.target.value.slice(0, 100))}
                            placeholder="Sarlavha..." className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none mb-3"
                            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)", caretColor: "#EC4899" }} />
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)" }}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black" style={{ color: "#C4B5FD" }}>Boshlanish</span>
                                <span className="text-[10px] font-black tabular-nums text-white">{fmtT(clipStart)}</span>
                            </div>
                            <input type="range" min={0} max={Math.max(0, vodDur - 3)} step={1} value={clipStart}
                                onChange={e => { const v = parseInt(e.target.value); setClipStart(v); if (clipEnd - v > 60) setClipEnd(v + 60); if (clipEnd <= v) setClipEnd(Math.min(vodDur, v + 30)); }}
                                className="w-full accent-[#8B5CF6]" />
                            <div className="flex items-center justify-between mt-2 mb-1">
                                <span className="text-[10px] font-black" style={{ color: "#EC4899" }}>Tugash · davomiylik {clipEnd - clipStart}s</span>
                                <span className="text-[10px] font-black tabular-nums text-white">{fmtT(clipEnd)}</span>
                            </div>
                            <input type="range" min={clipStart + 3} max={Math.min(vodDur, clipStart + 60)} step={1} value={clipEnd}
                                onChange={e => setClipEnd(parseInt(e.target.value))}
                                className="w-full accent-[#EC4899]" />
                        </div>
                        <button onClick={createClip} disabled={clipBusy || !clipTitle.trim() || clipEnd - clipStart < 3}
                            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
                            {clipBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Scissors className="w-4 h-4" />Saqlash</>}
                        </button>
                    </div>
                </>
            )}

            {/* Batch T — Raid composer (streamer LIVE'da) */}
            {raidComposerOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setRaidComposerOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(249,115,22,0.45)", boxShadow: "0 24px 80px rgba(249,115,22,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Rocket className="w-5 h-5" style={{ color: "#F97316" }} />
                            <h3 className="text-base font-black text-white">Raid bilan tugatish</h3>
                            <button onClick={() => setRaidComposerOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <p className="text-[10px] mb-3" style={{ color: "rgba(255,200,150,0.75)" }}>Tomoshabinlar 10 sek kutib boshqa streamer profiliga o&apos;tadi</p>
                        <div className="relative mb-4">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">@</span>
                            <input value={raidUsername} onChange={e => setRaidUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 30))}
                                placeholder="username" className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.30)", caretColor: "#F97316" }}
                                autoFocus />
                        </div>
                        <button onClick={endWithRaid} disabled={!raidUsername.trim()}
                            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", boxShadow: "0 4px 20px rgba(249,115,22,0.35)" }}>
                            <Rocket className="w-4 h-4" />Efirni tugatib raid boshlash
                        </button>
                    </div>
                </>
            )}

            {/* Batch T — Raid countdown overlay (viewer) */}
            {raidCountdown !== null && raidCountdown > 0 && stream?.raidToUsername && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9997] px-5 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
                    style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(249,115,22,0.95))", boxShadow: "0 12px 40px rgba(249,115,22,0.55)" }}>
                    <Rocket className="w-6 h-6 text-white" />
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white/95">RAID</span>
                        <span className="text-sm font-black text-white">@{stream.raidToUsername} — {raidCountdown}s</span>
                    </div>
                    <button onClick={() => setRaidCountdown(null)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.35)" }}>
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
            )}

            {/* Batch I — Clips list (VOD'da) */}
            {stream?.status === "ENDED" && stream?.recordingUrl && clips.length > 0 && (
                <div className="fixed bottom-6 right-6 z-15 max-w-[280px] p-3 rounded-2xl animate-in fade-in slide-in-from-right-2 duration-300"
                    style={{ background: "rgba(8,12,32,0.92)", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 12px 40px rgba(139,92,246,0.25)", backdropFilter: "blur(10px)" }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Scissors className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                        <span className="text-xs font-black text-white">Qirqimlar · {clips.length}</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {clips.slice(0, 6).map(c => (
                            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition group">
                                <a href={`/nexus/live/${streamId}?clip=${c.id}`} className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white truncate">{c.title}</p>
                                    <p className="text-[9px]" style={{ color: "rgba(200,180,230,0.65)" }}>{fmtT(c.startSec)} — {fmtT(c.endSec)} · {c.plays} ko&apos;rish</p>
                                </a>
                                <button onClick={() => likeClip(c.id)}
                                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition active:scale-95"
                                    style={{ background: clipLikes[c.id] ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.05)" }}>
                                    <Heart className={`w-3 h-3 ${clipLikes[c.id] ? "text-red-400 fill-red-400" : "text-white/60"}`} />
                                    <span className="text-[9px] tabular-nums font-black" style={{ color: clipLikes[c.id] ? "#F87171" : "rgba(255,255,255,0.7)" }}>{c.likes || 0}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch S — Chapter marker modal (streamer) */}
            {chapterEditOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setChapterEditOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(0,206,200,0.45)", boxShadow: "0 24px 80px rgba(0,206,200,0.35)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Plus className="w-5 h-5" style={{ color: "#00CEC8" }} />
                            <h3 className="text-base font-black text-white">Bo&apos;lim belgilash</h3>
                            <button onClick={() => setChapterEditOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                        <p className="text-[10px] mb-2" style={{ color: "rgba(160,220,215,0.75)" }}>Hozirgi vaqt VOD'da bo&apos;lim marker'i sifatida saqlanadi</p>
                        <input value={chapterDraft} onChange={e => setChapterDraft(e.target.value.slice(0, 80))}
                            onKeyDown={e => e.key === "Enter" && saveChapter()}
                            placeholder="masalan: Kirish, Q&A boshlandi..."
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none mb-4"
                            style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.30)", caretColor: "#00CEC8" }}
                            autoFocus />
                        <button onClick={saveChapter} disabled={!chapterDraft.trim()}
                            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#00CEC8,#2B3EE8)", boxShadow: "0 4px 20px rgba(0,206,200,0.35)" }}>
                            <Plus className="w-4 h-4" />Belgilash ({chapters.length + 1}-bo&apos;lim)
                        </button>
                    </div>
                </>
            )}

            {/* Batch M — Moderation panel modal (streamer) */}
            {modPanelOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setModPanelOpen(false)} />
                    <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(239,68,68,0.45)", boxShadow: "0 24px 80px rgba(239,68,68,0.35)", scrollbarWidth: "thin" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5" style={{ color: "#EF4444" }} />
                            <h3 className="text-base font-black text-white">Chat moderatsiya</h3>
                            <button onClick={() => setModPanelOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>

                        {/* Slow mode */}
                        <div className="mb-5">
                            <p className="text-xs font-black mb-2" style={{ color: "rgba(239,68,68,0.85)" }}>Slow mode</p>
                            <p className="text-[10px] mb-2" style={{ color: "rgba(200,180,180,0.65)" }}>Foydalanuvchi xabarlar orasidagi minimal vaqt</p>
                            <div className="grid grid-cols-5 gap-1.5">
                                {[0, 5, 10, 30, 60].map(s => (
                                    <button key={s} onClick={() => updateModSettings({ slowSeconds: s })} disabled={modBusy}
                                        className="py-1.5 rounded-lg text-[10px] font-black transition active:scale-95 disabled:opacity-50"
                                        style={modSettings.slowSeconds === s
                                            ? { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff" }
                                            : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "rgba(220,160,150,0.85)" }}>
                                        {s === 0 ? "Yo'q" : s < 60 ? `${s}s` : "1daq"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Followers-only */}
                        <div className="mb-5 p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                            <div className="flex-1">
                                <p className="text-xs font-black text-white">Faqat kuzatuvchilar</p>
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(200,180,180,0.65)" }}>Faqat sizni kuzatgan foydalanuvchilar chat yozadi</p>
                            </div>
                            <button onClick={() => updateModSettings({ followersOnly: !modSettings.followersOnly })} disabled={modBusy}
                                className="relative w-11 h-6 rounded-full transition disabled:opacity-50"
                                style={{ background: modSettings.followersOnly ? "linear-gradient(135deg,#EF4444,#F97316)" : "rgba(120,120,150,0.4)" }}>
                                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                                    style={{ left: modSettings.followersOnly ? "22px" : "2px" }} />
                            </button>
                        </div>

                        {/* Banned words */}
                        <div className="mb-5">
                            <p className="text-xs font-black mb-2" style={{ color: "rgba(239,68,68,0.85)" }}>Taqiqlangan so&apos;zlar</p>
                            <p className="text-[10px] mb-2" style={{ color: "rgba(200,180,180,0.65)" }}>Vergul yoki qator bilan ajrating. Kichik/katta harflarga farq qilmaydi.</p>
                            <textarea value={bannedWordsDraft} onChange={e => setBannedWordsDraft(e.target.value)}
                                rows={3} placeholder="masalan: reklama, spam, link.com"
                                className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-y mb-2"
                                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", caretColor: "#F97316" }} />
                            <div className="flex items-center justify-between">
                                <p className="text-[10px]" style={{ color: "rgba(200,180,180,0.60)" }}>
                                    {modSettings.bannedWords.length} ta so&apos;z faol
                                </p>
                                <button onClick={saveBannedWords} disabled={modBusy}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white transition active:scale-95 disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                    Saqlash
                                </button>
                            </div>
                        </div>

                        {/* Batch H — Co-host management */}
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)" }}>
                            <p className="text-xs font-black mb-2 flex items-center gap-1.5" style={{ color: "rgba(196,181,253,0.85)" }}>
                                <Users className="w-3.5 h-3.5" />Co-hostlar · {guests.length}
                            </p>
                            <div className="flex gap-1.5 mb-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 text-sm">@</span>
                                    <input value={guestInvite} onChange={e => setGuestInvite(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 30))}
                                        placeholder="username"
                                        className="w-full pl-6 pr-2 py-2 rounded-lg text-xs text-white outline-none"
                                        style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.30)" }} />
                                </div>
                                <button onClick={inviteGuest} disabled={!guestInvite.trim() || guestBusy}
                                    className="px-3 py-2 rounded-lg text-[10px] font-black text-white disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                                    {guestBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Taklif"}
                                </button>
                            </div>
                            {guests.length > 0 && (
                                <div className="space-y-1">
                                    {guests.map(g => (
                                        <div key={g.profileId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.05)" }}>
                                            <img src={avatarOf(g.author)} alt="" className="w-5 h-5 rounded-full object-cover bg-white" />
                                            <span className="flex-1 text-[11px] font-bold text-white truncate">{g.author?.name || g.author?.username || "..."}</span>
                                            <span className="text-[9px] font-black" style={{ color: g.joined ? "#10B981" : "rgba(200,180,230,0.55)" }}>{g.joined ? "● JOINED" : "kutilyapti"}</span>
                                            <button onClick={() => kickGuest(g.profileId)} className="w-6 h-6 flex items-center justify-center rounded-md" style={{ background: "rgba(239,68,68,0.15)" }}>
                                                <UserMinus className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Batch V — Live captions (Speech Recognition) */}
                        <div className="mb-3 p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.20)" }}>
                            <div className="flex-1">
                                <p className="text-xs font-black text-white flex items-center gap-1.5">
                                    <Captions className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                    Live subtitrlar
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(160,220,215,0.65)" }}>Ovozingiz avto matnga aylanadi (uz-UZ)</p>
                            </div>
                            <button onClick={() => setCaptionStreamerOn(o => !o)}
                                className="relative w-11 h-6 rounded-full transition"
                                style={{ background: captionStreamerOn ? "linear-gradient(135deg,#00CEC8,#2B3EE8)" : "rgba(120,120,150,0.4)" }}>
                                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                                    style={{ left: captionStreamerOn ? "22px" : "2px" }} />
                            </button>
                        </div>

                        {/* Batch AA — Donation goal */}
                        <div className="mb-4">
                            <p className="text-xs font-black mb-2 flex items-center gap-1.5" style={{ color: "rgba(245,158,11,0.85)" }}>
                                <Target className="w-3.5 h-3.5" />Donate maqsad
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 mb-2">
                                <input value={goalDraft.amount} onChange={e => setGoalDraft({ ...goalDraft, amount: e.target.value.replace(/[^0-9]/g, "").slice(0, 10) })}
                                    placeholder="Summa" className="px-3 py-2 rounded-lg text-xs text-white outline-none"
                                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)" }} />
                                <input value={goalDraft.label} onChange={e => setGoalDraft({ ...goalDraft, label: e.target.value.slice(0, 80) })}
                                    placeholder="Nimaga (mikrofon...)" className="px-3 py-2 rounded-lg text-xs text-white outline-none"
                                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)" }} />
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={() => updateModSettings({ donationGoal: goalDraft.amount ? parseInt(goalDraft.amount) : null, donationGoalLabel: goalDraft.label })} disabled={modBusy}
                                    className="flex-1 py-2 rounded-lg text-[10px] font-black text-white transition active:scale-95 disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                                    {modSettings.donationGoal ? "Yangilash" : "O'rnatish"}
                                </button>
                                {modSettings.donationGoal ? (
                                    <button onClick={() => { setGoalDraft({ amount: "", label: "" }); updateModSettings({ donationGoal: null, donationGoalLabel: null }); }}
                                        className="px-3 py-2 rounded-lg text-[10px] font-black text-white"
                                        style={{ background: "rgba(239,68,68,0.20)", border: "1px solid rgba(239,68,68,0.40)" }}>
                                        O&apos;chirish
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {/* Batch BU — Chat rules editor */}
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                                <p className="text-xs font-black text-white">Chat qoidalari</p>
                            </div>
                            {chatRules ? (
                                <>
                                    <p className="text-[11px] mb-2 whitespace-pre-wrap" style={{ color: "rgba(200,180,230,0.85)" }}>{chatRules}</p>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => { setRulesDraft(chatRules); setRulesEditOpen(true); }}
                                            className="flex-1 py-1.5 rounded-lg text-[10px] font-black text-white"
                                            style={{ background: "rgba(139,92,246,0.20)", border: "1px solid rgba(139,92,246,0.40)" }}>
                                            Tahrirlash
                                        </button>
                                        <button onClick={() => { setRulesDraft(""); saveRules(); }}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white"
                                            style={{ background: "rgba(239,68,68,0.20)", border: "1px solid rgba(239,68,68,0.40)" }}>
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={() => { setRulesDraft(""); setRulesEditOpen(true); }}
                                    className="w-full py-2 rounded-lg text-[10px] font-black text-white"
                                    style={{ background: "rgba(139,92,246,0.15)", border: "1px dashed rgba(139,92,246,0.40)" }}>
                                    <Plus className="w-3 h-3 inline mr-1" />Qoidalar qo&apos;shish
                                </button>
                            )}
                        </div>

                        {/* Batch AL — Sound alert (tip audio) */}
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Music className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                                <p className="text-xs font-black text-white">Tip audio alerti</p>
                            </div>
                            <p className="text-[10px] mb-2" style={{ color: "rgba(200,180,230,0.65)" }}>Sovg&apos;a kelganda ovoz effekti (mp3/wav)</p>
                            {stream?.soundAlertUrl ? (
                                <div className="flex items-center gap-2">
                                    <audio src={stream.soundAlertUrl} controls className="flex-1 h-8" style={{ maxWidth: "100%" }} />
                                    <button onClick={removeSoundAlert} className="px-3 py-2 rounded-lg text-[10px] font-black text-white flex-shrink-0"
                                        style={{ background: "rgba(239,68,68,0.20)", border: "1px solid rgba(239,68,68,0.40)" }}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="block cursor-pointer">
                                    <input type="file" accept="audio/mp3,audio/wav,audio/mpeg" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadSoundAlert(f); }} />
                                    <div className="py-2 rounded-lg text-center text-[10px] font-black text-white"
                                        style={{ background: "rgba(139,92,246,0.15)", border: "1px dashed rgba(139,92,246,0.40)" }}>
                                        <Plus className="w-3 h-3 inline mr-1" />Audio yuklash
                                    </div>
                                </label>
                            )}
                        </div>

                        {/* Batch AI — Emote admin */}
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)" }}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black" style={{ color: "#F59E0B" }}>:D</span>
                                    <p className="text-xs font-black text-white">Custom emotelar · {emotes.length}</p>
                                </div>
                                <button onClick={() => setEmoteAdmin(o => !o)}
                                    className="text-[10px] font-black px-2 py-1 rounded-md"
                                    style={{ background: "rgba(245,158,11,0.20)", color: "#F59E0B" }}>
                                    {emoteAdmin ? "Yopish" : "Boshqarish"}
                                </button>
                            </div>
                            {emoteAdmin && (
                                <>
                                    <div className="flex gap-1.5 mb-2">
                                        <input value={emoteName} onChange={e => setEmoteName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                                            placeholder="haha"
                                            className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                                            style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }} />
                                        <label className={`px-3 py-1.5 rounded-lg text-[10px] font-black text-white ${!emoteName || emoteBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                                            style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                                            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadEmote(f); }} />
                                            {emoteBusy ? <Loader2 className="w-3 h-3 inline animate-spin" /> : "Yuklash"}
                                        </label>
                                    </div>
                                    <p className="text-[9px] mb-2" style={{ color: "rgba(245,220,180,0.55)" }}>Chat'da :{emoteName || "nom"}: bilan ishlatiladi</p>
                                    <div className="grid grid-cols-6 gap-1">
                                        {emotes.map(em => (
                                            <div key={em.id} className="relative group aspect-square rounded-md flex items-center justify-center" style={{ background: "rgba(245,158,11,0.06)" }}>
                                                <img src={em.imageUrl} alt={em.name} className="w-7 h-7 object-contain" />
                                                <button onClick={() => deleteEmote(em.id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100"
                                                    style={{ background: "#EF4444" }}>
                                                    <X className="w-2.5 h-2.5 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Batch W — Watermark upload */}
                        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.20)" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                <p className="text-xs font-black text-white">Logo / Watermark</p>
                            </div>
                            <p className="text-[10px] mb-2" style={{ color: "rgba(160,220,215,0.65)" }}>Yozuv canvas'ga o&apos;ng-yuqori burchakda 12% kenglik bilan chiziladi</p>
                            {stream?.watermarkUrl ? (
                                <div className="flex items-center gap-2">
                                    <img src={stream.watermarkUrl} alt="wm" className="w-12 h-12 rounded-lg object-contain bg-black/50" />
                                    <button onClick={removeWatermark}
                                        className="flex-1 px-3 py-2 rounded-lg text-[10px] font-black text-white"
                                        style={{ background: "rgba(239,68,68,0.20)", border: "1px solid rgba(239,68,68,0.40)" }}>
                                        <Trash2 className="w-3 h-3 inline mr-1" />O&apos;chirish
                                    </button>
                                </div>
                            ) : (
                                <label className="block cursor-pointer">
                                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadWatermark(f); }} />
                                    <div className="py-2 rounded-lg text-center text-[10px] font-black text-white"
                                        style={{ background: "rgba(0,206,200,0.15)", border: "1px dashed rgba(0,206,200,0.40)" }}>
                                        {watermarkBusy ? <Loader2 className="w-3 h-3 inline animate-spin" /> : <><Plus className="w-3 h-3 inline mr-1" />Rasm yuklash (PNG/JPG/SVG)</>}
                                    </div>
                                </label>
                            )}
                        </div>

                        <p className="text-[10px] text-center" style={{ color: "rgba(150,150,180,0.55)" }}>
                            Ban qilingan foydalanuvchilar chat xabarlar 3-nuqta menyusidan
                        </p>
                    </div>
                </>
            )}

            {/* Share toast */}
            {shareToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-xl text-xs font-black text-white animate-in fade-in slide-in-from-bottom-2"
                    style={{ background: "linear-gradient(135deg,#00CEC8,#2B3EE8)", boxShadow: "0 8px 24px rgba(0,206,200,0.35)" }}>
                    Havola nusxalandi
                </div>
            )}
        </div>,
        document.body,
    );
}
