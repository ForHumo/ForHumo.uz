"use client";

// BN mahsulot narx tarixi chart — pure SVG (chart kutubxonasi yo'q).
// 30/90/365 kunlik tab, market avg gorizontal chiziqli mos yozuv,
// hover'da narx + sana ko'rsatiladi.

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

interface Point { t: string; price: number; marketAvg: number | null; }
interface Stats { min: number; max: number; first: number; last: number; changePct: number; marketAvg: number | null; }
interface Data { days: number; points: Point[]; stats: Stats; }

const DAYS_OPTIONS = [30, 90, 365] as const;

export function BnPriceChart({ slug }: { slug: string }) {
    const locale = useLocale();
    const [days, setDays] = useState<30 | 90 | 365>(30);
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const r = await fetch(`/api/bn/products/${slug}/price-history?days=${days}`);
                if (!r.ok) throw new Error();
                const d = await r.json();
                if (!cancelled) setData(d);
            } catch {
                if (!cancelled) setData(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, days]);

    // Chart hisoblari
    const chart = useMemo(() => {
        if (!data || data.points.length === 0) return null;
        const W = 600;
        const H = 200;
        const padL = 8, padR = 8, padT = 12, padB = 20;
        const points = data.points;
        const prices = points.map(p => p.price);
        const marketAvgs = points.map(p => p.marketAvg).filter((x): x is number => x !== null);
        const allValues = [...prices, ...marketAvgs];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;

        const xStep = points.length > 1 ? (W - padL - padR) / (points.length - 1) : 0;
        const yFor = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / range);

        // Price line
        const priceD = points.map((p, i) => {
            const x = padL + i * xStep;
            const y = yFor(p.price);
            return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");

        // Market avg line (dotted)
        const marketAvgD = points
            .map((p, i) => p.marketAvg !== null ? { i, v: p.marketAvg } : null)
            .filter((x): x is { i: number; v: number } => x !== null)
            .map((p, i) => {
                const x = padL + p.i * xStep;
                const y = yFor(p.v);
                return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
            }).join(" ");

        // Area fill under price line
        const areaD = priceD + ` L ${padL + (points.length - 1) * xStep},${H - padB} L ${padL},${H - padB} Z`;

        return { W, H, padL, padR, padT, padB, xStep, yFor, priceD, marketAvgD, areaD };
    }, [data]);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 h-[280px] flex items-center justify-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <div className="text-[13px]" style={{ color: BN.text3 }}>
                    {locale === "ru" ? "Загрузка графика..." : locale === "en" ? "Loading chart..." : "Grafik yuklanmoqda..."}
                </div>
            </div>
        );
    }

    if (!data || data.points.length < 2) {
        return (
            <div className="rounded-2xl p-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <div className="text-[13px]" style={{ color: BN.text3 }}>
                    {locale === "ru" ? "Пока недостаточно данных о цене" : locale === "en" ? "Not enough price data yet" : "Narx ma'lumoti hozircha kam"}
                </div>
            </div>
        );
    }

    const trend = data.stats.changePct;
    const trendColor = trend > 0 ? "#EF4444" : trend < 0 ? "#10B981" : BN.text3;
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const hovered = hoverIdx !== null ? data.points[hoverIdx] : null;

    return (
        <div className="rounded-2xl p-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                    <div className="text-[13px] font-semibold" style={{ color: BN.text }}>
                        {locale === "ru" ? "История цены" : locale === "en" ? "Price History" : "Narx tarixi"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px]" style={{ color: trendColor }}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        {trend > 0 ? "+" : ""}{trend}% ({days} {locale === "ru" ? "дн" : locale === "en" ? "d" : "kun"})
                    </div>
                </div>
                <div className="flex gap-1 rounded-lg p-1" style={{ background: BN.surfaceUp }}>
                    {DAYS_OPTIONS.map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                            style={{
                                background: days === d ? BN.gold : "transparent",
                                color: days === d ? BN.onGold : BN.text2,
                            }}
                        >
                            {d}{locale === "ru" ? "д" : locale === "en" ? "d" : "k"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {chart && (
                <div className="relative overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                    <svg
                        viewBox={`0 0 ${chart.W} ${chart.H}`}
                        className="w-full h-[200px]"
                        onMouseLeave={() => setHoverIdx(null)}
                    >
                        <defs>
                            <linearGradient id="bnPriceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={BN.gold} stopOpacity="0.35" />
                                <stop offset="100%" stopColor={BN.gold} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Area fill */}
                        <path d={chart.areaD} fill="url(#bnPriceAreaGrad)" />
                        {/* Market avg dotted line */}
                        {chart.marketAvgD && (
                            <path d={chart.marketAvgD} fill="none" stroke={BN.text3} strokeWidth="1" strokeDasharray="4 4" />
                        )}
                        {/* Price line */}
                        <path d={chart.priceD} fill="none" stroke={BN.gold} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                        {/* Points + hover markers */}
                        {data.points.map((p, i) => {
                            const x = chart.padL + i * chart.xStep;
                            const y = chart.yFor(p.price);
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r={hoverIdx === i ? 5 : 2.5}
                                    fill={hoverIdx === i ? BN.gold : BN.goldDark}
                                    onMouseEnter={() => setHoverIdx(i)}
                                    style={{ cursor: "pointer" }}
                                />
                            );
                        })}
                    </svg>

                    {/* Tooltip */}
                    {hovered && (
                        <div className="absolute top-1 right-1 rounded-lg px-2.5 py-1.5 text-[12px] pointer-events-none" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}>
                            <div className="font-semibold" style={{ color: BN.gold }}>{formatMoney(hovered.price, "UZS")}</div>
                            <div className="text-[11px]" style={{ color: BN.text3 }}>
                                {new Date(hovered.t).toLocaleDateString(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", { day: "numeric", month: "short" })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats row */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <StatItem
                    label={locale === "ru" ? "Мин" : locale === "en" ? "Min" : "Min"}
                    value={formatMoney(data.stats.min, "UZS")}
                    color="#10B981"
                />
                <StatItem
                    label={locale === "ru" ? "Макс" : locale === "en" ? "Max" : "Maks"}
                    value={formatMoney(data.stats.max, "UZS")}
                    color="#EF4444"
                />
                <StatItem
                    label={locale === "ru" ? "Рынок ср." : locale === "en" ? "Market avg" : "Bozor o'rt."}
                    value={data.stats.marketAvg ? formatMoney(data.stats.marketAvg, "UZS") : "—"}
                    color={BN.text2}
                />
            </div>
        </div>
    );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="rounded-lg px-2.5 py-2" style={{ background: BN.surfaceUp }}>
            <div style={{ color: BN.text3 }}>{label}</div>
            <div className="mt-0.5 font-semibold" style={{ color }}>{value}</div>
        </div>
    );
}
