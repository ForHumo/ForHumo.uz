"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, Trophy, Crown, Coins, Users, ShieldCheck,
    Swords, Wand2, Banknote, Check, AlertTriangle, Tv,
} from "lucide-react";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface Match { id: string; bracket: string; round: number; slot: number; seedA: number | null; seedB: number | null; scoreA: number | null; scoreB: number | null; status: string; streamUrl: string | null; winnerId: string | null; teamA: TeamLite | null; teamB: TeamLite | null }
interface Tournament { id: string; name: string; game: { name: string } | null; status: string; prizePool: number | null; prizeLabel: string | null; currency: string; maxTeams: number; bracketReady: boolean; thirdPlace: boolean; registrationEndsAt: string | null }
interface MyTeam { id: string; name: string; tag: string; registered: boolean }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };

function roundName(round: number, total: number): string {
    const fromEnd = total - round;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Yarim final";
    if (fromEnd === 2) return "Chorak final";
    return `1/${Math.pow(2, fromEnd + 1)} final`;
}

export default function TournamentDetail({ tournamentId }: { tournamentId: string }) {
    const [t, setT] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [participants, setParticipants] = useState<TeamLite[]>([]);
    const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [sel, setSel] = useState<string | null>(null);
    const [sa, setSa] = useState(""); const [sb, setSb] = useState("");

    const load = useCallback(async () => {
        const d = await fetch(`/api/esport/tournaments/${tournamentId}`).then(r => r.json()).catch(() => ({}));
        if (d.error) { setErr(d.error); setLoading(false); return; }
        setT(d.tournament); setMatches(d.matches || []); setParticipants(d.participants || []); setMyTeams(d.myTeams || []); setIsAdmin(!!d.isAdmin);
        setLoading(false);
    }, [tournamentId]);
    useEffect(() => { load(); }, [load]);

    async function call(url: string, method: string, body?: object) {
        setBusy(true); setErr("");
        const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(x => x.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setBusy(false);
        if (r.error) setErr(r.error); else await load();
        return r;
    }

    if (loading) return <main className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (!t) return <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3" style={{ background: BG }}><p className="text-sm text-white/60">{err || "Topilmadi"}</p><Link href="/esport/tournaments" className="text-sm font-bold text-[#00CEC8]">Orqaga</Link></main>;

    const mainRounds = [...new Set(matches.filter(m => m.bracket === "MAIN").map(m => m.round))].sort((a, b) => a - b);
    const totalRounds = mainRounds.length ? Math.max(...mainRounds) : 0;
    const finalMatch = matches.find(m => m.bracket === "MAIN" && m.round === totalRounds);
    const thirdMatch = matches.find(m => m.bracket === "THIRD");
    const champion = finalMatch?.status === "DONE" && finalMatch.winnerId ? (finalMatch.teamA?.id === finalMatch.winnerId ? finalMatch.teamA : finalMatch.teamB) : null;

    const eligible = myTeams.filter(x => !x.registered);

    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
                <div className="mb-4 flex items-center gap-3">
                    <Link href="/esport/tournaments" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <span className="text-sm font-bold text-white/50">Turnir</span>
                </div>

                {/* Header */}
                <div className="mb-5 rounded-3xl p-5" style={card}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: ACCENT }}><Trophy className="h-6 w-6 text-white" /></div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xl font-black text-white">{t.name}</p>
                            <p className="text-xs font-semibold text-white/45">{t.game?.name}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/55">
                        {t.prizeLabel && <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-[#FFB020]" /> {t.prizeLabel}</span>}
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {participants.length}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""} jamoa</span>
                    </div>
                </div>

                {/* Champion banner */}
                {champion && (
                    <div className="mb-5 flex items-center gap-3 rounded-3xl p-5" style={{ background: "rgba(255,176,32,0.10)", border: "1px solid rgba(255,176,32,0.35)" }}>
                        <Crown className="h-7 w-7 text-[#FFB020]" />
                        <div><p className="text-[11px] font-bold uppercase tracking-wide text-[#FFB020]/80">Chempion</p><p className="text-lg font-black text-white">{champion?.name}</p></div>
                    </div>
                )}

                {err && <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}><AlertTriangle className="h-4 w-4 text-red-400" /><span className="text-xs font-semibold text-red-300">{err}</span></div>}

                {/* Registration */}
                {t.status === "REGISTRATION" && eligible.length > 0 && (
                    <div className="mb-5 rounded-3xl p-5" style={card}>
                        <p className="mb-3 text-sm font-black text-white">Ro'yxatdan o'tish</p>
                        <div className="space-y-2">
                            {eligible.map(tm => (
                                <button key={tm.id} onClick={() => call(`/api/esport/tournaments/${tournamentId}/register`, "POST", { teamId: tm.id })} disabled={busy}
                                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left" style={soft}>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{tm.tag.slice(0, 3)}</span>
                                    <span className="flex-1 text-sm font-bold text-white">{tm.name}</span>
                                    <span className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: ACCENT }}>Qo'shilish</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {t.status === "REGISTRATION" && myTeams.some(x => x.registered) && (
                    <div className="mb-5 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.3)" }}>
                        <Check className="h-4 w-4 text-[#00CEC8]" /><span className="text-xs font-semibold text-[#00CEC8]">Jamoangiz ro'yxatdan o'tgan</span>
                    </div>
                )}

                {/* Admin controls */}
                {isAdmin && (
                    <div className="mb-5 flex flex-wrap gap-2 rounded-3xl p-4" style={card}>
                        <span className="w-full text-[11px] font-black uppercase tracking-wide text-white/40">Admin</span>
                        {t.status === "UPCOMING" && <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}`, "PATCH", { status: "REGISTRATION" })} busy={busy} icon={Users}>Ro'yxat ochish</AdminBtn>}
                        {!t.bracketReady && participants.length >= 2 && <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}/generate`, "POST")} busy={busy} icon={Wand2}>Setka tuzish (Elo)</AdminBtn>}
                        {t.status === "ENDED" && t.prizePool ? <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}/payout`, "POST")} busy={busy} icon={Banknote}>Yutuqни to'lash</AdminBtn> : null}
                    </div>
                )}

                {/* Participants (setka yo'q bo'lsa) */}
                {!t.bracketReady && participants.length > 0 && (
                    <div className="rounded-3xl p-5" style={card}>
                        <p className="mb-3 text-sm font-black text-white">Ishtirokchilar</p>
                        <div className="grid grid-cols-2 gap-2">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center gap-2 rounded-2xl p-2.5" style={soft}>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{p.tag.slice(0, 3)}</span>
                                    <span className="truncate text-sm font-bold text-white">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bracket */}
                {t.bracketReady && (
                    <div className="rounded-3xl p-4" style={card}>
                        <p className="mb-3 flex items-center gap-2 px-1 text-sm font-black text-white"><Swords className="h-4 w-4 text-[#00CEC8]" /> Setka</p>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {mainRounds.map(round => (
                                <div key={round} className="flex min-w-[150px] flex-col justify-around gap-3">
                                    <p className="text-center text-[10px] font-black uppercase tracking-wide text-white/35">{roundName(round, totalRounds)}</p>
                                    {matches.filter(m => m.bracket === "MAIN" && m.round === round).sort((a, b) => a.slot - b.slot).map(m => (
                                        <MatchBox key={m.id} m={m} isAdmin={isAdmin} sel={sel} setSel={setSel} sa={sa} sb={sb} setSa={setSa} setSb={setSb}
                                            submit={() => call(`/api/esport/admin/tournaments/${tournamentId}/match`, "PATCH", { matchId: m.id, scoreA: Number(sa), scoreB: Number(sb) }).then(() => { setSel(null); setSa(""); setSb(""); })} busy={busy} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        {thirdMatch && (
                            <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="mb-2 px-1 text-center text-[10px] font-black uppercase tracking-wide text-[#FFB020]/70">3-o'rin uchun</p>
                                <div className="mx-auto max-w-[200px]">
                                    <MatchBox m={thirdMatch} isAdmin={isAdmin} sel={sel} setSel={setSel} sa={sa} sb={sb} setSa={setSa} setSb={setSb}
                                        submit={() => call(`/api/esport/admin/tournaments/${tournamentId}/match`, "PATCH", { matchId: thirdMatch.id, scoreA: Number(sa), scoreB: Number(sb) }).then(() => { setSel(null); setSa(""); setSb(""); })} busy={busy} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function AdminBtn({ onClick, busy, icon: Icon, children }: { onClick: () => void; busy: boolean; icon: typeof Users; children: ReactNode }) {
    return <button onClick={onClick} disabled={busy} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: ACCENT }}><Icon className="h-4 w-4" /> {children}</button>;
}

function MatchBox({ m, isAdmin, sel, setSel, sa, sb, setSa, setSb, submit, busy }: {
    m: Match; isAdmin: boolean; sel: string | null; setSel: (v: string | null) => void; sa: string; sb: string; setSa: (v: string) => void; setSb: (v: string) => void; submit: () => void; busy: boolean;
}) {
    const editable = isAdmin && m.teamA && m.teamB && m.status !== "DONE";
    const open = sel === m.id;
    const row = (team: TeamLite | null, seed: number | null, score: number | null, isWinner: boolean) => (
        <div className="flex items-center gap-2 px-2.5 py-1.5" style={isWinner ? { background: "rgba(0,206,200,0.10)" } : undefined}>
            {seed != null && <span className="w-4 text-center text-[9px] font-bold text-white/30">{seed}</span>}
            <span className={`flex-1 truncate text-xs font-bold ${team ? (isWinner ? "text-white" : "text-white/60") : "text-white/25"}`}>{team ? team.tag : "—"}</span>
            {score != null && <span className={`text-xs font-black ${isWinner ? "text-[#00CEC8]" : "text-white/40"}`}>{score}</span>}
        </div>
    );
    return (
        <div>
            <button onClick={() => editable && setSel(open ? null : m.id)} disabled={!editable} className="w-full overflow-hidden rounded-xl text-left" style={soft}>
                {row(m.teamA, m.seedA, m.scoreA, m.status === "DONE" && m.winnerId === m.teamA?.id)}
                <div className="h-px bg-white/5" />
                {row(m.teamB, m.seedB, m.scoreB, m.status === "DONE" && m.winnerId === m.teamB?.id)}
            </button>
            {m.streamUrl && <a href={m.streamUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-[#00CEC8]"><Tv className="h-3 w-3" /> Efir</a>}
            {open && editable && (
                <div className="mt-1 flex items-center gap-1.5 rounded-xl p-1.5" style={soft}>
                    <input value={sa} onChange={e => setSa(e.target.value)} placeholder="0" className="w-10 rounded-lg px-1 py-1 text-center text-xs font-bold text-white outline-none" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <span className="text-white/30">:</span>
                    <input value={sb} onChange={e => setSb(e.target.value)} placeholder="0" className="w-10 rounded-lg px-1 py-1 text-center text-xs font-bold text-white outline-none" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <button onClick={submit} disabled={busy} className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: ACCENT }}><ShieldCheck className="h-3.5 w-3.5" /></button>
                </div>
            )}
        </div>
    );
}
