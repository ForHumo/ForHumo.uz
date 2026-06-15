"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, ArrowLeftRight, Search, Coins, Gamepad2, TrendingUp, ChevronRight, Send, Check, X, Clock } from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

interface Card {
    id: string; ign: string; position: string | null; game: string | null;
    image: string | null; marketValue: number | null;
    team: { name: string; tag: string; logo: string | null } | null; rating: number | null;
}
interface Offer {
    id: string; status: string; athleteId: string; ign: string; athleteName: string;
    toTeam: { name: string; tag: string } | null; fromTeam: { name: string; tag: string } | null;
    salary: number | null; salaryLabel: string | null; conditions: string | null; contractMonths: number | null;
    fee: number | null; feeLabel: string | null; marketValue: number | null; marketLabel: string | null;
}
interface Offers { asPlayer: Offer[]; asBuyer: Offer[]; asClub: Offer[] }

function money(n: number | null) { return n == null ? "Belgilanmagan" : `${n.toLocaleString()} so'm`; }

function OfferCard({ text, busy, onApprove, onReject, onCancel, approveLabel, icon }: { text: string; busy: boolean; onApprove?: () => void; onReject?: () => void; onCancel?: () => void; approveLabel?: string; icon?: "clock" }) {
    const t = useEsT();
    return (
        <div className="flex items-center gap-2 rounded-2xl p-3 es-card">
            {icon === "clock" && <Clock className="h-4 w-4 shrink-0 es-faint" />}
            <span className="min-w-0 flex-1 text-xs font-semibold es-fg">{text}</span>
            {onApprove && <button onClick={onApprove} disabled={busy} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white es-accent-bg disabled:opacity-50"><Check className="h-3.5 w-3.5" /> {approveLabel || t("tr.accept")}</button>}
            {onReject && <button onClick={onReject} disabled={busy} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold es-mut es-soft disabled:opacity-50"><X className="h-3.5 w-3.5" /> {t("tr.reject")}</button>}
            {onCancel && <button onClick={onCancel} disabled={busy} className="flex h-8 items-center rounded-lg px-3 text-xs font-bold es-mut es-soft disabled:opacity-50">{t("tr.cancel")}</button>}
        </div>
    );
}

function FeeCard({ o, busy, onSend, onCancel }: { o: Offer; busy: boolean; onSend: (fee: number) => void; onCancel: () => void }) {
    const t = useEsT();
    const [fee, setFee] = useState(o.marketValue != null ? String(o.marketValue) : "");
    return (
        <div className="rounded-2xl p-3 es-card">
            <p className="text-xs font-semibold es-fg">{o.ign} qabul qildi — {o.fromTeam?.tag} jamoasiga haq taklif qiling</p>
            <p className="mt-0.5 text-[11px] es-mut">Eng kam: {o.marketLabel || "0 so'm"} (transfermarket narxi)</p>
            <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 es-soft">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <input value={fee} onChange={e => setFee(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Transfer haqi (so'm)" className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
                </div>
                <button onClick={() => onSend(Number(fee || 0))} disabled={busy} className="flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-bold text-white es-accent-bg disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {t("tr.send")}</button>
                <button onClick={onCancel} disabled={busy} className="flex h-9 items-center rounded-xl px-3 text-xs font-bold es-mut es-soft">{t("tr.cancel")}</button>
            </div>
        </div>
    );
}

export default function TransfersView() {
    const t = useEsT();
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<Card[]>([]);
    const [q, setQ] = useState("");
    const [offers, setOffers] = useState<Offers>({ asPlayer: [], asBuyer: [], asClub: [] });
    const [busy, setBusy] = useState(false);

    const loadOffers = useCallback(() => {
        fetch("/api/esport/transfers").then(r => r.json()).then(d => setOffers({ asPlayer: d.asPlayer || [], asBuyer: d.asBuyer || [], asClub: d.asClub || [] })).catch(() => { });
    }, []);
    useEffect(() => {
        fetch("/api/esport/athletes").then(r => r.json()).then(d => { setList(d.athletes || []); setLoading(false); }).catch(() => setLoading(false));
        loadOffers();
    }, [loadOffers]);

    async function act(id: string, action: string, fee?: number) {
        setBusy(true);
        await fetch(`/api/esport/transfers/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, fee }) }).catch(() => { });
        setBusy(false); loadOffers();
    }
    async function cancelOffer(id: string) {
        setBusy(true);
        await fetch(`/api/esport/transfers/${id}`, { method: "DELETE" }).catch(() => { });
        setBusy(false); loadOffers();
    }
    const hasOffers = offers.asPlayer.length + offers.asBuyer.length + offers.asClub.length > 0;

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return list;
        return list.filter(a => a.ign.toLowerCase().includes(s) || (a.team?.name.toLowerCase().includes(s)) || (a.team?.tag.toLowerCase().includes(s)));
    }, [list, q]);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center gap-3">
                <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl es-accent-bg"><ArrowLeftRight className="h-5 w-5 text-white" /></div>
                    <div>
                        <h1 className="text-lg font-black es-fg">{t("tr.title")}</h1>
                        <p className="text-[11px] es-mut">{t("tr.sub")}</p>
                    </div>
                </div>
            </div>

            {/* Mening takliflarim */}
            {hasOffers && (
                <div className="mb-5 space-y-2">
                    <p className="px-1 text-xs font-black uppercase tracking-wide es-accent-text">{t("tr.offers")}</p>
                    {offers.asPlayer.map(o => (
                        <OfferCard key={o.id} text={`${o.toTeam?.name} sizga taklif: oylik ${o.salaryLabel || "—"}${o.contractMonths ? ` · ${o.contractMonths} oy` : ""}${o.conditions ? ` · ${o.conditions}` : ""}`}
                            busy={busy} onApprove={() => act(o.id, "approve")} onReject={() => act(o.id, "reject")} approveLabel={t("tr.accept")} />
                    ))}
                    {offers.asBuyer.map(o => {
                        if (o.status === "PLAYER_PENDING") return <OfferCard key={o.id} icon="clock" text={`${o.ign} — o'yinchi javobini kutmoqda`} busy={busy} onCancel={() => cancelOffer(o.id)} />;
                        if (o.status === "AWAIT_FEE") return <FeeCard key={o.id} o={o} busy={busy} onSend={(fee) => act(o.id, "setfee", fee)} onCancel={() => cancelOffer(o.id)} />;
                        if (o.status === "CLUB_PENDING") return <OfferCard key={o.id} icon="clock" text={`${o.ign} uchun ${o.fromTeam?.tag}ga ${o.feeLabel} taklif yuborildi — jamoa javobini kutmoqda`} busy={busy} />;
                        return null;
                    })}
                    {offers.asClub.map(o => (
                        <OfferCard key={o.id} text={`${o.toTeam?.name} ${o.ign}ni sotib olmoqchi — haq ${o.feeLabel} (bozor: ${o.marketLabel || "—"})`}
                            busy={busy} onApprove={() => act(o.id, "approve")} onReject={() => act(o.id, "reject")} approveLabel={t("tr.sell")} />
                    ))}
                </div>
            )}

            {/* Qidiruv */}
            <div className="mb-5 flex items-center gap-2 rounded-2xl px-4 py-2.5 es-soft">
                <Search className="h-4 w-4 es-faint" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("tr.search")}
                    className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>
            ) : filtered.length === 0 ? (
                <div className="rounded-3xl p-10 text-center es-card">
                    <ArrowLeftRight className="mx-auto h-10 w-10 es-faint" />
                    <p className="mt-3 text-sm font-bold es-mut">{q ? t("tr.notFound") : t("tr.empty")}</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(a => (
                        <Link key={a.id} href={`/esport/a/${a.id}`} className="group overflow-hidden rounded-3xl es-card transition-transform hover:scale-[1.02]">
                            {/* Karta yuqori — avatar + Elo */}
                            <div className="relative h-28 es-accent-bg3">
                                <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.35), transparent 60%)" }} />
                                {a.rating != null && (
                                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-black text-white backdrop-blur-sm">
                                        <TrendingUp className="h-3 w-3" /> {a.rating}
                                    </span>
                                )}
                                <div className="absolute -bottom-7 left-4">
                                    {a.image
                                        ? <img src={a.image} alt="" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-[var(--es-card)]" />
                                        : <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black text-white ring-4 ring-[var(--es-card)] es-accent-bg">{a.ign.slice(0, 2).toUpperCase()}</div>}
                                </div>
                            </div>
                            <div className="px-4 pb-4 pt-9">
                                <p className="truncate text-base font-black es-fg">{a.ign}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] es-mut">
                                    {a.team ? <span className="font-bold">[{a.team.tag}] {a.team.name}</span> : <span>Erkin sportchi</span>}
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold es-mut">
                                    <Gamepad2 className="h-3.5 w-3.5 es-accent-text" /> {a.game ?? "—"}{a.position ? ` · ${a.position}` : ""}
                                </div>
                                <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 es-soft">
                                    <span className="flex items-center gap-1.5 text-xs font-bold es-fg"><Coins className="h-3.5 w-3.5 text-amber-400" /> {a.marketValue == null ? t("common.notset") : money(a.marketValue)}</span>
                                    <ChevronRight className="h-4 w-4 es-faint transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
