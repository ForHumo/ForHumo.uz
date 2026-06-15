"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Loader2, Trophy, TrendingUp, Swords, Crown, Star, Gamepad2, Newspaper, Coins, CalendarClock, Plus, X, Send, Trash2, ImagePlus } from "lucide-react";
import EsportBroadcast, { type Broadcast } from "./esport-broadcast";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface T { id: string; name: string; game: string; status: string; teams: number; prizePool: number | null; currency: string }
interface TopTeam { team: TeamLite; rating: number; game: string }
interface TopPlayer { id: string; ign: string; position: string | null; roleLabel: string; team: TeamLite | null; rating: number; game: string }
interface Result { a: TeamLite | null; b: TeamLite | null; scoreA: number | null; scoreB: number | null; winnerId: string | null }
interface NewsItem { id: string; kind: string; title: string; body: string | null; image: string | null; pinned?: boolean; createdAt: string }
interface ExpPlayer { id: string; ign: string; position: string | null; image: string | null; value: number; team: { name: string; tag: string } | null }
interface ExpTeam { team: TeamLite; value: number }
interface Upcoming { a: TeamLite | null; b: TeamLite | null; at: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
    UPCOMING: { label: "Tez orada", cls: "es-mut" },
    REGISTRATION: { label: "Ro'yxat ochiq", cls: "es-accent-text" },
    LIVE: { label: "Jonli", cls: "text-rose-500" },
};
function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }

