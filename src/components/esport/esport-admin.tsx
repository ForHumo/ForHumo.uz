"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, ShieldAlert, Plus, Trash2, Check, X, CalendarDays,
    Layers, Users, Swords, BarChart3, Trophy, ChevronRight,
} from "lucide-react";

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };

interface Season { id: string; name: string; active: boolean; gameId: string }
interface Division { id: string; name: string; tier: number; gameId: string }
interface Team { id: string; name: string; tag: string; logo: string | null; enrolledDivisionId: string | null }
interface Match { id: string; divisionId: string; teamAId: string; teamBId: string; scoreA: number | null; scoreB: number | null; status: string }
interface StandRow { teamId: string; team: { name: string; tag: string } | null; points: number; wins: number; losses: number; played: number; rank: number }
interface StandDiv { id: string; name: string; tier: number; teams: StandRow[] }

type Tab = "season" | "division" | "enroll" | "match" | "table";

export default function EsportAdmin() {
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

    const teamName = useCallback((id: string) => teams.find(t => t.id === id)?.tag || "—", [teams]);

    const loadCore = useCallback(async () => {
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

    if (loading) return <main className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (denied) return (
        <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3" style={{ background: BG }}>
            <ShieldAlert className="h-10 w-10 text-white/30" />
            <p className="text-sm font-bold text-white/60">Bu sahifa faqat adminlar uchun</p>
            <Link href="/esport" className="text-sm font-bold text-[#00CEC8]">Orqaga</Link>
        </main>
    );

    const myDivs = divisions.filter(d => d.gameId === gameId).sort((a, b) => a.tier - b.tier);
    const reload = () => { loadCore(); if (seasonId) loadSeasonData(seasonId); };

    const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
        { id: "season", label: "Mavsum", icon: CalendarDays },
        { id: "division", label: "Divizion", icon: Layers },
        { id: "enroll", label: "Jamoa", icon: Users },
        { id: "match", label: "O'yin", icon: Swords },
        { id: "table", label: "Jadval", icon: BarChart3 },
    ];

    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-lg px-5 py-8">
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
                <div className="mb-5 grid grid-cols-5 gap-1.5">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1 rounded-xl py-2" style={tab === t.id ? { background: "rgba(43,62,232,0.22)", border: "1px solid rgba(0,206,200,0.4)" } : soft}>
                            <t.icon className="h-4 w-4" style={{ color: tab === t.id ? "#00CEC8" : "rgba(255,255,255,0.5)" }} />
                            <span className="text-[10px] font-bold text-white/70">{t.label}</span>
                        </button>
                    ))}
                </div>

                {tab === "season" && <SeasonTab seasons={seasons} gameId={gameId} api={api} reload={reload} busy={busy} />}
                {tab === "division" && <DivisionTab divisions={myDivs} gameId={gameId} api={api} reload={reload} busy={busy} />}
                {tab === "enroll" && <EnrollTab teams={teams} divisions={myDivs} seasonId={seasonId} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
                {tab === "match" && <MatchTab matches={matches} teams={teams} divisions={myDivs} seasonId={seasonId} teamName={teamName} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
                {tab === "table" && <TableTab standings={standings} divisions={myDivs} seasonId={seasonId} api={api} reload={() => loadSeasonData(seasonId)} busy={busy} />}
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
    const [name, setName] = useState("");
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">Yangi mavsum</p>
                <div className="flex gap-2">
                    <Inp value={name} onChange={setName} placeholder="Masalan 2026 Season 1" />
                    <Btn busy={busy} onClick={async () => { if (!name.trim()) return; await api("/api/esport/admin/seasons", "POST", { gameId, name }); setName(""); reload(); }}><Plus className="h-4 w-4" /></Btn>
                </div>
            </div>
            <div className="space-y-2">
                {seasons.map(s => (
                    <div key={s.id} className="flex items-center gap-2 rounded-2xl p-3" style={card}>
                        <CalendarDays className="h-4 w-4 text-white/40" />
                        <span className="flex-1 text-sm font-bold text-white">{s.name}</span>
                        {s.active ? <span className="text-[11px] font-bold text-[#00CEC8]">Faol</span> : <button onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, active: true }); reload(); }} className="text-[11px] font-bold text-white/50">Faollashtirish</button>}
                        {s.active && <button onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, end: true }); reload(); }} className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-300" style={{ background: "rgba(255,60,60,0.1)" }}>Tugatish</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DivisionTab({ divisions, gameId, api, reload, busy }: { divisions: Division[]; gameId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [name, setName] = useState("");
    const [tier, setTier] = useState("");
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">Yangi divizion (tier 1 = eng yuqori)</p>
                <div className="flex gap-2">
                    <Inp value={name} onChange={setName} placeholder="Nom" />
                    <Inp value={tier} onChange={setTier} placeholder="Tier" cls="w-20" />
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
    const divName = (id: string | null) => divisions.find(d => d.id === id)?.name;
    return (
        <div className="space-y-2">
            {teams.length === 0 && <p className="rounded-2xl p-6 text-center text-xs text-white/40" style={card}>Hali jamoa yo'q</p>}
            {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-2xl p-3" style={card}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{t.tag.slice(0, 3)}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{t.name}</p>{t.enrolledDivisionId && <p className="text-[11px] text-[#00CEC8]">{divName(t.enrolledDivisionId)}</p>}</div>
                    {t.enrolledDivisionId
                        ? <Check className="h-4 w-4 text-[#00CEC8]" />
                        : <button onClick={async () => { if (!seasonId) return; await api("/api/esport/admin/enroll", "POST", { teamId: t.id, seasonId }); reload(); }} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: ACCENT }}>Kiritish</button>}
                </div>
            ))}
        </div>
    );
}

