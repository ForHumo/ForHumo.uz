"use client";

import { useState, useRef, useEffect } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Heart, MessageCircle, Share2, Bookmark,
    Play, Volume2, VolumeX, ChevronUp, ChevronDown,
    Send, Loader2, BadgeCheck,
} from "lucide-react";

interface SComment {
    id: string; text: string; createdAt: string; isMine: boolean;
    author: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxShortsPlayer — haqiqiy video bilan to'liq ekran vertikal swipe player
// ─────────────────────────────────────────────────────────────────────────────
export function NxShortsPlayer() {
    const { shorts, shortIndex, shortsOpen, closeShorts, nextShort, prevShort, openShareSheet } = useNxPlayer();

    const [playing,     setPlaying]     = useState(true);
    const [muted,       setMuted]       = useState(true);
    const [progress,    setProgress]    = useState(0);
    const [liked,       setLiked]       = useState<Record<number, boolean>>({});
    const [saved,       setSaved]       = useState<Record<number, boolean>>({});
    const [heartAnim,   setHeartAnim]   = useState(false);  // double-tap animatsiya

    // Real izohlar paneli
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments,     setComments]     = useState<SComment[]>([]);
    const [cLoading,     setCLoading]     = useState(false);
    const [cInput,       setCInput]       = useState("");
    const [cBusy,        setCBusy]        = useState(false);

    const videoRef    = useRef<HTMLVideoElement>(null);
    const touchStart  = useRef(0);
    const isDragging  = useRef(false);
    const lastTap     = useRef(0);          // double-tap uchun
    const viewedRef   = useRef<Set<string>>(new Set());

    /* Yangi short ga o'tganda video reset */
    useEffect(() => {
        setProgress(0);
        setPlaying(true);
        setCommentsOpen(false); setComments([]); setCInput("");
        const v = videoRef.current;
        if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    }, [shortIndex]);

    /* Ko'rishni hisoblash (real video) */
    useEffect(() => {
        const s = shorts[shortIndex];
        if (!shortsOpen || !s?.id || viewedRef.current.has(s.id)) return;
        viewedRef.current.add(s.id);
        fetch(`/api/nexus/videos/${s.id}/view`, { method: "POST" }).catch(() => {});
    }, [shortIndex, shortsOpen, shorts]);

