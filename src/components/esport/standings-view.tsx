"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, Trophy, ArrowUp, ArrowDown, Minus, BarChart3 } from "lucide-react";

interface Row { rank: number; teamId: string; team: { id: string; name: string; tag: string; logo: string | null } | null; points: number; wins: number; losses: number; played: number; rating: number | null }
interface Division { id: string; name: string; tier: number; teams: Row[] }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };

export default function StandingsView() {
    const [loading, setLoading] = useState(true);
    const [season, setSeason] = useState<{ name: string; active: boolean } | null>(null);
    const [divisions, setDivisions] = useState<Division[]>([]);

    useEffect(() => {
        fetch("/api/esport/standings").then(r => r.json()).then(d => {
            setSeason(d.season || null);
            setDivisions(d.divisions || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <main className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;

    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-2xl px-5 py-8">
                {/* Header */}
                <div className="mb-5 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><BarChart3 className="h-5 w-5 text-white" /></div>
                        <div>
                            <h1 className="text-lg font-black leading-tight text-white">Divizionlar</h1>
                            {season && <p className="text-[11px] font-semibold text-white/45">{season.name}{season.active ? " · faol" : ""}</p>}
                        </div>
                    </div>
                </div>

                {divisions.length === 0 ? (
                    <div className="rounded-3xl p-8 text-center" style={card}>
                        <Trophy className="mx-auto h-10 w-10 text-white/25" />
                        <p className="mt-3 text-sm font-bold text-white/65">Hali jadval yo'q</p>
                        <p className="mt-1 text-xs text-white/40">Mavsum boshlanganda divizionlar bu yerda ko'rinadi.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {divisions.map((d, di) => (
                            <div key={d.id} className="overflow-hidden rounded-3xl" style={card}>
                                {/* Division header */}
                                <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: di === 0 ? "rgba(0,206,200,0.10)" : "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <Trophy className="h-4 w-4" style={{ color: di === 0 ? "#00CEC8" : "rgba(255,255,255,0.4)" }} />
                                    <p className="text-sm font-black text-white">{d.name}</p>
                                    <span className="ml-auto text-[11px] font-bold text-white/35">{d.teams.length} jamoa</span>
                                </div>

                                {d.teams.length === 0 ? (
                                    <p className="px-5 py-6 text-center text-xs text-white/35">Bu divizionda jamoa yo'q</p>
                                ) : (
                                    <div>
                                        {/* Column headers */}
                                        <div className="flex items-center gap-3 px-5 py-2 text-[10px] font-black uppercase tracking-wide text-white/30">
                                            <span className="w-5 text-center">#</span>
                                            <span className="flex-1">Jamoa</span>
                                            <span className="w-7 text-center">O</span>
                                            <span className="w-7 text-center">G</span>
                                            <span className="w-7 text-center">M</span>
                                            <span className="w-9 text-center">Ochko</span>
                                        </div>
                                        {d.teams.map(r => {
                                            const promo = di > 0 && r.rank <= 2;              // yuqori divizionlardagi top-2 ko'tariladi
                                            const releg = di < divisions.length - 1 && r.rank > d.teams.length - 2 && d.teams.length > 2;
                                            return (
                                                <div key={r.teamId} className="flex items-center gap-3 px-5 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                                    <span className="flex w-5 items-center justify-center">
                                                        {promo ? <ArrowUp className="h-3.5 w-3.5 text-emerald-400" /> : releg ? <ArrowDown className="h-3.5 w-3.5 text-red-400" /> : <span className="text-xs font-bold text-white/40">{r.rank}</span>}
                                                    </span>
                                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>
                                                            {r.team?.logo ? <img src={r.team.logo} alt="" className="h-full w-full rounded-lg object-cover" /> : (r.team?.tag.slice(0, 3) || "?")}
                                                        </div>
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-bold text-white">{r.team?.name || "—"}</span>
                                                            {r.rating != null && <span className="block text-[10px] font-semibold text-white/35">Elo {r.rating}</span>}
                                                        </span>
                                                    </div>
                                                    <span className="w-7 text-center text-xs font-semibold text-white/55">{r.played}</span>
                                                    <span className="w-7 text-center text-xs font-semibold text-emerald-400/80">{r.wins}</span>
                                                    <span className="w-7 text-center text-xs font-semibold text-red-400/70">{r.losses}</span>
                                                    <span className="w-9 text-center text-sm font-black text-white">{r.points}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-white/35">
                            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-emerald-400" /> ko'tariladi</span>
                            <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-red-400" /> tushadi</span>
                            <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> qoladi</span>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
