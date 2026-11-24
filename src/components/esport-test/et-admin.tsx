"use client";

// Humo eSport PREMIUM admin — oldingi esport-admin bilan bir xil funksional
// (mavsum/divizion/jamoa/match/jadval/turnir/nizo/adminlar), premium dizaynда,
// native date o'rnida EtDatePicker. Barcha API'lar o'zgarmagan.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
    ShieldAlert, Plus, Trash2, Check, CalendarDays, X, Flag, ImagePlus,
    Layers, Users, Swords, BarChart3, Trophy, ChevronRight, ArrowUp, Loader2, ArrowLeft,
    ShieldCheck, Gamepad2,
} from "lucide-react";
import { EtDatePicker } from "./et-date-picker";

interface Season { id: string; name: string; active: boolean; gameId: string }
interface Division { id: string; name: string; tier: number; gameId: string }
interface Team { id: string; name: string; tag: string; logo: string | null; enrolledDivisionId: string | null }
interface Match { id: string; divisionId: string; teamAId: string; teamBId: string; scoreA: number | null; scoreB: number | null; status: string }
interface StandRow { teamId: string; team: { name: string; tag: string } | null; points: number; wins: number; losses: number; played: number; rank: number }
interface StandDiv { id: string; name: string; tier: number; teams: StandRow[] }
interface DisputeRow { id: string; matchType: string; matchId: string; team: { id: string; name: string; tag: string } | null; reason: string; screenshotUrl: string | null; demoUrl: string | null; status: string; adminNote: string | null; createdAt: string }
type Tab = "season" | "division" | "enroll" | "match" | "table" | "turnir" | "nizo" | "tekshiruv" | "adminlar";
type ApiFn = (url: string, method: string, body?: object) => Promise<{ error?: string;[k: string]: unknown }>;

