"use client";

// Mahsulot narx tarixi grafigi — BN'ning asosiy va'dasi.
// 30/90/365 kunlik ma'lumot, kompakt SVG chart (chart library YO'Q).

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, LineChart } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

interface Point { t: string; price: number; marketAvg: number | null }
interface Stats { min: number; max: number; first: number; last: number; changePct: number; marketAvg: number | null }
interface Data { days: number; points: Point[]; stats: Stats }

export function BnPriceHistoryChart({ productSlug }: { productSlug: string }) {
    const [days, setDays] = useState<30 | 90 | 365>(30);
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/bn/products/${productSlug}/price-history?days=${days}`, { cache: "no-store" });
            if (r.ok) setData(await r.json());
        } finally { setLoading(false); }
    }, [productSlug, days]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="rounded-2xl p-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-black flex items-center gap-1.5" style={{ color: BN.text }}>
                    <LineChart className="w-4 h-4" style={{ color: BN.gold }} />
                    Narx tarixi
                </h3>
                <div className="flex gap-1">
                    {([30, 90, 365] as const).map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className="px-2 py-1 rounded-md text-[11px] font-bold transition-colors"
                            style={{
                                background: days === d ? BN.gold : BN.surfaceUp,
                                color: days === d ? BN.onGold : BN.text3,
                            }}
                        >
                            {d === 365 ? "1 yil" : `${d} kun`}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.text3 }} />
                </div>
            ) : !data || data.points.length < 2 ? (
                <div className="text-center py-6 text-[12.5px]" style={{ color: BN.text3 }}>
                    {data && data.points.length === 1
                        ? "Narx tarixi hali to'planmoqda — kunlik snapshot yig'iladi."
                        : "Ma'lumot yo'q."}
                </div>
            ) : (
                <>
                    {/* Statistika */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <StatCell label="Eng past" value={data.stats.min} color={BN.ok} />
                        <StatCell label="Hozir" value={data.stats.last} color={BN.text} bold />
                        <StatCell label="Eng baland" value={data.stats.max} color={BN.err} />
                    </div>

                    {/* O'zgarish */}
                    <ChangeChip changePct={data.stats.changePct} days={data.days} />

                    {/* Chart */}
                    <div className="mt-3">
                        <MiniChart points={data.points} marketAvg={data.stats.marketAvg} />
                    </div>

                    {data.stats.marketAvg && (
                        <div className="mt-2 flex items-center gap-2 text-[10.5px]" style={{ color: BN.text3 }}>
                            <span className="w-3 h-0.5 rounded" style={{ background: BN.gold }} />
                            Bozor o&apos;rtacha: <b style={{ color: BN.text2 }}>{formatMoney(data.stats.marketAvg, "UZS")}</b>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StatCell({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
    return (
        <div className="rounded-lg p-2" style={{ background: BN.surfaceUp }}>
            <div className="text-[10px]" style={{ color: BN.text3 }}>{label}</div>
            <div className={`text-[12px] mt-0.5 ${bold ? "font-black" : "font-bold"}`} style={{ color }}>
                {formatMoney(value, "UZS")}
            </div>
        </div>
    );
}

function ChangeChip({ changePct, days }: { changePct: number; days: number }) {
    const rising = changePct > 0;
    const flat = changePct === 0;
    const color = flat ? BN.text3 : rising ? BN.err : BN.ok;
    const Icon = flat ? Minus : rising ? TrendingUp : TrendingDown;
    const sign = rising ? "+" : "";
    const label = flat
        ? "O'zgarish yo'q"
        : rising
        ? `${days} kunda ${sign}${changePct}% qimmatlashdi`
        : `${days} kunda ${changePct}% arzonlashdi`;
    return (
        <div
            className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"
            style={{ background: color + "1F", color }}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </div>
    );
}

function MiniChart({ points, marketAvg }: { points: Point[]; marketAvg: number | null }) {
    const w = 300;
    const h = 80;
    const padding = 4;
    const values = points.map(p => p.price);
    const min = Math.min(...values, marketAvg ?? Infinity);
    const max = Math.max(...values, marketAvg ?? -Infinity);
    const range = max - min || 1;

    const stepX = points.length > 1 ? (w - padding * 2) / (points.length - 1) : 0;
    const y = (v: number) => h - padding - ((v - min) / range) * (h - padding * 2);
    const x = (i: number) => padding + i * stepX;

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.price)}`).join(" ");
    const areaPath = `${linePath} L ${x(points.length - 1)} ${h - padding} L ${padding} ${h - padding} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block">
            {/* Bozor o'rtacha chizig'i */}
            {marketAvg && (
                <line
                    x1={padding} y1={y(marketAvg)}
                    x2={w - padding} y2={y(marketAvg)}
                    stroke={BN.gold} strokeWidth={1} strokeDasharray="3 3" opacity={0.55}
                />
            )}
            {/* Area gradient */}
            <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BN.gold} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BN.gold} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#priceGrad)" />
            <path d={linePath} fill="none" stroke={BN.gold} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Oxirgi nuqta */}
            {points.length > 0 && (
                <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].price)} r={3.5} fill={BN.gold} stroke={BN.surface} strokeWidth={1.5} />
            )}
        </svg>
    );
}
