"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, Trophy, Users, ChevronRight, Coins, Calendar, ClipboardList, ShieldCheck, Crown, Youtube, ChevronDown, History, Medal } from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

interface RetroMatch { order: number; date: string; time: string | null; stage: string; teamA: string; teamB: string; scoreA: number | null; scoreB: number | null; winner: string | null; note: string | null; reason: string | null; youtube: string | null }
interface Retro { id: string; name: string; season: string; game: string; organizer: string; startDate: string; endDate: string; prizePool: number | null; currency: string; champion: string | null; runnerUp: string | null; third: string | null; matches: RetroMatch[] }

interface T {
    id: string; name: string; game: { name: string } | null; status: string;
    division: { name: string; tier: number } | null; isOpen: boolean;
    prizePool: number | null; currency: string; maxTeams: number; teams: number;
    registrationStartsAt: string | null; registrationEndsAt: string | null; startsAt: string | null; endsAt: string | null;
}

const MON = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
function fmt(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    // Toshkent (+5)
    const t = new Date(d.getTime() + 5 * 3600e3);
    return `${t.getUTCDate()} ${MON[t.getUTCMonth()]}`;
}

const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "var(--es-card)", border: "1px solid var(--es-card-bd)" };

const STATUS: Record<string, { tkey: string; color: string; bg: string }> = {
    UPCOMING: { tkey: "st.upcoming", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
    REGISTRATION: { tkey: "st.registration", color: "#00CEC8", bg: "rgba(0,206,200,0.12)" },
    LIVE: { tkey: "st.live", color: "#FF3C5F", bg: "rgba(255,60,95,0.14)" },
    ENDED: { tkey: "st.ended", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" },
};

function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }

export default function TournamentsList() {
    const tr = useEsT();
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<T[]>([]);
    const [retros, setRetros] = useState<Retro[]>([]);

    useEffect(() => {
        fetch("/api/esport/tournaments").then(r => r.json()).then(d => { setList(d.tournaments || []); setLoading(false); }).catch(() => setLoading(false));
        fetch("/api/esport/retro").then(r => r.json()).then(d => setRetros(d.retros || [])).catch(() => { });
    }, []);

    if (loading) return <main className="flex items-center justify-center py-24" ><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;

    return (
        <main className="min-h-full" >
            <div className="mx-auto w-full max-w-4xl px-5 py-8">
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><Trophy className="h-5 w-5 text-white" /></div>
                        <h1 className="text-lg font-black text-white">{tr("nav.tournaments")}</h1>
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="rounded-3xl p-8 text-center" style={card}>
                        <Trophy className="mx-auto h-10 w-10 text-white/25" />
                        <p className="mt-3 text-sm font-bold text-white/65">{tr("tour.none")}</p>
                        <p className="mt-1 text-xs text-white/40">{tr("tour.soon")}</p>
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
                                            <p className="text-xs font-semibold text-white/45">{t.game?.name}{t.division ? ` · ${t.division.name}` : ""}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: s.color, background: s.bg }}>{tr(s.tkey)}</span>
                                    </div>
                                    {(t.startsAt || t.endsAt) && (
                                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/55">
                                            <Calendar className="h-3.5 w-3.5 text-[#00CEC8]" /> {fmt(t.startsAt)} – {fmt(t.endsAt)}
                                        </div>
                                    )}
                                    {/* Ro'yxat (Ochiq divizion) yoki avtomatik qatnashuv */}
                                    {t.isOpen ? (
                                        t.registrationStartsAt && (
                                            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: t.status === "REGISTRATION" ? "#00CEC8" : "rgba(255,255,255,0.45)" }}>
                                                <ClipboardList className="h-3.5 w-3.5" /> {tr("tour.reg")}: {fmt(t.registrationStartsAt)} – {fmt(t.registrationEndsAt)}
                                            </div>
                                        )
                                    ) : t.division ? (
                                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-white/45">
                                            <ShieldCheck className="h-3.5 w-3.5 text-[#FFB020]" /> {tr("tour.auto")}
                                        </div>
                                    ) : null}
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

                {/* Arxiv — o'tgan turnirlar (retro) */}
                {retros.length > 0 && (
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <History className="h-4 w-4 text-[#00CEC8]" />
                            <h2 className="text-sm font-black uppercase tracking-wide text-white/70">{tr("tour.archive")}</h2>
                        </div>
                        <div className="space-y-3">
                            {retros.map(r => <RetroCard key={r.id} r={r} />)}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function RetroCard({ r }: { r: Retro }) {
    const tr = useEsT();
    const [open, setOpen] = useState(false);
    const stages = [...new Set(r.matches.map(m => m.stage))];
    return (
        <div className="rounded-3xl p-5" style={card}>
            <button onClick={() => setOpen(o => !o)} className="flex w-full items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-black text-white">{r.name} <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{r.season}</span></p>
                    <p className="text-xs font-semibold text-white/45">{r.game} · {r.organizer}</p>
                    {r.champion && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "rgba(255,176,32,0.14)", color: "#FFB020" }}><Crown className="h-3 w-3" /> {r.champion}</span>
                            {r.runnerUp && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white/60" style={{ background: "rgba(255,255,255,0.05)" }}><Medal className="h-3 w-3" /> {r.runnerUp}</span>}
                            {r.third && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white/45" style={{ background: "rgba(255,255,255,0.04)" }}>{"3-o'rin:"} {r.third}</span>}
                        </div>
                    )}
                </div>
                <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    {stages.map(stage => (
                        <div key={stage}>
                            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-[#00CEC8]">{stage}</p>
                            <div className="space-y-2">
                                {r.matches.filter(m => m.stage === stage).map(m => (
                                    <div key={m.order} className="rounded-2xl p-3" style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
                                        <div className="flex items-center gap-2">
                                            <span className={`flex-1 truncate text-right text-sm font-bold ${m.winner === m.teamA ? "text-white" : "text-white/45"}`}>{m.teamA}</span>
                                            <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-black text-white" style={{ background: "rgba(43,62,232,0.3)" }}>{m.scoreA == null ? "VS" : `${m.scoreA}:${m.scoreB}`}</span>
                                            <span className={`flex-1 truncate text-sm font-bold ${m.winner === m.teamB ? "text-white" : "text-white/45"}`}>{m.teamB}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                            <span className="text-[10px] text-white/35">{m.date}{m.time ? ` · ${m.time}` : ""}{m.note ? ` · ${m.note}` : ""}</span>
                                            {m.youtube && <a href={m.youtube} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#FF3C5F]"><Youtube className="h-3.5 w-3.5" /> {tr("tour.watch")}</a>}
                                        </div>
                                        {m.reason && <p className="mt-1 text-[10px] italic text-white/35">{m.reason}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
