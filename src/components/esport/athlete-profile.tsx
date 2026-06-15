"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, BadgeCheck, Shield, Gamepad2, TrendingUp, Hash, ChevronRight,
    Coins, Calendar, Trophy, ArrowUp, ArrowDown, Clock, Pencil, Check, X, Send, UserPlus,
} from "lucide-react";

interface Athlete {
    id: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null;
    game: { name: string } | null; createdAt: string; name: string; username: string | null;
    image: string | null; humoId: string | null; verified: boolean; marketValue: number | null;
    team: { id: string; name: string; tag: string; logo: string | null; role: string; joinedAt: string; rating: number; peakRating: number; lowRating: number } | null;
    results: { wins: number; losses: number; played: number } | null;
}

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
    const [a, setA] = useState<Athlete | null>(null);
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
        fetch(`/api/esport/athletes/${athleteId}`).then(r => r.json()).then(d => { setA(d.athlete || null); setLoading(false); }).catch(() => setLoading(false));
        fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { });
        fetch("/api/esport/teams").then(r => r.json()).then(d => { const o = d.owned || []; setMyTeams(o); if (o[0]) setOTeam(o[0].id); }).catch(() => { });
    }, [athleteId]);

    async function sendOffer() {
        if (!oTeam) return setOfferMsg("Jamoa tanlang");
        setSending(true); setOfferMsg("");
        const r = await fetch("/api/esport/transfers", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId, toTeamId: oTeam, salary: oSalary || null, conditions: oCond || null, contractMonths: oMonths || null }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setSending(false);
        if (r.error) return setOfferMsg(r.error);
        setOfferMsg("Taklif o'yinchiga yuborildi"); setOfferOpen(false); setOSalary(""); setOCond(""); setOMonths("");
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
    if (!a) return <div className="flex flex-col items-center justify-center gap-3 py-24"><p className="text-sm es-mut">Sportchi topilmadi</p><Link href="/esport/transfers" className="text-sm font-bold es-accent-text">Transfer bozori</Link></div>;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center gap-3">
                <Link href="/esport/transfers" className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                <span className="text-sm font-bold es-mut">Sportchi kartasi</span>
            </div>

            {/* Bosh karta */}
            <div className="relative mb-4 overflow-hidden rounded-3xl es-card">
                <div className="h-24 es-accent-bg3" />
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
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-amber-400 es-soft"><Coins className="h-3 w-3" /> {money(a.marketValue)}</span>
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
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-white es-accent-bg">{a.team.logo ? <img src={a.team.logo} alt="" className="h-full w-full object-cover" /> : a.team.tag.slice(0, 3)}</div>
                    <div className="flex-1"><p className="text-sm font-bold es-fg">{a.team.name}</p><p className="text-[11px] es-mut">[{a.team.tag}] · {roleLabel[a.team.role] || a.team.role} · jamoada {since(a.team.joinedAt)}dan beri</p></div>
                    <ChevronRight className="h-4 w-4 es-faint" />
                </Link>
            ) : (
                <div className="mb-4 flex items-center gap-2 rounded-3xl p-4 es-card"><Shield className="h-4 w-4 es-faint" /><span className="text-sm font-semibold es-mut">Erkin sportchi (jamoasiz)</span></div>
            )}

            {/* Taklif yuborish (jamoa egasi) */}
            {myTeams.length > 0 && (
                <div className="mb-4 rounded-3xl p-4 es-card">
                    {offerMsg && <p className="mb-2 text-xs font-semibold es-accent-text">{offerMsg}</p>}
                    {!offerOpen ? (
                        <button onClick={() => { setOfferOpen(true); setOfferMsg(""); }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white es-accent-bg"><UserPlus className="h-4 w-4" /> Transfer taklifi yuborish</button>
                    ) : (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between"><p className="text-sm font-black es-fg">O'yinchiga taklif</p><button onClick={() => setOfferOpen(false)}><X className="h-4 w-4 es-mut" /></button></div>
                            <div className="flex flex-wrap gap-1.5">
                                {myTeams.map(t => <button key={t.id} onClick={() => setOTeam(t.id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${oTeam === t.id ? "text-white es-accent-bg" : "es-mut es-soft"}`}>{t.tag}</button>)}
                            </div>
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 es-soft">
                                <Coins className="h-4 w-4 text-amber-400" />
                                <input value={oSalary} onChange={e => setOSalary(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Oylik maosh (so'm)" className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                            </div>
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 es-soft">
                                <Calendar className="h-4 w-4 es-accent-text" />
                                <input value={oMonths} onChange={e => setOMonths(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Shartnoma muddati (oy)" className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                            </div>
                            <input value={oCond} onChange={e => setOCond(e.target.value)} placeholder="Qo'shimcha shartlar (ixtiyoriy)" className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                            <button onClick={sendOffer} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-black text-white es-accent-bg disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Taklif yuborish</button>
                        </div>
                    )}
                </div>
            )}

            {/* Elo statistikasi */}
            {a.team && (
                <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat icon={TrendingUp} label="Joriy Elo" value={String(a.team.rating)} accent />
                    <Stat icon={ArrowUp} label="Maksimal Elo" value={String(a.team.peakRating)} />
                    <Stat icon={ArrowDown} label="Minimal Elo" value={String(a.team.lowRating)} />
                </div>
            )}

            {/* Natijalar + tajriba */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {a.results && <Stat icon={Trophy} label="G'alaba" value={String(a.results.wins)} />}
                {a.results && <Stat icon={Trophy} label="Mag'lubiyat" value={String(a.results.losses)} />}
                <Stat icon={Calendar} label="O'yinlar" value={String(a.results?.played ?? 0)} />
                <Stat icon={Clock} label="eSportda" value={since(a.createdAt)} />
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
