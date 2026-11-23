"use client";

// Humo eSport PREMIUM — turnir tafsiloti (tournaments/[id]). Asl tournament-detail
// bilan bir xil funksional/i18n; theme-aware (es-* tokenlar), /esport-test havolalari.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { useEsT } from "@/lib/esport-i18n";
import { seasonPoster } from "@/lib/esport-season";
import {
    Loader2, Trophy, Crown, Coins, Users, ShieldCheck,
    Swords, Wand2, Banknote, Check, AlertTriangle, Tv, Flag, ImagePlus, X, Send,
} from "lucide-react";

interface TeamLite { id: string; name: string; tag: string; logo: string | null }
interface Match { id: string; bracket: string; round: number; slot: number; seedA: number | null; seedB: number | null; scoreA: number | null; scoreB: number | null; status: string; streamUrl: string | null; proofUrl: string | null; winnerId: string | null; teamA: TeamLite | null; teamB: TeamLite | null }
interface Tournament { id: string; name: string; game: { name: string } | null; status: string; prizePool: number | null; prizeLabel: string | null; prizeFunded: number; prizeFundedLabel: string | null; currency: string; maxTeams: number; bracketReady: boolean; thirdPlace: boolean; registrationEndsAt: string | null }
interface MyTeam { id: string; name: string; tag: string; registered: boolean }

