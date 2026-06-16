"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, ShieldAlert, Plus, Trash2, Check, CalendarDays,
    Layers, Users, Swords, BarChart3, Trophy, ChevronRight, ArrowUp,
} from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "var(--es-card)", border: "1px solid var(--es-card-bd)" };
const soft = { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" };

interface Season { id: string; name: string; active: boolean; gameId: string }
interface Division { id: string; name: string; tier: number; gameId: string }
interface Team { id: string; name: string; tag: string; logo: string | null; enrolledDivisionId: string | null }
interface Match { id: string; divisionId: string; teamAId: string; teamBId: string; scoreA: number | null; scoreB: number | null; status: string }
interface StandRow { teamId: string; team: { name: string; tag: string } | null; points: number; wins: number; losses: number; played: number; rank: number }
interface StandDiv { id: string; name: string; tier: number; teams: StandRow[] }

type Tab = "season" | "division" | "enroll" | "match" | "table" | "turnir" | "adminlar";

export default function EsportAdmin() {
    const tr = useEsT();
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [tab, setTab] = useState<Tab>("season");

    const [gameId, setGameId] = useState("");
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [seasonId, setSeasonId] = useState("");
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [standings, setStandings] = useState<StandDiv[]>([]);
    const [busy, setBusy] = useState(false);
    const [isOwner, setIsOwner] = useState(false);

    const teamName = useCallback((id: string) => teams.find(t => t.id === id)?.tag || "—", [teams]);

    const loadCore = useCallback(async () => {
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsOwner(!!d.isOwner)).catch(() => { });
        const st = await fetch("/api/esport/standings").then(r => r.json()).catch(() => null);
        if (st?.gameId) setGameId(st.gameId);
        const [sx, dx] = await Promise.all([
            fetch("/api/esport/admin/seasons").then(r => r.json()),
            fetch("/api/esport/admin/divisions").then(r => r.json()),
        ]);
        if (sx.error) { setDenied(true); setLoading(false); return; }
        setSeasons(sx.seasons || []);
        setDivisions(dx.divisions || []);
        const active = (sx.seasons || []).find((s: Season) => s.active) || (sx.seasons || [])[0];
        if (active && !seasonId) setSeasonId(active.id);
        setLoading(false);
    }, [seasonId]);

    const loadSeasonData = useCallback(async (sid: string) => {
        if (!sid) return;
        const [tx, mx, st] = await Promise.all([
            fetch(`/api/esport/admin/teams?seasonId=${sid}`).then(r => r.json()),
            fetch(`/api/esport/admin/league-matches?seasonId=${sid}`).then(r => r.json()),
            fetch(`/api/esport/standings?seasonId=${sid}`).then(r => r.json()),
        ]);
        setTeams(tx.teams || []);
        setMatches(mx.matches || []);
        setStandings(st.divisions || []);
    }, []);

    useEffect(() => { loadCore(); }, [loadCore]);
    useEffect(() => { if (seasonId) loadSeasonData(seasonId); }, [seasonId, loadSeasonData]);

    async function api(url: string, method: string, body?: object) {
        setBusy(true);
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        return res;
    }

    if (loading) return <main className="flex items-center justify-center py-24" ><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (denied) return (
        <main className="flex flex-col items-center justify-center py-24 gap-3" >
            <ShieldAlert className="h-10 w-10 text-white/30" />
            <p className="text-sm font-bold text-white/60">{tr("adm.onlyAdmins")}</p>
            <Link href="/esport" className="text-sm font-bold text-[#00CEC8]">{tr("td.back")}</Link>
        </main>
    );

    const myDivs = divisions.filter(d => d.gameId === gameId).sort((a, b) => a.tier - b.tier);
    const reload = () => { loadCore(); if (seasonId) loadSeasonData(seasonId); };

    const TABS: { id: Tab; tkey: string; icon: typeof Layers }[] = [
        { id: "season", tkey: "adm.tabSeason", icon: CalendarDays },
        { id: "division", tkey: "adm.tabDivision", icon: Layers },
        { id: "enroll", tkey: "adm.tabTeam", icon: Users },
        { id: "match", tkey: "adm.tabMatch", icon: Swords },
        { id: "table", tkey: "adm.tabTable", icon: BarChart3 },
        { id: "turnir", tkey: "adm.tabTournament", icon: Trophy },
        ...(isOwner ? [{ id: "adminlar" as Tab, tkey: "adm.tabAdmins", icon: ShieldAlert }] : []),
    ];

    return (
        <main className="min-h-full" >
            <div className="mx-auto w-full max-w-4xl px-5 py-8">
                <div className="mb-4 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><Trophy className="h-5 w-5 text-white" /></div>
                        <h1 className="text-lg font-black text-white">eSport Admin</h1>
                    </div>
                </div>

                {/* Season selector */}
                <div className="mb-4 flex flex-wrap gap-2">
                    {seasons.map(s => (
                        <button key={s.id} onClick={() => setSeasonId(s.id)} className="rounded-xl px-3 py-1.5 text-xs font-bold" style={seasonId === s.id ? { background: ACCENT, color: "#fff" } : soft}>
                            {s.name}{s.active ? " ●" : ""}
                        </button>
                    ))}
                </div>

                {/* Tabs */}
                <div className="mb-5 grid grid-cols-3 gap-1.5">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1 rounded-xl py-2" style={tab === t.id ? { background: "rgba(43,62,232,0.22)", border: "1px solid rgba(0,206,200,0.4)" } : soft}>
                            <t.icon className="h-4 w-4" style={{ color: tab === t.id ? "#00CEC8" : "rgba(255,255,255,0.5)" }} />
                            <span className="text-[10px] font-bold text-white/70">{tr(t.tkey)}</span>
                        </button>
                    ))}
                </div>

                {tab === "season" && <SeasonTab seasons={seasons} gameId={gameId} api={api} reload={reload} busy={busy} />}
                {tab === "division" && <DivisionTab divisions={myDivs} gameId={gameId} api={api} reload={reload} busy={busy} />}
                {tab === "enroll" && <EnrollTab teams={teams} divisions={myDivs} seasonId={seasonId} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
                {tab === "match" && <MatchTab matches={matches} teams={teams} divisions={myDivs} seasonId={seasonId} teamName={teamName} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
                {tab === "table" && <TableTab standings={standings} divisions={myDivs} seasonId={seasonId} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
                {tab === "turnir" && <TournamentTab gameId={gameId} seasons={seasons} divisions={myDivs} seasonId={seasonId} api={api} busy={busy} />}
                {tab === "adminlar" && <AdminsTab api={api} busy={busy} />}
            </div>
        </main>
    );
}

type ApiFn = (url: string, method: string, body?: object) => Promise<{ error?: string;[k: string]: unknown }>;
const Inp = (p: { value: string; onChange: (v: string) => void; placeholder: string; cls?: string }) => (
    <input value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/30 ${p.cls || "w-full"}`} style={soft} />
);
const Btn = (p: { onClick: () => void; busy?: boolean; children: ReactNode }) => (
    <button onClick={p.onClick} disabled={p.busy} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: ACCENT }}>{p.children}</button>
);

function SeasonTab({ seasons, gameId, api, reload, busy }: { seasons: Season[]; gameId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const [name, setName] = useState("");
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">{tr("adm.newSeason")}</p>
                <div className="flex gap-2">
                    <Inp value={name} onChange={setName} placeholder={tr("adm.seasonPh")} />
                    <Btn busy={busy} onClick={async () => { if (!name.trim()) return; await api("/api/esport/admin/seasons", "POST", { gameId, name }); setName(""); reload(); }}><Plus className="h-4 w-4" /></Btn>
                </div>
            </div>
            <div className="space-y-2">
                {seasons.map(s => (
                    <div key={s.id} className="flex items-center gap-2 rounded-2xl p-3" style={card}>
                        <CalendarDays className="h-4 w-4 text-white/40" />
                        <span className="flex-1 text-sm font-bold text-white">{s.name}</span>
                        {s.active ? <span className="text-[11px] font-bold text-[#00CEC8]">{tr("adm.active")}</span> : <button onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, active: true }); reload(); }} className="text-[11px] font-bold text-white/50">{tr("adm.activate")}</button>}
                        {s.active && <button onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, end: true }); reload(); }} className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-300" style={{ background: "rgba(255,60,60,0.1)" }}>{tr("adm.end")}</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DivisionTab({ divisions, gameId, api, reload, busy }: { divisions: Division[]; gameId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const [name, setName] = useState("");
    const [tier, setTier] = useState("");
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">{tr("adm.newDiv")}</p>
                <div className="flex gap-2">
                    <Inp value={name} onChange={setName} placeholder={tr("adm.namePh")} />
                    <Inp value={tier} onChange={setTier} placeholder={tr("adm.tierPh")} cls="w-20" />
                    <Btn busy={busy} onClick={async () => { if (!name.trim() || !tier) return; const r = await api("/api/esport/admin/divisions", "POST", { gameId, name, tier: Number(tier) }); if (!r.error) { setName(""); setTier(""); reload(); } }}><Plus className="h-4 w-4" /></Btn>
                </div>
            </div>
            <div className="space-y-2">
                {divisions.map(d => (
                    <div key={d.id} className="flex items-center gap-2 rounded-2xl p-3" style={card}>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: ACCENT }}>{d.tier}</span>
                        <span className="flex-1 text-sm font-bold text-white">{d.name}</span>
                        <button onClick={async () => { await api("/api/esport/admin/divisions", "DELETE", { id: d.id }); reload(); }}><Trash2 className="h-4 w-4 text-red-300/60" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EnrollTab({ teams, divisions, seasonId, api, reload, busy }: { teams: Team[]; divisions: Division[]; seasonId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const divName = (id: string | null) => divisions.find(d => d.id === id)?.name;
    return (
        <div className="space-y-2">
            {teams.length === 0 && <p className="rounded-2xl p-6 text-center text-xs text-white/40" style={card}>{tr("adm.noTeams")}</p>}
            {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-2xl p-3" style={card}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{t.tag.slice(0, 3)}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{t.name}</p>{t.enrolledDivisionId && <p className="text-[11px] text-[#00CEC8]">{divName(t.enrolledDivisionId)}</p>}</div>
                    {t.enrolledDivisionId
                        ? <Check className="h-4 w-4 text-[#00CEC8]" />
                        : <button onClick={async () => { if (!seasonId) return; await api("/api/esport/admin/enroll", "POST", { teamId: t.id, seasonId }); reload(); }} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: ACCENT }}>{tr("adm.enroll")}</button>}
                </div>
            ))}
        </div>
    );
}

function MatchTab({ matches, teams, divisions, seasonId, teamName, api, reload, busy }: { matches: Match[]; teams: Team[]; divisions: Division[]; seasonId: string; teamName: (id: string) => string; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const [divId, setDivId] = useState("");
    const [a, setA] = useState("");
    const [b, setB] = useState("");
    const inDiv = teams.filter(t => t.enrolledDivisionId === divId);
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">{tr("adm.newMatch")}</p>
                <div className="space-y-2">
                    <Pills label={tr("adm.tabDivision")} items={divisions.map(d => ({ id: d.id, label: d.name }))} value={divId} onChange={v => { setDivId(v); setA(""); setB(""); }} />
                    {divId && <>
                        <Pills label={`A ${tr("common.team")}`} items={inDiv.map(t => ({ id: t.id, label: t.tag }))} value={a} onChange={setA} />
                        <Pills label={`B ${tr("common.team")}`} items={inDiv.filter(t => t.id !== a).map(t => ({ id: t.id, label: t.tag }))} value={b} onChange={setB} />
                        <Btn busy={busy} onClick={async () => { if (!a || !b) return; const r = await api("/api/esport/admin/league-matches", "POST", { seasonId, divisionId: divId, teamAId: a, teamBId: b }); if (!r.error) { setA(""); setB(""); reload(); } }}><Plus className="h-4 w-4" /> {tr("adm.newMatch")}</Btn>
                    </>}
                </div>
            </div>
            <div className="space-y-2">
                {matches.map(m => <MatchRow key={m.id} m={m} teamName={teamName} api={api} reload={reload} />)}
            </div>
        </div>
    );
}

function MatchRow({ m, teamName, api, reload }: { m: Match; teamName: (id: string) => string; api: ApiFn; reload: () => void }) {
    const tr = useEsT();
    const [sa, setSa] = useState("");
    const [sb, setSb] = useState("");
    const done = m.status === "DONE";
    return (
        <div className="rounded-2xl p-3" style={card}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{teamName(m.teamAId)}</span>
                {done ? <span className="text-sm font-black text-[#00CEC8]">{m.scoreA} : {m.scoreB}</span> : <span className="text-xs text-white/30">vs</span>}
                <span className="text-sm font-bold text-white">{teamName(m.teamBId)}</span>
            </div>
            {!done && (
                <div className="mt-2 flex items-center gap-2">
                    <input value={sa} onChange={e => setSa(e.target.value)} placeholder="0" className="w-12 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-white outline-none" style={soft} />
                    <span className="text-white/30">:</span>
                    <input value={sb} onChange={e => setSb(e.target.value)} placeholder="0" className="w-12 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-white outline-none" style={soft} />
                    <button onClick={async () => { const r = await api("/api/esport/admin/league-matches", "PATCH", { id: m.id, scoreA: Number(sa), scoreB: Number(sb) }); if (!r.error) reload(); }} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: ACCENT }}>{tr("adm.save")}</button>
                </div>
            )}
        </div>
    );
}

function TableTab({ standings, divisions, seasonId, api, reload, busy }: { standings: StandDiv[]; divisions: Division[]; seasonId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const [moveTeam, setMoveTeam] = useState<string | null>(null);
    const [confirmPromo, setConfirmPromo] = useState(false);
    return (
        <div className="space-y-4">
            {/* Mavsum yakuni: avto ko'tarilish/tushish */}
            <div className="rounded-2xl p-3" style={card}>
                {!confirmPromo ? (
                    <button onClick={() => setConfirmPromo(true)} disabled={busy || !seasonId} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white" style={{ background: ACCENT }}>
                        <ArrowUp className="h-4 w-4" /> {tr("adm.promoBtn")}
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-white/70">{tr("adm.promoConfirm")}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmPromo(false)} className="flex-1 rounded-xl py-2 text-xs font-bold text-white/70" style={soft}>{tr("adm.cancel")}</button>
                            <button disabled={busy} onClick={async () => { await api("/api/esport/admin/promote", "POST", { seasonId }); setConfirmPromo(false); reload(); }} className="flex-1 rounded-xl py-2 text-xs font-black text-white" style={{ background: ACCENT }}>{tr("adm.confirm")}</button>
                        </div>
                    </div>
                )}
            </div>
            {standings.map(d => (
                <div key={d.id} className="rounded-2xl p-3" style={card}>
                    <p className="mb-2 px-1 text-sm font-black text-white">{d.name}</p>
                    {d.teams.length === 0 ? <p className="py-3 text-center text-xs text-white/30">{"Bo'sh"}</p> : d.teams.map(r => (
                        <div key={r.teamId}>
                            <button onClick={() => setMoveTeam(moveTeam === r.teamId ? null : r.teamId)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left">
                                <span className="w-4 text-center text-xs font-bold text-white/40">{r.rank}</span>
                                <span className="flex-1 truncate text-sm font-bold text-white">{r.team?.name}</span>
                                <span className="text-[11px] text-white/40">{r.wins}-{r.losses}</span>
                                <span className="w-8 text-right text-sm font-black text-white">{r.points}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                            </button>
                            {moveTeam === r.teamId && (
                                <div className="mb-1 flex flex-wrap gap-1.5 rounded-xl p-2" style={soft}>
                                    <span className="w-full text-[10px] font-bold text-white/40">{"Ko'chirish:"}</span>
                                    {divisions.filter(dd => dd.id !== d.id).map(dd => (
                                        <button key={dd.id} disabled={busy} onClick={async () => { await api("/api/esport/admin/move", "POST", { seasonId, teamId: r.teamId, toDivisionId: dd.id }); setMoveTeam(null); reload(); }} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: "rgba(43,62,232,0.3)" }}>{dd.name}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

interface TournamentLite { id: string; name: string; status: string; prizePool: number | null; currency: string; teams: number; maxTeams: number }

function TournamentTab({ gameId, divisions, seasonId, api, busy }: { gameId: string; seasons: Season[]; divisions: Division[]; seasonId: string; api: ApiFn; busy: boolean }) {
    const tr = useEsT();
    const [list, setList] = useState<TournamentLite[]>([]);
    const [name, setName] = useState("");
    const [prize, setPrize] = useState("");
    const [maxTeams, setMaxTeams] = useState("");
    const [divId, setDivId] = useState("");

    const load = useCallback(async () => {
        const d = await fetch(`/api/esport/admin/tournaments?gameId=${gameId}`).then(r => r.json()).catch(() => ({}));
        setList(d.tournaments || []);
    }, [gameId]);
    useEffect(() => { if (gameId) load(); }, [gameId, load]);

    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">{tr("adm.newTournament")}</p>
                <div className="space-y-2">
                    <Inp value={name} onChange={setName} placeholder={tr("adm.tNamePh")} />
                    <div className="flex gap-2">
                        <Inp value={prize} onChange={setPrize} placeholder={tr("adm.prizePh")} />
                        <Inp value={maxTeams} onChange={setMaxTeams} placeholder={tr("adm.maxTeamsPh")} cls="w-40" />
                    </div>
                    <Pills label={tr("adm.divOpt")} items={[{ id: "", label: tr("adm.none") }, ...divisions.map(d => ({ id: d.id, label: d.name }))]} value={divId} onChange={setDivId} />
                    <Btn busy={busy} onClick={async () => {
                        if (!name.trim()) return;
                        const r = await api("/api/esport/admin/tournaments", "POST", {
                            gameId, name, prizePool: prize ? Number(prize) : null,
                            maxTeams: maxTeams ? Number(maxTeams) : 16,
                            seasonId: divId ? seasonId : null, divisionId: divId || null,
                        });
                        if (!r.error) { setName(""); setPrize(""); setMaxTeams(""); setDivId(""); load(); }
                    }}><Plus className="h-4 w-4" /> {tr("adm.newTournament")}</Btn>
                </div>
            </div>
            <div className="space-y-2">
                {list.map(t => <TourAdminRow key={t.id} t={t} api={api} reload={load} busy={busy} />)}
            </div>
        </div>
    );
}

function TourAdminRow({ t, api, reload, busy }: { t: TournamentLite; api: ApiFn; reload: () => void; busy: boolean }) {
    const tr = useEsT();
    const [prize, setPrize] = useState(t.prizePool != null ? String(t.prizePool) : "");
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl p-3" style={card}>
            <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#FFB020]" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{t.name}</p>
                    <p className="text-[11px] text-white/40">{t.status} · {t.teams}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""} jamoa · {t.prizePool ? `${t.prizePool.toLocaleString()} so'm` : "fondsiz"}</p>
                </div>
                <button onClick={() => setOpen(o => !o)} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: "rgba(43,62,232,0.3)" }}>{tr("adm.fund")}</button>
                <Link href={`/esport/tournaments/${t.id}`} className="flex h-7 w-7 items-center justify-center rounded-lg" style={soft}><ChevronRight className="h-4 w-4 text-white/40" /></Link>
            </div>
            {open && (
                <div className="mt-2 flex items-center gap-2">
                    <Inp value={prize} onChange={setPrize} placeholder={tr("adm.prizePh")} />
                    <Btn busy={busy} onClick={async () => { await api(`/api/esport/admin/tournaments/${t.id}`, "PATCH", { prizePool: prize ? Number(prize) : 0 }); setOpen(false); reload(); }}><Check className="h-4 w-4" /></Btn>
                </div>
            )}
        </div>
    );
}