export default function EtAdmin() {
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

    const api: ApiFn = async (url, method, body) => {
        setBusy(true);
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        return res;
    };

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Loader2 className="animate-spin" style={{ width: 28, height: 28, color: "var(--es-faint)" }} /></div>;
    if (denied) return (
        <div className="et-glass et-rise" style={{ marginTop: 40, padding: "50px 20px", textAlign: "center" }}>
            <ShieldAlert style={{ width: 42, height: 42, color: "var(--es-faint)", margin: "0 auto 12px" }} />
            <div className="et-fh" style={{ fontWeight: 700, fontSize: "1.05rem" }}>Faqat adminlar</div>
            <p style={{ color: "var(--es-mut)", fontSize: ".88rem", margin: "6px 0 16px" }}>Bu bo'lim Humo eSport egasi va adminlari uchun.</p>
            <Link href="/esport-test" className="et-btn ghost" style={{ textDecoration: "none" }}><ArrowLeft size={15} /> Orqaga</Link>
        </div>
    );

    const myDivs = divisions.filter(d => d.gameId === gameId).sort((a, b) => a.tier - b.tier);
    const reloadSeason = () => loadSeasonData(seasonId);
    const reloadAll = () => { loadCore(); if (seasonId) loadSeasonData(seasonId); };

    const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
        { id: "season", label: "Mavsum", icon: CalendarDays },
        { id: "division", label: "Divizion", icon: Layers },
        { id: "enroll", label: "Jamoa", icon: Users },
        { id: "match", label: "Match", icon: Swords },
        { id: "table", label: "Jadval", icon: BarChart3 },
        { id: "turnir", label: "Turnir", icon: Trophy },
        { id: "nizo", label: "Nizo", icon: Flag },
        { id: "tekshiruv", label: "Tekshiruv", icon: ShieldCheck },
        ...(isOwner ? [{ id: "adminlar" as Tab, label: "Adminlar", icon: ShieldAlert }] : []),
    ];

    return (
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise">
                <span style={{ width: 40, height: 40, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image src="/esport-logo.png" alt="Humo eSport" width={40} height={40} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </span>
                <div><h2>Humo eSport Admin</h2><p>Mavsum, divizion, turnir va boshqaruv — premium.</p></div>
            </div>

            {/* Season selector */}
            {seasons.length > 0 && (
                <div className="et-rise et-d1" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
                    {seasons.map(s => (
                        <button key={s.id} className={`et-pbtn${seasonId === s.id ? " on" : ""}`} onClick={() => setSeasonId(s.id)}>
                            {s.name}{s.active ? " ●" : ""}
                        </button>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="et-tabbar et-rise et-d2">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} className={`et-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
                            <Icon size={17} /><b>{t.label}</b>
                        </button>
                    );
                })}
            </div>

            <div className="et-rise et-d3">
                {tab === "season" && <SeasonTab seasons={seasons} gameId={gameId} api={api} reload={reloadAll} busy={busy} />}
                {tab === "division" && <DivisionTab divisions={myDivs} gameId={gameId} api={api} reload={reloadAll} busy={busy} />}
                {tab === "enroll" && <EnrollTab teams={teams} divisions={myDivs} seasonId={seasonId} api={api} reload={reloadSeason} busy={busy} />}
                {tab === "match" && <MatchTab matches={matches} teams={teams} divisions={myDivs} seasonId={seasonId} teamName={teamName} api={api} reload={reloadSeason} busy={busy} />}
                {tab === "table" && <TableTab standings={standings} divisions={myDivs} seasonId={seasonId} api={api} reload={reloadSeason} busy={busy} />}
                {tab === "turnir" && <TournamentTab gameId={gameId} divisions={myDivs} seasonId={seasonId} api={api} busy={busy} />}
                {tab === "nizo" && <DisputeTab />}
                {tab === "tekshiruv" && <VerifyTab api={api} busy={busy} />}
                {tab === "adminlar" && <AdminsTab api={api} busy={busy} />}
            </div>
        </div>
    );
}

/* ---- shared ---- */
function Card({ children, title, sub }: { children: ReactNode; title?: string; sub?: string }) {
    return (
        <div className="et-glass" style={{ padding: 18, marginBottom: 12 }}>
            {title && <div className="et-lbl">{title}</div>}
            {sub && <p style={{ color: "var(--es-faint)", fontSize: ".78rem", marginTop: -3, marginBottom: 10 }}>{sub}</p>}
            {children}
        </div>
    );
}
function Pills({ label, items, value, onChange }: { label: string; items: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <span className="et-lbl">{label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {items.length === 0 && <span style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>—</span>}
                {items.map(i => <button key={i.id} className={`et-pbtn${value === i.id ? " on" : ""}`} onClick={() => onChange(i.id)}>{i.label}</button>)}
            </div>
        </div>
    );
}

/* ---- Season ---- */
function SeasonTab({ seasons, gameId, api, reload, busy }: { seasons: Season[]; gameId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [name, setName] = useState("");
    const [rName, setRName] = useState("");
    const [rStart, setRStart] = useState("");
    const [rEnd, setREnd] = useState("");
    const [rMsg, setRMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const active = seasons.find(s => s.active);
    return (
        <div>
            <Card title="Yangi mavsum">
                <div style={{ display: "flex", gap: 8 }}>
                    <input className="et-inp" value={name} onChange={e => setName(e.target.value)} placeholder="masalan, 2026 Mavsum 1" />
                    <button className="et-mini" disabled={busy} onClick={async () => { if (!name.trim()) return; await api("/api/esport/admin/seasons", "POST", { gameId, name }); setName(""); reload(); }}><Plus size={16} /></button>
                </div>
            </Card>

            {active && (
                <Card title="Mavsum almashuvi" sub="Joriy mavsum yopiladi; jamoalar ko'tarilish/tushish bilan keyingi mavsumga o'tadi (reyting nollanadi).">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input className="et-inp" value={rName} onChange={e => setRName(e.target.value)} placeholder="Keyingi mavsum nomi" />
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 180px" }}><span className="et-lbl">Boshlanish</span><EtDatePicker value={rStart} onChange={setRStart} placeholder="Boshlanish sanasi" /></div>
                            <div style={{ flex: "1 1 180px" }}><span className="et-lbl">Tugash</span><EtDatePicker value={rEnd} onChange={setREnd} placeholder="Tugash sanasi" /></div>
                        </div>
                        <button className="et-mini" disabled={busy} style={{ alignSelf: "flex-start" }} onClick={async () => {
                            if (!rName.trim()) return; setRMsg(null);
                            const r = await api("/api/esport/admin/seasons/rollover", "POST", { seasonId: active.id, nextName: rName, nextStartsAt: rStart || null, nextEndsAt: rEnd || null });
                            if (r.error) setRMsg({ ok: false, t: String(r.error) }); else { setRMsg({ ok: true, t: `Bajarildi: ${r.carried} jamoa o'tdi` }); setRName(""); setRStart(""); setREnd(""); reload(); }
                        }}><ArrowUp size={16} /> Almashuvni boshlash</button>
                        {rMsg && <p className={rMsg.ok ? "et-okmsg" : "et-errmsg"}>{rMsg.t}</p>}
                    </div>
                </Card>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {seasons.map(s => (
                    <div key={s.id} className="et-row">
                        <span className="et-logo" style={{ width: 34, height: 34, background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", color: "var(--es-c2)" }}><CalendarDays size={15} /></span>
                        <span className="et-nm" style={{ flex: 1 }}>{s.name}</span>
                        {s.active
                            ? <><span className="et-chip reg">Faol</span><button className="et-mini danger" onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, end: true }); reload(); }}>Tugat</button></>
                            : <button className="et-mini ghost" onClick={async () => { await api("/api/esport/admin/seasons", "PATCH", { id: s.id, active: true }); reload(); }}>Faollashtir</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---- Division ---- */
function DivisionTab({ divisions, gameId, api, reload, busy }: { divisions: Division[]; gameId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [name, setName] = useState("");
    const [tier, setTier] = useState("");
    return (
        <div>
            <Card title="Yangi divizion">
                <div style={{ display: "flex", gap: 8 }}>
                    <input className="et-inp" value={name} onChange={e => setName(e.target.value)} placeholder="Nom" />
                    <input className="et-inp" style={{ width: 90 }} value={tier} onChange={e => setTier(e.target.value)} placeholder="Tier" inputMode="numeric" />
                    <button className="et-mini" disabled={busy} onClick={async () => { if (!name.trim() || !tier) return; const r = await api("/api/esport/admin/divisions", "POST", { gameId, name, tier: Number(tier) }); if (!r.error) { setName(""); setTier(""); reload(); } }}><Plus size={16} /></button>
                </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {divisions.map(d => (
                    <div key={d.id} className="et-row">
                        <span className="et-logo" style={{ width: 30, height: 30, fontSize: ".82rem" }}>{d.tier}</span>
                        <span className="et-nm" style={{ flex: 1 }}>{d.name}</span>
                        <button className="et-mini danger" onClick={async () => { await api("/api/esport/admin/divisions", "DELETE", { id: d.id }); reload(); }}><Trash2 size={15} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---- Enroll ---- */
function EnrollTab({ teams, divisions, seasonId, api, reload, busy }: { teams: Team[]; divisions: Division[]; seasonId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const divName = (id: string | null) => divisions.find(d => d.id === id)?.name;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {teams.length === 0 && <div className="et-glass"><div className="et-empty"><span className="ic"><Users size={22} /></span><b>Jamoa yo'q</b>Avval jamoa ro'yxatdan o'tsin.</div></div>}
            {teams.map(t => (
                <div key={t.id} className="et-row">
                    <span className="et-logo" style={{ width: 36, height: 36, fontSize: ".78rem" }}>{t.logo ? <img src={t.logo} alt="" /> : t.tag.slice(0, 3)}</span>
                    <span className="et-nm" style={{ flex: 1 }}>{t.name}{t.enrolledDivisionId && <small style={{ color: "var(--es-c2)" }}>{divName(t.enrolledDivisionId)}</small>}</span>
                    {t.enrolledDivisionId
                        ? <Check size={18} style={{ color: "var(--es-c2)" }} />
                        : <button className="et-mini" disabled={busy} onClick={async () => { if (!seasonId) return; await api("/api/esport/admin/enroll", "POST", { teamId: t.id, seasonId }); reload(); }}>Qo'shish</button>}
                </div>
            ))}
        </div>
    );
}

/* ---- Match ---- */
function MatchTab({ matches, teams, divisions, seasonId, teamName, api, reload, busy }: { matches: Match[]; teams: Team[]; divisions: Division[]; seasonId: string; teamName: (id: string) => string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [divId, setDivId] = useState("");
    const [a, setA] = useState("");
    const [b, setB] = useState("");
    const [dbl, setDbl] = useState(false);
    const [fxStart, setFxStart] = useState("");
    const [fxInt, setFxInt] = useState("7");
    const [fxMsg, setFxMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const inDiv = teams.filter(t => t.enrolledDivisionId === divId);
    return (
        <div>
            <Card title="Yangi o'yin">
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    <Pills label="Divizion" items={divisions.map(d => ({ id: d.id, label: d.name }))} value={divId} onChange={v => { setDivId(v); setA(""); setB(""); }} />
                    {divId && <>
                        <Pills label="A jamoa" items={inDiv.map(t => ({ id: t.id, label: t.tag }))} value={a} onChange={setA} />
                        <Pills label="B jamoa" items={inDiv.filter(t => t.id !== a).map(t => ({ id: t.id, label: t.tag }))} value={b} onChange={setB} />
                        <button className="et-mini" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={async () => { if (!a || !b) return; const r = await api("/api/esport/admin/league-matches", "POST", { seasonId, divisionId: divId, teamAId: a, teamBId: b }); if (!r.error) { setA(""); setB(""); reload(); } }}><Plus size={16} /> O'yin qo'shish</button>
                    </>}
                </div>
            </Card>

            <Card title="To'liq jadval (fixture) — avtomatik">
                {!divId ? <p style={{ fontSize: ".82rem", color: "var(--es-faint)" }}>Yuqoridан divizion tanlang.</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                        <label className="et-check"><input type="checkbox" checked={dbl} onChange={e => setDbl(e.target.checked)} /> Ikki aylanali (uy/mehmon)</label>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: "1 1 180px" }}><span className="et-lbl">Boshlanish</span><EtDatePicker value={fxStart} onChange={setFxStart} placeholder="Boshlanish sanasi" /></div>
                            <div style={{ width: 110 }}><span className="et-lbl">Interval (kun)</span><input className="et-inp" style={{ textAlign: "center" }} value={fxInt} onChange={e => setFxInt(e.target.value)} inputMode="numeric" /></div>
                        </div>
                        <button className="et-mini" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={async () => {
                            setFxMsg(null);
                            const r = await api("/api/esport/admin/league-matches/generate", "POST", { seasonId, divisionId: divId, double: dbl, startsAt: fxStart || null, intervalDays: Number(fxInt) || 7 });
                            if (r.error) setFxMsg({ ok: false, t: String(r.error) }); else { setFxMsg({ ok: true, t: `Yaratildi: ${r.created} o'yin` }); reload(); }
                        }}><CalendarDays size={16} /> Jadval yaratish</button>
                        {fxMsg && <p className={fxMsg.ok ? "et-okmsg" : "et-errmsg"}>{fxMsg.t}</p>}
                    </div>
                )}
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
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
        <div className="et-glass" style={{ padding: 13 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="et-fh" style={{ fontWeight: 600, fontSize: ".9rem" }}>{teamName(m.teamAId)}</span>
                {done ? <span className="et-fh et-grad" style={{ fontWeight: 700 }}>{m.scoreA} : {m.scoreB}</span> : <span style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>vs</span>}
                <span className="et-fh" style={{ fontWeight: 600, fontSize: ".9rem" }}>{teamName(m.teamBId)}</span>
            </div>
            {!done && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <input className="et-score-inp" value={sa} onChange={e => setSa(e.target.value)} placeholder="0" inputMode="numeric" />
                    <span style={{ color: "var(--es-faint)" }}>:</span>
                    <input className="et-score-inp" value={sb} onChange={e => setSb(e.target.value)} placeholder="0" inputMode="numeric" />
                    <button className="et-mini" style={{ marginLeft: "auto" }} onClick={async () => { const r = await api("/api/esport/admin/league-matches", "PATCH", { id: m.id, scoreA: Number(sa), scoreB: Number(sb) }); if (!r.error) reload(); }}>Saqlash</button>
                </div>
            )}
        </div>
    );
}

/* ---- Table ---- */
function TableTab({ standings, divisions, seasonId, api, reload, busy }: { standings: StandDiv[]; divisions: Division[]; seasonId: string; api: ApiFn; reload: () => void; busy: boolean }) {
    const [moveTeam, setMoveTeam] = useState<string | null>(null);
    const [confirmPromo, setConfirmPromo] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="et-glass" style={{ padding: 14 }}>
                {!confirmPromo ? (
                    <button className="et-mini" style={{ width: "100%" }} disabled={busy || !seasonId} onClick={() => setConfirmPromo(true)}><ArrowUp size={16} /> Mavsum yakuni — ko'tarilish/tushish</button>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <p style={{ fontSize: ".84rem", color: "var(--es-mut)" }}>Har divizion yuqori/quyi jamoalari ko'chadi. Davom etamizmi?</p>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="et-mini ghost" style={{ flex: 1 }} onClick={() => setConfirmPromo(false)}>Bekor</button>
                            <button className="et-mini" style={{ flex: 1 }} disabled={busy} onClick={async () => { await api("/api/esport/admin/promote", "POST", { seasonId }); setConfirmPromo(false); reload(); }}>Tasdiqlash</button>
                        </div>
                    </div>
                )}
            </div>
            {standings.map(d => (
                <div key={d.id} className="et-glass" style={{ padding: 16 }}>
                    <div className="et-fh" style={{ fontWeight: 700, fontSize: ".98rem", marginBottom: 10 }}>{d.name}</div>
                    {d.teams.length === 0 ? <p style={{ textAlign: "center", padding: "10px 0", fontSize: ".82rem", color: "var(--es-faint)" }}>Bo'sh</p> : d.teams.map(r => (
                        <div key={r.teamId}>
                            <button onClick={() => setMoveTeam(moveTeam === r.teamId ? null : r.teamId)} className="et-row" style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid transparent", background: "transparent" }}>
                                <span className={`et-rank g${r.rank}`} style={{ width: 20 }}>{r.rank}</span>
                                <span className="et-nm" style={{ flex: 1 }}>{r.team?.name}</span>
                                <span style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>{r.wins}-{r.losses}</span>
                                <span className="et-fh" style={{ fontWeight: 700, width: 30, textAlign: "right" }}>{r.points}</span>
                                <ChevronRight size={14} style={{ color: "var(--es-faint)" }} />
                            </button>
                            {moveTeam === r.teamId && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "8px 10px", margin: "2px 0 6px", borderRadius: 12, background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
                                    <span className="et-lbl" style={{ width: "100%", margin: 0 }}>Ko'chirish:</span>
                                    {divisions.filter(dd => dd.id !== d.id).map(dd => (
                                        <button key={dd.id} className="et-pbtn" disabled={busy} onClick={async () => { await api("/api/esport/admin/move", "POST", { seasonId, teamId: r.teamId, toDivisionId: dd.id }); setMoveTeam(null); reload(); }}>{dd.name}</button>
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

/* ---- Tournament ---- */
interface TournamentLite { id: string; name: string; status: string; prizePool: number | null; currency: string; teams: number; maxTeams: number }
function TournamentTab({ gameId, divisions, seasonId, api, busy }: { gameId: string; divisions: Division[]; seasonId: string; api: ApiFn; busy: boolean }) {
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
        <div>
            <Card title="Yangi turnir">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input className="et-inp" value={name} onChange={e => setName(e.target.value)} placeholder="Turnir nomi" />
                    <div style={{ display: "flex", gap: 8 }}>
                        <input className="et-inp" value={prize} onChange={e => setPrize(e.target.value)} placeholder="Mukofot fondi (ixtiyoriy)" inputMode="numeric" />
                        <input className="et-inp" style={{ width: 150 }} value={maxTeams} onChange={e => setMaxTeams(e.target.value)} placeholder="Maks jamoa" inputMode="numeric" />
                    </div>
                    <Pills label="Divizion (ixtiyoriy)" items={[{ id: "", label: "Yo'q" }, ...divisions.map(d => ({ id: d.id, label: d.name }))]} value={divId} onChange={setDivId} />
                    <button className="et-mini" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={async () => {
                        if (!name.trim()) return;
                        const r = await api("/api/esport/admin/tournaments", "POST", { gameId, name, prizePool: prize ? Number(prize) : null, maxTeams: maxTeams ? Number(maxTeams) : 16, seasonId: divId ? seasonId : null, divisionId: divId || null });
                        if (!r.error) { setName(""); setPrize(""); setMaxTeams(""); setDivId(""); load(); }
                    }}><Plus size={16} /> Turnir yaratish</button>
                </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {list.map(t => <TourAdminRow key={t.id} t={t} api={api} reload={load} busy={busy} />)}
            </div>
        </div>
    );
}
function TourAdminRow({ t, api, reload, busy }: { t: TournamentLite; api: ApiFn; reload: () => void; busy: boolean }) {
    const [prize, setPrize] = useState(t.prizePool != null ? String(t.prizePool) : "");
    const [open, setOpen] = useState(false);
    return (
        <div className="et-glass" style={{ padding: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="et-logo" style={{ width: 34, height: 34 }}><Trophy size={15} color="#fff" /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="et-fh" style={{ fontWeight: 600, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ fontSize: ".74rem", color: "var(--es-faint)" }}>{t.status} · {t.teams}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""} jamoa · {t.prizePool ? `${t.prizePool.toLocaleString()} so'm` : "fondsiz"}</div>
                </div>
                <button className="et-mini ghost" onClick={() => setOpen(o => !o)}>Fond</button>
                <Link href={`/esport-test/tournaments/${t.id}`} className="et-mini ghost" style={{ textDecoration: "none", padding: "9px 10px" }} title="Setka / boshqaruv"><ChevronRight size={15} /></Link>
            </div>
            {open && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input className="et-inp" value={prize} onChange={e => setPrize(e.target.value)} placeholder="Mukofot fondi" inputMode="numeric" />
                    <button className="et-mini" disabled={busy} onClick={async () => { await api(`/api/esport/admin/tournaments/${t.id}`, "PATCH", { prizePool: prize ? Number(prize) : 0 }); setOpen(false); reload(); }}><Check size={16} /></button>
                </div>
            )}
        </div>
    );
}

/* ---- Disputes ---- */
function DisputeTab() {
    const [list, setList] = useState<DisputeRow[]>([]);
    const [note, setNote] = useState<Record<string, string>>({});
    const [working, setWorking] = useState(false);
    const load = useCallback(async () => {
        const d = await fetch("/api/esport/disputes").then(r => r.json()).catch(() => ({}));
        setList(d.disputes || []);
    }, []);
    useEffect(() => { load(); }, [load]);
    async function decide(id: string, action: "resolve" | "reject") {
        setWorking(true);
        await fetch(`/api/esport/disputes/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: note[id] || null }) }).catch(() => { });
        setWorking(false); load();
    }
    const stChip = (s: string) => s === "OPEN" ? "up" : s === "RESOLVED" ? "reg" : "end";
    const stLabel = (s: string) => s === "OPEN" ? "Ochiq" : s === "RESOLVED" ? "Qabul" : "Rad";
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {list.length === 0 && <div className="et-glass"><div className="et-empty"><span className="ic"><Flag size={22} /></span><b>Nizo yo'q</b>Barcha e'tirozlar ko'rib chiqilgan.</div></div>}
            {list.map(d => (
                <div key={d.id} className="et-glass" style={{ padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <span className="et-fh" style={{ fontWeight: 600, fontSize: ".88rem" }}>{d.team?.tag ?? "—"} · {d.matchType === "TOURNAMENT" ? "Turnir" : "Liga"}</span>
                        <span className={`et-chip ${stChip(d.status)}`}>{stLabel(d.status)}</span>
                    </div>
                    <p style={{ fontSize: ".84rem", color: "var(--es-mut)" }}>{d.reason}</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
                        {d.screenshotUrl && <a href={d.screenshotUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".78rem", fontWeight: 600, color: "var(--es-c2)" }}><ImagePlus size={13} /> Dalil</a>}
                        {d.demoUrl && <a href={d.demoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".78rem", fontWeight: 600, color: "var(--es-c2)" }}><Swords size={13} /> Demo/replay</a>}
                    </div>
                    {d.adminNote && <p style={{ fontSize: ".78rem", color: "var(--es-faint)", marginTop: 5 }}>{d.adminNote}</p>}
                    {d.status === "OPEN" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                            <input className="et-inp" value={note[d.id] || ""} onChange={e => setNote(n => ({ ...n, [d.id]: e.target.value }))} placeholder="Hakam izohi (ixtiyoriy)" />
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="et-mini" style={{ flex: 1 }} disabled={working} onClick={() => decide(d.id, "resolve")}><Check size={15} /> Qabul</button>
                                <button className="et-mini ghost" style={{ flex: 1 }} disabled={working} onClick={() => decide(d.id, "reject")}><X size={15} /> Rad</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ---- Tekshiruv (akkaunt verdikt) ---- */
interface PendingProof { id: string; externalId: string; proofCode: string | null; athlete: { ign: string; gameUserId: string; gameServer: string | null; game: { name: string } } | null }
interface FlaggedAcct { id: string; platform: string; externalId: string; handle: string | null; verdict: string; snapshot: { reasons?: string[] } | null; athlete: { ign: string; game: { name: string } } | null }

function VerifyTab({ api, busy }: { api: ApiFn; busy: boolean }) {
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<PendingProof[]>([]);
    const [flagged, setFlagged] = useState<FlaggedAcct[]>([]);
    const load = useCallback(async () => {
        const d = await fetch("/api/esport/admin/verify").then(r => r.json()).catch(() => null);
        if (d && !d.error) { setPending(d.pending || []); setFlagged(d.flagged || []); }
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);
    async function decide(accountId: string, action: "approve" | "reject") {
        await api("/api/esport/admin/verify", "POST", { accountId, action });
        load();
    }
    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Loader2 className="animate-spin" size={22} style={{ color: "var(--es-faint)" }} /></div>;
    return (
        <div>
            <Card title={`MLBB kod-isbot tasdiqlash (${pending.length})`} sub="O'yinchi kodni o'yin ichidagi nikiga qo'yib skrinshot yuboradi — shuni ko'rib tasdiqlang.">
                {pending.length === 0 ? (
                    <div className="et-empty"><span className="ic"><Gamepad2 size={22} /></span><b>Kutayotgan yo'q</b></div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {pending.map(p => (
                            <div key={p.id} className="et-row" style={{ cursor: "default", flexWrap: "wrap", gap: 8 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: ".9rem", fontWeight: 700 }}>{p.athlete?.ign ?? "—"}</div>
                                    <div style={{ fontSize: ".72rem", color: "var(--es-faint)" }}>{p.athlete?.game.name} · ID {p.athlete?.gameUserId}{p.athlete?.gameServer ? ` (${p.athlete.gameServer})` : ""}</div>
                                </div>
                                <code style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 8, background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", color: "var(--es-c2)" }}>{p.proofCode}</code>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button className="et-mini" disabled={busy} onClick={() => decide(p.id, "approve")}><Check size={14} /> Tasdiq</button>
                                    <button className="et-mini ghost" disabled={busy} onClick={() => decide(p.id, "reject")}><X size={14} /> Rad</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card title={`Bloklangan akkauntlar (${flagged.length})`} sub="Tekshiruv BLOK bergan akkauntlar — bu o'yinchilar bilan turnirga ro'yxatdan o'tib bo'lmaydi.">
                {flagged.length === 0 ? (
                    <div className="et-empty"><span className="ic"><ShieldCheck size={22} /></span><b>Bloklangan yo'q</b></div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {flagged.map(f => (
                            <div key={f.id} className="et-glass" style={{ padding: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: ".9rem", fontWeight: 700 }}>{f.athlete?.ign ?? "—"}</span>
                                    <span style={{ fontSize: ".72rem", color: "var(--es-faint)" }}>{f.platform} · {f.athlete?.game.name}</span>
                                    <span className="et-chip" style={{ marginLeft: "auto", color: "#ff6b6b", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.28)" }}>BLOK</span>
                                </div>
                                {f.snapshot?.reasons && f.snapshot.reasons.length > 0 && (
                                    <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                                        {f.snapshot.reasons.slice(0, 4).map((r, i) => <li key={i} style={{ fontSize: ".72rem", color: "var(--es-faint)" }}>· {r}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

/* ---- Admins ---- */
interface AdminRow { humoId: string; name: string | null; username: string | null; image: string | null }
function AdminsTab({ api, busy }: { api: ApiFn; busy: boolean }) {
    const [list, setList] = useState<AdminRow[]>([]);
    const [humoId, setHumoId] = useState("");
    const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const load = useCallback(async () => {
        const d = await fetch("/api/esport/admin/admins").then(r => r.json()).catch(() => ({}));
        setList(d.admins || []);
    }, []);
    useEffect(() => { load(); }, [load]);
    return (
        <div>
            <Card title="Admin qo'shish" sub="Humo ID (UZxxxxxxx) orqali admin tayinlang. Faqat ega qo'sha oladi.">
                <div style={{ display: "flex", gap: 8 }}>
                    <input className="et-inp" value={humoId} onChange={e => setHumoId(e.target.value.toUpperCase())} placeholder="UZ1234567" />
                    <button className="et-mini" disabled={busy} onClick={async () => {
                        setMsg(null);
                        const r = await api("/api/esport/admin/admins", "POST", { humoId });
                        if (r.error) setMsg({ ok: false, t: String(r.error) }); else { setHumoId(""); setMsg({ ok: true, t: `Qo'shildi: ${r.name || humoId}` }); load(); }
                    }}><Plus size={16} /></button>
                </div>
                {msg && <p className={msg.ok ? "et-okmsg" : "et-errmsg"}>{msg.t}</p>}
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {list.length === 0 && <div className="et-glass"><div className="et-empty"><span className="ic"><ShieldAlert size={22} /></span><b>Admin yo'q</b></div></div>}
                {list.map(a => (
                    <div key={a.humoId} className="et-row">
                        <span className="et-logo" style={{ width: 34, height: 34, fontSize: ".72rem" }}>{a.image ? <img src={a.image} alt="" /> : (a.name || a.humoId).slice(0, 2).toUpperCase()}</span>
                        <span className="et-nm" style={{ flex: 1 }}>{a.name || a.humoId}<small>{a.username ? `@${a.username} · ` : ""}{a.humoId}</small></span>
                        <button className="et-mini danger" onClick={async () => { await api("/api/esport/admin/admins", "DELETE", { humoId: a.humoId }); load(); }}><Trash2 size={15} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}
