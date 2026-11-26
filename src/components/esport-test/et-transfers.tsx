"use client";

// Humo eSport PREMIUM — Transferlar (asl transfers-view bilan bir xil funksional).
// API o'zgarmagan: /api/esport/athletes, /api/esport/transfers (GET/POST/DELETE).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2, ArrowLeftRight, Search, Coins, Gamepad2, TrendingUp, ChevronRight, Send, Check, X, Clock } from "lucide-react";
import { useEsT, ES_BASE } from "@/lib/esport-i18n";

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

function money(n: number | null, notset = "Belgilanmagan") { return n == null ? notset : `${n.toLocaleString()} so'm`; }

function OfferRow({ text, busy, onApprove, onReject, onCancel, approveLabel, clock }: { text: string; busy: boolean; onApprove?: () => void; onReject?: () => void; onCancel?: () => void; approveLabel?: string; clock?: boolean }) {
    return (
        <div className="et-row" style={{ cursor: "default" }}>
            {clock && <Clock size={16} style={{ flex: "0 0 auto", color: "var(--es-faint)" }} />}
            <span style={{ minWidth: 0, flex: 1, fontSize: ".84rem", fontWeight: 500 }}>{text}</span>
            {onApprove && <button className="et-mini" disabled={busy} onClick={onApprove}><Check size={14} /> {approveLabel || "Qabul"}</button>}
            {onReject && <button className="et-mini ghost" disabled={busy} onClick={onReject}><X size={14} /> Rad</button>}
            {onCancel && <button className="et-mini ghost" disabled={busy} onClick={onCancel}>Bekor</button>}
        </div>
    );
}

