"use client";

import { BnLink } from "./bn-nav";
import { Store, MapPin, Star, Globe, Package, Clock, ChevronRight, ShoppingBasket } from "lucide-react";
import { BN, TIER_META, type ShopTier, type LocationType } from "@/lib/bn-theme";

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
}

export function BnShopCard({ s }: { s: ShopCardData }) {
    const tier = TIER_META[s.tier];
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
                    {s.tier !== "NEW" && (
                        <span
                            className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black leading-none flex-shrink-0"
                            style={{ background: `${tier.color}1F`, color: tier.color }}
                        >
                            {tier.label}
                        </span>
                    )}
                </div>

                <p className="flex items-center gap-1 text-[11.5px] truncate" style={{ color: BN.text3 }}>
                    <LocationIcon type={s.locationType} />
                    <span className="truncate">{shopLocationText(s)}</span>
                </p>

                <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: BN.text3 }}>
                    <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {s.productCount} ta
                    </span>
                    {s.ratingCount > 0 && (
                        <span className="flex items-center gap-1" style={{ color: BN.gold }}>
                            <Star className="w-3 h-3 fill-current" />
                            {s.rating.toFixed(1)}
                            <span style={{ color: BN.text3 }}>({s.ratingCount})</span>
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
        </BnLink>
    );
}

export function shopLocationText(s: Pick<ShopCardData, "locationType" | "marketName" | "marketSection" | "marketShopNo" | "address" | "city">): string {
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
    return (
        <BnLink
            href={`/m/${m.slug}`}
            newTab
            className="group relative overflow-hidden rounded-2xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${BN.border}` }}
        >
            <div className={wide ? "aspect-[16/7]" : "aspect-[4/3]"} style={{ background: BN.surfaceUp }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={m.coverUrl}
                    alt={m.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
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
                        {m.shopCount} do&apos;kon
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

// ── Bo'lim sarlavhasi ───────────────────────────────────────────────────────

export function BnSectionTitle({
    title, subtitle, href, hrefLabel = "Barchasi",
}: { title: string; subtitle?: string; href?: string; hrefLabel?: string }) {
    return (
        <div className="flex items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
                <h2 className="text-[19px] sm:text-[22px] font-black tracking-tight leading-none">{title}</h2>
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
                    {hrefLabel}
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
