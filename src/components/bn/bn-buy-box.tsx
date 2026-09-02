"use client";

// BN Buy Box — bir xil (yoki juda o'xshash) mahsulot uchun eng arzon+ishonchli
// sotuvchi. Mahsulot detali sahifasida "Boshqa sotuvchilar" bo'limi ustida.

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Crown, Star, ShieldCheck, BadgeCheck, Store } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";
import { BnLink } from "./bn-nav";

interface Alt {
    id: string; slug: string; title: string; price: number;
    image: string | null; rating: number; ratingCount: number;
    marketAvgPrice: number | null;
    shop: {
        id: string; name: string; slug: string;
        tier: string; verifiedTier: string; isPremium: boolean; rating: number;
    };
}

interface Data { winner: Alt | null; alternatives: Alt[]; isAnchorWinner: boolean; }

export function BnBuyBox({ slug }: { slug: string }) {
    const locale = useLocale();
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(`/api/bn/products/${slug}/buy-box`);
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
    }, [slug]);

    if (loading || !data || !data.winner || data.isAnchorWinner) return null;

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    return (
        <div className="rounded-2xl p-4 my-4" style={{ background: BN.surface, border: `2px solid ${BN.gold}` }}>
            <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5" style={{ color: BN.gold }} fill="currentColor" />
                <div>
                    <div className="text-[14px] font-bold" style={{ color: BN.text }}>
                        {t("Eng yaxshi taklif", "Лучшее предложение", "Best offer")}
                    </div>
                    <div className="text-[12px]" style={{ color: BN.text3 }}>
                        {t("Bir xil mahsulot uchun eng arzon + ishonchli", "Тот же товар дешевле у другого", "Same product cheaper elsewhere")}
                    </div>
                </div>
            </div>

            <BnLink
                href={`/p/${data.winner.slug}`}
                className="flex gap-3 rounded-xl p-3 hover:bg-white/5 transition-colors"
                style={{ background: BN.surfaceUp }}
            >
                {data.winner.image ? (
                    <img src={data.winner.image} alt={data.winner.title} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: BN.surface }}>
                        <Store className="w-6 h-6" style={{ color: BN.text3 }} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold line-clamp-1" style={{ color: BN.text }}>{data.winner.title}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[16px] font-bold" style={{ color: BN.gold }}>
                            {formatMoney(data.winner.price, "UZS")}
                        </span>
                        {data.winner.marketAvgPrice && data.winner.marketAvgPrice > data.winner.price && (
                            <span className="text-[11px] line-through" style={{ color: BN.text3 }}>
                                {formatMoney(data.winner.marketAvgPrice, "UZS")}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11.5px]" style={{ color: BN.text2 }}>
                        <span>{data.winner.shop.name}</span>
                        {data.winner.shop.verifiedTier !== "NONE" && (
                            <ShieldCheck className="w-3.5 h-3.5" style={{ color: BN.gold }} />
                        )}
                        {data.winner.shop.isPremium && (
                            <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                        )}
                        {data.winner.shop.rating > 0 && (
                            <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3" fill={BN.gold} style={{ color: BN.gold }} />
                                {data.winner.shop.rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </BnLink>

            {data.alternatives.length > 0 && (
                <details className="mt-3">
                    <summary className="text-[12px] cursor-pointer select-none" style={{ color: BN.text2 }}>
                        {t(`Yana ${data.alternatives.length} sotuvchi`, `Еще ${data.alternatives.length} продавцов`, `${data.alternatives.length} more sellers`)}
                    </summary>
                    <div className="mt-2 space-y-1.5">
                        {data.alternatives.map(a => (
                            <BnLink key={a.id} href={`/p/${a.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px]" style={{ background: BN.surfaceUp }}>
                                <span className="truncate" style={{ color: BN.text }}>{a.shop.name}</span>
                                <span className="font-semibold" style={{ color: BN.gold }}>{formatMoney(a.price, "UZS")}</span>
                            </BnLink>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
