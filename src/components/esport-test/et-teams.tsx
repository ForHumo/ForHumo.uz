"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Users, Check } from "lucide-react";
import { TeamCardBody, useCardTilt, type TeamData } from "./et-card";

interface TeamRow { id: string; isMine: boolean; card: TeamData }

export default function EtTeams() {
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/esport/teams/all").then(r => r.json()).then(j => { setTeams(j.teams || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    useCardTilt(teams.length);

    return (
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise"><span className="num"><Users size={15} /></span><div><h2>Jamoalar</h2><p>Barcha jamoalar — klub gerbi kartasi. Material = jamoa Elo kuchi.</p></div></div>

            {loading ? (
                <div className="etc-gallery">{[0, 1, 2, 3].map(i => <div key={i} className="et-skel" style={{ width: 214, height: 289, borderRadius: 16 }} />)}</div>
            ) : teams.length === 0 ? (
                <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><Users size={24} /></span><b>Hali jamoa yo'q</b>Birinchi jamoani yarating — shu yerda chiqadi.</div></div>
            ) : (
                <div className="etc-gallery">
                    {teams.map((t, i) => (
                        <Link key={t.id} href={`/esport-test/teams/${t.id}`} className={`etc-cw et-rise et-d${(i % 6) + 1}`} style={{ textDecoration: "none", color: "inherit", position: "relative" }}>
                            {t.isMine && <span className="et-chip reg" style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", zIndex: 8 }}>Meniki</span>}
                            <TeamCardBody d={t.card} />
                        </Link>
                    ))}
                </div>
            )}
            <div style={{ marginTop: 18, textAlign: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: ".82rem", color: "var(--es-faint)" }}><Check size={14} style={{ color: "var(--es-c2)" }} /> Gerb, tarkib va Elo — asl eSport bazasidan; tarix saqlangan.</span>
            </div>
        </div>
    );
}
