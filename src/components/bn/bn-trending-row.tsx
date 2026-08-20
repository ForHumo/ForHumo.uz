"use client";

// BN home "Trend" qatori — so'nggi 7 kunda ko'p ko'rilgan/sotib olingan
// mahsulotlar. Discovery hook — foydalanuvchi "boshqalar nima olyapti"
// signalidan foydalanadi (social proof + trend discovery).

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Flame, Eye, ShoppingBag, ChevronRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface TrendingItem {
    slug: string;
    title: string;
    image: string | null;
    price: number;
    marketAvgPrice: number | null;
    shopName: string;
    marketName: string | null;
    viewsRecent: number;
    ordersRecent: number;
}

function fmtPrice(n: number, locale: string): string {
    const bcp = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-Latn-UZ";
    const num = n.toLocaleString(bcp, { maximumFractionDigits: 0 });
    return locale === "ru" ? `${num} сум` : locale === "en" ? `${num} UZS` : `${num} so'm`;
}

export function BnTrendingRow() {
    const t = useTranslations("bn.trending");
    const locale = useLocale();
    const [items, setItems] = useState<TrendingItem[] | null>(null);

    useEffect(() => {
        fetch("/api/bn/trending")
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => setItems(d.items ?? []))
            .catch(() => setItems([]));
    }, []);

    // Kutish holati yashirilgan (skeleton emas — home slot band bo'lmasin);
    // bo'sh natija ham jim (mavjud emas, chaqirilmaydi).
    if (items === null || items.length === 0) return null;

    return (
        <section className="mb-10">
            <div className="flex items-end justify-between gap-3 mb-4">
                <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <Flame className="w-[18px] h-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-[18px] sm:text-[21px] font-black tracking-tight leading-none">{t("title")}</h2>
                        <p className="text-[12.5px] mt-1.5" style={{ color: BN.text3 }}>{t("subtitle")}</p>
                    </div>
                </div>
                <BnLink href="/qidiruv?sort=new"
                    className="flex items-center gap-1 text-[13px] font-bold flex-shrink-0 whitespace-nowrap"
                    style={{ color: BN.gold }}>
                    {t("allBtn")}
                    <ChevronRight className="w-4 h-4" />
                </BnLink>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1" data-no-swipe>
                {items.map((p, i) => {
                    const savedPct = p.marketAvgPrice && p.marketAvgPrice > p.price
                        ? Math.round(((p.marketAvgPrice - p.price) / p.marketAvgPrice) * 100)
                        : 0;
                    return (
                        <BnLink key={p.slug} href={`/p/${p.slug}`}
                            className="flex-shrink-0 w-[168px] rounded-2xl overflow-hidden transition-transform active:scale-[0.99]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <div className="relative aspect-square grid place-items-center overflow-hidden"
                                style={{ background: BN.surfaceUp }}>
                                {p.image && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                                )}
                                {/* Rank badge — 1-3 tilla, 4-10 kulrang */}
                                <span className="absolute top-1.5 left-1.5 min-w-[22px] h-[22px] px-1 grid place-items-center rounded-md text-[10.5px] font-black tabular-nums"
                                    style={i < 3
                                        ? { background: BN.gold, color: BN.onGold }
                                        : { background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                                    {i + 1}
                                </span>
                                {savedPct > 0 && (
                                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none"
                                        style={{ background: BN.ok, color: "#000" }}>
                                        −{savedPct}%
                                    </span>
                                )}
                            </div>
                            <div className="p-2.5">
                                <p className="text-[12.5px] font-black leading-tight line-clamp-2 min-h-[32px]">{p.title}</p>
                                <p className="text-[13px] font-black mt-1" style={{ color: BN.gold }}>
                                    {fmtPrice(p.price, locale)}
                                </p>
                                <p className="flex items-center gap-2 text-[10px] mt-1.5" style={{ color: BN.text3 }}>
                                    {p.ordersRecent > 0 ? (
                                        <span className="inline-flex items-center gap-0.5">
                                            <ShoppingBag className="w-3 h-3" />
                                            <span className="tabular-nums">{p.ordersRecent}</span>
                                        </span>
                                    ) : null}
                                    <span className="inline-flex items-center gap-0.5">
                                        <Eye className="w-3 h-3" />
                                        <span className="tabular-nums">{p.viewsRecent}</span>
                                    </span>
                                </p>
                            </div>
                        </BnLink>
                    );
                })}
            </div>
        </section>
    );
}
