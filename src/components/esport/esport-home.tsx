"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Loader2, Trophy, TrendingUp, Swords, Coins, Users, ChevronRight, Crown, Star, Gamepad2 } from "lucide-react";
import EsportBroadcast, { type Broadcast } from "./esport-broadcast";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface T { id: string; name: string; game: string; status: string; teams: number; prizePool: number | null; currency: string }
interface TopTeam { team: TeamLite; rating: number; game: string }
interface TopPlayer { id: string; ign: string; position: string | null; roleLabel: string; team: TeamLite | null; rating: number; game: string }
interface Result { a: TeamLite | null; b: TeamLite | null; scoreA: number | null; scoreB: number | null; winnerId: string | null }
interface Casts { live: Broadcast[]; scheduled: Broadcast[]; ended: Broadcast[] }

const STATUS: Record<string, { label: string; cls: string }> = {
    UPCOMING: { label: "Tez orada", cls: "es-mut" },
    REGISTRATION: { label: "Ro'yxat ochiq", cls: "es-accent-text" },
    LIVE: { label: "Jonli", cls: "text-rose-500" },
};
function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }

const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function EsportHome() {
    const [loading, setLoading] = useState(true);
    const [casts, setCasts] = useState<Casts>({ live: [], scheduled: [], ended: [] });
    const [tournaments, setTournaments] = useState<T[]>([]);
    const [topTeams, setTopTeams] = useState<TopTeam[]>([]);
    const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const load = useCallback(() => {
        fetch("/api/esport/home").then(r => r.json()).then(d => {
            setCasts(d.broadcasts || { live: [], scheduled: [], ended: [] });
            setTournaments(d.tournaments || []); setTopTeams(d.topTeams || []);
            setTopPlayers(d.topPlayers || []); setResults(d.results || []); setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, [load]);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {/* Hero */}
            <motion.div {...fade} transition={{ duration: 0.4 }} className="relative mb-6 overflow-hidden rounded-3xl es-card">
                <div className="pointer-events-none absolute inset-0 es-accent-bg3 opacity-[0.08]" />
                <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full es-accent-bg3 opacity-30" style={{ filter: "blur(60px)" }} />
                <div className="relative flex items-center gap-4 p-6 sm:p-8">
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl es-accent-bg3 opacity-50 blur-lg" />
                        <Image src="/esport-logo.png" alt="Humo eSport" width={80} height={80} className="relative h-16 w-16 object-contain sm:h-20 sm:w-20" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="es-accent-text3 text-2xl font-black tracking-tight sm:text-4xl">Humo eSport</h1>
                        <p className="mt-1 text-sm font-semibold es-mut sm:text-base">Kibersport arenasi — turnirlar, divizionlar, transferlar va jonli efir</p>
                    </div>
                </div>
            </motion.div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>
            ) : (
                <>
                    {/* Translyatsiya oynasi 16:9 */}
                    <motion.div {...fade} transition={{ duration: 0.4, delay: 0.05 }} className="mb-3">
                        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-wide es-fg">
                            <Swords className="h-4 w-4 es-accent-text" /> Turnir efiri
                        </h2>
                        <EsportBroadcast live={casts.live} scheduled={casts.scheduled} ended={casts.ended} isAdmin={isAdmin} onChanged={load} />
                    </motion.div>

                    {/* 3 karta: Turnirlar · Top jamoalar · Top o'yinchilar */}
                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        {/* Turnirlar */}
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.1 }} className="rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Trophy className="h-4 w-4 es-accent-text" /> Turnirlar</h2>
                            {tournaments.length === 0 ? <Empty text="Hozircha turnir yo'q" /> : (
                                <div className="space-y-2">
                                    {tournaments.map(t => (
                                        <Link key={t.id} href={`/esport/tournaments/${t.id}`} className="flex items-center gap-3 rounded-2xl p-3 es-soft transition-transform hover:scale-[1.02]">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl es-accent-bg"><Trophy className="h-4 w-4 text-white" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold es-fg">{t.name}</p>
                                                <p className="truncate text-[11px] es-mut">{t.game} · {t.teams} jamoa{t.prizePool ? ` · ${money(t.prizePool, t.currency)}` : ""}</p>
                                            </div>
                                            <span className={`shrink-0 text-[11px] font-bold ${STATUS[t.status]?.cls || "es-mut"}`}>{STATUS[t.status]?.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.section>

                        {/* Top 5 jamoa */}
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.15 }} className="rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><TrendingUp className="h-4 w-4 es-accent-text" /> Eng kuchli jamoalar</h2>
                            {topTeams.length === 0 ? <Empty text="Hali reyting yo'q" /> : (
                                <div className="space-y-1.5">
                                    {topTeams.map((r, i) => (
                                        <Link key={r.team.id} href={`/esport/teams/${r.team.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 es-soft transition-transform hover:scale-[1.02]">
                                            <Rank i={i} />
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-black text-white es-accent-bg">{r.team.logo ? <img src={r.team.logo} alt="" className="h-full w-full object-cover" /> : r.team.tag.slice(0, 3)}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold es-fg">{r.team.name}</p>
                                                <p className="truncate text-[11px] es-mut">{r.game}</p>
                                            </div>
                                            <span className="shrink-0 text-sm font-black es-accent-text">{r.rating}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.section>

                        {/* Top 5 o'yinchi */}
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.2 }} className="rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Star className="h-4 w-4 es-accent-text" /> Eng kuchli o'yinchilar</h2>
                            {topPlayers.length === 0 ? <Empty text="Hali o'yinchi yo'q" /> : (
                                <div className="space-y-1.5">
                                    {topPlayers.map((p, i) => (
                                        <Link key={p.id} href={`/esport/a/${p.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 es-soft transition-transform hover:scale-[1.02]">
                                            <Rank i={i} />
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white es-accent-bg">{p.ign.slice(0, 2).toUpperCase()}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold es-fg">{p.ign}</p>
                                                <p className="truncate text-[11px] es-mut">{p.team ? `[${p.team.tag}]` : "Erkin"}{p.position ? ` · ${p.position}` : ""}</p>
                                            </div>
                                            <span className="shrink-0 text-sm font-black es-accent-text">{p.rating}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.section>
                    </div>

                    {/* So'nggi natijalar */}
                    <motion.section {...fade} transition={{ duration: 0.35, delay: 0.25 }} className="mt-4 rounded-3xl p-5 es-card">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Gamepad2 className="h-4 w-4 es-accent-text" /> So'nggi natijalar</h2>
                        {results.length === 0 ? <Empty text="Hali o'yin o'tkazilmagan" /> : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {results.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 rounded-2xl p-3 es-soft">
                                        <span className={`flex-1 truncate text-right text-sm font-bold ${m.winnerId && m.a && m.winnerId === m.a.id ? "es-fg" : "es-mut"}`}>{m.a?.tag || "—"}</span>
                                        <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-black text-white es-accent-bg">{m.scoreA}:{m.scoreB}</span>
                                        <span className={`flex-1 truncate text-sm font-bold ${m.winnerId && m.b && m.winnerId === m.b.id ? "es-fg" : "es-mut"}`}>{m.b?.tag || "—"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                </>
            )}

            {/* Tezkor havolalar */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Quick href="/esport/athlete" icon={Users} label="Sportchi" />
                <Quick href="/esport/teams" icon={Users} label="Jamoalar" />
                <Quick href="/esport/standings" icon={TrendingUp} label="Divizionlar" />
                <Quick href="/esport/transfers" icon={Coins} label="Transfer" />
            </div>
        </div>
    );
}

function Rank({ i }: { i: number }) {
    if (i === 0) return <span className="w-5 text-center"><Crown className="mx-auto h-4 w-4 text-amber-400" /></span>;
    return <span className="w-5 text-center text-sm font-black es-faint">{i + 1}</span>;
}
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-xs es-faint">{text}</p>; }
function Quick({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
    return (
        <Link href={href} className="flex items-center justify-between rounded-2xl p-4 es-card transition-transform hover:scale-[1.03]">
            <span className="flex items-center gap-2 text-sm font-bold es-fg"><Icon className="h-4 w-4 es-accent-text" /> {label}</span>
            <ChevronRight className="h-4 w-4 es-faint" />
        </Link>
    );
}
