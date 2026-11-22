"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Trophy, Users, Crown, TrendingUp, Radio, Newspaper, CalendarClock, Gamepad2, Play, Swords, Star } from "lucide-react";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface T { id: string; name: string; game: string; status: string; teams: number; prizePool: number | null; currency: string }
interface TopTeam { team: TeamLite | null; rating: number; game: string }
interface TopPlayer { id: string; ign: string; position: string | null; roleLabel: string; image: string | null; team: TeamLite | null; rating: number; game: string }
interface ExpPlayer { id: string; ign: string; image: string | null; value: number; team: { name: string; tag: string } | null }
interface ExpTeam { team: TeamLite; value: number }
interface Result { a: TeamLite | null; b: TeamLite | null; scoreA: number | null; scoreB: number | null; winnerId: string | null }
interface Upcoming { a: TeamLite | null; b: TeamLite | null; at: string | null }
interface Cast { id: string; title: string; status: string; posterUrl: string | null }
interface News { id: string; title: string; body: string | null; image: string | null; createdAt: string }

function money(n: number, c: string) { return c === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} so'm`; }
const ST: Record<string, { c: string; t: string }> = {
    LIVE: { c: "live", t: "Jonli" }, REGISTRATION: { c: "reg", t: "Ro'yxat ochiq" },
    UPCOMING: { c: "up", t: "Tez orada" }, ENDED: { c: "end", t: "Tugadi" },
};
function timeShort(at: string | null) {
    if (!at) return "";
    const d = new Date(at), now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = d.getHours().toString().padStart(2, "0"), mm = d.getMinutes().toString().padStart(2, "0");
    if (sameDay) return `Bugun ${hh}:${mm}`;
    return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")} ${hh}:${mm}`;
}

function TeamLogo({ team, cls }: { team: TeamLite | null; cls?: string }) {
    if (!team) return <span className={`et-logo ${cls || ""}`}>?</span>;
    return <span className={`et-logo ${cls || ""}`}>{team.logo ? <img src={team.logo} alt="" /> : team.tag.slice(0, 3)}</span>;
}

