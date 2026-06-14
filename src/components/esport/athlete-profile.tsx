"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, BadgeCheck, Shield, Gamepad2, TrendingUp, Hash, ChevronRight } from "lucide-react";

interface Athlete {
    id: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null;
    game: { name: string } | null; createdAt: string; name: string; username: string | null;
    image: string | null; humoId: string | null; verified: boolean;
    team: { id: string; name: string; tag: string; logo: string | null; role: string; rating: number } | null;
}

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };
const roleLabel: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

export default function AthleteProfile({ athleteId }: { athleteId: string }) {
    const [a, setA] = useState<Athlete | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/esport/athletes/${athleteId}`).then(r => r.json()).then(d => { setA(d.athlete || null); setLoading(false); }).catch(() => setLoading(false));
    }, [athleteId]);

    if (loading) return <main className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (!a) return <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3" style={{ background: BG }}><p className="text-sm text-white/60">Sportchi topilmadi</p><Link href="/esport" className="text-sm font-bold text-[#00CEC8]">Orqaga</Link></main>;

    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-lg px-5 py-8">
                <div className="mb-5 flex items-center gap-3">
                    <Link href="/esport/teams" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <span className="text-sm font-bold text-white/50">Sportchi</span>
                </div>

                {/* Profil */}
                <div className="mb-5 rounded-3xl p-6 text-center" style={card}>
                    {a.image
                        ? <img src={a.image} alt="" className="mx-auto h-20 w-20 rounded-3xl object-cover" />
                        : <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black text-white" style={{ background: ACCENT }}>{a.ign.slice(0, 2).toUpperCase()}</div>}
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xl font-black text-white">{a.ign}{a.verified && <BadgeCheck className="h-5 w-5 text-[#00CEC8]" />}</p>
                    {a.name && <p className="text-sm font-semibold text-white/45">{a.name}</p>}
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-[#00CEC8]" style={{ background: "rgba(0,206,200,0.12)" }}><Gamepad2 className="h-3 w-3" /> {a.game?.name}</span>
                        {a.position && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white/60" style={soft}>{a.position}</span>}
                    </div>
                </div>

                {/* Jamoa */}
                {a.team ? (
                    <Link href={`/esport/teams/${a.team.id}`} className="mb-3 flex items-center gap-3 rounded-3xl p-4" style={card}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ background: ACCENT }}>{a.team.logo ? <img src={a.team.logo} alt="" className="h-full w-full rounded-2xl object-cover" /> : a.team.tag.slice(0, 3)}</div>
                        <div className="flex-1"><p className="text-sm font-bold text-white">{a.team.name}</p><p className="text-[11px] text-white/45">[{a.team.tag}] · {roleLabel[a.team.role] || a.team.role}</p></div>
                        <ChevronRight className="h-4 w-4 text-white/25" />
                    </Link>
                ) : (
                    <div className="mb-3 flex items-center gap-2 rounded-3xl p-4" style={card}><Shield className="h-4 w-4 text-white/35" /><span className="text-sm font-semibold text-white/50">Erkin sportchi (jamoasiz)</span></div>
                )}

                {/* Statistika */}
                <div className="grid grid-cols-2 gap-3">
                    {a.team && <Stat icon={TrendingUp} label="Jamoa Elo" value={String(a.team.rating)} />}
                    <Stat icon={Hash} label="In-game ID" value={a.gameServer ? `${a.gameUserId} (${a.gameServer})` : a.gameUserId} />
                </div>
            </div>
        </main>
    );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
    return (
        <div className="rounded-2xl p-4" style={card}>
            <Icon className="h-4 w-4 text-[#00CEC8]" />
            <p className="mt-2 text-lg font-black text-white">{value}</p>
            <p className="text-[11px] font-semibold text-white/40">{label}</p>
        </div>
    );
}