const ACCENT = "linear-gradient(120deg,var(--es-c1),var(--es-c2) 60%,var(--es-c3))";
const soft: React.CSSProperties = { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" };

function roundName(round: number, total: number): string {
    const fromEnd = total - round;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Yarim final";
    if (fromEnd === 2) return "Chorak final";
    return `1/${Math.pow(2, fromEnd + 1)} final`;
}

export default function EtTournamentDetail({ tournamentId }: { tournamentId: string }) {
    const tr = useEsT();
    const [t, setT] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [participants, setParticipants] = useState<TeamLite[]>([]);
    const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [fundAmt, setFundAmt] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [sel, setSel] = useState<string | null>(null);
    const [sa, setSa] = useState(""); const [sb, setSb] = useState("");
    const [proof, setProof] = useState(""); const [upBusy, setUpBusy] = useState(false);
    const [dispMatch, setDispMatch] = useState<Match | null>(null);
    const [dispReason, setDispReason] = useState(""); const [dispShot, setDispShot] = useState(""); const [dispBusy, setDispBusy] = useState(false); const [dispDone, setDispDone] = useState(false);

    async function uploadImg(file: File): Promise<string | null> {
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({}));
        return r.url || null;
    }
    async function fileDispute() {
        if (!dispMatch || !dispReason.trim()) return;
        setDispBusy(true);
        const r = await fetch("/api/esport/disputes", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchType: "TOURNAMENT", matchId: dispMatch.id, reason: dispReason, screenshotUrl: dispShot || null }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setDispBusy(false);
        if (r.error) { setErr(r.error); return; }
        setDispDone(true); setDispReason(""); setDispShot("");
        setTimeout(() => { setDispDone(false); setDispMatch(null); }, 1400);
    }

    const load = useCallback(async () => {
        const d = await fetch(`/api/esport/tournaments/${tournamentId}`).then(r => r.json()).catch(() => ({}));
        if (d.error) { setErr(d.error); setLoading(false); return; }
        setT(d.tournament); setMatches(d.matches || []); setParticipants(d.participants || []); setMyTeams(d.myTeams || []); setIsAdmin(!!d.isAdmin); setIsOwner(!!d.isOwner);
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

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "96px 0" }}><Loader2 className="animate-spin" size={28} style={{ color: "var(--es-faint)" }} /></div>;
    if (!t) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "96px 0" }}><p style={{ color: "var(--es-mut)" }}>{err || "Topilmadi"}</p><Link href="/esport-test/tournaments" className="et-grad" style={{ fontWeight: 700 }}>Orqaga</Link></div>;

    const mainRounds = [...new Set(matches.filter(m => m.bracket === "MAIN").map(m => m.round))].sort((a, b) => a - b);
    const totalRounds = mainRounds.length ? Math.max(...mainRounds) : 0;
    const finalMatch = matches.find(m => m.bracket === "MAIN" && m.round === totalRounds);
    const thirdMatch = matches.find(m => m.bracket === "THIRD");
    const champion = finalMatch?.status === "DONE" && finalMatch.winnerId ? (finalMatch.teamA?.id === finalMatch.winnerId ? finalMatch.teamA : finalMatch.teamB) : null;

    const eligible = myTeams.filter(x => !x.registered);
    const myTeamIds = myTeams.map(x => x.id);
    async function pickProof(file: File) { setUpBusy(true); const u = await uploadImg(file); setUpBusy(false); if (u) setProof(u); }

    return (
        <div style={{ maxWidth: 760, margin: "14px auto 0" }}>
            <div className="et-sh et-rise"><span className="num"><Trophy size={15} /></span><div><h2>{t.name}</h2><p>{t.game?.name}</p></div></div>

            {/* Header karta */}
            <div className="et-glass et-rise" style={{ padding: 18, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {seasonPoster(t.name) ? <img src={seasonPoster(t.name)!} alt="" style={{ height: 64, width: 44, flex: "0 0 auto", borderRadius: 12, objectFit: "cover" }} /> : <span className="et-logo" style={{ width: 48, height: 48 }}><Trophy size={22} color="#fff" /></span>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="et-fh" style={{ fontWeight: 700, fontSize: "1.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                        <p style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--es-faint)" }}>{t.game?.name}</p>
                    </div>
                </div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, fontSize: ".8rem", fontWeight: 600, color: "var(--es-mut)" }}>
                    {t.prizeLabel && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Coins size={14} style={{ color: "#f0b400" }} /> {t.prizeLabel}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Users size={14} /> {participants.length}{t.maxTeams > 0 ? `/${t.maxTeams}` : ""} jamoa</span>
                </div>
            </div>

            {/* Chempion */}
            {champion && (
                <div className="et-rise" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12, padding: 18, borderRadius: 18, background: "rgba(255,176,32,0.10)", border: "1px solid rgba(255,176,32,0.35)" }}>
                    <Crown size={28} style={{ color: "#FFB020" }} />
                    <div><p style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#FFB020" }}>Chempion</p><p className="et-fh" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{champion?.name}</p></div>
                </div>
            )}

            {err && <div className="et-errmsg" style={{ marginBottom: 14 }}><AlertTriangle size={14} /> {err}</div>}

            {/* Ro'yxatdan o'tish */}
            {t.status === "REGISTRATION" && eligible.length > 0 && (
                <div className="et-glass" style={{ padding: 18, marginBottom: 14 }}>
                    <span className="et-lbl">Ro'yxatdan o'tish</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {eligible.map(tm => (
                            <button key={tm.id} className="et-row" style={{ cursor: "pointer", width: "100%", textAlign: "left" }} disabled={busy} onClick={() => call(`/api/esport/tournaments/${tournamentId}/register`, "POST", { teamId: tm.id })}>
                                <span className="et-logo" style={{ width: 34, height: 34, fontSize: ".7rem" }}>{tm.tag.slice(0, 3)}</span>
                                <span style={{ flex: 1, fontWeight: 700, fontSize: ".9rem" }}>{tm.name}</span>
                                <span className="et-mini">Qo'shilish</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {t.status === "REGISTRATION" && myTeams.some(x => x.registered) && (
                <div className="et-okmsg" style={{ marginBottom: 14 }}><Check size={16} /> Jamoangiz ro'yxatdan o'tgan</div>
            )}

            {/* Admin boshqaruvlari */}
            {isAdmin && (
                <div className="et-glass" style={{ padding: 16, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span className="et-lbl" style={{ width: "100%" }}>Admin</span>
                    {t.status === "UPCOMING" && <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}`, "PATCH", { status: "REGISTRATION" })} busy={busy} icon={Users}>Ro'yxat ochish</AdminBtn>}
                    {!t.bracketReady && participants.length >= 2 && <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}/generate`, "POST")} busy={busy} icon={Wand2}>Setka tuzish (Elo)</AdminBtn>}
                    {t.status === "ENDED" && t.prizePool ? <AdminBtn onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}/payout`, "POST")} busy={busy} icon={Banknote}>Yutuqni to'lash</AdminBtn> : null}
                    {isOwner && t.prizePool ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, ...soft }}>
                            <p style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--es-mut)" }}>{tr("pe.fund")}: <span style={{ color: "var(--es-c2)" }}>{t.prizeFundedLabel}</span> / {t.prizeLabel}</p>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input className="et-inp" value={fundAmt} onChange={e => setFundAmt(e.target.value)} placeholder="0" inputMode="numeric" />
                                <button className="et-mini" onClick={() => call(`/api/esport/admin/tournaments/${tournamentId}/fund`, "POST", { amount: Number(fundAmt) }).then(() => setFundAmt(""))} disabled={busy || !fundAmt}><Banknote size={14} /> {tr("pe.fundBtn")}</button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Ishtirokchilar (setka yo'q bo'lsa) */}
            {!t.bracketReady && participants.length > 0 && (
                <div className="et-glass" style={{ padding: 18, marginBottom: 14 }}>
                    <span className="et-lbl">Ishtirokchilar</span>
                    <div className="et-grid et-g2">
                        {participants.map(p => (
                            <div key={p.id} className="et-row" style={{ cursor: "default" }}>
                                <span className="et-logo" style={{ width: 30, height: 30, fontSize: ".65rem" }}>{p.tag.slice(0, 3)}</span>
                                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: ".86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Setka */}
            {t.bracketReady && (
                <div className="et-glass" style={{ padding: 16 }}>
                    <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 12 }}><Swords size={16} style={{ color: "var(--es-c2)" }} /> Setka</p>
                    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                        {mainRounds.map(round => (
                            <div key={round} style={{ display: "flex", minWidth: 150, flexDirection: "column", justifyContent: "space-around", gap: 12 }}>
                                <p style={{ textAlign: "center", fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--es-faint)" }}>{roundName(round, totalRounds)}</p>
                                {matches.filter(m => m.bracket === "MAIN" && m.round === round).sort((a, b) => a.slot - b.slot).map(m => (
                                    <MatchBox key={m.id} m={m} isAdmin={isAdmin} sel={sel} setSel={setSel} sa={sa} sb={sb} setSa={setSa} setSb={setSb}
                                        myTeamIds={myTeamIds} onDispute={() => setDispMatch(m)} proof={proof} onPickProof={pickProof} upBusy={upBusy}
                                        submit={() => call(`/api/esport/admin/tournaments/${tournamentId}/match`, "PATCH", { matchId: m.id, scoreA: Number(sa), scoreB: Number(sb), proofUrl: proof || null }).then(() => { setSel(null); setSa(""); setSb(""); setProof(""); })} busy={busy} />
                                ))}
                            </div>
                        ))}
                    </div>
                    {thirdMatch && (
                        <div style={{ marginTop: 16, borderTop: "1px solid var(--es-soft-bd)", paddingTop: 16 }}>
                            <p style={{ marginBottom: 8, textAlign: "center", fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#FFB020" }}>3-o'rin uchun</p>
                            <div style={{ maxWidth: 200, margin: "0 auto" }}>
                                <MatchBox m={thirdMatch} isAdmin={isAdmin} sel={sel} setSel={setSel} sa={sa} sb={sb} setSa={setSa} setSb={setSb}
                                    myTeamIds={myTeamIds} onDispute={() => setDispMatch(thirdMatch)} proof={proof} onPickProof={pickProof} upBusy={upBusy}
                                    submit={() => call(`/api/esport/admin/tournaments/${tournamentId}/match`, "PATCH", { matchId: thirdMatch.id, scoreA: Number(sa), scoreB: Number(sb), proofUrl: proof || null }).then(() => { setSel(null); setSa(""); setSb(""); setProof(""); })} busy={busy} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* E'tiroz modali */}
            {dispMatch && (
                <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2,6,20,.72)", padding: 16 }} onClick={() => !dispBusy && setDispMatch(null)}>
                    <div className="et-glass" style={{ width: "100%", maxWidth: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Flag size={16} style={{ color: "#FFB020" }} /> {tr("dp.title")}</p>
                            <button onClick={() => setDispMatch(null)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--es-mut)" }}><X size={16} /></button>
                        </div>
                        {dispDone ? (
                            <p className="et-grad" style={{ padding: "24px 0", textAlign: "center", fontWeight: 700 }}>{tr("dp.sent")}</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <p style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--es-mut)" }}>{dispMatch.teamA?.tag} {dispMatch.scoreA}:{dispMatch.scoreB} {dispMatch.teamB?.tag}</p>
                                <textarea value={dispReason} onChange={e => setDispReason(e.target.value)} placeholder={tr("dp.reasonPh")} rows={3} className="et-inp" style={{ resize: "none" }} />
                                <label className="et-row" style={{ cursor: "pointer", fontSize: ".78rem", fontWeight: 700, color: "var(--es-mut)" }}>
                                    {upBusy ? <Loader2 size={16} className="animate-spin" /> : dispShot ? <Check size={16} style={{ color: "var(--es-c2)" }} /> : <ImagePlus size={16} />} {tr("dp.proof")}
                                    <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) { setUpBusy(true); const u = await uploadImg(f); setUpBusy(false); if (u) setDispShot(u); } }} />
                                </label>
                                <button className="et-btn" style={{ width: "100%" }} onClick={fileDispute} disabled={dispBusy || !dispReason.trim()}>{dispBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {tr("dp.send")}</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminBtn({ onClick, busy, icon: Icon, children }: { onClick: () => void; busy: boolean; icon: typeof Users; children: ReactNode }) {
    return <button className="et-mini" onClick={onClick} disabled={busy}><Icon size={14} /> {children}</button>;
}

function MatchBox({ m, isAdmin, sel, setSel, sa, sb, setSa, setSb, submit, busy, myTeamIds, onDispute, proof, onPickProof, upBusy }: {
    m: Match; isAdmin: boolean; sel: string | null; setSel: (v: string | null) => void; sa: string; sb: string; setSa: (v: string) => void; setSb: (v: string) => void; submit: () => void; busy: boolean;
    myTeamIds: string[]; onDispute: () => void; proof: string; onPickProof: (f: File) => void; upBusy: boolean;
}) {
    const tr = useEsT();
    const editable = isAdmin && m.teamA && m.teamB && m.status !== "DONE";
    const open = sel === m.id;
    const canDispute = m.status === "DONE" && (myTeamIds.includes(m.teamA?.id ?? "") || myTeamIds.includes(m.teamB?.id ?? ""));
    const row = (team: TeamLite | null, seed: number | null, score: number | null, isWinner: boolean) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: isWinner ? "rgba(0,206,200,0.10)" : undefined }}>
            {seed != null && <span style={{ width: 16, textAlign: "center", fontSize: ".58rem", fontWeight: 700, color: "var(--es-faint)" }}>{seed}</span>}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".76rem", fontWeight: 700, color: team ? (isWinner ? "var(--es-fg)" : "var(--es-mut)") : "var(--es-faint)" }}>{team ? team.tag : "—"}</span>
            {score != null && <span style={{ fontSize: ".76rem", fontWeight: 700, color: isWinner ? "var(--es-c2)" : "var(--es-faint)" }}>{score}</span>}
        </div>
    );
    return (
        <div>
            <button onClick={() => editable && setSel(open ? null : m.id)} disabled={!editable} style={{ width: "100%", overflow: "hidden", borderRadius: 11, textAlign: "left", cursor: editable ? "pointer" : "default", ...soft }}>
                {row(m.teamA, m.seedA, m.scoreA, m.status === "DONE" && m.winnerId === m.teamA?.id)}
                <div style={{ height: 1, background: "var(--es-soft-bd)" }} />
                {row(m.teamB, m.seedB, m.scoreB, m.status === "DONE" && m.winnerId === m.teamB?.id)}
            </button>
            {m.streamUrl && <a href={m.streamUrl} target="_blank" rel="noreferrer" style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: ".62rem", fontWeight: 700, color: "var(--es-c2)" }}><Tv size={12} /> Efir</a>}
            {m.proofUrl && <a href={m.proofUrl} target="_blank" rel="noreferrer" style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: ".62rem", fontWeight: 700, color: "var(--es-faint)" }}><ImagePlus size={12} /> {tr("dp.viewProof")}</a>}
            {canDispute && <button onClick={onDispute} style={{ marginTop: 4, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 8, padding: "4px 0", fontSize: ".62rem", fontWeight: 700, color: "#FFB020", background: "rgba(255,176,32,0.10)", border: 0, cursor: "pointer" }}><Flag size={12} /> {tr("dp.dispute")}</button>}
            {open && editable && (
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4, borderRadius: 11, padding: 6, ...soft }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input value={sa} onChange={e => setSa(e.target.value)} placeholder="0" style={{ width: 40, borderRadius: 8, padding: "4px", textAlign: "center", fontSize: ".76rem", fontWeight: 700, background: "var(--et-surface-2)", border: "1px solid var(--es-card-bd)", color: "var(--es-fg)", outline: "none" }} />
                        <span style={{ color: "var(--es-faint)" }}>:</span>
                        <input value={sb} onChange={e => setSb(e.target.value)} placeholder="0" style={{ width: 40, borderRadius: 8, padding: "4px", textAlign: "center", fontSize: ".76rem", fontWeight: 700, background: "var(--et-surface-2)", border: "1px solid var(--es-card-bd)", color: "var(--es-fg)", outline: "none" }} />
                        <label style={{ marginLeft: "auto", display: "flex", height: 28, width: 28, cursor: "pointer", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--et-surface-2)", border: "1px solid var(--es-card-bd)" }}>
                            {upBusy ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--es-faint)" }} /> : proof ? <Check size={14} style={{ color: "var(--es-c2)" }} /> : <ImagePlus size={14} style={{ color: "var(--es-faint)" }} />}
                            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPickProof(f); }} />
                        </label>
                        <button onClick={submit} disabled={busy} style={{ display: "flex", height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, color: "#fff", background: ACCENT, border: 0, cursor: "pointer" }}><ShieldCheck size={14} /></button>
                    </div>
                    <p style={{ fontSize: ".58rem", color: "var(--es-faint)" }}>{tr("dp.proofUpload")}</p>
                </div>
            )}
        </div>
    );
}