function FeeRow({ o, busy, onSend, onCancel }: { o: Offer; busy: boolean; onSend: (fee: number) => void; onCancel: () => void }) {
    const [fee, setFee] = useState(o.marketValue != null ? String(o.marketValue) : "");
    return (
        <div className="et-glass" style={{ padding: 14 }}>
            <p style={{ fontSize: ".86rem", fontWeight: 600 }}>{o.ign} qabul qildi — {o.fromTeam?.tag} jamoasiga haq taklif qiling</p>
            <p style={{ marginTop: 2, fontSize: ".74rem", color: "var(--es-mut)" }}>Eng kam: {o.marketLabel || "0 so'm"} (transfermarket narxi)</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <Coins size={16} style={{ color: "#f0b400", flex: "0 0 auto" }} />
                    <input className="et-inp" value={fee} onChange={e => setFee(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Transfer haqi (so'm)" />
                </div>
                <button className="et-mini" disabled={busy} onClick={() => onSend(Number(fee || 0))}><Send size={14} /> Yuborish</button>
                <button className="et-mini ghost" disabled={busy} onClick={onCancel}>Bekor</button>
            </div>
        </div>
    );
}

export default function EtTransfers() {
    const tr = useEsT();
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
        <div style={{ marginTop: 14 }}>
            <div className="et-sh et-rise"><span className="num"><ArrowLeftRight size={15} /></span><div><h2>{tr("tr.title")}</h2><p>{tr("tr.sub")}</p></div></div>

            {/* Mening takliflarim */}
            {hasOffers && (
                <div className="et-glass et-rise" style={{ padding: 16, marginBottom: 16 }}>
                    <span className="et-lbl">{tr("tr.myOffers")}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {offers.asPlayer.map(o => (
                            <OfferRow key={o.id} text={`${o.toTeam?.name} sizga taklif: oylik ${o.salaryLabel || "—"}${o.contractMonths ? ` · ${o.contractMonths} oy` : ""}${o.conditions ? ` · ${o.conditions}` : ""}`}
                                busy={busy} onApprove={() => act(o.id, "approve")} onReject={() => act(o.id, "reject")} approveLabel="Qabul" />
                        ))}
                        {offers.asBuyer.map(o => {
                            if (o.status === "PLAYER_PENDING") return <OfferRow key={o.id} clock text={`${o.ign} — o'yinchi javobini kutmoqda`} busy={busy} onCancel={() => cancelOffer(o.id)} />;
                            if (o.status === "AWAIT_FEE") return <FeeRow key={o.id} o={o} busy={busy} onSend={(fee) => act(o.id, "setfee", fee)} onCancel={() => cancelOffer(o.id)} />;
                            if (o.status === "CLUB_PENDING") return <OfferRow key={o.id} clock text={`${o.ign} uchun ${o.fromTeam?.tag}ga ${o.feeLabel} taklif yuborildi — jamoa javobini kutmoqda`} busy={busy} />;
                            return null;
                        })}
                        {offers.asClub.map(o => (
                            <OfferRow key={o.id} text={`${o.toTeam?.name} ${o.ign}ni sotib olmoqchi — haq ${o.feeLabel} (bozor: ${o.marketLabel || "—"})`}
                                busy={busy} onApprove={() => act(o.id, "approve")} onReject={() => act(o.id, "reject")} approveLabel="Sotish" />
                        ))}
                    </div>
                </div>
            )}

            {/* Qidiruv */}
            <div className="et-rise" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", borderRadius: 14, padding: "4px 14px" }}>
                <Search size={16} style={{ color: "var(--es-faint)", flex: "0 0 auto" }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr("tr.search")}
                    style={{ width: "100%", background: "transparent", border: 0, outline: "none", color: "var(--es-fg)", fontFamily: "Inter", fontSize: ".9rem", padding: "9px 0" }} />
            </div>

            {loading ? (
                <div className="et-grid et-g3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="et-skel" style={{ height: 210 }} />)}</div>
            ) : filtered.length === 0 ? (
                <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><ArrowLeftRight size={24} /></span><b>{q ? tr("tr.notFound") : tr("tr.empty")}</b>{q ? tr("tr.searchOther") : tr("tr.emptyHint")}</div></div>
            ) : (
                <div className="et-grid et-g3">
                    {filtered.map((a, i) => (
                        <Link key={a.id} href={`${ES_BASE}/a/${a.id}`} className={`et-tile et-rise et-d${(i % 6) + 1}`} style={{ padding: 0, overflow: "hidden", textDecoration: "none", color: "inherit" }}>
                            {/* yuqori banner + avatar */}
                            <div style={{ position: "relative", height: 92, background: "linear-gradient(120deg,var(--es-c1),var(--es-c2) 55%,var(--es-c3))" }}>
                                <div style={{ position: "absolute", inset: 0, opacity: .3, background: "radial-gradient(circle at 72% 18%, rgba(255,255,255,.4), transparent 60%)" }} />
                                {a.rating != null && (
                                    <span style={{ position: "absolute", right: 12, top: 12, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 700, fontSize: ".7rem", padding: "4px 9px", borderRadius: 999, backdropFilter: "blur(4px)" }}>
                                        <TrendingUp size={12} /> {a.rating}
                                    </span>
                                )}
                                <span className="et-logo" style={{ position: "absolute", left: 16, bottom: -24, width: 56, height: 56, fontSize: "1rem", border: "4px solid var(--et-surface)" }}>
                                    {a.image ? <img src={a.image} alt="" /> : a.ign.slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div style={{ padding: "32px 16px 16px" }}>
                                <div className="et-fh" style={{ fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ign}</div>
                                <div style={{ marginTop: 2, fontSize: ".76rem", color: "var(--es-mut)" }}>{a.team ? `[${a.team.tag}] ${a.team.name}` : tr("tr.freeAgent")}</div>
                                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".76rem", fontWeight: 600, color: "var(--es-mut)" }}>
                                    <Gamepad2 size={14} style={{ color: "var(--es-c2)" }} /> {a.game ?? "—"}{a.position ? ` · ${a.position}` : ""}
                                </div>
                                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", borderRadius: 12, padding: "9px 12px" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".8rem", fontWeight: 600 }}><Coins size={14} style={{ color: "#f0b400" }} /> {money(a.marketValue, tr("common.notset"))}</span>
                                    <ChevronRight size={16} style={{ color: "var(--es-faint)" }} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
