"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, BadgeCheck, Shield, Gamepad2, TrendingUp, Hash, ChevronRight,
    Coins, Calendar, Trophy, ArrowUp, ArrowDown, Clock, Pencil, Check, X, Send, UserPlus, FileText,
} from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

interface Athlete {
    id: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null;
    game: { name: string } | null; createdAt: string; name: string; username: string | null;
    image: string | null; coverImage: string | null; humoId: string | null; verified: boolean; marketValue: number | null;
    team: { id: string; name: string; tag: string; logo: string | null; role: string; joinedAt: string; rating: number; peakRating: number; lowRating: number } | null;
    results: { wins: number; losses: number; played: number } | null;
}

interface Contract { id: string; salary: number | null; salaryLabel: string | null; startsAt: string; endsAt: string | null; status: string }

const roleLabel: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

// Sana'dan beri o'tgan vaqt (yil/oy/kun)
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

export default function AthleteProfile({ athleteId }: { athleteId: string }) {
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
    // Taklif yuborish (jamoa egasi)
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
        const r = await fetch(`/api/esport/contracts/${contract.id}/extend`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ months: Number(extMonths) }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setExtBusy(false);
        if (!r.error) {
            setExtMonths("");
            fetch(`/api/esport/athletes/${athleteId}`).then(x => x.json()).then(d => { setContract(d.contract || null); setCanExtend(!!d.canExtend); }).catch(() => { });
        }
    }

    async function savePrice() {
        setSavingPrice(true);
        const r = await fetch(`/api/esport/athletes/${athleteId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marketValue: priceVal.trim() === "" ? null : Number(priceVal) }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setSavingPrice(false);
        if (!r.error) { setA(prev => prev ? { ...prev, marketValue: r.marketValue } : prev); setEditPrice(false); }
    }

    if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>;
    if (!a) return <div className="flex flex-col items-center justify-center gap-3 py-24"><p className="text-sm es-mut">{t("ap.notFound")}</p><Link href="/esport/transfers" className="text-sm font-bold es-accent-text">{t("tr.title")}</Link></div>;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center gap-3">
                <Link href="/esport/transfers" className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                <span className="text-sm font-bold es-mut">{t("ap.card")}</span>
            </div>

            {/* Bosh karta */}
            <div className="relative mb-4 overflow-hidden rounded-3xl es-card">
                <div className="h-24 overflow-hidden es-accent-bg3">{a.coverImage && <img src={a.coverImage} alt="" className="h-full w-full object-cover" />}</div>
                <div className="px-6 pb-6">
                    <div className="-mt-12 flex items-end gap-4">
                        {a.image
                            ? <img src={a.image} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-[var(--es-card)]" />
                            : <div className="flex h-24 w-24 items-center justify-center rounded-3xl text-2xl font-black text-white ring-4 ring-[var(--es-card)] es-accent-bg">{a.ign.slice(0, 2).toUpperCase()}</div>}
                        <div className="mb-1 min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-xl font-black es-fg">{a.ign}{a.verified && <BadgeCheck className="h-5 w-5 es-accent-text" />}</p>
                            {a.name && <p className="truncate text-sm font-semibold es-mut">{a.name}</p>}
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold es-accent-text es-soft"><Gamepad2 className="h-3 w-3" /> {a.game?.name}</span>
                        {a.position && <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold es-mut es-soft">{a.position}</span>}
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-amber-400 es-soft"><Coins className="h-3 w-3" /> {a.marketValue == null ? t("common.notset") : money(a.marketValue)}</span>
                        {isAdmin && !editPrice && (
                            <button onClick={() => { setPriceVal(a.marketValue != null ? String(a.marketValue) : ""); setEditPrice(true); }} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold es-accent-text es-soft"><Pencil className="h-3 w-3" /> Narx</button>
                        )}
                    </div>
                    {isAdmin && editPrice && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 es-soft">
                                <Coins className="h-4 w-4 text-amber-400" />
                                <input value={priceVal} onChange={e => setPriceVal(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Transfer narxi (so'm) — bo'sh = belgilanmagan" className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                            </div>
                            <button onClick={savePrice} disabled={savingPrice} className="flex h-9 w-9 items-center justify-center rounded-xl text-white es-accent-bg disabled:opacity-50">{savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
                            <button onClick={() => setEditPrice(false)} className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><X className="h-4 w-4 es-mut" /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Jamoa */}
            {a.team ? (
                <Link href={`/esport/teams/${a.team.id}`} className="mb-4 flex items-center gap-3 rounded-3xl p-4 es-card">
                    <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-white ${a.team.logo ? "" : "es-accent-bg"}`}>{a.team.logo ? <img src={a.team.logo} alt="" className="h-full w-full object-contain" /> : a.team.tag.slice(0, 3)}</div>
                    <div className="flex-1"><p className="text-sm font-bold es-fg">{a.team.name}</p><p className="text-[11px] es-mut">[{a.team.tag}] · {roleLabel[a.team.role] || a.team.role} · jamoada {since(a.team.joinedAt)}dan beri</p></div>
                    <ChevronRight className="h-4 w-4 es-faint" />
                </Link>
            ) : (
                <div className="mb-4 flex items-center gap-2 rounded-3xl p-4 es-card"><Shield className="h-4 w-4 es-faint" /><span className="text-sm font-semibold es-mut">{t("ap.freeAthlete")}</span></div>
            )}

            {/* Shartnoma */}
            {contract && (
                <div className="mb-4 rounded-3xl p-4 es-card">
                    <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-sm font-black es-fg"><FileText className="h-4 w-4 es-accent-text" /> {t("ct.title")}</p>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={
                            contract.status === "ACTIVE" ? { background: "rgba(0,206,200,0.14)", color: "#00CEC8" }
                                : contract.status === "EXPIRED" ? { background: "rgba(255,176,32,0.14)", color: "#FFB020" }
                                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }
                        }>{contract.status === "ACTIVE" ? t("ct.active") : contract.status === "EXPIRED" ? t("ct.expired") : t("ct.terminated")}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs es-mut">
                        {contract.salaryLabel && <span>{t("ct.salary")}: <b className="es-fg">{contract.salaryLabel}</b></span>}
                        <span>{t("ct.until")}: <b className="es-fg">{contract.endsAt ? new Date(contract.endsAt).toLocaleDateString() : t("ct.openEnded")}</b></span>
                    </div>
                    {canExtend && (
                        <div className="mt-3 flex gap-2">
                            <input value={extMonths} onChange={e => setExtMonths(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ct.months")} className="w-24 rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                            <button onClick={extend} disabled={extBusy || !extMonths} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white es-accent-bg disabled:opacity-50">{extBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} {t("ct.extend")}</button>
                        </div>
                    )}
                </div>
            )}

            {/* Taklif yuborish (jamoa egasi) */}
            {myTeams.length > 0 && (
                <div className="mb-4 rounded-3xl p-4 es-card">
                    {offerMsg && <p className="mb-2 text-xs font-semibold es-accent-text">{offerMsg}</p>}
                    {!offerOpen ? (
                        <button onClick={() => { setOfferOpen(true); setOfferMsg(""); }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white es-accent-bg"><UserPlus className="h-4 w-4" /> {t("ap.offerBtn")}</button>
                    ) : (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between"><p className="text-sm font-black es-fg">{t("ap.offerTitle")}</p><button onClick={() => setOfferOpen(false)}><X className="h-4 w-4 es-mut" /></button></div>
                            <div className="flex flex-wrap gap-1.5">
                                {myTeams.map(t => <button key={t.id} onClick={() => setOTeam(t.id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${oTeam === t.id ? "text-white es-accent-bg" : "es-mut es-soft"}`}>{t.tag}</button>)}
                            </div>
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 es-soft">
                                <Coins className="h-4 w-4 text-amber-400" />
                                <input value={oSalary} onChange={e => setOSalary(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ap.salaryPh")} className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                            </div>
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 es-soft">
                                <Calendar className="h-4 w-4 es-accent-text" />
                                <input value={oMonths} onChange={e => setOMonths(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("ap.monthsPh")} className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                            </div>
                            <input value={oCond} onChange={e => setOCond(e.target.value)} placeholder={t("ap.condPh")} className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                            <button onClick={sendOffer} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-black text-white es-accent-bg disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Taklif yuborish</button>
                        </div>
                    )}
                </div>
            )}

            {/* Elo statistikasi */}
            {a.team && (
                <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat icon={TrendingUp} label={t("ap.curElo")} value={String(a.team.rating)} accent />
                    <Stat icon={ArrowUp} label={t("ap.maxElo")} value={String(a.team.peakRating)} />
                    <Stat icon={ArrowDown} label={t("ap.minElo")} value={String(a.team.lowRating)} />
                </div>
            )}

            {/* Natijalar + tajriba */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {a.results && <Stat icon={Trophy} label={t("ap.wins")} value={String(a.results.wins)} />}
                {a.results && <Stat icon={Trophy} label={t("ap.losses")} value={String(a.results.losses)} />}
                <Stat icon={Calendar} label={t("ap.games")} value={String(a.results?.played ?? 0)} />
                <Stat icon={Clock} label={t("ap.inEsport")} value={since(a.createdAt)} />
            </div>

            {/* O'yin ma'lumotlari */}
            <div className="mt-3 rounded-2xl p-4 es-card">
                <div className="flex items-center gap-2 text-sm es-fg"><Hash className="h-4 w-4 es-accent-text" /><span className="font-bold">In-game ID:</span> <span className="es-mut">{a.gameServer ? `${a.gameUserId} (${a.gameServer})` : a.gameUserId}</span></div>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Hash; label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-2xl p-4 es-card">
            <Icon className="h-4 w-4 es-accent-text" />
            <p className={`mt-2 text-lg font-black ${accent ? "es-accent-text" : "es-fg"}`}>{value}</p>
            <p className="text-[11px] font-semibold es-mut">{label}</p>
        </div>
    );
}
