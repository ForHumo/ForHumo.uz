"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    Radio, Hash, Loader2, ChevronRight, Eye, Clock, CalendarClock,
    Search, X, Bell, BellRing,
} from "lucide-react";
import { NxLiveRoom } from "./nx-live-room";
import { NxVerifiedBadge } from "./nx-verified-badge";
import { Play, Trash2 } from "lucide-react";
import { NxConfirm } from "./nx-confirm";

// LocalStorage — rejadagi efirlar uchun eslatma (client-side)
const REM_KEY = "nx-live-reminders-v1";
function getReminders(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(REM_KEY) || "[]") as string[]); }
    catch { return new Set(); }
}
function saveReminders(s: Set<string>) {
    try { localStorage.setItem(REM_KEY, JSON.stringify([...s])); } catch { /* jim */ }
}

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
export interface LiveStream {
    id: string; title: string; category: string | null; status: "UPCOMING" | "LIVE" | "ENDED";
    scheduledAt: string | null; startedAt: string | null; endedAt: string | null;
    viewers: number; peakViewers: number; likes: number; createdAt: string;
    author: LAuthor | null;
    recordingUrl?: string | null; recordingDurationSec?: number | null; isMine?: boolean;
}

const CATS = [
    { id: "", label: "Hammasi" },
    { id: "gaming", label: "Gaming" },
    { id: "musiqa", label: "Musiqa" },
    { id: "dasturlash", label: "Dasturlash" },
    { id: "sport", label: "Sport" },
    { id: "talim", label: "Ta'lim" },
] as const;