const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function EsportHome() {
    const [loading, setLoading] = useState(true);
    const [casts, setCasts] = useState<Broadcast[]>([]);
    const [tournaments, setTournaments] = useState<T[]>([]);
    const [topTeams, setTopTeams] = useState<TopTeam[]>([]);
    const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [expPlayers, setExpPlayers] = useState<ExpPlayer[]>([]);
    const [expTeams, setExpTeams] = useState<ExpTeam[]>([]);
    const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    // News admin
    const [newsOpen, setNewsOpen] = useState(false);
    const [nTitle, setNTitle] = useState("");
    const [nBody, setNBody] = useState("");
    const [nImage, setNImage] = useState("");
    const [nBusy, setNBusy] = useState(false);
    const newsFileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(() => {
        fetch("/api/esport/home").then(r => r.json()).then(d => {
            setCasts(d.broadcasts || []);
            setTournaments(d.tournaments || []); setTopTeams(d.topTeams || []);
            setTopPlayers(d.topPlayers || []); setResults(d.results || []);
            setNews(d.news || []); setExpPlayers(d.expensivePlayers || []); setExpTeams(d.expensiveTeams || []);
            setUpcoming(d.upcoming || []); setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
    }, [load]);

    async function uploadNewsImg(file: File) {
        setNBusy(true);
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({}));
        setNBusy(false); if (r.url) setNImage(r.url);
    }
    async function addNews() {
        if (!nTitle.trim()) return;
        setNBusy(true);
        await fetch("/api/esport/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: nTitle, body: nBody, image: nImage || null }) }).catch(() => { });
        setNBusy(false); setNTitle(""); setNBody(""); setNImage(""); setNewsOpen(false); load();
    }
    async function delNews(id: string) {
        await fetch(`/api/esport/news/${id}`, { method: "DELETE" }).catch(() => { });
        load();
    }

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
                        <EsportBroadcast broadcasts={casts} isAdmin={isAdmin} onChanged={load} />
                    </motion.div>

                    {/* Yangiliklar */}
                    <motion.section {...fade} transition={{ duration: 0.35, delay: 0.07 }} className="mt-6">
                        <div className="mb-2.5 flex items-center justify-between px-1">
                            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Newspaper className="h-4 w-4 es-accent-text" /> Yangiliklar</h2>
                            {isAdmin && !newsOpen && <button onClick={() => setNewsOpen(true)} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white es-accent-bg"><Plus className="h-3.5 w-3.5" /> Qo'shish</button>}
                        </div>
                        {isAdmin && newsOpen && (
                            <div className="mb-3 space-y-2 rounded-2xl p-4 es-card">
                                <div className="flex items-center justify-between"><p className="text-sm font-black es-fg">Yangilik qo'shish</p><button onClick={() => setNewsOpen(false)}><X className="h-4 w-4 es-mut" /></button></div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => newsFileRef.current?.click()} className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl es-soft">{nImage ? <img src={nImage} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 es-mut" />}</button>
                                    <input ref={newsFileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadNewsImg(f); }} />
                                    <input value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="Sarlavha" className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                                </div>
                                <textarea value={nBody} onChange={e => setNBody(e.target.value)} placeholder="Matn (ixtiyoriy)" rows={2} className="w-full rounded-xl px-3 py-2 text-sm es-fg es-soft outline-none placeholder:opacity-50" />
                                <button onClick={addNews} disabled={nBusy} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white es-accent-bg disabled:opacity-50">{nBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} E'lon qilish</button>
                            </div>
                        )}
                        {news.length === 0 ? <div className="rounded-2xl p-5 es-card"><Empty text="Hozircha yangilik yo'q" /></div> : (
                            <div className="flex gap-3 overflow-x-auto pb-1 nx-hide-scrollbar">
                                {news.map(n => (
                                    <div key={n.id} className="relative w-64 shrink-0 overflow-hidden rounded-2xl es-card">
                                        {n.image && <img src={n.image} alt="" className="h-28 w-full object-cover" />}
                                        <div className="p-3">
                                            <div className="mb-1 flex items-center gap-1.5">
                                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${n.kind === "auto" ? "es-mut es-soft" : "text-white es-accent-bg"}`}>{n.kind === "auto" ? "Avto" : "Yangilik"}</span>
                                                {n.pinned && <Star className="h-3 w-3 text-amber-400" />}
                                            </div>
                                            <p className="text-sm font-black es-fg">{n.title}</p>
                                            {n.body && <p className="mt-1 line-clamp-2 text-[11px] es-mut">{n.body}</p>}
                                        </div>
                                        {isAdmin && n.kind === "admin" && <button onClick={() => delNews(n.id)} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white"><Trash2 className="h-3 w-3" /></button>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.section>

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

                    {/* Eng qimmat o'yinchilar · Eng qimmat jamoalar */}
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.22 }} className="rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Coins className="h-4 w-4 text-amber-400" /> Eng qimmat o'yinchilar</h2>
                            {expPlayers.length === 0 ? <Empty text="Hali narx belgilanmagan" /> : (
                                <div className="space-y-1.5">
                                    {expPlayers.map((p, i) => (
                                        <Link key={p.id} href={`/esport/a/${p.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 es-soft transition-transform hover:scale-[1.02]">
                                            <Rank i={i} />
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-black text-white es-accent-bg">{p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : p.ign.slice(0, 2).toUpperCase()}</div>
                                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold es-fg">{p.ign}</p><p className="truncate text-[11px] es-mut">{p.team ? `[${p.team.tag}]` : "Erkin"}</p></div>
                                            <span className="shrink-0 text-xs font-black text-amber-400">{som(p.value)}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.section>
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.24 }} className="rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><Coins className="h-4 w-4 text-amber-400" /> Eng qimmat jamoalar</h2>
                            {expTeams.length === 0 ? <Empty text="Hali narx belgilanmagan" /> : (
                                <div className="space-y-1.5">
                                    {expTeams.map((t, i) => (
                                        <Link key={t.team.id} href={`/esport/teams/${t.team.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 es-soft transition-transform hover:scale-[1.02]">
                                            <Rank i={i} />
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-black text-white es-accent-bg">{t.team.logo ? <img src={t.team.logo} alt="" className="h-full w-full object-cover" /> : t.team.tag.slice(0, 3)}</div>
                                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold es-fg">{t.team.name}</p><p className="truncate text-[11px] es-mut">[{t.team.tag}]</p></div>
                                            <span className="shrink-0 text-xs font-black text-amber-400">{som(t.value)}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.section>
                    </div>

                    {/* Bo'lajak o'yinlar */}
                    {upcoming.length > 0 && (
                        <motion.section {...fade} transition={{ duration: 0.35, delay: 0.26 }} className="mt-4 rounded-3xl p-5 es-card">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide es-fg"><CalendarClock className="h-4 w-4 es-accent-text" /> Bo'lajak o'yinlar</h2>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {upcoming.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 rounded-2xl p-3 es-soft">
                                        <span className="flex-1 truncate text-right text-sm font-bold es-fg">{m.a?.tag || "—"}</span>
                                        <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold es-mut" style={{ background: "var(--es-soft)" }}>{fmtDate(m.at)}</span>
                                        <span className="flex-1 truncate text-sm font-bold es-fg">{m.b?.tag || "—"}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* So'nggi natijalar */}
                    <motion.section {...fade} transition={{ duration: 0.35, delay: 0.28 }} className="mt-4 rounded-3xl p-5 es-card">
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
        </div>
    );
}

function Rank({ i }: { i: number }) {
    if (i === 0) return <span className="w-5 text-center"><Crown className="mx-auto h-4 w-4 text-amber-400" /></span>;
    return <span className="w-5 text-center text-sm font-black es-faint">{i + 1}</span>;
}
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-xs es-faint">{text}</p>; }
function som(n: number) { return `${n.toLocaleString()} so'm`; }
const MON = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
function fmtDate(iso: string | null) {
    if (!iso) return "—";
    const t = new Date(new Date(iso).getTime() + 5 * 3600e3); // Toshkent +5
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${t.getUTCDate()} ${MON[t.getUTCMonth()]} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}
