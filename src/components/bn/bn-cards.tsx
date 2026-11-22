"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BnLink } from "./bn-nav";
import { Store, MapPin, Star, Globe, Package, Clock, ChevronRight, ShoppingBasket, BadgeCheck, Landmark } from "lucide-react";
import { BN, TIER_META, type ShopTier, type LocationType } from "@/lib/bn-theme";
import { bnCity } from "@/lib/bn-seo";
import { useBnFormat } from "./bn-format-hook";

// ── Do'kon kartasi ──────────────────────────────────────────────────────────

export interface ShopCardData {
    slug: string;
    name: string;
    logoUrl: string | null;
    tier: ShopTier;
    locationType: LocationType;
    marketName: string | null;
    marketSection: string | null;
    marketShopNo: string | null;
    address: string | null;
    city: string;
    rating: number;
    ratingCount: number;
    productCount: number;
    verifiedTier?: "NONE" | "RETAIL" | "WHOLESALE";  // tasdiqlangan sotuvchi galochkasi
}

export function BnShopCard({ s }: { s: ShopCardData }) {
    const tier = TIER_META[s.tier];
    const t = useTranslations("bn.shopCard");
    const fmt = useBnFormat();
    const locText = useShopLocationText();
    return (
        <BnLink
            href={`/d/${s.slug}`}
            newTab
            className="group flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.99]"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            <div
                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                style={{ background: BN.surfaceUp }}
            >
                {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <Store className="w-6 h-6" style={{ color: BN.text3 }} />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[14px] font-black truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                        {s.name}
                    </p>
                    {s.verifiedTier && s.verifiedTier !== "NONE" && (
                        <BadgeCheck
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: s.verifiedTier === "WHOLESALE" ? BN.gold : BN.info }}
                            strokeWidth={2.6}
                            aria-label={s.verifiedTier === "WHOLESALE" ? t("verifiedWholesale") : t("verifiedRetail")}
                        />
                    )}
                    {s.tier !== "NEW" && (
                        <span
                            className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black leading-none flex-shrink-0"
                            style={{ background: `${tier.color}1F`, color: tier.color }}
                        >
                            {fmt.tier(s.tier)}
                        </span>
                    )}
                </div>

                <p className="flex items-center gap-1 text-[11.5px] truncate" style={{ color: BN.text3 }}>
                    <LocationIcon type={s.locationType} />
                    <span className="truncate">{locText(s)}</span>
                </p>

                <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: BN.text3 }}>
                    {s.productCount > 0 && (
                        <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {t("productsLabel", { n: s.productCount })}
                        </span>
                    )}
                    <BnShopRating rating={s.rating} ratingCount={s.ratingCount} showCount iconClass="w-3 h-3" />
                </div>
            </div>

            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
        </BnLink>
    );
}

/** Do'kon bahosi: baho bo'lsa yulduz + o'rtacha, bo'lmasa "Yangi" belgisi — oltin "0.0"
 *  yulduzi juda yomon baho bo'lib o'qiladi. Shrift o'lchami ota elementdan meros. */
export function BnShopRating({
    rating, ratingCount, showCount = false, iconClass = "w-3.5 h-3.5",
}: { rating: number; ratingCount: number; showCount?: boolean; iconClass?: string }) {
    const t = useTranslations("bn.shopCard");
    if (ratingCount > 0) {
        return (
            <span className="inline-flex items-center gap-1" style={{ color: BN.gold }}>
                <Star className={`${iconClass} fill-current`} />
                {rating.toFixed(1)}
                {showCount && <span style={{ color: BN.text3 }}>({ratingCount})</span>}
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none"
            style={{ background: BN.goldSoft, color: BN.gold }}
            title={t("newBadgeHint")}
        >
            {t("newBadge")}
        </span>
    );
}

type ShopLocInput = Pick<ShopCardData, "locationType" | "marketName" | "marketSection" | "marketShopNo" | "address" | "city">;

/** Locale-aware do'kon joylashuv matni. Komponent ichida chaqirilishi kerak. */
export function useShopLocationText() {
    const t = useTranslations("bn.shopLoc");
    const locale = useLocale();
    return (s: ShopLocInput): string => {
        if (s.locationType === "IN_MARKET") {
            const parts = [
                s.marketName,
                s.marketSection,
                s.marketShopNo ? t("shopNo", { n: s.marketShopNo }) : null,
            ].filter(Boolean);
            return parts.join(" · ");
        }
        // Manzil — erkin matn (DB); faqat shahar nomi tilga moslanadi ("Toshkent" → "Ташкент")
        if (s.locationType === "STANDALONE") return s.address || bnCity(s.city, locale);
        return t("onlineShop");
    };
}

/** Server-side fallback (UZ). Client'da useShopLocationText'ni afzal ko'ring. */
export function shopLocationText(s: ShopLocInput): string {
    if (s.locationType === "IN_MARKET") {
        const parts = [s.marketName, s.marketSection, s.marketShopNo && `${s.marketShopNo}-do'kon`].filter(Boolean);
        return parts.join(" · ");
    }
    if (s.locationType === "STANDALONE") return s.address || s.city;
    return "Onlayn do'kon";
}

function LocationIcon({ type }: { type: LocationType }) {
    const cls = "w-3 h-3 flex-shrink-0";
    if (type === "IN_MARKET") return <Store className={cls} />;
    if (type === "STANDALONE") return <ShoppingBasket className={cls} />;
    return <Globe className={cls} />;
}

// ── Bozor kartasi ───────────────────────────────────────────────────────────

export interface MarketCardData {
    slug: string;
    name: string;
    district: string;
    coverUrl: string;
    workHours: string;
    shopCount: number;
}

export function BnMarketCard({ m, wide = false }: { m: MarketCardData; wide?: boolean }) {
    const t = useTranslations("bn.markets");
    return (
        <BnLink
            href={`/m/${m.slug}`}
            newTab
            className="group relative overflow-hidden rounded-2xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${BN.border}` }}
        >
            <div className={wide ? "aspect-[16/7]" : "aspect-[4/3]"} style={{ background: BN.surfaceUp }}>
                <BnMarketCover
                    src={m.coverUrl}
                    alt={m.name}
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                />
            </div>

            <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.45) 45%, transparent 75%)" }}
            />

            <div className="absolute inset-x-0 bottom-0 p-3.5">
                <p className="text-[15px] font-black leading-tight mb-1 transition-colors group-hover:text-[color:var(--bn-gold)]">
                    {m.name}
                </p>
                <div className="flex items-center gap-3 text-[11.5px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {m.district}
                    </span>
                    <span className="flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {m.shopCount > 0 ? t("shopN", { n: m.shopCount }) : t("shopsSoon")}
                    </span>
                </div>
                {wide && (
                    <p className="flex items-center gap-1 mt-1 text-[11.5px]" style={{ color: "rgba(255,255,255,0.68)" }}>
                        <Clock className="w-3 h-3" />
                        {m.workHours}
                    </p>
                )}
            </div>
        </BnLink>
    );
}

