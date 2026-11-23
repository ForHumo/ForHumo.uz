"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Trophy, Crown, Medal, Award, History, Users, CalendarDays } from "lucide-react";

interface T { id: string; name: string; game: { name: string; slug: string } | null; status: string; division: { name: string; tier: number } | null; isOpen: boolean; prizePool: number | null; currency: string; maxTeams: number; teams: number }
interface RMatch { order: number; stage: string; teamA: string; teamB: string; scoreA: number | null; scoreB: number | null; winner: string | null }
interface Retro { id: string; name: string; season: string; game: string; organizer: string; startDate: string; endDate: string; prizePool: number | null; currency: string; champion: string | null; runnerUp: string | null; third: string | null; matches: RMatch[] }

function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }
const ST: Record<string, { c: string; t: string }> = {
    LIVE: { c: "live", t: "Jonli" }, REGISTRATION: { c: "reg", t: "Ro'yxat ochiq" },
    UPCOMING: { c: "up", t: "Tez orada" }, ENDED: { c: "end", t: "Tugadi" },
};
function ymd(s: string) { const d = new Date(s); return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`; }

export default function EtTournaments() {
    const [tab, setTab] = useState(0);
    const [tours, setTours] = useState<T[]>([]);
    const [retros, setRetros] = useState<Retro[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/esport/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
            fetch("/api/esport/retro").then(r => r.json()).catch(() => ({ retros: [] })),
        ]).then(([a, b]) => { setTours(a.tournaments || []); setRetros(b.retros || []); setLoading(false); });
    }, []);

    return (
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise"><span className="num"><Trophy size={15} /></span><div><h2>Turnirlar</h2><p>Faol turnirlar va Humo eSport tarixi.</p></div></div>

            <div className="et-seg et-rise et-d1" style={{ maxWidth: 360, marginBottom: 20 }}>
                <span className="pill" style={{ left: tab === 0 ? 5 : "50%", width: "calc(50% - 5px)" }} />
                <button className={tab === 0 ? "on" : ""} onClick={() => setTab(0)}><Trophy size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Faol</button>
                <button className={tab === 1 ? "on" : ""} onClick={() => setTab(1)}><History size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Tarix</button>
            </div>

            {loading ? (
                <div className="et-grid et-g2">{[0, 1, 2, 3].map(i => <div key={i} className="et-skel" style={{ height: 130 }} />)}</div>
            ) : tab === 0 ? (
                tours.length === 0 ? (
                    <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><Trophy size={24} /></span><b>Hozircha faol turnir yo'q</b>Admin paneldан yangi turnir oching.</div></div>
                ) : (
                    <div className="et-grid et-g2">
                        {tours.map((t, i) => (
                            <Link key={t.id} href={`/esport-test/tournaments/${t.id}`} className={`et-glass et-rise et-d${(i % 6) + 1}`} style={{ padding: 18, textDecoration: "none", color: "inherit", display: "block" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                                        <span className="et-logo" style={{ width: 42, height: 42 }}><Trophy size={19} color="#fff" /></span>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="et-fh" style={{ fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                                            <div style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>{t.game?.name}{t.division ? ` · ${t.division.name}` : ""}</div>
                                        </div>
                                    </div>
                                    <span className={`et-chip ${ST[t.status]?.c ?? "up"}`}>{ST[t.status]?.t ?? t.status}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: ".82rem", color: "var(--es-mut)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Users size={14} /> {t.teams}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""} jamoa</span>
                                    {t.prizePool ? <span className="et-fh et-grad" style={{ fontWeight: 700, marginLeft: "auto" }}>{money(t.prizePool, t.currency)}</span> : null}
                                </div>
                            </Link>
                        ))}
                    </div>
                )
            ) : (
                retros.length === 0 ? (
                    <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><History size={24} /></span><b>Tarix bo'sh</b></div></div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {retros.map((r, ri) => (
                            <div key={r.id} className={`et-glass et-rise et-d${(ri % 4) + 1}`} style={{ padding: 20 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div>
                                        <div className="et-fh et-grad" style={{ fontWeight: 700, fontSize: "1.3rem" }}>{r.name}</div>
                                        <div style={{ fontSize: ".82rem", color: "var(--es-mut)", marginTop: 3 }}>{r.game} · {r.season}</div>
                                        <div style={{ fontSize: ".76rem", color: "var(--es-faint)", marginTop: 2 }}><CalendarDays size={12} style={{ verticalAlign: -2 }} /> {ymd(r.startDate)} — {ymd(r.endDate)} · {r.organizer}</div>
                                    </div>
                                    {r.prizePool ? <div style={{ textAlign: "right" }}><div className="et-fh et-grad" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{money(r.prizePool, r.currency)}</div><div style={{ fontSize: ".72rem", color: "var(--es-faint)" }}>Mukofot fondi</div></div> : null}
                                </div>

                                {/* Podium */}
                                <div className="et-grid et-g3" style={{ marginTop: 16, gap: 10 }}>
                                    {[{ nm: r.champion, ic: <Crown size={16} />, lbl: "Chempion", cls: "g1", bg: "linear-gradient(135deg,#ffd84d,#ff9a3d)" },
                                      { nm: r.runnerUp, ic: <Medal size={16} />, lbl: "2-o'rin", cls: "g2", bg: "linear-gradient(135deg,#cfd8e6,#9fb0c6)" },
                                      { nm: r.third, ic: <Award size={16} />, lbl: "3-o'rin", cls: "g3", bg: "linear-gradient(135deg,#e59b57,#b9742f)" }]
                                        .filter(x => x.nm).map((x, i) => (
                                            <div key={i} className="et-row" style={{ background: "var(--es-soft)" }}>
                                                <span className="et-logo" style={{ width: 36, height: 36, background: x.bg, color: "#1a1206" }}>{x.ic}</span>
                                                <span className="et-nm" style={{ flex: 1 }}>{x.nm}<small>{x.lbl}</small></span>
                                            </div>
                                        ))}
                                </div>

                                {/* Match history (grand final / key) */}
                                {r.matches.length > 0 && (
                                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--es-soft-bd)" }}>
                                        <div style={{ fontFamily: "Chakra Petch", fontWeight: 600, fontSize: ".74rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--es-faint)", marginBottom: 10 }}>O'yinlar ({r.matches.length})</div>
                                        {r.matches.slice(0, 5).map((m, mi) => {
                                            const aWon = m.winner && m.winner === m.teamA;
                                            return (
                                                <div key={mi} className="et-row" style={{ gap: 10, padding: "9px 12px" }}>
                                                    <span style={{ fontFamily: "Chakra Petch", fontSize: ".66rem", color: "var(--es-faint)", width: 92, flex: "0 0 auto", textTransform: "uppercase" }}>{m.stage}</span>
                                                    <span className="et-nm" style={{ flex: 1, textAlign: "right", fontSize: ".85rem", color: aWon ? "var(--es-fg)" : "var(--es-mut)" }}>{m.teamA}</span>
                                                    <span className="et-fh et-mono" style={{ fontWeight: 700, fontSize: ".9rem", flex: "0 0 auto" }}><span style={{ color: aWon ? "var(--es-c2)" : "var(--es-faint)" }}>{m.scoreA ?? 0}</span><span style={{ color: "var(--es-faint)", margin: "0 4px" }}>:</span><span style={{ color: !aWon ? "var(--es-c2)" : "var(--es-faint)" }}>{m.scoreB ?? 0}</span></span>
                                                    <span className="et-nm" style={{ flex: 1, fontSize: ".85rem", color: !aWon ? "var(--es-fg)" : "var(--es-mut)" }}>{m.teamB}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
