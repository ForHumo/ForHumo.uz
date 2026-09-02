"use client";

// BN Bugungi bozor narxlari dashboard widget.
// Bosh sahifada gorizontal karta qatori. Har kategoriya uchun avg, min-max,
// 7 kunlik trend (up/down/flat). AI prognoz card ham ochish mumkin.

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { TrendingUp, TrendingDown, Minus, BarChart3, ChevronRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";
import { BnLink } from "./bn-nav";
import { BnForecastCard } from "./bn-forecast-card";

interface CatAgg {
    slug: string; name: string; icon: string | null;
    productCount: number;
    avg: number; min: number; max: number;
    changePct: number;
    trend: "up" | "down" | "flat";
}

const TREND_META: Record<CatAgg["trend"], { icon: typeof TrendingUp; color: string; bg: string }> = {
    up:   { icon: TrendingUp,   color: "#EF4444", bg: "#EF444422" },
    down: { icon: TrendingDown, color: "#10B981", bg: "#10B98122" },
    flat: { icon: Minus,        color: "#94A3B8", bg: "#94A3B822" },
};

export function BnPriceDashboard() {
    const locale = useLocale();
    const [cats, setCats] = useState<CatAgg[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/bn/prices/today");
                if (!r.ok) throw new Error();
                const d = await r.json();
                setCats(Array.isArray(d.categories) ? d.categories : []);
            } catch { setCats([]); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading || !cats || cats.length === 0) return null;

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BN.goldSoft, color: BN.gold }}>
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-bold" style={{ color: BN.text }}>
                            {t("Bugungi bozor narxlari", "Сегодняшние рыночные цены", "Today's Market Prices")}
                        </h2>
                        <div className="text-[13px]" style={{ color: BN.text2 }}>
                            {t("Har kategoriya uchun o'rtacha narx, hafta trendi", "Средняя цена по каждой категории, недельный тренд", "Average price per category, weekly trend")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cats.map(c => {
                    const meta = TREND_META[c.trend];
                    const Icon = meta.icon;
                    return (
                        <button
                            key={c.slug}
                            onClick={() => setSelected(selected === c.slug ? null : c.slug)}
                            className="text-left rounded-2xl p-4 transition-transform hover:scale-[1.02]"
                            style={{ background: BN.surface, border: `1px solid ${selected === c.slug ? BN.gold : BN.border}` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="text-[13px] font-semibold" style={{ color: BN.text }}>
                                    {c.name}
                                </div>
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                                    <Icon className="w-3 h-3" />
                                    {c.changePct > 0 ? "+" : ""}{c.changePct}%
                                </div>
                            </div>
                            <div className="mt-2 text-[16px] font-bold tabular-nums" style={{ color: BN.gold }}>
                                {formatMoney(c.avg, "UZS")}
                            </div>
                            <div className="text-[11px] mt-0.5" style={{ color: BN.text3 }}>
                                {formatMoney(c.min, "UZS")} — {formatMoney(c.max, "UZS")}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: BN.text3 }}>
                                <span>{c.productCount} {t("mahsulot", "товаров", "items")}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    );
                })}
            </div>

            {selected && (
                <div className="mt-4">
                    <BnForecastCard categorySlug={selected} onClose={() => setSelected(null)} />
                    <div className="mt-3 text-center">
                        <BnLink href={`/k/${selected}`} className="text-[13px] font-semibold" style={{ color: BN.gold }}>
                            {t("Bu kategoriya mahsulotlari", "Товары этой категории", "Browse category")} →
                        </BnLink>
                    </div>
                </div>
            )}
        </section>
    );
}
