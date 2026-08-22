"use client";

import { useLocale } from "next-intl";
import { BELIS } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

export interface BelisProductLite {
    id: string; slug: string;
    nameUz: string; nameRu?: string | null; nameEn?: string | null;
    images: string[];
    price: number; oldPrice?: number | null;
    currency: string;
    stock: number;
}

function pickName(p: BelisProductLite, locale: string): string {
    if (locale === "ru" && p.nameRu) return p.nameRu;
    if (locale === "en" && p.nameEn) return p.nameEn;
    return p.nameUz;
}

function formatPrice(n: number, currency: string, locale: string): string {
    const num = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(n);
    return currency === "USD" ? `$${num}` : `${num} so'm`;
}

export function BelisProductCard({ product }: { product: BelisProductLite }) {
    const locale = useLocale();
    const name = pickName(product, locale);
    const img = product.images[0];
    const hasDiscount = product.oldPrice && product.oldPrice > product.price;
    const soldOut = product.stock === 0;

    return (
        <BelisLink href={`/belis/p/${product.slug}`}
            className="group block rounded-2xl overflow-hidden transition hover:brightness-105 active:scale-[0.98]"
            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
            <div className="aspect-square relative overflow-hidden"
                style={{ background: "rgba(212,175,55,0.06)" }}>
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={name}
                        className="w-full h-full object-cover transition group-hover:scale-105"
                        loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                        style={{ color: BELIS.text3, fontFamily: "'Great Vibes', cursive", fontSize: 48 }}>
                        Belis
                    </div>
                )}
                {hasDiscount && (
                    <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-1 rounded-md"
                        style={{ background: BELIS.gold, color: BELIS.onGold }}>
                        -{Math.round(100 - (product.price / product.oldPrice!) * 100)}%
                    </span>
                )}
                {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(11,10,5,0.55)" }}>
                        <span className="text-white text-xs font-black uppercase tracking-widest">Sotuvda yo&apos;q</span>
                    </div>
                )}
            </div>
            <div className="p-3">
                <p className="text-sm font-bold line-clamp-2 min-h-[40px]"
                    style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>
                    {name}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-base font-black" style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                        {formatPrice(product.price, product.currency, locale)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs line-through" style={{ color: BELIS.text3 }}>
                            {formatPrice(product.oldPrice!, product.currency, locale)}
                        </span>
                    )}
                </div>
            </div>
        </BelisLink>
    );
}
