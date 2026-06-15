"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useEsT } from "@/lib/esport-i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, Radio, Clock, ChevronLeft, ChevronRight, CalendarPlus,
    Loader2, Send, X, Tv, Users, ImagePlus,
} from "lucide-react";

export interface Broadcast {
    id: string; title: string; status: string; streamUrl: string | null;
    nexusLiveId: string | null; posterUrl: string | null; scheduledAt: string | null; endsAt: string | null; viewers: number;
}
interface Props { broadcasts: Broadcast[]; isAdmin: boolean; onChanged: () => void; }

const ROTATE_MS = 5000;

// YouTube/Twitch/Nexus → iframe src (sayt ichida o'ynaydi, Nexusga o'tib ketmaydi)
function useEmbedSrc() {
    const locale = useLocale();
    return (b: Broadcast): string | null => {
        if (b.streamUrl) {
            const u = b.streamUrl.trim();
            const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/);
            if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1`;
            const tw = u.match(/twitch\.tv\/([A-Za-z0-9_]+)$/);
            if (tw) return `https://player.twitch.tv/?channel=${tw[1]}&parent=forhumo.uz&parent=www.forhumo.uz&autoplay=true`;
            return u;
        }
        if (b.nexusLiveId) return `/${locale}/nexus/live/${b.nexusLiveId}?embed=1`;
        return null;
    };
}

