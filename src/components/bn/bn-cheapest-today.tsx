"use client";

// BN home "Bugungi eng arzon" qatori. Bozor o'rtacha narxidan yoki 7-kun
// oldingi narxdan arzonlashgan mahsulotlar top 10. Empty holatda jim
// yashiradi (home boshqa qatorlarni buzmaydi).

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { TrendingDown, ChevronRight, Tag } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { formatMoney } from "@/lib/money";

interface CheapItem {
    id: string;
    slug: string;
    title: string;
    price: number;
    oldPrice: number | null;
    image: string | null;
    shopName: string;
    shopSlug: string;
    marketAvgPrice: number | null;
    discountPct: number;
    reason: "market_avg" | "price_drop";
}

export function BnCheapestToday() {
    const locale = useLocale();
    const [items, setItems] = useState<CheapItem[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch("/api/bn/cheapest-today");
                if (!r.ok) throw new Error("fetch_failed");
                const data = await r.json();
                if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return null;
    if (!items || items.length === 0) return null;

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "#10B98122", color: "#10B981" }}
                    >
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-bold" style={{ color: BN.text }}>
                            {locale === "ru" ? "Самые выгодные сегодня" : locale === "en" ? "Best Deals Today" : "Bugungi eng arzon"}
                        </h2>
                        <div className="text-[13px]" style={{ color: BN.text2 }}>
                            {locale === "ru"
                                ? "Ниже среднерыночной цены или упали за неделю"
                                : locale === "en"
                                    ? "Below market average or dropped this week"
                                    : "Bozor o'rtachasidan past yoki hafta ichida tushgan"}
                        </div>
                    </div>
                </div>
                <BnLink
                    href="/qidiruv?cheap=1"
                    className="hidden sm:flex items-center gap-1 text-[13px] font-medium hover:opacity-80"
                    style={{ color: BN.gold }}
                >
                    {locale === "ru" ? "Смотреть все" : locale === "en" ? "See all" : "Barchasi"}
                    <ChevronRight className="w-4 h-4" />
                </BnLink>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                {items.map(item => (
                    <BnLink
                        key={item.id}
                        href={`/p/${item.slug}`}
                        className="shrink-0 w-[180px] rounded-2xl overflow-hidden group"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <div className="relative aspect-square" style={{ background: BN.surfaceUp }}>
                            {item.image ? (
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ color: BN.text3 }}>
                                    <Tag className="w-8 h-8" />
                                </div>
                            )}
                            <div
                                className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                                style={{ background: "#10B981", color: "#fff" }}
                            >
                                <TrendingDown className="w-3 h-3" />
                                −{item.discountPct}%
                            </div>
                        </div>
                        <div className="p-2.5">
                            <div className="text-[12px] font-semibold line-clamp-2 h-[32px]" style={{ color: BN.text }}>
                                {item.title}
                            </div>
                            <div className="mt-1.5 flex items-baseline gap-1.5">
                                <span className="text-[14px] font-bold" style={{ color: BN.gold }}>
                                    {formatMoney(item.price, "UZS")}
                                </span>
                                {item.reason === "market_avg" && item.marketAvgPrice ? (
                                    <span className="text-[10.5px] line-through" style={{ color: BN.text3 }}>
                                        {formatMoney(item.marketAvgPrice, "UZS")}
                                    </span>
                                ) : item.oldPrice ? (
                                    <span className="text-[10.5px] line-through" style={{ color: BN.text3 }}>
                                        {formatMoney(item.oldPrice, "UZS")}
                                    </span>
                                ) : null}
                            </div>
                            <div className="mt-1 text-[11px] truncate" style={{ color: BN.text2 }}>
                                {item.shopName}
                            </div>
                        </div>
                    </BnLink>
                ))}
            </div>
        </section>
    );
}