interface AdminRow { humoId: string; name: string | null; username: string | null; image: string | null }

function AdminsTab({ api, busy }: { api: ApiFn; busy: boolean }) {
    const tr = useEsT();
    const [list, setList] = useState<AdminRow[]>([]);
    const [humoId, setHumoId] = useState("");
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        const d = await fetch("/api/esport/admin/admins").then(r => r.json()).catch(() => ({}));
        setList(d.admins || []);
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-1 text-xs font-black uppercase text-white/40">{tr("adm.addAdmin")}</p>
                <p className="mb-2 text-[11px] text-white/40">{tr("adm.addAdminHint")}</p>
                <div className="flex gap-2">
                    <Inp value={humoId} onChange={v => setHumoId(v.toUpperCase())} placeholder="UZ1234567" />
                    <Btn busy={busy} onClick={async () => {
                        setMsg("");
                        const r = await api("/api/esport/admin/admins", "POST", { humoId });
                        if (r.error) setMsg(String(r.error)); else { setHumoId(""); setMsg(`${tr("adm.added")}: ${r.name || humoId}`); load(); }
                    }}><Plus className="h-4 w-4" /></Btn>
                </div>
                {msg && <p className="mt-2 text-xs font-semibold text-[#00CEC8]">{msg}</p>}
            </div>
            <div className="space-y-2">
                {list.length === 0 && <p className="rounded-2xl p-6 text-center text-xs text-white/40" style={card}>{tr("adm.noAdmins")}</p>}
                {list.map(a => (
                    <div key={a.humoId} className="flex items-center gap-3 rounded-2xl p-3" style={card}>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{a.image ? <img src={a.image} alt="" className="h-full w-full rounded-lg object-cover" /> : (a.name || a.humoId).slice(0, 2).toUpperCase()}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{a.name || a.humoId}</p><p className="text-[11px] text-white/40">{a.username ? `@${a.username} · ` : ""}{a.humoId}</p></div>
                        <button onClick={async () => { await api("/api/esport/admin/admins", "DELETE", { humoId: a.humoId }); load(); }}><Trash2 className="h-4 w-4 text-red-300/60" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Pills({ label, items, value, onChange }: { label: string; items: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-white/35">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {items.length === 0 && <span className="text-[11px] text-white/30">—</span>}
                {items.map(i => (
                    <button key={i.id} onClick={() => onChange(i.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={value === i.id ? { background: ACCENT, color: "#fff" } : soft}>{i.label}</button>
                ))}
            </div>
        </div>
    );
}
