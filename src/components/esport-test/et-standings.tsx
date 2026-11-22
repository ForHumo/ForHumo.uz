"use client";

import { useEffect, useState } from "react";
import { BarChart3, Trophy } from "lucide-react";

interface Row { rank: number; teamId: string; team: { id: string; name: string; tag: string; logo: string | null } | null; points: number; wins: number; losses: number; played: number; rating: number | null }
interface Div { id: string; name: string; tier: number; teams: Row[] }

export default function EtStandings() {
    const [season, setSeason] = useState<{ name: string } | null>(null);
    const [divs, setDivs] = useState<Div[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/esport/standings").then(r => r.json()).then(j => { setSeason(j.season); setDivs(j.divisions || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const hasAny = divs.some(d => d.teams.length > 0);

    return (
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise"><span className="num"><BarChart3 size={15} /></span><div><h2>Reyting</h2><p>{season ? `${season.name} · divizion jadvallari` : "Divizion jadvallari"}</p></div></div>

            {loading ? (
                <div className="et-grid et-g2">{[0, 1].map(i => <div key={i} className="et-skel" style={{ height: 220 }} />)}</div>
            ) : !hasAny ? (
                <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><BarChart3 size={24} /></span><b>Jadval hali bo'sh</b>Liga o'yinlari o'tkazilgach, divizion jadvallari shu yerда chiqadi.</div></div>
            ) : (
                <div className="et-grid et-g2">
                    {divs.filter(d => d.teams.length > 0).map((d, di) => (
                        <div key={d.id} className={`et-glass et-rise et-d${(di % 4) + 1}`} style={{ padding: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                                <span className="et-logo" style={{ width: 34, height: 34 }}><Trophy size={15} color="#fff" /></span>
                                <div className="et-fh" style={{ fontWeight: 700, fontSize: "1rem" }}>{d.name}</div>
                            </div>
                            <div style={{ display: "flex", padding: "0 12px 8px", fontFamily: "Chakra Petch", fontSize: ".64rem", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--es-faint)" }}>
                                <span style={{ width: 22, flex: "0 0 auto" }}>#</span>
                                <span style={{ flex: 1, marginLeft: 12 }}>Jamoa</span>
                                <span style={{ width: 34, textAlign: "center" }}>O</span>
                                <span style={{ width: 28, textAlign: "center" }}>G</span>
                                <span style={{ width: 28, textAlign: "center" }}>M</span>
                                <span style={{ width: 40, textAlign: "center" }}>Ochko</span>
                            </div>
                            {d.teams.map(row => (
                                <div key={row.teamId} className="et-row" style={{ padding: "10px 12px" }}>
                                    <span className={`et-rank g${row.rank}`} style={{ width: 22 }}>{row.rank}</span>
                                    <span className="et-logo" style={{ width: 30, height: 30, fontSize: ".72rem", marginLeft: 12 }}>{row.team?.logo ? <img src={row.team.logo} alt="" /> : (row.team?.tag.slice(0, 3) ?? "?")}</span>
                                    <span className="et-nm" style={{ flex: 1, marginLeft: 10, fontSize: ".86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.team?.name ?? "—"}</span>
                                    <span className="et-mono" style={{ width: 34, textAlign: "center", fontSize: ".82rem", color: "var(--es-mut)" }}>{row.played}</span>
                                    <span className="et-mono" style={{ width: 28, textAlign: "center", fontSize: ".82rem", color: "var(--es-c2)" }}>{row.wins}</span>
                                    <span className="et-mono" style={{ width: 28, textAlign: "center", fontSize: ".82rem", color: "var(--es-faint)" }}>{row.losses}</span>
                                    <span className="et-fh et-mono" style={{ width: 40, textAlign: "center", fontWeight: 700, fontSize: ".9rem" }}>{row.points}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