function fmtViewers(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }
function fmtWhen(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtStreamDur(start: string | null, end: string | null) {
    if (!start || !end) return "";
    const s = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}s ${m}d` : `${m} daqiqa`;
}

export function LiveView() {
    const { setGoLiveOpen } = useNxPlayer();
    const [live, setLive] = useState<LiveStream[]>([]);
    const [upcoming, setUpcoming] = useState<LiveStream[]>([]);
    const [ended, setEnded] = useState<LiveStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [cat, setCat] = useState("");
    const [query, setQuery] = useState("");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [liveHasMore, setLiveHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [reminders, setReminders] = useState<Set<string>>(new Set());
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => { setReminders(getReminders()); }, []);

    async function performDelete(id: string) {
        setDeleteBusy(true);
        try {
            const r = await fetch(`/api/nexus/live/${id}`, { method: "DELETE" });
            if (r.ok) await load(true);
        } finally {
            setDeleteBusy(false);
            setDeleteId(null);
        }
    }

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const catQ = cat ? `&category=${cat}` : "";
            const qQ = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
            const [l, u, e] = await Promise.all([
                fetch(`/api/nexus/live?status=live&limit=24${catQ}${qQ}`).then(r => r.json()),
                fetch(`/api/nexus/live?status=upcoming&limit=12${catQ}${qQ}`).then(r => r.json()),
                fetch(`/api/nexus/live?status=ended&limit=12${catQ}${qQ}`).then(r => r.json()),
            ]);
            setLive(l.streams ?? []); setUpcoming(u.streams ?? []); setEnded(e.streams ?? []);
            setLiveHasMore(!!l.hasMore);
        } finally { if (!silent) setLoading(false); }
    }, [cat, query]);

    async function loadMoreLive() {
        if (loadingMore || !liveHasMore) return;
        setLoadingMore(true);
        try {
            const catQ = cat ? `&category=${cat}` : "";
            const qQ = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
            const d = await fetch(`/api/nexus/live?status=live&limit=24&offset=${live.length}${catQ}${qQ}`).then(r => r.json());
            setLive(prev => [...prev, ...(d.streams ?? [])]);
            setLiveHasMore(!!d.hasMore);
        } finally { setLoadingMore(false); }
    }

    function toggleReminder(id: string) {
        setReminders(prev => {
            const nx = new Set(prev);
            if (nx.has(id)) nx.delete(id); else nx.add(id);
            saveReminders(nx);
            return nx;
        });
    }

    // Query o'zgarganida debounce
    useEffect(() => { const t = setTimeout(load, query ? 300 : 0); return () => clearTimeout(t); }, [load, query]);
    // Jonli ro'yxat har 20s yangilanadi
    useEffect(() => {
        const iv = setInterval(() => load(true), 20_000);
        return () => clearInterval(iv);
    }, [load]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {/* Header */}
            <div className="mx-4 mt-4 mb-3 p-5 rounded-2xl relative overflow-hidden" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(239,68,68,0.22)" }}>
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)" }} />
                <h2 className="text-2xl md:text-3xl font-black text-white mb-1 relative">Jonli <span style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Efirlar</span></h2>
                <p className="text-xs mb-3 relative" style={{ color: "rgba(140,160,210,0.75)" }}>Real vaqtda — chat va ko&apos;ruvchilar jonli</p>

                {/* Qidiruv */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(239,68,68,0.55)" }} />
                    <input value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Efir sarlavhasi yoki kategoriya..."
                        className="w-full h-10 rounded-xl pl-10 pr-9 text-sm text-white outline-none"
                        style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(239,68,68,0.22)", caretColor: "#EF4444" }} />
                    {query && (
                        <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5" style={{ color: "rgba(200,150,150,0.7)" }} />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 relative" style={{ scrollbarWidth: "none" }}>
                    {CATS.map(c => (
                        <button key={c.id} onClick={() => setCat(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition active:scale-95"
                            style={cat === c.id
                                ? { background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff" }
                                : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "rgba(220,160,150,0.85)" }}>
                            {c.id === "" ? <Radio className="w-3 h-3" /> : <Hash className="w-3 h-3" />}{c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Go Live CTA */}
            <div className="mx-4 mt-3 mb-4">
                <button onClick={() => setGoLiveOpen(true)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.99] group"
                    style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.12) 100%)", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 4px 24px rgba(239,68,68,0.12)" }}>
                    <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                            <Radio className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-black text-white leading-tight">Jonli Efir Boshlash</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(200,120,100,0.85)" }}>Auditoriyangizga real vaqtda ulaning</p>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: "rgba(239,68,68,0.70)" }} />
                </button>
            </div>

            {loading ? (
                <>
                    <Section title="Hozir Jonli" accent="#EF4444">
                        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[0,1,2].map(i => <StreamSkeleton key={i} />)}
                        </div>
                    </Section>
                </>
            ) : (
                <>
                    {/* Hozir jonli */}
                    <Section title="Hozir Jonli" accent="#EF4444">
                        {live.length === 0 ? (
                            <Empty text={query ? `"${query}" bo'yicha jonli efir topilmadi` : "Hozir hech kim jonli emas — birinchi bo'ling!"} />
                        ) : (
                            <>
                                <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {live.map(s => (
                                        <StreamCard key={s.id} s={s} onOpen={() => setRoomId(s.id)}
                                            badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "#EF4444" }}><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE</span>}
                                            meta={<><Eye className="w-3 h-3" />{fmtViewers(s.viewers)} ko&apos;rmoqda</>} />
                                    ))}
                                </div>
                                {liveHasMore && (
                                    <div className="flex justify-center mt-4 px-4">
                                        <button onClick={loadMoreLive} disabled={loadingMore}
                                            className="px-5 py-2 rounded-xl text-xs font-black text-white active:scale-95 disabled:opacity-50"
                                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                            {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Yuklanmoqda</> : "Ko'proq efir"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </Section>

                    {/* Rejalashtirilgan (reminder toggle) */}
                    {upcoming.length > 0 && (
                        <Section title="Tez kunda boshlanadi" accent="#10B981">
                            <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcoming.map(s => {
                                    const rem = reminders.has(s.id);
                                    return (
                                        <StreamCard key={s.id} s={s} onOpen={() => setRoomId(s.id)}
                                            badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "#10B981" }}><CalendarClock className="w-3 h-3" />REJADA</span>}
                                            meta={<><Clock className="w-3 h-3" />{fmtWhen(s.scheduledAt)}</>}
                                            corner={
                                                <button onClick={e => { e.stopPropagation(); toggleReminder(s.id); }}
                                                    title={rem ? "Eslatma yoqilgan" : "Eslatma qo'shish"}
                                                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg"
                                                    style={{ background: rem ? "rgba(16,185,129,0.85)" : "rgba(5,8,24,0.75)", backdropFilter: "blur(6px)" }}>
                                                    {rem ? <BellRing className="w-3.5 h-3.5 text-white" /> : <Bell className="w-3.5 h-3.5 text-white" />}
                                                </button>
                                            } />
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Tugagan — VOD ko'rish + o'z egasi o'chira oladi */}
                    {ended.length > 0 && (
                        <Section title="Yaqinda tugagan" accent="#8B5CF6">
                            <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ended.map(s => (
                                    <StreamCard key={s.id} s={s}
                                        onOpen={() => s.recordingUrl ? setRoomId(s.id) : setRoomId(s.id)}
                                        dim={!s.recordingUrl}
                                        badge={
                                            s.recordingUrl
                                                ? <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                                                    <Play className="w-2.5 h-2.5 fill-current" />YOZUV
                                                  </span>
                                                : <span className="px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "rgba(100,110,140,0.85)" }}>TUGADI</span>
                                        }
                                        meta={<><Eye className="w-3 h-3" />{fmtViewers(s.peakViewers)} eng yuqori · {fmtStreamDur(s.startedAt, s.endedAt)}</>}
                                        corner={s.isMine ? (
                                            <button type="button"
                                                onMouseDown={e => e.stopPropagation()}
                                                onPointerDown={e => e.stopPropagation()}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setDeleteId(s.id);
                                                }} title="O'chirish"
                                                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-lg"
                                                style={{ background: "rgba(239,68,68,0.85)", backdropFilter: "blur(6px)" }}>
                                                <Trash2 className="w-3.5 h-3.5 text-white" />
                                            </button>
                                        ) : null} />
                                ))}
                            </div>
                        </Section>
                    )}
                </>
            )}

            {/* Tomoshabin xonasi */}
            {roomId && <NxLiveRoom streamId={roomId} onClose={() => { setRoomId(null); load(true); }} />}

            {/* O'chirish tasdiqlash */}
            <NxConfirm
                open={!!deleteId}
                title="Efirni o'chirish"
                message="Bu efir Nexus platformasidan butunlay olib tashlanadi. Chat, ko'ruvchilar va yozuv — hammasi o'chadi. Bu amalni orqaga qaytarib bo'lmaydi."
                confirmText="O'chirish"
                cancelText="Bekor qilish"
                tone="danger"
                busy={deleteBusy}
                onCancel={() => !deleteBusy && setDeleteId(null)}
                onConfirm={() => deleteId && performDelete(deleteId)}
            />
        </div>
    );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <div className="px-4 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
                <span className="text-sm font-black text-white">{title}</span>
            </div>
            {children}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="mx-4 px-4 py-8 rounded-2xl flex flex-col items-center gap-2 text-center" style={{ background: "rgba(239,68,68,0.05)", border: "1px dashed rgba(239,68,68,0.20)" }}>
            <Radio className="w-6 h-6" style={{ color: "rgba(239,68,68,0.40)" }} />
            <p className="text-xs" style={{ color: "rgba(150,150,180,0.75)" }}>{text}</p>
        </div>
    );
}

