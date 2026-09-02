"use client";

// BN AI narx prognozi kartochkasi — Gemini asosida 14 kunlik prognoz.
// BnPriceDashboard kartochkasi bosilganda ochiladi.

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Forecast {
    direction: "up" | "down" | "flat";
    magnitudePct: number;
    reason: string;
    confidence: "low" | "medium" | "high";
    horizonDays: number;
}

interface Data {
    forecast: Forecast | null;
    currentAvg?: number;
    category?: { slug: string; name: string };
}

const DIR_META = {
    up:   { icon: TrendingUp,   color: "#EF4444", bg: "#EF444422" },
    down: { icon: TrendingDown, color: "#10B981", bg: "#10B98122" },
    flat: { icon: Minus,        color: "#94A3B8", bg: "#94A3B822" },
};

const CONFIDENCE_META = {
    low:    { color: "#94A3B8", label: { uz: "Past", ru: "Низкая", en: "Low" } },
    medium: { color: "#F59E0B", label: { uz: "O'rta", ru: "Средняя", en: "Medium" } },
    high:   { color: "#10B981", label: { uz: "Yuqori", ru: "Высокая", en: "High" } },
};

export function BnForecastCard({ categorySlug, onClose }: { categorySlug: string; onClose?: () => void }) {
    const locale = useLocale();
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const r = await fetch(`/api/bn/prices/forecast/${categorySlug}`);
                if (!r.ok) throw new Error();
                setData(await r.json());
            } catch { setData(null); }
            finally { setLoading(false); }
        })();
    }, [categorySlug]);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    return (
        <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${BN.surfaceUp}, ${BN.surface})`, border: `1px solid ${BN.gold}` }}>
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" style={{ color: BN.gold }} />
                <div className="text-[14px] font-bold" style={{ color: BN.text }}>
                    {t("AI narx prognozi", "AI прогноз цен", "AI Price Forecast")}
                </div>
                {onClose && (
                    <button onClick={onClose} className="ml-auto text-[12px]" style={{ color: BN.text3 }}>
                        {t("Yopish", "Закрыть", "Close")}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-2" style={{ color: BN.text3 }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[13px]">{t("AI o'ylayapti...", "AI думает...", "AI thinking...")}</span>
                </div>
            ) : !data?.forecast ? (
                <div className="text-[13px]" style={{ color: BN.text3 }}>
                    {t("Ma'lumot yetarli emas", "Недостаточно данных", "Not enough data")}
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-3">
                        {(() => {
                            const dm = DIR_META[data.forecast.direction];
                            const Icon = dm.icon;
                            return (
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: dm.bg }}>
                                    <Icon className="w-8 h-8" style={{ color: dm.color }} />
                                </div>
                            );
                        })()}
                        <div>
                            <div className="text-[22px] font-black" style={{ color: DIR_META[data.forecast.direction].color }}>
                                {data.forecast.magnitudePct > 0 ? "+" : ""}{data.forecast.magnitudePct}%
                            </div>
                            <div className="text-[12px]" style={{ color: BN.text3 }}>
                                {data.forecast.horizonDays} {t("kun ichida", "дней", "days")}
                            </div>
                        </div>
                    </div>

                    <div className="text-[13px] leading-relaxed mb-3" style={{ color: BN.text2 }}>
                        {data.forecast.reason}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                        <span style={{ color: BN.text3 }}>
                            {t("Ishonchlilik", "Достоверность", "Confidence")}:
                        </span>
                        <span className="font-semibold" style={{ color: CONFIDENCE_META[data.forecast.confidence].color }}>
                            {CONFIDENCE_META[data.forecast.confidence].label[locale === "ru" ? "ru" : locale === "en" ? "en" : "uz"]}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