function MatchTab({ matches, teams, divisions, seasonId, teamName, api, reload, busy }: { matches: Match[]; teams: Team[]; divisions: Division[]; seasonId: string; teamName: (id: string) => string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [divId, setDivId] = useState("");
    const [a, setA] = useState("");
    const [b, setB] = useState("");
    const inDiv = teams.filter(t => t.enrolledDivisionId === divId);
    return (
        <div className="space-y-3">
            <div className="rounded-2xl p-4" style={card}>
                <p className="mb-2 text-xs font-black uppercase text-white/40">Yangi o'yin</p>
                <div className="space-y-2">
                    <Pills label="Divizion" items={divisions.map(d => ({ id: d.id, label: d.name }))} value={divId} onChange={v => { setDivId(v); setA(""); setB(""); }} />
                    {divId && <>
                        <Pills label="A jamoa" items={inDiv.map(t => ({ id: t.id, label: t.tag }))} value={a} onChange={setA} />
                        <Pills label="B jamoa" items={inDiv.filter(t => t.id !== a).map(t => ({ id: t.id, label: t.tag }))} value={b} onChange={setB} />
                        <Btn busy={busy} onClick={async () => { if (!a || !b) return; const r = await api("/api/esport/admin/league-matches", "POST", { seasonId, divisionId: divId, teamAId: a, teamBId: b }); if (!r.error) { setA(""); setB(""); reload(); } }}><Plus className="h-4 w-4" /> O'yin qo'shish</Btn>
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
                    <button onClick={async () => { const r = await api("/api/esport/admin/league-matches", "PATCH", { id: m.id, scoreA: Number(sa), scoreB: Number(sb) }); if (!r.error) reload(); }} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: ACCENT }}>Saqlash</button>
                </div>
            )}
        </div>
    );
}

function TableTab({ standings, divisions, seasonId, api, reload, busy }: { standings: StandDiv[]; divisions: Division[]; seasonId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [moveTeam, setMoveTeam] = useState<string | null>(null);
    return (
        <div className="space-y-4">
            {standings.map(d => (
                <div key={d.id} className="rounded-2xl p-3" style={card}>
                    <p className="mb-2 px-1 text-sm font-black text-white">{d.name}</p>
                    {d.teams.length === 0 ? <p className="py-3 text-center text-xs text-white/30">Bo'sh</p> : d.teams.map(r => (
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
                                    <span className="w-full text-[10px] font-bold text-white/40">Ko'chirish:</span>
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