function StreamCard({ s, onOpen, badge, meta, dim, corner }: {
    s: LiveStream; onOpen: () => void; badge: React.ReactNode; meta: React.ReactNode; dim?: boolean;
    corner?: React.ReactNode;
}) {
    return (
        <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === "Enter" && onOpen()}
            className="text-left group cursor-pointer">
            <div className="relative aspect-video rounded-xl overflow-hidden mb-2 flex items-center justify-center"
                style={{ border: `1px solid ${dim ? "rgba(100,110,140,0.25)" : "rgba(239,68,68,0.25)"}`, background: "linear-gradient(135deg, rgba(40,10,20,0.9), rgba(30,15,50,0.9))", opacity: dim ? 0.75 : 1 }}>
                <img src={avatarOf(s.author)} alt="" className="w-16 h-16 rounded-full object-cover bg-white" style={{ border: "2px solid rgba(239,68,68,0.5)" }} />
                <div className="absolute top-2 left-2">{badge}</div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" style={{ background: "rgba(5,8,24,0.40)" }}>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>Kirish</span>
                </div>
                {corner}
                {s.category && !corner && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white pointer-events-none" style={{ background: "rgba(5,8,24,0.75)" }}>#{s.category}</span>}
            </div>
            <div className="flex gap-2.5">
                {s.author?.username ? (
                    <Link href={`/nexus/u/${s.author.username}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
                        <img src={avatarOf(s.author)} alt="" className="w-8 h-8 rounded-full object-cover bg-white" style={{ border: "1px solid rgba(239,68,68,0.25)" }} />
                    </Link>
                ) : (
                    <img src={avatarOf(s.author)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-white" style={{ border: "1px solid rgba(239,68,68,0.25)" }} />
                )}
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#F97316] transition-colors">{s.title}</h4>
                    <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: "rgba(150,130,150,0.85)" }}>
                        {s.author?.username ? (
                            <Link href={`/nexus/u/${s.author.username}`} onClick={e => e.stopPropagation()}
                                className="truncate inline-flex items-center gap-0.5 hover:text-white transition-colors">
                                {s.author.name || s.author.username}
                                {s.author.verified && <NxVerifiedBadge category={s.author.verifiedCategory} size={12} />}
                            </Link>
                        ) : (
                            <span className="truncate">{s.author?.name || "Streamer"}</span>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0">{meta}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function StreamSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="aspect-video rounded-xl mb-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.15)" }} />
            <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: "rgba(239,68,68,0.15)" }} />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded" style={{ background: "rgba(239,68,68,0.15)" }} />
                    <div className="h-2 rounded" style={{ background: "rgba(239,68,68,0.10)", width: "60%" }} />
                </div>
            </div>
        </div>
    );
}