export default function EtHome() {
    const [d, setD] = useState<{
        tournaments: T[]; topTeams: TopTeam[]; topPlayers: TopPlayer[]; expensivePlayers: ExpPlayer[];
        expensiveTeams: ExpTeam[]; results: Result[]; upcoming: Upcoming[]; broadcasts: Cast[]; news: News[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/esport/home").then(r => r.json()).then(j => { setD(j); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ marginTop: 16 }}>
                <div className="et-skel" style={{ height: 150 }} />
                <div className="et-grid et-g3" style={{ marginTop: 16 }}>
                    <div className="et-skel" style={{ height: 180 }} /><div className="et-skel" style={{ height: 180 }} /><div className="et-skel" style={{ height: 180 }} />
                </div>
            </div>
        );
    }

    const liveCast = d?.broadcasts?.find(b => b.status === "LIVE") || d?.broadcasts?.[0] || null;

    return (
        <div>
            {/* HERO */}
            <section className="et-glass et-rise" style={{ padding: "30px 24px", marginTop: 14, textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "Chakra Petch", fontWeight: 600, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--es-c2)", border: "1px solid var(--es-card-bd)", borderRadius: 999, padding: "6px 14px", background: "var(--es-soft)" }}>
                    <Gamepad2 size={13} /> Kibersport arenasi
                </div>
                <h1 className="et-fh et-grad" style={{ fontSize: "clamp(2.2rem,7vw,3.6rem)", fontWeight: 700, margin: "14px 0 8px", lineHeight: 1 }}>Humo eSport</h1>
                <p style={{ color: "var(--es-mut)", maxWidth: "52ch", margin: "0 auto", fontSize: "1rem" }}>Turnirlar, divizionlar, transferlar va jonli efir — bir arenада. CS2 · Dota 2 · PUBG Mobile · Mobile Legends.</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
                    <Link href="/esport-test/tournaments" className="et-btn"><Trophy size={16} /> Turnirlar</Link>
                    <Link href="/esport-test/teams" className="et-btn ghost"><Users size={16} /> Jamoalar</Link>
                </div>
            </section>

            {/* JONLI EFIR + BO'LAJAK */}
            {(liveCast || (d?.upcoming?.length ?? 0) > 0) && (
                <section style={{ marginTop: 34 }}>
                    <div className="et-sh et-rise"><span className="num">01</span><div><h2>Jonli <span className="et-grad">efir</span> & bo'lajak</h2><p>Hozir va keyingi o'yinlar.</p></div></div>
                    <div className="et-grid et-g2">
                        {liveCast && (
                            <div className="et-glass et-match et-rise et-d1">
                                <div className="et-scan" />
                                <div className="et-match-top">
                                    <span className={`et-chip ${liveCast.status === "LIVE" ? "live" : "up"}`}>{liveCast.status === "LIVE" ? <><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#fff", marginRight: 6, verticalAlign: "middle" }} />JONLI</> : "Rejada"}</span>
                                    <span style={{ fontFamily: "Chakra Petch", fontSize: ".78rem", color: "var(--es-mut)" }}>Efir</span>
                                </div>
                                <div style={{ padding: "22px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                                    <span className="et-logo" style={{ width: 48, height: 48, background: "linear-gradient(135deg,var(--es-c1),var(--es-c3))" }}><Radio size={22} color="#fff" /></span>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="et-fh" style={{ fontWeight: 600, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis" }}>{liveCast.title}</div>
                                        <div style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>Humo eSport translyatsiya</div>
                                    </div>
                                </div>
                                <div style={{ padding: "0 18px 18px" }}><button className="et-btn" style={{ width: "100%" }}><Play size={16} /> Efirni ko'rish</button></div>
                            </div>
                        )}
                        {(d?.upcoming ?? []).slice(0, liveCast ? 1 : 2).map((u, i) => (
                            <div key={i} className="et-glass et-match et-rise et-d2">
                                <div className="et-match-top"><span className="et-chip up">Bo'lajak</span><span style={{ fontFamily: "Chakra Petch", fontSize: ".78rem", color: "var(--es-mut)" }}><CalendarClock size={13} style={{ verticalAlign: -2 }} /> {timeShort(u.at)}</span></div>
                                <div className="et-vs">
                                    <div className="et-team a"><TeamLogo team={u.a} cls="" /><div className="tn">{u.a?.name ?? "—"}</div></div>
                                    <div className="et-score pending"><span className="s1">VS</span></div>
                                    <div className="et-team b"><TeamLogo team={u.b} cls="" /><div className="tn">{u.b?.name ?? "—"}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* TURNIRLAR */}
            <section style={{ marginTop: 34 }}>
                <div className="et-sh et-rise"><span className="num">02</span><div><h2>Faol <span className="et-grad">turnirlar</span></h2><p>Ro'yxat ochiq va jonli.</p></div></div>
                {(d?.tournaments?.length ?? 0) > 0 ? (
                    <div className="et-grid et-g3">
                        {d!.tournaments.map((t, i) => (
                            <Link key={t.id} href="/esport-test/tournaments" className={`et-tile et-rise et-d${(i % 6) + 1}`}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span className="et-logo" style={{ width: 38, height: 38 }}><Trophy size={18} color="#fff" /></span>
                                    <span className={`et-chip ${ST[t.status]?.c ?? "up"}`}>{ST[t.status]?.t ?? t.status}</span>
                                </div>
                                <div className="et-fh" style={{ fontWeight: 600, fontSize: "1rem", position: "relative" }}>{t.name}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", color: "var(--es-mut)", position: "relative" }}>
                                    <span>{t.game} · {t.teams} jamoa</span>
                                    {t.prizePool ? <span className="et-fh et-grad" style={{ fontWeight: 700 }}>{money(t.prizePool, t.currency)}</span> : null}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="et-glass et-rise et-d1"><div className="et-empty"><span className="ic"><Trophy size={24} /></span><b>Hozircha turnir yo'q</b>Birinchi turnirni admin paneldан oching — shu yerда chiqadi.</div></div>
                )}
            </section>

            {/* TOP JAMOA + O'YINCHI */}
            <section style={{ marginTop: 34 }}>
                <div className="et-grid et-g2">
                    <div className="et-glass et-rise et-d1" style={{ padding: 18 }}>
                        <div className="et-sh" style={{ marginBottom: 14 }}><Users size={18} style={{ color: "var(--es-c2)" }} /><div><h2 style={{ fontSize: "1.05rem" }}>Eng kuchli jamoalar</h2></div></div>
                        {(d?.topTeams?.length ?? 0) > 0 ? d!.topTeams.map((t, i) => (
                            <div key={i} className="et-row">
                                <span className={`et-rank g${i + 1}`}>{i + 1}</span><TeamLogo team={t.team} />
                                <span className="et-nm" style={{ flex: 1 }}>{t.team?.name ?? "—"}<small>{t.game}</small></span>
                                <span className="et-val"><span className="et-grad">{t.rating}</span><small>Elo</small></span>
                            </div>
                        )) : <div className="et-empty" style={{ padding: 20 }}>Hali reyting yo'q</div>}
                    </div>
                    <div className="et-glass et-rise et-d2" style={{ padding: 18 }}>
                        <div className="et-sh" style={{ marginBottom: 14 }}><Star size={18} style={{ color: "var(--es-c2)" }} /><div><h2 style={{ fontSize: "1.05rem" }}>Eng kuchli o'yinchilar</h2></div></div>
                        {(d?.topPlayers?.length ?? 0) > 0 ? d!.topPlayers.map((p, i) => (
                            <div key={p.id} className="et-row">
                                <span className={`et-rank g${i + 1}`}>{i + 1}</span>
                                <span className="et-logo">{p.image ? <img src={p.image} alt="" /> : (p.ign[0] || "?").toUpperCase()}</span>
                                <span className="et-nm" style={{ flex: 1 }}>{p.ign}<small>{p.team?.tag ? `${p.team.tag} · ` : ""}{p.roleLabel}</small></span>
                                <span className="et-val"><span className="et-grad">{p.rating}</span><small>{p.game}</small></span>
                            </div>
                        )) : <div className="et-empty" style={{ padding: 20 }}>Hali o'yinchi yo'q</div>}
                    </div>
                </div>
            </section>

            {/* ENG QIMMAT */}
            {((d?.expensiveTeams?.length ?? 0) > 0 || (d?.expensivePlayers?.length ?? 0) > 0) && (
                <section style={{ marginTop: 34 }}>
                    <div className="et-sh et-rise"><span className="num">03</span><div><h2>Eng <span className="et-grad">qimmat</span></h2><p>Bozor qiymati bo'yicha.</p></div></div>
                    <div className="et-grid et-g2">
                        {(d?.expensiveTeams?.length ?? 0) > 0 && (
                            <div className="et-glass et-rise et-d1" style={{ padding: 18 }}>
                                <div style={{ fontFamily: "Chakra Petch", fontWeight: 600, fontSize: ".82rem", color: "var(--es-mut)", marginBottom: 12 }}><Crown size={14} style={{ verticalAlign: -2, color: "var(--es-c2)" }} /> Qimmat jamoalar</div>
                                {d!.expensiveTeams.map((x, i) => (
                                    <div key={i} className="et-row"><span className={`et-rank g${i + 1}`}>{i + 1}</span><TeamLogo team={x.team} /><span className="et-nm" style={{ flex: 1 }}>{x.team.name}</span><span className="et-val et-grad">{money(x.value, "UZS")}</span></div>
                                ))}
                            </div>
                        )}
                        {(d?.expensivePlayers?.length ?? 0) > 0 && (
                            <div className="et-glass et-rise et-d2" style={{ padding: 18 }}>
                                <div style={{ fontFamily: "Chakra Petch", fontWeight: 600, fontSize: ".82rem", color: "var(--es-mut)", marginBottom: 12 }}><TrendingUp size={14} style={{ verticalAlign: -2, color: "var(--es-c2)" }} /> Qimmat o'yinchilar</div>
                                {d!.expensivePlayers.map((p, i) => (
                                    <div key={p.id} className="et-row"><span className={`et-rank g${i + 1}`}>{i + 1}</span><span className="et-logo">{p.image ? <img src={p.image} alt="" /> : (p.ign[0] || "?").toUpperCase()}</span><span className="et-nm" style={{ flex: 1 }}>{p.ign}<small>{p.team?.tag ?? "Erkin"}</small></span><span className="et-val et-grad">{money(p.value, "UZS")}</span></div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* NATIJALAR */}
            {(d?.results?.length ?? 0) > 0 && (
                <section style={{ marginTop: 34 }}>
                    <div className="et-sh et-rise"><span className="num">04</span><div><h2>So'nggi <span className="et-grad">natijalar</span></h2></div></div>
                    <div className="et-glass et-rise et-d1" style={{ padding: 14 }}>
                        {d!.results.map((r, i) => {
                            const aWon = r.winnerId && r.a && r.winnerId === r.a.id;
                            return (
                                <div key={i} className="et-row" style={{ gap: 10 }}>
                                    <Swords size={16} style={{ color: "var(--es-faint)", flex: "0 0 auto" }} />
                                    <span className="et-nm" style={{ flex: 1, textAlign: "right", color: aWon ? "var(--es-fg)" : "var(--es-mut)" }}>{r.a?.name ?? "—"}</span>
                                    <span className="et-fh et-mono" style={{ fontWeight: 700, fontSize: ".95rem", flex: "0 0 auto" }}><span style={{ color: aWon ? "var(--es-c2)" : "var(--es-faint)" }}>{r.scoreA ?? 0}</span><span style={{ color: "var(--es-faint)", margin: "0 5px" }}>:</span><span style={{ color: !aWon ? "var(--es-c2)" : "var(--es-faint)" }}>{r.scoreB ?? 0}</span></span>
                                    <span className="et-nm" style={{ flex: 1, color: !aWon ? "var(--es-fg)" : "var(--es-mut)" }}>{r.b?.name ?? "—"}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* YANGILIKLAR */}
            {(d?.news?.length ?? 0) > 0 && (
                <section style={{ marginTop: 34 }}>
                    <div className="et-sh et-rise"><span className="num">05</span><div><h2><span className="et-grad">Yangiliklar</span></h2></div></div>
                    <div className="et-grid et-g2">
                        {d!.news.slice(0, 4).map((n, i) => (
                            <div key={n.id} className={`et-glass et-rise et-d${(i % 4) + 1}`} style={{ padding: 16, display: "flex", gap: 12 }}>
                                <span className="et-logo" style={{ width: 40, height: 40, flex: "0 0 auto" }}>{n.image ? <img src={n.image} alt="" /> : <Newspaper size={18} color="#fff" />}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div className="et-fh" style={{ fontWeight: 600, fontSize: ".92rem" }}>{n.title}</div>
                                    {n.body && <div style={{ fontSize: ".82rem", color: "var(--es-mut)", marginTop: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