/** Bozor muqovasi. coverUrl bo'sh yoki buzuq bo'lsa `<img src="">` (buzuq rasm belgisi +
 *  alt matn) o'rniga BN gradient + Landmark ikon chiqadi. Nom yonidagi matnda bor —
 *  fallback ichida takrorlanmaydi. `onFallback` — ota (masalan hero matn rangi) uchun. */
export function BnMarketCover({
    src, alt, eager = false, imgClassName = "", iconClass = "w-10 h-10", onFallback,
}: {
    src: string | null | undefined; alt: string; eager?: boolean;
    imgClassName?: string; iconClass?: string; onFallback?: () => void;
}) {
    const [failed, setFailed] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const fail = () => { setFailed(true); onFallback?.(); };
    // Rasm hidratsiyadan OLDIN buzilgan bo'lsa onError kelmaydi — holatni o'zimiz tekshiramiz
    // (currentSrc: lazy rasm hali so'ralmagan bo'lsa bo'sh — uni buzuq deb hisoblamaymiz)
    useEffect(() => {
        const el = imgRef.current;
        if (el && el.complete && el.currentSrc && el.naturalWidth === 0) fail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    if (src && !failed) {
        return (
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                loading={eager ? "eager" : "lazy"}
                onError={fail}
                className={`w-full h-full object-cover ${imgClassName}`}
            />
        );
    }
    return (
        <div
            role="img"
            aria-label={alt}
            className="w-full h-full grid place-items-center"
            style={{ background: `radial-gradient(120% 90% at 85% 0%, ${BN.goldSoft} 0%, transparent 60%), linear-gradient(160deg, ${BN.surfaceUp} 0%, ${BN.surface} 100%)` }}
        >
            <Landmark className={iconClass} style={{ color: BN.gold, opacity: 0.6 }} strokeWidth={1.4} />
        </div>
    );
}

// ── Bo'lim sarlavhasi ───────────────────────────────────────────────────────

export function BnSectionTitle({
    title, subtitle, href, hrefLabel,
}: { title: string; subtitle?: string; href?: string; hrefLabel?: string }) {
    const t = useTranslations("bn.home");
    const label = hrefLabel ?? t("allBtn");
    return (
        <div className="flex items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
                <h2 className="bn-display text-[20px] sm:text-[24px] font-black tracking-tight leading-none">{title}</h2>
                {subtitle && (
                    <p className="text-[13px] mt-1.5" style={{ color: BN.text3 }}>{subtitle}</p>
                )}
            </div>
            {href && (
                <BnLink
                    href={href}
                    className="flex items-center gap-1 text-[13px] font-bold flex-shrink-0 transition-colors hover:opacity-70"
                    style={{ color: BN.gold }}
                >
                    {label}
                    <ChevronRight className="w-4 h-4" />
                </BnLink>
            )}
        </div>
    );
}

// ── Bo'sh holat ─────────────────────────────────────────────────────────────

export function BnEmpty({
    icon, title, text, action,
}: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span
                className="w-14 h-14 rounded-2xl grid place-items-center mb-4"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text3 }}
            >
                {icon ?? <Package className="w-6 h-6" />}
            </span>
            <p className="text-[15px] font-black mb-1">{title}</p>
            {text && <p className="text-[13px] max-w-[380px]" style={{ color: BN.text3 }}>{text}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
