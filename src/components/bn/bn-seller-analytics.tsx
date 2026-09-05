"use client";

// Sotuvchi tahlil ekrani — 4 dashboard raqam + AI tavsiya + trend grafik +
// kategoriya breakdown + 5 reyting + sotilmagan (tez chegirma).

import { useEffect, useMemo, useState } from "react";
import {
    TrendingUp, TrendingDown, DollarSign, Package, Users, Eye,
    Trophy, Award, Percent, Ban, Sparkles, ChevronRight,
    AlertTriangle, Calendar, Loader2, Store, Check, Download,
    Tag, BarChart3, Layers, X, Printer, Wand2, Send, PackageMinus,
} from "lucide-react";
import { BN, fmtPrice, fmtPriceShort } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnSellerAiCommand } from "./bn-seller-ai-command";

interface RankRow {
    productId: string;
    title: string;
    imageUrl: string | null;
    soldQty: number;
    revenue: number;
    orders: number;
}
interface UnsoldRow {
    productId: string;
    title: string;
    imageUrl: string | null;
    price: number;
    stock: number;
    views: number;
    daysSinceCreated: number;
}
interface TrendPoint { day: string; orders: number; revenue: number; items: number }
interface CatRow { slug: string; name: string; soldQty: number; revenue: number; products: number }
interface InsightItem { type?: string; title: string; body?: string; productId?: string; action?: string; actionUrl?: string }

interface AnalyticsResp {
    shop: { id: string; name: string; productCount: number };
    period: { from: string; to: string };
    summary: {
        totalRevenue: number; totalOrders: number; totalItems: number;
        uniqueBuyers: number; avgOrder: number; totalViews: number;
        conversionPct: number; staleCount: number; unsoldCount: number;
    };
    trend: TrendPoint[];
    categoryBreakdown: CatRow[];
    rankings: {
        topSold: RankRow[]; topRevenue: RankRow[];
        lowSold: RankRow[]; lowRevenue: RankRow[];
        unsold: UnsoldRow[];
    };
    insight: {
        id: string; items: InsightItem[]; aiSummary: string | null;
        createdAt: string; seen: boolean;
    } | null;
}

type RankKey = "topSold" | "topRevenue" | "lowSold" | "lowRevenue" | "unsold";

