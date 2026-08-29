"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Radio, Eye, Hash, TrendingUp, Crown, ChevronLeft, Users, ArrowRight } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

// Batch AZ — Live discovery hub (kategoriyalar + top streamerlar + rejadagi efirlar)
interface Cat { id: string; label: string; liveCount: number; totalViewers: number; }
interface LAuthor { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null }
interface TopStreamer { rank: number; author: LAuthor | null; streams: number; peakViewers: number; totalTips: number; }

function avatarOf(a: LAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }

export function NxLiveBrowse() {
    const [cats, setCats] = useState<Cat[]>([]);
    const [top, setTop] = useState<TopStreamer[]>([]);
    const [days, setDays] = useState<7 | 14 | 30>(7);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/nexus/live/categories").then(r => r.json()).then(d => setCats(d.categories || [])).catch(() => { }),
            fetch(`/api/nexus/live/leaderboard?days=${days}`).then(r => r.json()).then(d => setTop(d.leaderboard || [])).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, [days]);

    const totalLive = cats.reduce((a, c) => a + c.liveCount, 0);

    return (
        <div className="min-h-screen pb-24" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="px-4 pt-4 md:pt-6 max-w-4xl mx-auto">
                <Link href="/nexus" className="inline-flex items-center gap-1 text-[11px] font-black mb-3 hover:underline" style={{ color: "rgba(200,180,230,0.75)" }}>
                    <ChevronLeft className="w-3.5 h-3.5" />Nexus
                </Link>
                <div className="p-5 rounded-2xl mb-4 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(239,68,68,0.35)" }}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.35), transparent 70%)" }} />
                    <div className="flex items-center gap-3 mb-2 relative">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                            <Radio className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">Jonli efirlar hub</h1>
                            {totalLive > 0 && (
                                <p className="text-[11px]" style={{ color: "rgba(220,200,220,0.75)" }}>
                                    Hozir <b style={{ color: "#F97316" }}>{totalLive}</b> ta efir jonli
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kategoriyalar */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Hash className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                        <h2 className="text-sm font-black text-white">Kategoriyalar</h2>
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(139,92,246,0.10)" }} />
                            ))}
                        </div>
                    ) : cats.length === 0 ? (
                        <div className="p-6 rounded-2xl text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px dashed rgba(139,92,246,0.30)" }}>
                            <p className="text-xs" style={{ color: "rgba(200,180,230,0.65)" }}>Hozir hech qaysi kategoriyada efir yo&apos;q</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {cats.map(c => (
                                <Link key={c.id} href={`/nexus/live/category/${c.id}`}
                                    className="p-3 rounded-2xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition"
                                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
                                    <p className="text-sm font-black text-white mb-1">#{c.label}</p>
                                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(200,180,230,0.75)" }}>
                                        <span className="flex items-center gap-0.5"><Radio className="w-2.5 h-2.5" style={{ color: "#EF4444" }} />{c.liveCount}</span>
                                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{c.totalViewers}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top streamerlar */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" style={{ color: "#F59E0B" }} />
                            <h2 className="text-sm font-black text-white">Top streamerlar</h2>
                        </div>
                        <div className="flex gap-1">
                            {([7, 14, 30] as const).map(d => (
                                <button key={d} onClick={() => setDays(d)}
                                    className="px-2 py-1 rounded-md text-[10px] font-black transition"
                                    style={days === d
                                        ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff" }
                                        : { background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", color: "rgba(220,200,180,0.75)" }}>
                                    {d}k
                                </button>
                            ))}
                        </div>
                    </div>
                    {loading ? (
                        <div className="space-y-2">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(245,158,11,0.06)" }} />
                            ))}
                        </div>
                    ) : top.length === 0 ? (
                        <div className="p-6 rounded-2xl text-center" style={{ background: "rgba(245,158,11,0.06)", border: "1px dashed rgba(245,158,11,0.30)" }}>
                            <p className="text-xs" style={{ color: "rgba(220,200,180,0.65)" }}>Ma&apos;lumot to&apos;planmoqda</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {top.map(s => (
                                <Link key={s.author?.username || s.rank} href={s.author?.username ? `/nexus/u/${s.author.username}` : "/nexus/live"}
                                    className="flex items-center gap-3 p-3 rounded-xl transition hover:bg-white/5 group"
                                    style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                                        style={s.rank === 1 ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff" }
                                            : s.rank <= 3 ? { background: "rgba(245,158,11,0.20)", color: "#F59E0B" }
                                                : { background: "rgba(200,200,220,0.10)", color: "rgba(220,200,180,0.75)" }}>
                                        {s.rank === 1 ? <Crown className="w-4 h-4" /> : s.rank}
                                    </div>
                                    <img src={avatarOf(s.author)} alt="" className="w-9 h-9 rounded-full object-cover bg-white flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-white truncate flex items-center gap-1">
                                            {s.author?.name || s.author?.username || "Streamer"}
                                            {s.author?.verified && <NxVerifiedBadge category={s.author.verifiedCategory} size={12} />}
                                        </p>
                                        <p className="text-[10px]" style={{ color: "rgba(220,200,180,0.65)" }}>
                                            {s.streams} efir · <Eye className="w-2.5 h-2.5 inline" />{s.peakViewers}
                                            {s.totalTips > 0 && (<> · <Crown className="w-2.5 h-2.5 inline" style={{ color: "#F59E0B" }} />{Math.floor(s.totalTips / 1000)}K</>)}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 flex-shrink-0 transition group-hover:translate-x-0.5" style={{ color: "rgba(200,180,230,0.55)" }} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Follow all btn */}
                <Link href="/nexus" className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition active:scale-95"
                    style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}>
                    <Users className="w-4 h-4" />Barcha efirlar
                </Link>
            </div>
        </div>
    );
}
