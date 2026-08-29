"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Radio, Eye, ChevronLeft, Hash, CalendarClock, Search, X } from "lucide-react";
import { NxLiveRoom } from "./nx-live-room";
import { NxVerifiedBadge } from "./nx-verified-badge";

interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface LStream {
    id: string; title: string; category: string | null; status: "UPCOMING" | "LIVE" | "ENDED";
    scheduledAt: string | null; viewers: number; peakViewers: number;
    recordingUrl?: string | null;
    author: LAuthor | null;
}

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }
function fmtN(n: number) { if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"; return String(n); }
function fmtWhen(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

// Batch — Live category dedicated page + search
export function NxLiveCategory({ category, label }: { category: string; label: string }) {
    const [live, setLive] = useState<LStream[]>([]);
    const [upcoming, setUpcoming] = useState<LStream[]>([]);
    const [ended, setEnded] = useState<LStream[]>([]);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

    useEffect(() => {
        setLoading(true);
        const qs = debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : "";
        Promise.all([
            fetch(`/api/nexus/live?status=live&category=${category}&limit=20${qs}`).then(r => r.json()),
            fetch(`/api/nexus/live?status=upcoming&category=${category}&limit=10${qs}`).then(r => r.json()),
            fetch(`/api/nexus/live?status=ended&category=${category}&limit=10${qs}`).then(r => r.json()),
        ]).then(([l, u, e]) => {
            setLive(l.streams || []);
            setUpcoming(u.streams || []);
            setEnded(e.streams || []);
        }).finally(() => setLoading(false));
    }, [category, debouncedQ]);

    return (
        <div className="min-h-screen pb-24" style={{ background: "#050818" }}>
            <div className="px-4 pt-4 md:pt-6 max-w-4xl mx-auto">
                <Link href="/nexus/live/browse" className="inline-flex items-center gap-1 text-[11px] font-black mb-3 hover:underline" style={{ color: "rgba(200,180,230,0.75)" }}>
                    <ChevronLeft className="w-3.5 h-3.5" />Hub
                </Link>

                {/* Category header */}
                <div className="p-5 rounded-2xl mb-4 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(139,92,246,0.35)" }}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)" }} />
                    <div className="flex items-center gap-3 relative">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                            <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">#{label}</h1>
                            <p className="text-[11px]" style={{ color: "rgba(220,200,220,0.75)" }}>
                                {live.length} jonli · {upcoming.length} rejada · {ended.length} tugagan
                            </p>
                        </div>
                    </div>
                </div>

                {/* Batch BN — Live search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(139,92,246,0.55)" }} />
                    <input value={q} onChange={e => setQ(e.target.value)}
                        placeholder={`#${label} ichida qidiruv...`}
                        className="w-full h-10 rounded-xl pl-10 pr-9 text-sm text-white outline-none"
                        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.30)", caretColor: "#EC4899" }} />
                    {q && (
                        <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5" style={{ color: "rgba(200,180,230,0.75)" }} />
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="aspect-video rounded-xl animate-pulse" style={{ background: "rgba(139,92,246,0.10)" }} />
                        ))}
                    </div>
                ) : (
                    <>
                        {live.length > 0 && (
                            <Section title="Hozir jonli" accent="#EF4444" Icon={Radio}>
                                {live.map(s => <StreamCard key={s.id} s={s} onOpen={() => setRoomId(s.id)}
                                    badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "#EF4444" }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                                    </span>}
                                    meta={<><Eye className="w-3 h-3" />{fmtN(s.viewers)} ko&apos;rmoqda</>} />)}
                            </Section>
                        )}
                        {upcoming.length > 0 && (
                            <Section title="Tez kunda" accent="#10B981" Icon={CalendarClock}>
                                {upcoming.map(s => <StreamCard key={s.id} s={s} onOpen={() => setRoomId(s.id)}
                                    badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "#10B981" }}>REJADA</span>}
                                    meta={<><CalendarClock className="w-3 h-3" />{fmtWhen(s.scheduledAt)}</>} />)}
                            </Section>
                        )}
                        {ended.length > 0 && (
                            <Section title="Yaqinda tugagan" accent="#8B5CF6" Icon={Radio}>
                                {ended.map(s => <StreamCard key={s.id} s={s} onOpen={() => setRoomId(s.id)}
                                    badge={<span className="px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ background: s.recordingUrl ? "linear-gradient(135deg,#8B5CF6,#6366F1)" : "rgba(100,110,140,0.85)" }}>
                                        {s.recordingUrl ? "YOZUV" : "TUGADI"}
                                    </span>}
                                    meta={<><Eye className="w-3 h-3" />{fmtN(s.peakViewers)} eng yuqori</>} />)}
                            </Section>
                        )}
                        {live.length === 0 && upcoming.length === 0 && ended.length === 0 && (
                            <div className="p-8 rounded-2xl text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px dashed rgba(139,92,246,0.30)" }}>
                                <Radio className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(139,92,246,0.55)" }} />
                                <p className="text-xs" style={{ color: "rgba(200,180,230,0.75)" }}>
                                    {q ? `"${q}" bo'yicha topilmadi` : `Bu kategoriyada hozircha efir yo'q`}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {roomId && <NxLiveRoom streamId={roomId} onClose={() => setRoomId(null)} />}
        </div>
    );
}

function Section({ title, accent, Icon, children }: { title: string; accent: string; Icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                <h2 className="text-sm font-black text-white">{title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
        </div>
    );
}

function StreamCard({ s, onOpen, badge, meta }: { s: LStream; onOpen: () => void; badge: React.ReactNode; meta: React.ReactNode }) {
    return (
        <button onClick={onOpen} className="text-left group">
            <div className="relative aspect-video rounded-xl overflow-hidden mb-2 flex items-center justify-center"
                style={{ border: "1px solid rgba(139,92,246,0.25)", background: "linear-gradient(135deg, rgba(40,10,50,0.9), rgba(30,15,80,0.9))" }}>
                <img src={avatarOf(s.author)} alt="" className="w-16 h-16 rounded-full object-cover bg-white" style={{ border: "2px solid rgba(139,92,246,0.5)" }} />
                <div className="absolute top-2 left-2">{badge}</div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none" style={{ background: "rgba(5,8,24,0.40)" }}>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>Kirish</span>
                </div>
            </div>
            <p className="text-sm font-bold text-white truncate">{s.title}</p>
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: "rgba(200,180,230,0.75)" }}>
                <span className="truncate flex items-center gap-0.5">
                    {s.author?.name || s.author?.username || "Streamer"}
                    {s.author?.verified && <NxVerifiedBadge category={s.author.verifiedCategory} size={10} />}
                </span>
                <span>·</span>
                <span className="flex items-center gap-0.5 flex-shrink-0">{meta}</span>
            </p>
        </button>
    );
}
