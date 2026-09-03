"use client";

// BN home — trending kategoriyalar horizontal row (M2).
// So'nggi 7 kunlik VIEW event'lariga qarab top-8 kategoriya.

import { useEffect, useState } from "react";
import { Flame, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Cat {
    slug: string;
    name: string;
    productCount: number;
    imageUrl: string | null;
}

export function BnTrendingCategories() {
    const t = useTranslations("bn.home");
    const [rows, setRows] = useState<Cat[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let alive = true;
        fetch("/api/bn/home/trending-categories", { cache: "no-store" })
            .then(r => r.json())
            .then((d: { categories: Cat[] }) => {
                if (alive && Array.isArray(d?.categories)) setRows(d.categories);
            })
            .catch(() => {})
            .finally(() => { if (alive) setLoaded(true); });
        return () => { alive = false; };
    }, []);

    if (loaded && rows.length === 0) return null;

    return (
        <section className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-black flex items-center gap-2">
                    <Flame className="w-4 h-4" style={{ color: BN.gold }} />
                    {t("trendingCatsTitle")}
                </h2>
                <BnLink href="/qidiruv" className="text-[12px] font-bold flex items-center gap-0.5" style={{ color: BN.gold }}>
                    {t("viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                </BnLink>
            </div>

            <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
                {!loaded && Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-[110px] h-[140px] rounded-2xl animate-pulse"
                        style={{ background: BN.surface }}
                    />
                ))}
                {loaded && rows.map(c => (
                    <BnLink
                        key={c.slug}
                        href={`/k/${c.slug}`}
                        className="flex-shrink-0 w-[110px] rounded-2xl overflow-hidden group transition-transform active:scale-95"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <div
                            className="w-full aspect-square overflow-hidden"
                            style={{ background: BN.surfaceUp }}
                        >
                            {c.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={c.imageUrl}
                                    alt={c.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                    <Flame className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div className="p-2 text-center">
                            <p className="text-[12px] font-black line-clamp-1">{c.name}</p>
                            <p className="text-[10.5px] tabular-nums" style={{ color: BN.text3 }}>
                                {t("nItems", { n: c.productCount })}
                            </p>
                        </div>
                    </BnLink>
                ))}
            </div>
        </section>
    );
}
