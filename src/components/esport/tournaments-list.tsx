"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, Trophy, Users, ChevronRight, Coins } from "lucide-react";

interface T { id: string; name: string; game: { name: string } | null; status: string; prizePool: number | null; currency: string; maxTeams: number; teams: number; startsAt: string | null }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    UPCOMING: { label: "Tez orada", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
    REGISTRATION: { label: "Ro'yxat ochiq", color: "#00CEC8", bg: "rgba(0,206,200,0.12)" },
    LIVE: { label: "Jonli", color: "#FF3C5F", bg: "rgba(255,60,95,0.14)" },
    ENDED: { label: "Tugagan", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" },
};

function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }

export default function TournamentsList() {
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<T[]>([]);

    useEffect(() => {
        fetch("/api/esport/tournaments").then(r => r.json()).then(d => { setList(d.tournaments || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <main className="flex items-center justify-center py-24" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;

    return (
        <main className="min-h-full" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-4xl px-5 py-8">
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><Trophy className="h-5 w-5 text-white" /></div>
                        <h1 className="text-lg font-black text-white">Turnirlar</h1>
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="rounded-3xl p-8 text-center" style={card}>
                        <Trophy className="mx-auto h-10 w-10 text-white/25" />
                        <p className="mt-3 text-sm font-bold text-white/65">Hali turnir yo'q</p>
                        <p className="mt-1 text-xs text-white/40">Tez orada birinchi turnir e'lon qilinadi.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {list.map(t => {
                            const s = STATUS[t.status] || STATUS.UPCOMING;
                            return (
                                <Link key={t.id} href={`/esport/tournaments/${t.id}`} className="block rounded-3xl p-5" style={card}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-base font-black text-white">{t.name}</p>
                                            <p className="text-xs font-semibold text-white/45">{t.game?.name}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-white/55">
                                        {t.prizePool ? <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-[#FFB020]" /> {money(t.prizePool, t.currency)}</span> : null}
                                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t.teams}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""}</span>
                                        <ChevronRight className="ml-auto h-4 w-4 text-white/25" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