const RANK_META: Record<RankKey, { label: string; icon: typeof Trophy; color: string }> = {
    topSold:    { label: "Eng ko'p sotilgan", icon: Trophy,      color: BN.gold },
    topRevenue: { label: "Eng ko'p tushum",   icon: DollarSign,  color: BN.ok },
    lowSold:    { label: "Eng kam sotilgan",  icon: TrendingDown, color: BN.info },
    lowRevenue: { label: "Eng kam tushum",    icon: Award,        color: BN.warn },
    unsold:     { label: "Umuman sotilmagan", icon: Ban,          color: BN.err },
};

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function BnSellerAnalytics({ shopName }: { shopName: string }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [from, setFrom] = useState(isoDate(monthStart));
    const [to, setTo] = useState(isoDate(now));
    const [data, setData] = useState<AnalyticsResp | null>(null);
    const [loading, setLoading] = useState(false);
    const [rank, setRank] = useState<RankKey>("topSold");
    const [discountRow, setDiscountRow] = useState<UnsoldRow | null>(null);

    const reload = () => {
        setLoading(true);
        fetch(`/api/bn/seller/analytics?from=${from}&to=${to}`, { cache: "no-store" })
            .then(r => r.json())
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

    useEffect(() => {
        if (!data?.insight || data.insight.seen) return;
        fetch("/api/bn/seller/insight/seen", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.insight.id }),
        }).catch(() => {});
    }, [data?.insight?.id, data?.insight?.seen]);

    const rows: (RankRow | UnsoldRow)[] = useMemo(() => data ? data.rankings[rank] : [], [data, rank]);

    const setQuickRange = (days: number) => {
        const t = new Date();
        const f = new Date(t.getTime() - (days - 1) * 86400000);
        setFrom(isoDate(f)); setTo(isoDate(t));
    };

    const exportCsv = () => {
        window.open(`/api/bn/seller/analytics/export?type=${rank}&from=${from}&to=${to}`, "_blank");
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-6" style={{ color: BN.text }}>
            {/* Sarlavha */}
            <div className="flex items-start gap-3 mb-5">
                <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}>
                    <TrendingUp className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-[22px] sm:text-[24px] font-black tracking-tight leading-tight truncate">
                        {shopName} — tahlil
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: BN.text2 }}>
                        Sotuv reytinglari, sotilmagan mahsulotlar va AI tavsiyalar
                    </p>
                </div>
                <BnLink href="/sotuvchi/tahlil/chop-etish"
                    className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold hover:brightness-95 flex-shrink-0"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                    title="PDF/bosma hisobot">
                    <Printer className="w-4 h-4" /> PDF
                </BnLink>
                <BnLink href="/kabinet"
                    className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold hover:brightness-95 flex-shrink-0"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}>
                    <Store className="w-4 h-4" /> Kabinet
                </BnLink>
            </div>

            {/* Sana filtri */}
            <div className="rounded-2xl p-3 mb-5 flex flex-wrap items-center gap-2"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                    <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: BN.gold }} />
                    <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                        className="h-9 px-2.5 rounded-lg text-[13px] font-bold w-[145px]"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                    <span className="text-[12px]" style={{ color: BN.text3 }}>—</span>
                    <input type="date" value={to} min={from} max={isoDate(now)} onChange={e => setTo(e.target.value)}
                        className="h-9 px-2.5 rounded-lg text-[13px] font-bold w-[145px]"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                </div>
                <div className="flex items-center gap-1.5">
                    {[{ d: 7, label: "7 kun" }, { d: 30, label: "30 kun" }, { d: 90, label: "90 kun" }].map(x => (
                        <button key={x.d} onClick={() => setQuickRange(x.d)}
                            className="h-8 px-3 rounded-lg text-[12px] font-black hover:brightness-95"
                            style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                            {x.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} />
                </div>
            )}

            {data && (
                <>
                    {/* AI BUYRUQ INPUT */}
                    <BnSellerAiCommand onDone={reload} />

                    {/* AI TAVSIYA */}
                    {data.insight && data.insight.items.length > 0 && (
                        <div className="rounded-2xl p-4 sm:p-5 mb-5"
                            style={{ background: `linear-gradient(135deg, ${BN.goldSoft} 0%, ${BN.surface} 60%)`,
                                     border: `1px solid ${BN.borderGold}` }}>
                            <div className="flex items-start gap-3 mb-3">
                                <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                                    style={{ background: BN.gold, color: BN.onGold }}>
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[15px] font-black">AI tavsiya — bugun</p>
                                    <p className="text-[12px]" style={{ color: BN.text2 }}>
                                        {data.insight.aiSummary || "Do'koningiz uchun bugungi taklif"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {data.insight.items.slice(0, 5).map((it, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                                        <span className="w-6 h-6 rounded-lg grid place-items-center flex-shrink-0 mt-0.5 text-[11px] font-black"
                                            style={{ background: BN.goldSoft, color: BN.gold }}>{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13.5px] font-bold" style={{ color: BN.text }}>{it.title}</p>
                                            {it.body && <p className="text-[12px] mt-0.5" style={{ color: BN.text2 }}>{it.body}</p>}
                                        </div>
                                        {it.actionUrl && (
                                            <BnLink href={it.actionUrl}
                                                className="h-8 px-3 rounded-lg text-[12px] font-black inline-flex items-center gap-1 flex-shrink-0 self-center"
                                                style={{ background: BN.gold, color: BN.onGold }}>
                                                {it.action || "Ochish"} <ChevronRight className="w-3 h-3" />
                                            </BnLink>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4 KATTA RAQAM */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
                        <StatCard icon={DollarSign} label="Tushum" value={fmtPrice(data.summary.totalRevenue)}
                            hint={`${data.summary.totalOrders} buyurtma`} color={BN.ok} />
                        <StatCard icon={Package} label="Sotildi" value={String(data.summary.totalItems)}
                            hint="dona" color={BN.gold} />
                        <StatCard icon={Users} label="Xaridor" value={String(data.summary.uniqueBuyers)}
                            hint={data.summary.avgOrder > 0 ? `o'rt. ${fmtPrice(data.summary.avgOrder)}` : "—"} color={BN.info} />
                        <StatCard icon={Eye} label="Ko'rishlar" value={String(data.summary.totalViews)}
                            hint={data.summary.conversionPct > 0 ? `${data.summary.conversionPct}% konv.` : "—"} color={BN.warn} />
                    </div>

                    {/* TREND GRAFIK */}
                    {data.trend.length > 1 && (
                        <div className="rounded-2xl p-4 sm:p-5 mb-5"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4" style={{ color: BN.gold }} />
                                <p className="text-[14px] font-black" style={{ color: BN.text }}>Kunlik dinamika</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <MiniBars title="Tushum" data={data.trend} pick={p => p.revenue} color={BN.ok} money />
                                <MiniBars title="Buyurtma" data={data.trend} pick={p => p.orders} color={BN.gold} />
                                <MiniBars title="Sotildi (dona)" data={data.trend} pick={p => p.items} color={BN.info} />
                            </div>
                        </div>
                    )}

                    {/* KATEGORIYA BREAKDOWN */}
                    {data.categoryBreakdown.length > 0 && (
                        <div className="rounded-2xl p-4 sm:p-5 mb-5"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Layers className="w-4 h-4" style={{ color: BN.gold }} />
                                <p className="text-[14px] font-black">Kategoriyalar bo'yicha</p>
                            </div>
                            <div className="space-y-2">
                                {data.categoryBreakdown.map((c, i) => {
                                    const maxRev = data.categoryBreakdown[0].revenue || 1;
                                    const w = Math.round((c.revenue / maxRev) * 100);
                                    return (
                                        <div key={c.slug} className="p-2.5 rounded-xl"
                                            style={{ background: BN.surfaceUp }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[11px] font-black tabular-nums"
                                                        style={{ color: i === 0 ? BN.gold : BN.text3 }}>{i + 1}.</span>
                                                    <p className="text-[13px] font-bold truncate" style={{ color: BN.text }}>{c.name}</p>
                                                </div>
                                                <p className="text-[12.5px] font-black tabular-nums flex-shrink-0"
                                                    style={{ color: BN.gold }}>{fmtPriceShort(c.revenue)}</p>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden"
                                                style={{ background: BN.surface }}>
                                                <div style={{ width: `${w}%`, height: "100%",
                                                    background: `linear-gradient(90deg, ${BN.gold}, ${BN.goldLight})` }} />
                                            </div>
                                            <p className="text-[10.5px] mt-1" style={{ color: BN.text3 }}>
                                                {c.soldQty} dona · {c.products} mahsulot
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SOTILMAGAN OGOHLANTIRISH */}
                    {data.summary.staleCount > 0 && (
                        <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
                            style={{ background: BN.errSoft, border: `1px solid ${BN.err}` }}>
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BN.err }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-black" style={{ color: BN.err }}>
                                    {data.summary.staleCount} ta mahsulot 30 kundan ortiq sotilmagan
                                </p>
                                <p className="text-[12px] mt-0.5" style={{ color: BN.text2 }}>
                                    Chegirma qiling, rasmni yangilang yoki sotuvdan chiqaring.
                                </p>
                            </div>
                            <button onClick={() => setRank("unsold")}
                                className="h-9 px-3 rounded-xl text-[12px] font-black self-center flex-shrink-0 hover:brightness-95"
                                style={{ background: BN.err, color: "#fff" }}>
                                Ro'yxat
                            </button>
                        </div>
                    )}

                    {/* 5 REYTING */}
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                        <div className="p-2 flex items-center gap-1.5 overflow-x-auto border-b"
                            style={{ borderColor: BN.border }}>
                            {(Object.keys(RANK_META) as RankKey[]).map(k => {
                                const m = RANK_META[k];
                                const active = rank === k;
                                const Icon = m.icon;
                                return (
                                    <button key={k} onClick={() => setRank(k)}
                                        className="h-9 px-3 rounded-xl text-[12px] font-black inline-flex items-center gap-1.5 flex-shrink-0 hover:brightness-95"
                                        style={{
                                            background: active ? BN.gold : BN.surfaceUp,
                                            color: active ? BN.onGold : BN.text2,
                                            border: `1px solid ${active ? "transparent" : BN.border}`,
                                        }}>
                                        <Icon className="w-3.5 h-3.5" />{m.label}
                                    </button>
                                );
                            })}
                            <div className="flex-1" />
                            <button onClick={exportCsv} disabled={rows.length === 0}
                                className="h-9 px-3 rounded-xl text-[12px] font-black inline-flex items-center gap-1.5 flex-shrink-0 hover:brightness-95 disabled:opacity-40"
                                style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}
                                title="CSV eksport (Excel)">
                                <Download className="w-3.5 h-3.5" /> CSV
                            </button>
                        </div>

                        {rows.length === 0 ? (
                            <div className="text-center py-12">
                                <Percent className="w-9 h-9 mx-auto mb-2 opacity-40" style={{ color: BN.text3 }} />
                                <p className="text-[13px] font-bold" style={{ color: BN.text2 }}>
                                    {rank === "unsold" ? "Barcha mahsulotlar sotilyapti — ajoyib!" : "Bu davrda buyurtma yo'q"}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: BN.border }}>
                                {rows.map((r, i) => (
                                    <RankRow key={r.productId} row={r} index={i + 1} isUnsold={rank === "unsold"}
                                        onDiscount={rank === "unsold" ? () => setDiscountRow(r as UnsoldRow) : undefined} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                            <Check className="w-3 h-3 inline mr-1" />
                            Ma'lumotlar faqat siz uchun. Boshqa sotuvchilar ko'rmaydi.
                        </p>
                    </div>
                </>
            )}

            {discountRow && (
                <DiscountModal row={discountRow} onClose={() => setDiscountRow(null)}
                    onDone={() => { setDiscountRow(null); reload(); }} />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, hint, color }: {
    icon: typeof TrendingUp; label: string; value: string; hint?: string; color: string;
}) {
    return (
        <div className="rounded-2xl p-3.5"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>{label}</p>
            </div>
            <p className="text-[18px] font-black leading-tight" style={{ color: BN.text }}>{value}</p>
            {hint && <p className="text-[11px] mt-0.5" style={{ color: BN.text3 }}>{hint}</p>}
        </div>
    );
}

function MiniBars({ title, data, pick, color, money }: {
    title: string; data: TrendPoint[]; pick: (p: TrendPoint) => number; color: string; money?: boolean;
}) {
    const values = data.map(pick);
    const max = Math.max(1, ...values);
    const total = values.reduce((a, b) => a + b, 0);
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BN.text3 }}>{title}</span>
                <span className="text-[13px] font-black tabular-nums" style={{ color }}>
                    {money ? fmtPriceShort(total) : total}
                </span>
            </div>
            <div className="flex items-end gap-1 h-16" role="img" aria-label={`${title} kunlik grafik`}>
                {data.map((p, i) => {
                    const v = pick(p);
                    const h = Math.round((v / max) * 100);
                    const isLast = i === data.length - 1;
                    return (
                        <div key={p.day} title={`${p.day.slice(5)}: ${money ? fmtPriceShort(v) : v}`}
                            className="flex-1 flex flex-col justify-end">
                            <div className="w-full rounded-t transition-all"
                                style={{ background: color, height: `${Math.max(3, h)}%`, opacity: v === 0 ? 0.15 : isLast ? 1 : 0.7 }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RankRow({ row, index, isUnsold, onDiscount }: {
    row: RankRow | UnsoldRow; index: number; isUnsold: boolean;
    onDiscount?: () => void;
}) {
    const isSold = "soldQty" in row;
    return (
        <div className="flex items-center gap-3 p-3 hover:brightness-95 transition"
            style={{ background: index <= 3 && isSold ? BN.goldSoft : "transparent" }}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 text-[13px] font-black"
                style={{
                    background: index === 1 ? BN.gold : index <= 3 ? BN.goldSoft : BN.surfaceUp,
                    color: index === 1 ? BN.onGold : index <= 3 ? BN.gold : BN.text2,
                }}>
                {index}
            </span>
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
                style={{ background: BN.surfaceUp }}>
                {row.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold truncate" style={{ color: BN.text }}>{row.title}</p>
                {isSold ? (
                    <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                        {(row as RankRow).soldQty} dona · {(row as RankRow).orders} buyurtma
                    </p>
                ) : (
                    <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                        {(row as UnsoldRow).stock > 0 ? `${(row as UnsoldRow).stock} dona zaxira · ` : ""}
                        {(row as UnsoldRow).views} ko'rildi · {(row as UnsoldRow).daysSinceCreated} kun
                    </p>
                )}
            </div>
            <div className="text-right flex-shrink-0">
                {isSold ? (
                    <>
                        <p className="text-[13px] font-black" style={{ color: BN.gold }}>
                            {fmtPrice((row as RankRow).revenue)}
                        </p>
                        <p className="text-[10.5px]" style={{ color: BN.text3 }}>tushum</p>
                    </>
                ) : (
                    <p className="text-[13px] font-black" style={{ color: BN.text2 }}>
                        {fmtPrice((row as UnsoldRow).price)}
                    </p>
                )}
            </div>
            {isUnsold && onDiscount && (
                <button onClick={onDiscount} title="Chegirma qo'yish"
                    className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 hover:brightness-95"
                    style={{ background: BN.gold, color: BN.onGold }}>
                    <Tag className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

function DiscountModal({ row, onClose, onDone }: { row: UnsoldRow; onClose: () => void; onDone: () => void }) {
    const [pct, setPct] = useState(15);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const preview = Math.round(row.price * (1 - pct / 100) / 100) * 100;
    const savePerUnit = row.price - preview;

    const apply = async () => {
        setBusy(true); setErr(null);
        try {
            const r = await fetch(`/api/bn/seller/products/${row.productId}/discount`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pct }),
            });
            const j = await r.json();
            if (!r.ok) { setErr(j?.message || "Xatolik"); setBusy(false); return; }
            onDone();
        } catch {
            setErr("Tarmoq xatosi");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] grid place-items-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                <div className="p-4 flex items-center gap-2 border-b" style={{ borderColor: BN.border }}>
                    <Tag className="w-4 h-4" style={{ color: BN.gold }} />
                    <p className="text-[14px] font-black flex-1" style={{ color: BN.text }}>Chegirma qo'yish</p>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                        style={{ color: BN.text2 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: BN.surfaceUp }}>
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BN.surface }}>
                            {row.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13.5px] font-bold truncate" style={{ color: BN.text }}>{row.title}</p>
                            <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                                Joriy: {fmtPrice(row.price)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[12px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                Chegirma foizi
                            </p>
                            <p className="text-[18px] font-black" style={{ color: BN.gold }}>-{pct}%</p>
                        </div>
                        <input type="range" min={3} max={70} step={1} value={pct}
                            onChange={e => setPct(Number(e.target.value))}
                            className="w-full accent-current" style={{ color: BN.gold }} />
                        <div className="flex justify-between text-[10.5px] mt-1" style={{ color: BN.text3 }}>
                            <span>3%</span><span>70%</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl grid grid-cols-2 gap-3"
                        style={{ background: BN.goldSoft, border: `1px solid ${BN.borderGold}` }}>
                        <div>
                            <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>Yangi narx</p>
                            <p className="text-[16px] font-black" style={{ color: BN.gold }}>{fmtPrice(preview)}</p>
                        </div>
                        <div>
                            <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>Tejaladi</p>
                            <p className="text-[14px] font-black" style={{ color: BN.text }}>{fmtPrice(savePerUnit)}</p>
                        </div>
                    </div>

                    {err && (
                        <div className="text-[12px] p-2 rounded-lg" style={{ background: BN.errSoft, color: BN.err }}>
                            {err}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button onClick={onClose} disabled={busy}
                            className="flex-1 h-11 rounded-xl text-[13px] font-black hover:brightness-95"
                            style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                            Bekor
                        </button>
                        <button onClick={apply} disabled={busy}
                            className="flex-1 h-11 rounded-xl text-[13px] font-black hover:brightness-95 inline-flex items-center justify-center gap-1.5"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                            Chegirmani qo'llash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
