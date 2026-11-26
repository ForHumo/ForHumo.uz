"use client";

// Humo eSport PREMIUM — sportchi profili (a/[id]). Asl athlete-profile bilan bir xil
// funksional/i18n; /esport-test havolalari, et-glass kartalar, native date o'rnida EtDatePicker.

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, BadgeCheck, Shield, Gamepad2, TrendingUp, Hash, ChevronRight,
    Coins, Calendar, Trophy, ArrowUp, ArrowDown, Clock, Pencil, Check, X, Send, UserPlus, FileText, Ban,
} from "lucide-react";
import { useEsT, ES_BASE } from "@/lib/esport-i18n";
import { EtDatePicker } from "./et-date-picker";
import { PlayerCardBody, useCardTilt, type PlayerData } from "./et-card";
import { gameSlug, GAME_LABEL, ccFromCountry, countryName } from "@/lib/esport-card";

interface Athlete {
    id: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null;
    game: { name: string } | null; createdAt: string; name: string; username: string | null; country: string | null;
    image: string | null; coverImage: string | null; humoId: string | null; verified: boolean; marketValue: number | null;
    blocked: boolean; blockedUntil: string | null;
    team: { id: string; name: string; tag: string; logo: string | null; role: string; joinedAt: string; rating: number; peakRating: number; lowRating: number } | null;
    results: { wins: number; losses: number; played: number } | null;
}
interface Contract { id: string; salary: number | null; salaryLabel: string | null; startsAt: string; endsAt: string | null; status: string }

const roleLabel: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

function since(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 864e5);
    if (days < 1) return "bugun";
    if (days < 30) return `${days} kun`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} oy`;
    const years = Math.floor(months / 12);
    const remM = months % 12;
    return remM ? `${years} yil ${remM} oy` : `${years} yil`;
}
function money(n: number | null) { return n == null ? "Belgilanmagan" : `${n.toLocaleString()} so'm`; }

