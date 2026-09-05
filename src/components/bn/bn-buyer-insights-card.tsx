"use client";

// Xaridor uchun kabinet dashboard karta — bu oy sarflagan, kategoriya, tez-tez oladigan.

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ShoppingBag, Package, Heart, Bell, ChevronRight, Loader2 } from "lucide-react";
import { BN, fmtPrice, fmtPriceShort } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Deal { productId: string; slug: string; title: string; image: string | null; price: number; oldPrice: number | null; marketAvgPrice: number | null; shopName?: string; shopSlug?: string }
interface Cat { name: string; slug: string; total: number; qty: number }
interface Freq { productId: string; title: string; imageUrl: string | null; qty: number; times: number; lastPrice: number }

interface Resp {
    summary: {
        thisMonthTotal: number; thisMonthOrders: number;
        lastMonthTotal: number; trendPct: number;
        allTimeOrders: number; favoriteCount: number; watchCount: number;
    };
    categoryBreakdown: Cat[];
    frequentBuys: Freq[];
    dealsFromFavs: Deal[];
}

export function BnBuyerInsightsCard() {
    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/bn/buyer/insights", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-2"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: BN.gold }} />
                <span className="text-[12px]" style={{ color: BN.text3 }}>Statistika yuklanmoqda…</span>
            </div>
        );
    }
    if (!data) return null;

    // Buyurtma yo'q va sevimli yo'q — kartani yashiramiz
    if (data.summary.allTimeOrders === 0 && data.summary.favoriteCount === 0) return null;

    const s = data.summary;
    const trendIcon = s.trendPct > 0 ? TrendingUp : s.trendPct < 0 ? TrendingDown : ShoppingBag;
    const TIcon = trendIcon;
    const trendColor = s.trendPct > 0 ? BN.warn : s.trendPct < 0 ? BN.ok : BN.text3;

    return (
        <div className="space-y-3 mb-6">
            {/* Bu oy dashboard */}
            <div className="rounded-2xl p-4"
                style={{
                    background: `linear-gradient(135deg, ${BN.info}22 0%, ${BN.surface} 60%)`,
                    border: `1px solid ${BN.border}`,
                }}>
                <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4" style={{ color: BN.info }} />
                    <p className="text-[13.5px] font-black" style={{ color: BN.text }}>Bu oy — xarid tahlili</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="p-2.5 rounded-xl" style={{ background: BN.surface }}>
                        <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>Sarflagan</p>
                        <p className="text-[18px] font-black leading-tight" style={{ color: BN.text }}>{fmtPrice(s.thisMonthTotal)}</p>
                        <p className="text-[10.5px] mt-0.5 flex items-center gap-1" style={{ color: trendColor }}>
                            <TIcon className="w-3 h-3" /> {Math.abs(s.trendPct)}% o'tgan oydan
                        </p>
                    </div>
                    <div className="p-2.5 rounded-xl" style={{ background: BN.surface }}>
                        <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>Buyurtma</p>
                        <p className="text-[18px] font-black leading-tight" style={{ color: BN.text }}>{s.thisMonthOrders}</p>
                        <p className="text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>
                            Barcha vaqt: {s.allTimeOrders}
                        </p>
                    </div>
                </div>

                {/* Kategoriya top 3 */}
                {data.categoryBreakdown.length > 0 && (
                    <div className="pt-3 border-t" style={{ borderColor: BN.border }}>
                        <p className="text-[10.5px] font-black uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>Kategoriya bo'yicha</p>
                        {data.categoryBreakdown.slice(0, 3).map((c, i) => {
                            const maxT = data.categoryBreakdown[0].total || 1;
                            const w = Math.round((c.total / maxT) * 100);
                            return (
                                <div key={c.slug} className="mb-1.5">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-[11.5px] font-bold truncate" style={{ color: BN.text }}>
                                            <span style={{ color: BN.text3 }}>{i + 1}.</span> {c.name}
                                        </p>
                                        <p className="text-[11.5px] font-black tabular-nums" style={{ color: BN.gold }}>
                                            {fmtPriceShort(c.total)}
                                        </p>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: BN.surfaceUp }}>
                                        <div style={{ width: `${w}%`, height: "100%", background: BN.gold }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                    <BnLink href="/sevimlilar"
                        className="flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-bold"
                        style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                        <Heart className="w-3.5 h-3.5" /> Sevimlilar: {s.favoriteCount}
                    </BnLink>
                    <BnLink href="/bildirishnomalar"
                        className="flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-bold"
                        style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                        <Bell className="w-3.5 h-3.5" /> Kuzatuv: {s.watchCount}
                    </BnLink>
                </div>
            </div>

            {/* Chegirmadagi sevimlilar */}
            {data.dealsFromFavs.length > 0 && (
                <div className="rounded-2xl p-4"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" style={{ color: BN.gold }} />
                            <p className="text-[13.5px] font-black">Sevimlilaringiz chegirmada</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            {data.dealsFromFavs.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {data.dealsFromFavs.slice(0, 3).map(d => {
                            const savings = d.oldPrice && d.oldPrice > d.price ? d.oldPrice - d.price : 0;
                            const savePct = d.oldPrice && d.oldPrice > 0 ? Math.round((savings / d.oldPrice) * 100) : 0;
                            return (
                                <BnLink key={d.productId} href={`/p/${d.slug}`}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:brightness-95"
                                    style={{ background: BN.surfaceUp }}>
                                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
                                        style={{ background: BN.surface }}>
                                        {d.image && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={d.image} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold truncate" style={{ color: BN.text }}>{d.title}</p>
                                        <p className="text-[11px]" style={{ color: BN.text3 }}>{d.shopName}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[13px] font-black" style={{ color: BN.gold }}>{fmtPrice(d.price)}</p>
                                        {savePct > 0 && (
                                            <p className="text-[10.5px] font-black" style={{ color: BN.ok }}>-{savePct}%</p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                                </BnLink>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tez-tez oladiganlar */}
            {data.frequentBuys.length > 0 && (
                <div className="rounded-2xl p-4"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4" style={{ color: BN.gold }} />
                        <p className="text-[13.5px] font-black">Tez-tez oladigan mahsulotlaringiz</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {data.frequentBuys.slice(0, 8).map(f => (
                            <div key={f.productId} className="p-2 rounded-xl"
                                style={{ background: BN.surfaceUp }}>
                                <div className="w-full aspect-square rounded-lg overflow-hidden mb-1"
                                    style={{ background: BN.surface }}>
                                    {f.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={f.imageUrl} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <p className="text-[11.5px] font-bold line-clamp-2" style={{ color: BN.text }}>{f.title}</p>
                                <p className="text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    {f.times} marta olgan · {f.qty} dona
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