function Countdown({ iso }: { iso: string | null }) {
    const tt = useEsT();
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
    if (!iso) return <span className="es-accent-text">{tt("st.upcoming")}</span>;
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return <span className="es-accent-text">{tt("bc.starting")}</span>;
    const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return <span className="tabular-nums">{d > 0 ? `${d}k ` : ""}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

export default function EsportBroadcast({ broadcasts, isAdmin, onChanged }: Props) {
    const t = useEsT();
    const embedSrc = useEmbedSrc();
    // Deck: translyatsiyalar + (admin uchun) oxirida "rejalashtirish" slaydi
    const slides = useMemo(() => {
        const arr: ({ kind: "cast"; data: Broadcast } | { kind: "schedule" })[] =
            broadcasts.map(d => ({ kind: "cast" as const, data: d }));
        if (isAdmin) arr.push({ kind: "schedule" });
        return arr;
    }, [broadcasts, isAdmin]);

    const [idx, setIdx] = useState(0);
    const [dir, setDir] = useState(0);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [progress, setProgress] = useState(0);

    const paused = playingId !== null || formOpen;
    useEffect(() => { if (idx > slides.length - 1) setIdx(Math.max(0, slides.length - 1)); }, [slides.length, idx]);

    const go = (d: number) => { setDir(d); setPlayingId(null); setIdx(i => (i + d + slides.length) % slides.length); };
    const jump = (i: number) => { setDir(i > idx ? 1 : -1); setPlayingId(null); setIdx(i); };

    // Avto-aylanish + progress (har slaydda 5s, chiziq to'lib boradi)
    useEffect(() => {
        setProgress(0);
        if (paused || slides.length <= 1) return;
        const start = Date.now();
        const t = setInterval(() => {
            const pct = Math.min(100, ((Date.now() - start) / ROTATE_MS) * 100);
            setProgress(pct);
            if (pct >= 100) { clearInterval(t); setDir(1); setIdx(i => (i + 1) % slides.length); }
        }, 50);
        return () => clearInterval(t);
    }, [idx, paused, slides.length]);

    if (slides.length === 0) {
        return (
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl es-card">
                <div className="absolute inset-0 es-accent-bg3 opacity-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Tv className="h-9 w-9 es-faint" />
                    <p className="text-sm font-bold es-mut">{t("bc.soon")}</p>
                    <p className="text-xs es-faint">{t("bc.soonSub")}</p>
                </div>
            </div>
        );
    }

    const cur = slides[idx];

    return (
        <div className="relative">
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl es-card es-glow">
                {/* segment progress (stories uslubi) — tepada */}
                {slides.length > 1 && (
                    <div className="absolute inset-x-3 top-3 z-30 flex gap-1">
                        {slides.map((_, i) => (
                            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                                <div className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                                    style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }} />
                            </div>
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait" custom={dir}>
                    <motion.div key={idx} custom={dir}
                        initial={{ opacity: 0, x: dir >= 0 ? 40 : -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: dir >= 0 ? -40 : 40 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        drag={slides.length > 1 ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
                        onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
                        className="absolute inset-0"
                    >
                        {cur.kind === "schedule"
                            ? <ScheduleSlide onChanged={onChanged} onOpenChange={setFormOpen} />
                            : <CastSlide b={cur.data} playing={playingId === cur.data.id} onPlay={() => setPlayingId(cur.data.id)} embedSrc={embedSrc} />}
                    </motion.div>
                </AnimatePresence>

                {/* strelkalar */}
                {slides.length > 1 && (
                    <>
                        <button onClick={() => go(-1)} className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={() => go(1)} className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>

            {/* pastki nuqta indikatorlari */}
            {slides.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                    {slides.map((s, i) => (
                        <button key={i} onClick={() => jump(i)}
                            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 es-accent-bg" : "w-1.5 es-faint"}`}
                            style={i === idx ? undefined : { background: "currentColor" }}
                            aria-label={s.kind === "schedule" ? "Rejalashtirish" : `Slayd ${i + 1}`} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CastSlide({ b, playing, onPlay, embedSrc }: { b: Broadcast; playing: boolean; onPlay: () => void; embedSrc: (b: Broadcast) => string | null }) {
    const t = useEsT();
    const src = embedSrc(b);
    const isLive = b.status === "LIVE";
    const isEnded = b.status === "ENDED";

    if (playing && src) {
        return <iframe src={src} title={b.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full border-0" />;
    }

    return (
        <div className="relative h-full w-full">
            {b.posterUrl
                ? <img src={b.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                : <div className="absolute inset-0 es-accent-bg3 opacity-20" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />

            {/* status chip — avtomatik */}
            <div className="absolute left-4 top-7 z-10 flex items-center gap-2">
                {isLive ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-lg">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {t("bc.live")}
                    </span>
                ) : isEnded ? (
                    <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">{t("bc.replay")}</span>
                ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm"><Clock className="h-3 w-3" /> {t("bc.scheduled")}</span>
                )}
                {isLive && b.viewers > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm"><Users className="h-3 w-3" /> {b.viewers}</span>
                )}
            </div>

            {/* markaz: play yoki countdown */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                {src && (isLive || isEnded) ? (
                    <button onClick={onPlay} className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 transition-transform hover:scale-110 active:scale-95 sm:h-20 sm:w-20">
                        {isLive && <span className="absolute h-16 w-16 animate-ping rounded-full bg-white/20 sm:h-20 sm:w-20" />}
                        <Play className="ml-1 h-7 w-7 fill-white text-white sm:h-9 sm:w-9" />
                    </button>
                ) : !isEnded ? (
                    <div className="text-center">
                        <Radio className="mx-auto mb-2 h-8 w-8 text-white/70" />
                        <p className="text-2xl font-black text-white sm:text-3xl"><Countdown iso={b.scheduledAt} /></p>
                        <p className="mt-1 text-xs font-semibold text-white/55">{t("bc.untilStart")}</p>
                    </div>
                ) : (
                    <p className="text-sm font-semibold text-white/55">{t("bc.recSoon")}</p>
                )}
            </div>

            {/* pastki sarlavha */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
                <p className="truncate text-base font-black text-white sm:text-lg">{b.title}</p>
            </div>
        </div>
    );
}

function ScheduleSlide({ onChanged, onOpenChange }: { onChanged: () => void; onOpenChange: (open: boolean) => void }) {
    const t = useEsT();
    const [open, setOpenState] = useState(false);
    const setOpen = (v: boolean) => { setOpenState(v); onOpenChange(v); };
    const [title, setTitle] = useState("");
    const [streamUrl, setStreamUrl] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [posterUrl, setPosterUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    async function uploadPoster(file: File) {
        setUploading(true); setErr("");
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({ error: "Yuklash xatosi" }));
        setUploading(false);
        if (r.url) setPosterUrl(r.url); else setErr(r.error || "Rasm yuklanmadi");
    }

    async function submit() {
        if (!title.trim()) return setErr(t("bc.titleReq"));
        setBusy(true); setErr("");
        const r = await fetch("/api/esport/broadcasts", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, streamUrl, posterUrl, scheduledAt: scheduledAt || null, endsAt: endsAt || null }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (r.error) return setErr(r.error);
        setTitle(""); setStreamUrl(""); setScheduledAt(""); setEndsAt(""); setPosterUrl(""); setOpen(false); onChanged();
    }

    return (
        <div className="relative h-full w-full overflow-y-auto nx-hide-scrollbar">
            <div className="absolute inset-0 es-accent-bg3 opacity-15" />
            {!open ? (
                <div className="relative flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl es-accent-bg shadow-lg">
                        <CalendarPlus className="h-7 w-7 text-white" />
                    </div>
                    <p className="text-base font-black es-fg">{t("bc.schedule")}</p>
                    <p className="max-w-xs text-xs es-mut">{t("bc.scheduleSub")}</p>
                    <button onClick={() => setOpen(true)} className="mt-1 rounded-xl px-5 py-2.5 text-sm font-black text-white es-accent-bg transition-transform hover:scale-[1.03] active:scale-95">
                        {t("bc.scheduleBtn")}
                    </button>
                </div>
            ) : (
                <div className="relative grid h-full grid-cols-1 gap-2.5 p-4 sm:grid-cols-[auto_1fr] sm:p-5">
                    {/* oblojka yuklash */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl es-soft sm:w-40">
                            {posterUrl ? <img src={posterUrl} alt="" className="h-full w-full object-cover" />
                                : uploading ? <Loader2 className="h-5 w-5 animate-spin es-mut" />
                                    : <span className="flex flex-col items-center gap-1 es-mut"><ImagePlus className="h-5 w-5" /><span className="text-[10px] font-bold">{t("bc.cover")}</span></span>}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadPoster(f); }} />
                    </div>

                    <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black es-fg">{t("bc.new")}</p>
                            <button onClick={() => setOpen(false)}><X className="h-4 w-4 es-mut" /></button>
                        </div>
                        {err && <p className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300" style={{ background: "rgba(255,60,60,0.12)" }}>{err}</p>}
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("bc.titlePh")} className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none" />
                        <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder={t("bc.linkPh")} className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-bold es-mut">{t("bc.start")}<input value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} type="datetime-local" className="mt-0.5 w-full rounded-xl px-2 py-2 text-xs font-semibold es-fg es-soft outline-none" /></label>
                            <label className="text-[10px] font-bold es-mut">{t("bc.end")}<input value={endsAt} onChange={e => setEndsAt(e.target.value)} type="datetime-local" className="mt-0.5 w-full rounded-xl px-2 py-2 text-xs font-semibold es-fg es-soft outline-none" /></label>
                        </div>
                        <button onClick={submit} disabled={busy || uploading} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white es-accent-bg disabled:opacity-50">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t("bc.save")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
