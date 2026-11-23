"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Users, Shield, Check } from "lucide-react";

interface TeamCard { id: string; name: string; tag: string; logo: string | null; rating: number; members: number; games: string[]; isMine: boolean }

export default function EtTeams() {
    const [teams, setTeams] = useState<TeamCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/esport/teams/all").then(r => r.json()).then(j => { setTeams(j.teams || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise"><span className="num"><Users size={15} /></span><div><h2>Jamoalar</h2><p>Barcha ro'yxatdan o'tgan jamoalar — Elo bo'yicha.</p></div></div>

            {loading ? (
                <div className="et-grid et-g3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="et-skel" style={{ height: 120 }} />)}</div>
            ) : teams.length === 0 ? (
                <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><Users size={24} /></span><b>Hali jamoa yo'q</b>Birinchi jamoani yarating — shu yerда chiqadi.</div></div>
            ) : (
                <div className="et-grid et-g3">
                    {teams.map((t, i) => (
                        <Link key={t.id} href={`/esport-test/teams/${t.id}`} className={`et-tile et-rise et-d${(i % 6) + 1}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
                                <span className="et-logo" style={{ width: 48, height: 48, fontSize: "1rem" }}>{t.logo ? <img src={t.logo} alt="" /> : t.tag.slice(0, 3)}</span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="et-fh" style={{ fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                                    <div style={{ fontFamily: "Chakra Petch", fontSize: ".75rem", color: "var(--es-faint)", letterSpacing: ".04em" }}>{t.tag}</div>
                                </div>
                                {t.isMine && <span className="et-chip reg" style={{ position: "absolute", top: 0, right: 0 }}>Meniki</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: ".8rem", color: "var(--es-mut)", position: "relative" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Users size={13} /> {t.members}</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Shield size={13} /> {t.games.length ? t.games.join(", ") : "—"}</span>
                                <span className="et-val et-grad" style={{ marginLeft: "auto", fontSize: ".95rem" }}>{t.rating} <small style={{ color: "var(--es-faint)", fontWeight: 400 }}>Elo</small></span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
            <div style={{ marginTop: 18, textAlign: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: ".82rem", color: "var(--es-faint)" }}><Check size={14} style={{ color: "var(--es-c2)" }} /> Barcha jamoalar va o'yinchilar asl eSport bazasidan — tarix saqlangan.</span>
            </div>
        </div>
    );
}
