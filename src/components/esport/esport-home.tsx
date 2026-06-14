"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, Trophy, TrendingUp, Swords, Coins, Users, ChevronRight, Crown } from "lucide-react";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface T { id: string; name: string; game: string; status: string; teams: number; prizePool: number | null; currency: string }
interface TopTeam { team: TeamLite; rating: number; game: string }
interface Result { a: TeamLite | null; b: TeamLite | null; scoreA: number | null; scoreB: number | null; winnerId: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
    UPCOMING: { label: "Tez orada", cls: "es-mut" },
    REGISTRATION: { label: "Ro'yxat ochiq", cls: "es-accent-text" },
    LIVE: { label: "Jonli", cls: "text-rose-500" },
};
function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }

export default function EsportHome() {
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<T[]>([]);
    const [topTeams, setTopTeams] = useState<TopTeam[]>([]);
    const [results, setResults] = useState<Result[]>([]);

    useEffect(() => {
        fetch("/api/esport/home").then(r => r.json()).then(d => {
            setTournaments(d.tournaments || []); setTopTeams(d.topTeams || []); setResults(d.results || []); setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {/* Hero */}
            <div className="relative mb-6 overflow-hidden rounded-3xl es-card">
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,150,255,.25), transparent 70%)", filter: "blur(30px)" }} />
                <div className="relative flex items-center gap-4 p-6 sm:p-8">
                    <Image src="/esport-logo.png" alt="Humo eSport" width={72} height={72} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
                    <div>
                        <h1 className="text-2xl font-black tracking-tight es-fg sm:text-3xl">Humo eSport</h1>
                        <p className="text-sm font-semibold es-mut">Kibersport ekotizimi — turnirlar, divizionlar, transferlar</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Faol turnirlar */}
                    <section className="rounded-3xl p-5 es-card">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Trophy className="h-4 w-4 es-accent-text" /> Turnirlar</h2>
                        {tournaments.length === 0 ? <Empty text="Hozircha turnir yo'q" /> : (
                            <div className="space-y-2">
                                {tournaments.map(t => (
                                    <Link key={t.id} href={`/esport/tournaments/${t.id}`} className="flex items-center gap-3 rounded-2xl p-3 es-soft">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl es-accent-bg"><Trophy className="h-4 w-4 text-white" /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold es-fg">{t.name}</p>
                                            <p className="text-[11px] es-mut">{t.game} · {t.teams} jamoa{t.prizePool ? ` · ${money(t.prizePool, t.currency)}` : ""}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold ${STATUS[t.status]?.cls || "es-mut"}`}>{STATUS[t.status]?.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Eng yuqori Elo */}
                    <section className="rounded-3xl p-5 es-card">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><TrendingUp className="h-4 w-4 es-accent-text" /> Eng kuchli jamoalar</h2>
                        {topTeams.length === 0 ? <Empty text="Hali reyting yo'q" /> : (
                            <div className="space-y-1.5">
                                {topTeams.map((r, i) => (
                                    <Link key={r.team.id} href={`/esport/teams/${r.team.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 es-soft">
                                        <span className="w-5 text-center text-sm font-black es-faint">{i === 0 ? <Crown className="mx-auto h-4 w-4 text-amber-400" /> : i + 1}</span>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white es-accent-bg">{r.team.logo ? <img src={r.team.logo} alt="" className="h-full w-full rounded-lg object-cover" /> : r.team.tag.slice(0, 3)}</div>
                                        <span className="min-w-0 flex-1 truncate text-sm font-bold es-fg">{r.team.name}</span>
                                        <span className="text-sm font-black es-accent-text">{r.rating}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* So'nggi natijalar */}
                    <section className="rounded-3xl p-5 es-card lg:col-span-2">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Swords className="h-4 w-4 es-accent-text" /> So'nggi natijalar</h2>
                        {results.length === 0 ? <Empty text="Hali o'yin o'tkazilmagan" /> : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {results.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 rounded-2xl p-3 es-soft">
                                        <span className={`flex-1 truncate text-right text-sm font-bold ${m.winnerId && m.a && m.winnerId === m.a.id ? "es-fg" : "es-mut"}`}>{m.a?.tag || "—"}</span>
                                        <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-black es-fg" style={{ background: "rgba(0,150,255,0.12)" }}>{m.scoreA}:{m.scoreB}</span>
                                        <span className={`flex-1 truncate text-sm font-bold ${m.winnerId && m.b && m.winnerId === m.b.id ? "es-fg" : "es-mut"}`}>{m.b?.tag || "—"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Tezkor havolalar (mobil qulaylik) */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Quick href="/esport/athlete" icon={Users} label="Sportchi" />
                <Quick href="/esport/teams" icon={Users} label="Jamoalar" />
                <Quick href="/esport/standings" icon={TrendingUp} label="Divizionlar" />
                <Quick href="/esport/transfers" icon={Coins} label="Transfer" />
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-xs es-faint">{text}</p>; }
function Quick({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
    return (
        <Link href={href} className="flex items-center justify-between rounded-2xl p-4 es-card">
            <span className="flex items-center gap-2 text-sm font-bold es-fg"><Icon className="h-4 w-4 es-accent-text" /> {label}</span>
            <ChevronRight className="h-4 w-4 es-faint" />
        </Link>
    );
}
