"use client";

import { BnLink } from "./bn-nav";
import { Store, MapPin, Star, Eye, Truck } from "lucide-react";
import { BN, fmtPrice, priceRankOf, PRICE_RANK_META, priceDiffLabel } from "@/lib/bn-theme";

export interface ProductCardData {
    slug: string;
    title: string;
    price: number;
    oldPrice: number | null;
    marketAvgPrice: number | null;
    images: string[];
    shopName: string;
    shopSlug: string;
    marketName: string | null;
    city: string;
    rating: number;
    ratingCount: number;
    isNegotiable: boolean;
    allowDelivery: boolean;
    allowInspect: boolean;
    stock: number;
}

export function BnProductCard({ p, compact = false }: { p: ProductCardData; compact?: boolean }) {
    const rank = priceRankOf(p.price, p.marketAvgPrice);
    const rankMeta = rank ? PRICE_RANK_META[rank] : null;
    const diff = priceDiffLabel(p.price, p.marketAvgPrice);
    const showDiff = rank === "cheap" && diff;

    return (
        <BnLink
            href={`/p/${p.slug}`}
            className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-150 active:scale-[0.985]"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            {/* Rasm */}
            <div className="relative aspect-square overflow-hidden" style={{ background: BN.surfaceUp }}>
                {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={p.images[0]}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                        <Store className="w-8 h-8" />
                    </div>
                )}

                {/* Arzon belgisi — BN ning asosiy va'dasi */}
                {showDiff && (
                    <span
                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10.5px] font-black leading-none"
                        style={{ background: BN.ok, color: BN.onGold }}
                    >
                        {diff}
                    </span>
                )}

                {/* Kam qoldi */}
                {p.stock > 0 && p.stock <= 3 && (
                    <span
                        className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10.5px] font-black leading-none"
                        style={{ background: BN.glass, color: BN.warn }}
                    >
                        {p.stock} ta qoldi
                    </span>
                )}

                {/* Pastki belgilar */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    {p.allowInspect && (
                        <Chip icon={<Eye className="w-3 h-3" />} text="Ko'rib olish" />
                    )}
                    {p.allowDelivery && !compact && (
                        <Chip icon={<Truck className="w-3 h-3" />} text="Yetkazish" />
                    )}
                </div>
            </div>

            {/* Matn */}
            <div className="flex flex-col flex-1 p-3">
                {/* Narx — asosiy element */}
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[16px] font-black tabular-nums leading-none">
                        {fmtPrice(p.price)}
                    </span>
                    {p.oldPrice && p.oldPrice > p.price && (
                        <span className="text-[12px] line-through tabular-nums" style={{ color: BN.text3 }}>
                            {p.oldPrice.toLocaleString("uz-UZ")}
                        </span>
                    )}
                </div>

                {/* Bozor narxi bilan solishtirish */}
                {rankMeta && p.marketAvgPrice && (
                    <p className="text-[11px] mb-1.5 leading-none" style={{ color: rankMeta.color }}>
                        {rank === "fair"
                            ? "Bozor narxida"
                            : `Bozorda o'rtacha ${p.marketAvgPrice.toLocaleString("uz-UZ")}`}
                    </p>
                )}
                {p.isNegotiable && !rankMeta && (
                    <p className="text-[11px] mb-1.5 leading-none" style={{ color: BN.text3 }}>
                        Kelishilgan narxda
                    </p>
                )}

                {/* Nomi */}
                <p
                    className="text-[13px] leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[color:var(--bn-gold)]"
                    style={{ color: BN.text }}
                >
                    {p.title}
                </p>

                <div className="flex-1" />

                {/* Do'kon + joy */}
                <div className="flex items-center gap-1.5 text-[11px] min-w-0" style={{ color: BN.text3 }}>
                    {p.marketName ? (
                        <>
                            <Store className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.marketName}</span>
                        </>
                    ) : (
                        <>
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.shopName}</span>
                        </>
                    )}
                    {p.ratingCount > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 flex-shrink-0" style={{ color: BN.gold }}>
                            <Star className="w-3 h-3 fill-current" />
                            {p.rating.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
        </BnLink>
    );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <span
            className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold leading-none backdrop-blur-sm"
            style={{ background: BN.glass, color: BN.text2 }}
        >
            {icon}
            {text}
        </span>
    );
}

/** Yuklanish skeleti */
export function BnProductCardSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="aspect-square" style={{ background: BN.surfaceUp }} />
            <div className="p-3 space-y-2">
                <div className="h-4 w-2/3 rounded" style={{ background: BN.surfaceUp }} />
                <div className="h-3 w-1/2 rounded" style={{ background: BN.surfaceUp }} />
                <div className="h-3 w-full rounded" style={{ background: BN.surfaceUp }} />
            </div>
        </div>
    );
}