export default function EtAthleteProfile({ athleteId }: { athleteId: string }) {
    const t = useEsT();
    const [a, setA] = useState<Athlete | null>(null);
    const [contract, setContract] = useState<Contract | null>(null);
    const [canExtend, setCanExtend] = useState(false);
    const [extMonths, setExtMonths] = useState("");
    const [extBusy, setExtBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editPrice, setEditPrice] = useState(false);
    const [priceVal, setPriceVal] = useState("");
    const [savingPrice, setSavingPrice] = useState(false);
    const [blockOpen, setBlockOpen] = useState(false);
    const [blockUntil, setBlockUntil] = useState("");
    const [blockReason, setBlockReason] = useState("");
    const [blockBusy, setBlockBusy] = useState(false);
    const reloadAthlete = () => fetch(`/api/esport/athletes/${athleteId}`).then(r => r.json()).then(d => { setA(d.athlete || null); setContract(d.contract || null); setCanExtend(!!d.canExtend); }).catch(() => { });
    async function block(permanent: boolean) {
        if (!permanent && !blockUntil) return;
        setBlockBusy(true);
        const until = permanent ? "permanent" : new Date(blockUntil).toISOString();
        await fetch(`/api/esport/admin/athletes/${athleteId}/block`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ until, reason: blockReason || null }) }).catch(() => { });
        setBlockBusy(false); setBlockOpen(false); setBlockReason(""); setBlockUntil(""); reloadAthlete();
    }
    async function unblock() {
        setBlockBusy(true);
        await fetch(`/api/esport/admin/athletes/${athleteId}/block`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ until: null }) }).catch(() => { });
        setBlockBusy(false); reloadAthlete();
    }
    const [myTeams, setMyTeams] = useState<{ id: string; name: string; tag: string }[]>([]);
    const [offerOpen, setOfferOpen] = useState(false);
    const [oTeam, setOTeam] = useState("");
    const [oSalary, setOSalary] = useState("");
    const [oCond, setOCond] = useState("");
    const [oMonths, setOMonths] = useState("");
    const [sending, setSending] = useState(false);
    const [offerMsg, setOfferMsg] = useState("");

    useEffect(() => {
        fetch(`/api/esport/athletes/${athleteId}`).then(r => r.json()).then(d => { setA(d.athlete || null); setContract(d.contract || null); setCanExtend(!!d.canExtend); setLoading(false); }).catch(() => setLoading(false));
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
        fetch("/api/esport/teams").then(r => r.json()).then(d => { const o = d.owned || []; setMyTeams(o); if (o[0]) setOTeam(o[0].id); }).catch(() => { });
    }, [athleteId]);

    async function sendOffer() {
        if (!oTeam) return setOfferMsg(t("ap.pickTeam"));
        setSending(true); setOfferMsg("");
        const r = await fetch("/api/esport/transfers", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId, toTeamId: oTeam, salary: oSalary || null, conditions: oCond || null, contractMonths: oMonths || null }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setSending(false);
        if (r.error) return setOfferMsg(r.error);
        setOfferMsg(t("ap.sent")); setOfferOpen(false); setOSalary(""); setOCond(""); setOMonths("");
    }
    async function extend() {
        if (!contract || !extMonths) return;
        setExtBusy(true);
        const r = await fetch(`/api/esport/contracts/${contract.id}/extend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ months: Number(extMonths) }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setExtBusy(false);
        if (!r.error) { setExtMonths(""); fetch(`/api/esport/athletes/${athleteId}`).then(x => x.json()).then(d => { setContract(d.contract || null); setCanExtend(!!d.canExtend); }).catch(() => { }); }
    }
    async function savePrice() {
        setSavingPrice(true);
        const r = await fetch(`/api/esport/athletes/${athleteId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marketValue: priceVal.trim() === "" ? null : Number(priceVal) }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setSavingPrice(false);
        if (!r.error) { setA(prev => prev ? { ...prev, marketValue: r.marketValue } : prev); setEditPrice(false); }
    }

    useCardTilt(a?.id);

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "96px 0" }}><Loader2 className="animate-spin" size={28} style={{ color: "var(--es-faint)" }} /></div>;
    if (!a) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "96px 0" }}><p style={{ color: "var(--es-mut)" }}>{t("ap.notFound")}</p><Link href={`${ES_BASE}/transfers`} className="et-grad" style={{ fontWeight: 700 }}>{t("tr.title")}</Link></div>;

    // O'yinchi kartasi — identity REAL (ism/rasm/o'yin/rol/jamoa/davlat); OVR+6 ko'rsatkich
    // Steam/Faceit ulanib, match-stat yig'ilgach hisoblanadi → hozir "pending" (raqam "—").
    const pcGame = gameSlug(a.game?.name);
    const playerCard: PlayerData = {
        tier: "bronza", game: pcGame, ovr: 0, pending: true,
        role: (a.position || "").trim().toUpperCase().slice(0, 7) || "—",
        gameLabel: GAME_LABEL[pcGame], rank: "Yangi",
        name: a.ign, country: countryName(a.country), cc: ccFromCountry(a.country),
        team: a.team?.name, teamInitial: a.team ? a.team.tag.slice(0, 1).toUpperCase() : undefined, teamColor: "#3aa0ff",
        photo: a.image || undefined, stats: [], lead: a.ign, cap: "",
    };

    return (
        <div style={{ maxWidth: 760, margin: "14px auto 0" }}>
            <div className="et-sh et-rise"><span className="num"><Gamepad2 size={15} /></span><div><h2>{a.ign}</h2><p>{t("ap.card")}</p></div></div>

            {/* O'yinchi kartasi (premium — identity real, reyting kutilmoqda) */}
            <div className="etc-cw et-rise" style={{ margin: "0 auto 16px" }}><PlayerCardBody d={playerCard} /></div>

            {/* Bosh karta */}
            <div className="et-glass et-rise" style={{ overflow: "hidden", marginBottom: 14 }}>
                <div style={{ height: 96, background: "linear-gradient(120deg,var(--es-c1),var(--es-c2) 55%,var(--es-c3))", overflow: "hidden" }}>{a.coverImage && <img src={a.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ padding: "0 22px 22px" }}>
                    <div style={{ marginTop: -44, display: "flex", alignItems: "flex-end", gap: 16 }}>
                        <span className="et-logo" style={{ width: 92, height: 92, fontSize: "1.5rem", border: "4px solid var(--et-surface)" }}>{a.image ? <img src={a.image} alt="" /> : a.ign.slice(0, 2).toUpperCase()}</span>
                        <div style={{ marginBottom: 4, minWidth: 0, flex: 1 }}>
                            <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "1.3rem" }}>{a.ign}{a.verified && <BadgeCheck size={18} style={{ color: "var(--es-c2)" }} />}</p>
                            {a.name && <p style={{ color: "var(--es-mut)", fontSize: ".9rem", fontWeight: 600 }}>{a.name}</p>}
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span className="et-chip up"><Gamepad2 size={12} style={{ display: "inline", marginRight: 4 }} /> {a.game?.name}</span>
                        {a.position && <span className="et-chip end">{a.position}</span>}
                        <span className="et-chip" style={{ color: "#f0b400", background: "var(--es-soft)" }}><Coins size={12} style={{ display: "inline", marginRight: 4 }} /> {money(a.marketValue)}</span>
                        {a.blocked && <span className="et-chip" style={{ color: "#ff7a84", background: "rgba(255,80,90,.12)" }}><Ban size={12} style={{ display: "inline", marginRight: 4 }} /> {t("bl.blocked")}</span>}
                        {isAdmin && !editPrice && <button className="et-pbtn" onClick={() => { setPriceVal(a.marketValue != null ? String(a.marketValue) : ""); setEditPrice(true); }}><Pencil size={12} /> Narx</button>}
                    </div>
                    {isAdmin && editPrice && (
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <input className="et-inp" value={priceVal} onChange={e => setPriceVal(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Transfer narxi (so'm) — bo'sh = belgilanmagan" />
                            <button className="et-mini" onClick={savePrice} disabled={savingPrice}>{savingPrice ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button>
                            <button className="et-mini ghost" onClick={() => setEditPrice(false)}><X size={16} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bloklash (admin) */}
            {isAdmin && (
                <div className="et-glass" style={{ padding: 16, marginBottom: 14 }}>
                    <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 10 }}><Ban size={16} style={{ color: "#ff7a84" }} /> {t("bl.title")}</p>
                    {a.blocked ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <p style={{ fontSize: ".8rem", color: "var(--es-mut)" }}>{t("bl.until")}: <b style={{ color: "var(--es-fg)" }}>{a.blockedUntil && new Date(a.blockedUntil).getFullYear() >= 2090 ? t("bl.permanent") : (a.blockedUntil ? new Date(a.blockedUntil).toLocaleDateString() : "")}</b></p>
                            <button className="et-mini" onClick={unblock} disabled={blockBusy}>{t("bl.unblock")}</button>
                        </div>
                    ) : !blockOpen ? (
                        <button className="et-mini danger" onClick={() => setBlockOpen(true)}><Ban size={14} /> {t("bl.block")}</button>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input className="et-inp" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder={t("bl.reasonPh")} />
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1 }}><EtDatePicker value={blockUntil} onChange={setBlockUntil} placeholder={t("bl.until")} /></div>
                                <button className="et-mini" onClick={() => block(false)} disabled={blockBusy || !blockUntil}>{t("bl.blockUntil")}</button>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="et-mini danger" style={{ flex: 1 }} onClick={() => block(true)} disabled={blockBusy}>{t("bl.permanent")}</button>
                                <button className="et-mini ghost" onClick={() => setBlockOpen(false)}><X size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Jamoa */}
            {a.team ? (
                <Link href={`${ES_BASE}/teams/${a.team.id}`} className="et-row et-rise" style={{ marginBottom: 14, textDecoration: "none", color: "inherit" }}>
                    <span className="et-logo" style={{ width: 44, height: 44 }}>{a.team.logo ? <img src={a.team.logo} alt="" /> : a.team.tag.slice(0, 3)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><p className="et-fh" style={{ fontWeight: 700, fontSize: ".9rem" }}>{a.team.name}</p><p style={{ fontSize: ".72rem", color: "var(--es-mut)" }}>[{a.team.tag}] · {roleLabel[a.team.role] || a.team.role} · jamoada {since(a.team.joinedAt)}dan beri</p></div>
                    <ChevronRight size={16} style={{ color: "var(--es-faint)" }} />
                </Link>
            ) : (
                <div className="et-row" style={{ marginBottom: 14, cursor: "default" }}><Shield size={16} style={{ color: "var(--es-faint)" }} /><span style={{ fontSize: ".86rem", fontWeight: 600, color: "var(--es-mut)" }}>{t("ap.freeAthlete")}</span></div>
            )}

            {/* Shartnoma */}
            {contract && (
                <div className="et-glass" style={{ padding: 16, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><FileText size={16} style={{ color: "var(--es-c2)" }} /> {t("ct.title")}</p>
                        <span className="et-chip" style={contract.status === "ACTIVE" ? { background: "rgba(0,206,200,.14)", color: "var(--es-c2)" } : contract.status === "EXPIRED" ? { background: "rgba(255,176,32,.14)", color: "#FFB020" } : { background: "var(--es-soft)", color: "var(--es-mut)" }}>{contract.status === "ACTIVE" ? t("ct.active") : contract.status === "EXPIRED" ? t("ct.expired") : t("ct.terminated")}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: ".8rem", color: "var(--es-mut)" }}>
                        {contract.salaryLabel && <span>{t("ct.salary")}: <b style={{ color: "var(--es-fg)" }}>{contract.salaryLabel}</b></span>}
                        <span>{t("ct.until")}: <b style={{ color: "var(--es-fg)" }}>{contract.endsAt ? new Date(contract.endsAt).toLocaleDateString() : t("ct.openEnded")}</b></span>
                    </div>
                    {canExtend && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                            <input className="et-inp" style={{ width: 110 }} value={extMonths} onChange={e => setExtMonths(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ct.months")} />
                            <button className="et-mini" onClick={extend} disabled={extBusy || !extMonths}>{extBusy ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} {t("ct.extend")}</button>
                        </div>
                    )}
                </div>
            )}

            {/* Taklif yuborish (jamoa egasi) */}
            {myTeams.length > 0 && (
                <div className="et-glass" style={{ padding: 16, marginBottom: 14 }}>
                    {offerMsg && <p className="et-grad" style={{ marginBottom: 8, fontSize: ".8rem", fontWeight: 600 }}>{offerMsg}</p>}
                    {!offerOpen ? (
                        <button className="et-btn" style={{ width: "100%" }} onClick={() => { setOfferOpen(true); setOfferMsg(""); }}><UserPlus size={16} /> {t("ap.offerBtn")}</button>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><p className="et-fh" style={{ fontWeight: 700 }}>{t("ap.offerTitle")}</p><button onClick={() => setOfferOpen(false)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--es-mut)" }}><X size={16} /></button></div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {myTeams.map(tm => <button key={tm.id} className={`et-pbtn${oTeam === tm.id ? " on" : ""}`} onClick={() => setOTeam(tm.id)}>{tm.tag}</button>)}
                            </div>
                            <input className="et-inp" value={oSalary} onChange={e => setOSalary(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ap.salaryPh")} />
                            <input className="et-inp" value={oMonths} onChange={e => setOMonths(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ap.monthsPh")} />
                            <input className="et-inp" value={oCond} onChange={e => setOCond(e.target.value)} placeholder={t("ap.condPh")} />
                            <button className="et-btn" style={{ width: "100%" }} onClick={sendOffer} disabled={sending}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Taklif yuborish</button>
                        </div>
                    )}
                </div>
            )}

            {/* Elo statistikasi */}
            {a.team && (
                <div className="et-grid et-g3" style={{ marginBottom: 14 }}>
                    <Stat icon={TrendingUp} label={t("ap.curElo")} value={String(a.team.rating)} accent />
                    <Stat icon={ArrowUp} label={t("ap.maxElo")} value={String(a.team.peakRating)} />
                    <Stat icon={ArrowDown} label={t("ap.minElo")} value={String(a.team.lowRating)} />
                </div>
            )}

            {/* Natijalar + tajriba */}
            <div className="et-grid et-g4">
                {a.results && <Stat icon={Trophy} label={t("ap.wins")} value={String(a.results.wins)} />}
                {a.results && <Stat icon={Trophy} label={t("ap.losses")} value={String(a.results.losses)} />}
                <Stat icon={Calendar} label={t("ap.games")} value={String(a.results?.played ?? 0)} />
                <Stat icon={Clock} label={t("ap.inEsport")} value={since(a.createdAt)} />
            </div>

            {/* O'yin ma'lumotlari */}
            <div className="et-glass" style={{ padding: 16, marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".86rem" }}><Hash size={16} style={{ color: "var(--es-c2)" }} /><span style={{ fontWeight: 700 }}>In-game ID:</span> <span style={{ color: "var(--es-mut)" }}>{a.gameServer ? `${a.gameUserId} (${a.gameServer})` : a.gameUserId}</span></div>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Hash; label: string; value: string; accent?: boolean }) {
    return (
        <div className="et-glass" style={{ padding: 16 }}>
            <Icon size={16} style={{ color: "var(--es-c2)" }} />
            <p className="et-fh" style={{ marginTop: 8, fontSize: "1.15rem", fontWeight: 700, color: accent ? "var(--es-c2)" : "var(--es-fg)" }}>{value}</p>
            <p style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--es-mut)" }}>{label}</p>
        </div>
    );
}
