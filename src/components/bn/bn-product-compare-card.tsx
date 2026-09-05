"use client";

// Product detail sahifasida "Bu mahsulot boshqa do'konlarda" karta.
// Xaridor uchun narx solishtirish — BN'ning asosiy va'dasi.

import { useEffect, useState } from "react";
import { Store, TrendingDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { BN, fmtPrice } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Alt {
    productId: string; slug: string; title: string;
    price: number; oldPrice: number | null; imageUrl: string | null;
    stock: number; rating: number; ratingCount: number;
    shop: { id: string; slug: string; name: string; tier: string; city: string; marketId: string | null } | null;
    diff: number; diffPct: number; cheaper: boolean;
}

interface Resp {
    product: { title: string; price: number };
    alternatives: Alt[];
    summary: {
        cheapest: number | null;
        currentPrice: number;
        possibleSavings: number;
        savingsPct: number;
        alternativeCount: number;
    };
}

export function BnProductCompareCard({ productId }: { productId: string }) {
    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/bn/products/${productId}/compare`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 mt-6 flex items-center gap-2"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: BN.gold }} />
                <span className="text-[12px]" style={{ color: BN.text3 }}>Boshqa do'konlar tekshirilmoqda…</span>
            </div>
        );
    }

    if (!data || data.alternatives.length === 0) return null;

    const cheaperCount = data.alternatives.filter(a => a.cheaper).length;

    return (
        <div className="rounded-2xl mt-6"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            {/* Sarlavha */}
            <div className="p-4 border-b" style={{ borderColor: BN.border }}>
                <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <Store className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-black" style={{ color: BN.text }}>Boshqa do'konlarda</p>
                        <p className="text-[12px] mt-0.5" style={{ color: BN.text2 }}>
                            {data.alternatives.length} ta o'xshash mahsulot topildi
                        </p>
                    </div>
                </div>

                {/* Tejash e'lon */}
                {data.summary.possibleSavings > 0 && (
                    <div className="mt-3 p-3 rounded-xl flex items-center gap-3"
                        style={{ background: BN.okSoft, border: `1px solid ${BN.ok}` }}>
                        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: BN.ok }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-black" style={{ color: BN.ok }}>
                                {fmtPrice(data.summary.possibleSavings)} tejashingiz mumkin
                            </p>
                            <p className="text-[11.5px]" style={{ color: BN.text2 }}>
                                {cheaperCount} do'kon bu mahsulotni {data.summary.savingsPct}% arzon sotmoqda
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Alternativalar */}
            <div className="divide-y" style={{ borderColor: BN.border }}>
                {data.alternatives.slice(0, 6).map(a => {
                    const cheaper = a.cheaper;
                    return (
                        <BnLink key={a.productId} href={`/p/${a.slug}`}
                            className="flex items-center gap-3 p-3 hover:brightness-95 transition"
                            style={{ background: cheaper ? BN.okSoft + "22" : "transparent" }}>
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                                style={{ background: BN.surfaceUp }}>
                                {a.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold truncate" style={{ color: BN.text }}>{a.title}</p>
                                <p className="text-[11px]" style={{ color: BN.text3 }}>
                                    {a.shop?.name} · {a.shop?.city}
                                    {a.rating > 0 && ` · ${a.rating.toFixed(1)} (${a.ratingCount})`}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[13.5px] font-black" style={{ color: cheaper ? BN.ok : BN.text2 }}>
                                    {fmtPrice(a.price)}
                                </p>
                                {a.diffPct !== 0 && (
                                    <p className="text-[10.5px] font-black flex items-center gap-0.5 justify-end"
                                        style={{ color: cheaper ? BN.ok : BN.err }}>
                                        {cheaper && <TrendingDown className="w-3 h-3" />}
                                        {cheaper ? `${Math.abs(a.diffPct)}% arzon` : `${a.diffPct}% qimmat`}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                        </BnLink>
                    );
                })}
            </div>

            {data.alternatives.length > 6 && (
                <div className="p-2 text-center border-t" style={{ borderColor: BN.border }}>
                    <p className="text-[11px]" style={{ color: BN.text3 }}>
                        Yana {data.alternatives.length - 6} ta variant mavjud
                    </p>
                </div>
            )}
        </div>
    );
}