    /* Play/Pause sinxronizatsiya */
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (playing && shortsOpen) v.play().catch(() => {});
        else v.pause();
    }, [playing, shortsOpen]);

    /* Ovoz holati */
    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = muted;
    }, [muted]);

    /* Klaviatura */
    useEffect(() => {
        if (!shortsOpen) return;
        const handler = (e: KeyboardEvent) => {
            // Izoh yozayotganda player tugmalari ishlamasin
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
            if (e.key === "ArrowDown") nextShort();
            if (e.key === "ArrowUp")   prevShort();
            if (e.key === " ")         { e.preventDefault(); setPlaying(p => !p); }
            if (e.key === "Escape")    closeShorts();
            if (e.key === "m")         setMuted(p => !p);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [shortsOpen, nextShort, prevShort, closeShorts]);

    async function likeShort(s: { id?: string }) {
        if (!s.id) return;
        fetch(`/api/nexus/videos/${s.id}/like`, { method: "POST" }).catch(() => { });
    }

    /* Real izohlar — video comments API */
    function openCommentsPanel() {
        const s = shorts[shortIndex];
        if (!s?.id) return;
        setCommentsOpen(true); setCLoading(true);
        fetch(`/api/nexus/videos/${s.id}/comments`)
            .then(r => r.json()).then(d => setComments(d.comments ?? []))
            .catch(() => { }).finally(() => setCLoading(false));
    }
    async function sendComment() {
        const s = shorts[shortIndex];
        if (!s?.id || !cInput.trim() || cBusy) return;
        setCBusy(true);
        const text = cInput.trim(); setCInput("");
        try {
            const r = await fetch(`/api/nexus/videos/${s.id}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
            });
            if (r.ok) { const d = await r.json(); setComments(c => [d.comment, ...c]); }
        } finally { setCBusy(false); }
    }

    if (shorts.length === 0) return null;

    const short   = shorts[shortIndex];
    const isLiked = liked[shortIndex] ?? false;
    const isSaved = saved[shortIndex] ?? false;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
            style={{
                background: "#000",
                opacity: shortsOpen ? 1 : 0,
                pointerEvents: shortsOpen ? "auto" : "none",
            }}
            onTouchStart={e => {
                touchStart.current = e.touches[0].clientY;
                isDragging.current = false;
            }}
            onTouchMove={e => {
                const delta = e.touches[0].clientY - touchStart.current;
                if (Math.abs(delta) > 10) isDragging.current = true;
            }}
            onTouchEnd={e => {
                const delta = e.changedTouches[0].clientY - touchStart.current;
                if (isDragging.current) {
                    if (delta < -60) nextShort();
                    if (delta >  60) prevShort();
                }
            }}
            onWheel={e => {
                if (e.deltaY > 30)  nextShort();
                if (e.deltaY < -30) prevShort();
            }}
        >
            {/* ── Video sahna (9:16) ──────────────────────────────── */}
            <div
                className="relative h-full max-h-screen"
                style={{ aspectRatio: "9/16", maxWidth: "calc(100vh * 9 / 16)" }}
                onClick={() => {
                    const now = Date.now();
                    if (now - lastTap.current < 300) {
                        // Double tap — like
                        setLiked(p => ({ ...p, [shortIndex]: true }));
                        likeShort(short);
                        setHeartAnim(true);
                        setTimeout(() => setHeartAnim(false), 700);
                    } else {
                        setPlaying(p => !p);
                    }
                    lastTap.current = now;
                }}
            >
                {/* ── Haqiqiy video yoki fallback rasm ── */}
                {short.videoSrc ? (
                    <video
                        key={short.videoSrc}           // key o'zgarganda React unmount qiladi
                        ref={videoRef}
                        src={short.videoSrc}
                        autoPlay
                        muted={muted}
                        playsInline
                        loop={false}
                        className="w-full h-full object-cover"
                        style={{ filter: playing ? "brightness(0.88)" : "brightness(0.50)", transition: "filter 0.3s" }}
                        onTimeUpdate={e => {
                            const v = e.currentTarget;
                            if (v.duration > 0) {
                                const pct = (v.currentTime / v.duration) * 100;
                                setProgress(pct);
                                if (pct >= 99) nextShort();
                            }
                        }}
                        onEnded={nextShort}
                    />
                ) : (
                    <img
                        src={short.image}
                        alt={short.author}
                        className="w-full h-full object-cover"
                        style={{ filter: playing ? "brightness(0.85)" : "brightness(0.55)", transition: "filter 0.3s" }}
                    />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.30) 100%)"
                }} />

                {/* Double-tap heart animatsiya */}
                {heartAnim && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 5 }}>
                        <Heart
                            className="w-24 h-24"
                            style={{
                                color: "#EF4444",
                                fill: "#EF4444",
                                animation: "nx-heart-pop 0.7s ease-out forwards",
                            }}
                        />
                    </div>
                )}

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: "rgba(255,255,255,0.20)" }}>
                    <div
                        className="h-full"
                        style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                            transition: "width 0.25s linear",
                        }}
                    />
                </div>

                {/* Tepada tugmalar */}
                <div
                    className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={closeShorts}
                        className="w-9 h-9 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(8px)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>

                    <button
                        onClick={() => setMuted(p => !p)}
                        className="w-9 h-9 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(8px)" }}
                    >
                        {muted
                            ? <VolumeX className="w-4 h-4 text-white" />
                            : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                </div>

                {/* Play/Pause ko'rsatkichi */}
                {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(43,62,232,0.80)", backdropFilter: "blur(8px)" }}>
                            <Play className="w-7 h-7 text-white fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* O'ng — amal tugmalari */}
                <div
                    className="absolute right-3 bottom-24 flex flex-col items-center gap-5 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden"
                            style={{ border: "2px solid white" }}>
                            <img
                                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${short.author}`}
                                alt={short.author}
                                className="w-full h-full object-cover bg-white"
                            />
                        </div>
                        <div
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                        >
                            <span className="text-white text-[10px] font-black leading-none">+</span>
                        </div>
                    </div>

                    <ActionBtn
                        icon={Heart} label={short.likes}
                        active={isLiked} activeColor="#EF4444" fill={isLiked}
                        onClick={() => { setLiked(p => ({ ...p, [shortIndex]: !p[shortIndex] })); likeShort(short); }}
                    />
                    <ActionBtn icon={MessageCircle} label={commentsOpen ? String(comments.length) : "Sharh"} active={commentsOpen} onClick={() => commentsOpen ? setCommentsOpen(false) : openCommentsPanel()} />
                    <ActionBtn icon={Share2} label="Ulash" onClick={() => openShareSheet(short.author)} />
                    <ActionBtn
                        icon={Bookmark} label="Saqlash"
                        active={isSaved} activeColor="#00CEC8" fill={isSaved}
                        onClick={() => setSaved(p => ({ ...p, [shortIndex]: !p[shortIndex] }))}
                    />
                </div>

                {/* Pastda — ma'lumot */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                    <p className="text-sm font-black text-white mb-1">{short.author}</p>
                    <p className="text-xs text-white/70 mb-2">{short.duration} · {short.views} ko'rish</p>
                    <p className="text-xs text-white/60 line-clamp-2">
                        Humo Nexus platformasidagi kontent · #nexus #humo #shorts
                    </p>
                </div>

                {/* Real izohlar paneli */}
                {commentsOpen && (
                    <div className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl overflow-hidden"
                        style={{ height: "62%", background: "rgba(8,12,32,0.97)", border: "1px solid rgba(43,62,232,0.25)", borderBottom: "none", zIndex: 10 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <span className="text-sm font-black text-white">Izohlar {comments.length > 0 && <span style={{ color: "rgba(0,206,200,0.9)" }}>{comments.length}</span>}</span>
                            <button onClick={() => setCommentsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: "none" }}>
                            {cLoading ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                            ) : comments.length === 0 ? (
                                <p className="text-xs text-center py-6" style={{ color: "rgba(120,140,185,0.6)" }}>Birinchi izohni qoldiring</p>
                            ) : comments.map(c => (
                                <div key={c.id} className="flex gap-2 py-2">
                                    <img src={c.author?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(c.author?.username || c.author?.name || "u")}`}
                                        alt="" className="w-7 h-7 rounded-lg object-cover bg-white flex-shrink-0" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-white">{c.author?.name || c.author?.username || "Foydalanuvchi"}</span>
                                            {c.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: "rgba(200,215,245,0.85)" }}>{c.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            <input value={cInput} onChange={e => setCInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment()}
                                placeholder="Izoh yozing..." className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }} />
                            <button onClick={sendComment} disabled={cBusy || !cInput.trim()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {cBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Navbat ko'rsatkichlari ────────────────────────────── */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {shorts.map((_, i) => (
                    <div
                        key={i}
                        className="rounded-full transition-all duration-200"
                        style={{
                            width:   i === shortIndex ? "3px" : "2px",
                            height:  i === shortIndex ? "24px" : "8px",
                            background: i === shortIndex
                                ? "linear-gradient(180deg,#2B3EE8,#00CEC8)"
                                : "rgba(255,255,255,0.25)",
                        }}
                    />
                ))}
            </div>

            {/* ── Tepaga / Pastga ────────────────────────────────────── */}
            <div className="absolute right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <button
                    onClick={prevShort}
                    disabled={shortIndex === 0}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(4px)" }}
                >
                    <ChevronUp className="w-4 h-4 text-white" style={{ opacity: shortIndex === 0 ? 0.30 : 1 }} />
                </button>
                <button
                    onClick={nextShort}
                    disabled={shortIndex === shorts.length - 1}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(4px)" }}
                >
                    <ChevronDown className="w-4 h-4 text-white" style={{ opacity: shortIndex === shorts.length - 1 ? 0.30 : 1 }} />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function ActionBtn({
    icon: Icon, label, active = false, activeColor = "#00CEC8",
    onClick, fill = false,
}: {
    icon: React.ElementType; label?: string; active?: boolean;
    activeColor?: string; onClick?: () => void; fill?: boolean;
}) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1 transition-all duration-150 active:scale-90">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(8px)" }}>
                <Icon className="w-5 h-5 transition-colors duration-200"
                    style={{
                        color: active ? activeColor : "rgba(255,255,255,0.90)",
                        fill:  fill ? activeColor : "none",
                    }}
                />
            </div>
            {label && <span className="text-[9px] font-bold text-white/80">{label}</span>}
        </button>
    );
}
