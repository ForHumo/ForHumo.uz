"use client";

import { useState, useEffect } from "react";
import {
    Store, MapPin, ArrowRight, ChevronRight, Star, Package,
    TrendingDown, Sparkles, Crown, Loader2, Globe, ShoppingBasket, ClipboardList,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnHeroSlider } from "./bn-hero-slider";
import { BnLink, useBnBase } from "./bn-nav";
import { useShopLocationText } from "./bn-cards";
import { LiquidGlassNavbar } from "@/components/shared/liquid-glass-navbar";
import { BnShopStories } from "./bn-shop-stories";
import { BnReferralHero } from "./bn-referral-hero";
import { BnInstallCard } from "./bn-install-card";
import { BnNearbyRow } from "./bn-nearby-row";
import type { BnMarketDTO, BnProductDTO, BnShopDTO } from "@/lib/bn-data";

const COLS = 5;          // chapdan o'ngga 5 ta
const INITIAL_ROWS = 2;  // tepadan pastga 2 qator
const LOAD_ROWS = 5;     // "Yuklash" har bosishda 5 qator qo'shadi

type FilterKey = "cheap" | "fresh" | "top" | "seasonal";

export interface BnHomeInitial {
    markets: BnMarketDTO[];
    topShops: BnShopDTO[];
    cheap: BnProductDTO[];
    fresh: BnProductDTO[];
    top: BnProductDTO[];
    seasonal: BnProductDTO[];
    forYou?: BnProductDTO[];
}

export function BnHome({ initial }: { initial: BnHomeInitial }) {
    const { markets, topShops, cheap, fresh, top, seasonal, forYou } = initial;
    const t = useTranslations("bn.home");
    const locText = useShopLocationText();

    // ── Mahsulotlar filtri (LiquidGlassNavbar bilan) ────────────────────────
    const [filter, setFilter] = useState<FilterKey>("cheap");
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const { resolvedTheme } = useTheme();
    const navTint: "light" | "dark" = mounted && resolvedTheme === "dark" ? "dark" : "light";

    const FILTER_MAP: Record<FilterKey, { title: string; subtitle?: string; icon: React.ReactNode; items: BnProductDTO[]; href: string }> = {
        cheap:    { title: t("cheapTitle"),    subtitle: t("cheapSub"),    icon: <TrendingDown className="w-[18px] h-[18px]" />, items: cheap,    href: "/qidiruv?sort=cheap" },
        fresh:    { title: t("freshTitle"),                                icon: <Sparkles className="w-[18px] h-[18px]" />,     items: fresh,    href: "/qidiruv?sort=new" },
        top:      { title: t("topTitle"),      subtitle: t("topSub"),      icon: <Star className="w-[18px] h-[18px]" />,         items: top,      href: "/qidiruv?sort=rating" },
        seasonal: { title: t("seasonalTitle"), subtitle: t("seasonalSub"), icon: <Package className="w-[18px] h-[18px]" />,      items: seasonal, href: "/qidiruv?sort=seasonal" },
    };
    const active = FILTER_MAP[filter];

    return (
        <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-10">
            {/* ── Sotuvchi Nexus stories (24 soatlik hikoyalar) ── */}
            <BnShopStories />

            {/* ── Reklama slayder (Bozor/Do'kondan TEPADA) ── */}
            <BnHeroSlider />

            {/* ── Anonim tashrifchiga referral CTA (kirsa yashirilmaydi) ── */}
            <BnReferralHero />

            {/* ── PWA "Ilovani o'rnatish" — retentsiya + iOS Push uchun ── */}
            <BnInstallCard />

            {/* ── Ikkita asosiy kirish nuqtasi ── */}
            <section className="grid grid-cols-2 gap-2 sm:gap-3 mb-8 sm:mb-10">
                <EntryCard
                    href="/bozorlar"
                    icon={<Store className="w-6 h-6" />}
                    title={t("markets")}
                    text={t("marketsText")}
                    count={t("marketsCount", { n: markets.length })}
                    cover={markets[0]?.coverUrl ?? "https://picsum.photos/seed/bn-fallback-1/800/800"}
                />
                <EntryCard
                    href="/dokonlar"
                    icon={<ShoppingBasket className="w-6 h-6" />}
                    title={t("shops")}
                    text={t("shopsText")}
                    count={t("shopsCount", { n: topShops.length })}
                    cover={markets[2]?.coverUrl ?? markets[0]?.coverUrl ?? "https://picsum.photos/seed/bn-fallback-2/800/800"}
                />
            </section>

            {/* ── Yaqin do'konlar (geolocation) — permission bersa ko'rinadi ── */}
            <BnNearbyRow />

            {/* ── Siz uchun (personalizatsiya) — faqat kirganlar uchun ── */}
            {forYou && forYou.length > 0 && (
                <ProductSection
                    title={t("forYou")}
                    subtitle={t("forYouSub")}
                    icon={<Sparkles className="w-[18px] h-[18px]" />}
                    href="/qidiruv?sort=recommended"
                    items={forYou}
                />
            )}

            {/* ── TOP 10 ishonchli do'kon ── */}
            <section className="mb-10">
                <SectionHead
                    title={t("trustedShops")}
                    subtitle={t("trustedShopsSub")}
                    href="/dokonlar"
                    hrefLabel={t("seeAll")}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {topShops.map((s, i) => (
                        <BnLink
                            key={s.id}
                            href={`/d/${s.slug}`}
                            newTab
                            className={`group flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.99] ${i >= 3 ? "hidden md:flex" : ""}`}
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <span
                                className="w-7 h-7 rounded-lg grid place-items-center text-[12px] font-black flex-shrink-0 tabular-nums"
                                style={
                                    i < 3
                                        ? { background: BN.goldSoft, color: BN.gold }
                                        : { background: BN.surfaceUp, color: BN.text3 }
                                }
                            >
                                {i === 0 ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                            </span>

                            <span
                                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                                style={{ background: BN.surfaceUp }}
                            >
                                {s.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-5 h-5" style={{ color: BN.text3 }} />
                                )}
                            </span>

                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[13.5px] font-black truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                                        {s.name}
                                    </span>
                                    {s.tier !== "NEW" && (
                                        <span
                                            className="px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none flex-shrink-0"
                                            style={{ background: `${TIER_META[s.tier].color}1F`, color: TIER_META[s.tier].color }}
                                        >
                                            {TIER_META[s.tier].label}
                                        </span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1 text-[11.5px] mt-0.5 truncate" style={{ color: BN.text3 }}>
                                    {s.locationType === "IN_MARKET"
                                        ? <Store className="w-3 h-3 flex-shrink-0" />
                                        : s.locationType === "STANDALONE"
                                            ? <MapPin className="w-3 h-3 flex-shrink-0" />
                                            : <Globe className="w-3 h-3 flex-shrink-0" />}
                                    <span className="truncate">{locText(s)}</span>
                                </span>
                            </span>

                            <span className="flex flex-col items-end flex-shrink-0">
                                <span className="flex items-center gap-1 text-[12.5px] font-black" style={{ color: BN.gold }}>
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    {s.rating.toFixed(1)}
                                </span>
                                <span className="flex items-center gap-1 text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    <Package className="w-3 h-3" />
                                    {s.productCount}
                                </span>
                            </span>
                        </BnLink>
                    ))}
                </div>
            </section>

            {/* ── Mahsulot filtri (iOS 26 uslubidagi Liquid Glass navbar) ── */}
            <section className="mb-6 flex justify-center overflow-x-auto no-scrollbar" data-no-swipe>
                <LiquidGlassNavbar
                    tint={navTint}
                    accent="var(--bn-gold)"
                    value={filter}
                    onChange={k => setFilter(k as FilterKey)}
                    ariaLabel={t("filterAria")}
                    items={[
                        { key: "cheap",    label: t("cheap"),    icon: <TrendingDown className="w-4 h-4" /> },
                        { key: "fresh",    label: t("fresh"),    icon: <Sparkles className="w-4 h-4" /> },
                        { key: "top",      label: t("top"),      icon: <Star className="w-4 h-4" /> },
                        { key: "seasonal", label: t("seasonal"), icon: <Package className="w-4 h-4" /> },
                    ]}
                />
            </section>

            <ProductSection
                key={filter}
                title={active.title}
                subtitle={active.subtitle}
                icon={active.icon}
                items={active.items}
                href={active.href}
            />

            {/* ── Sotuvchi CTA — faqat do'koni yo'q foydalanuvchilarga ── */}
            <SellerBanner />
        </div>
    );
}

function SellerBanner() {
    const { hasShop } = useBnBase();
    const t = useTranslations("bn.home");
    if (hasShop) return null;   // do'koni bor odam uchun ko'rsatmaymiz
    return (
        <section className="mt-4">
            <div
                className="relative overflow-hidden rounded-3xl p-7 sm:p-10"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight mb-3">
                            {t("sellerCta")}
                        </h3>
                        <p className="text-[14px] leading-relaxed max-w-[560px]" style={{ color: BN.text2 }}>
                            {t("sellerCtaText")}
                        </p>
                    </div>
                    <SellerCta />
                </div>
            </div>
        </section>
    );
}

// ── Mahsulot bo'limi: 5 ustun × 2 qator, "Yuklash" 5 qatordan qo'shadi ──────

function SellerCta() {
    const { hasShop } = useBnBase();
    const t = useTranslations("bn.seller");
    const tBanner = useTranslations("bn.sellerBanner");

    if (hasShop) {
        return (
            <BnLink
                href="/kabinet"
                className="flex items-center justify-center gap-2 px-7 rounded-2xl text-[15px] font-black flex-shrink-0 transition-transform active:scale-[0.97]"
                style={{ height: 52, background: BN.gold, color: BN.onGold }}
            >
                <Store className="w-5 h-5" />
                {t("openCabinet")}
                <ArrowRight className="w-4 h-4" />
            </BnLink>
        );
    }

    // MChJ ochilgunicha waitlist asosiy oqim — primary + secondary CTA
    return (
        <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-auto md:min-w-[220px]">
            <BnLink
                href="/sotuvchi/waitlist"
                className="flex items-center justify-center gap-2 px-6 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.97]"
                style={{ height: 52, background: BN.gold, color: BN.onGold }}
            >
                <ClipboardList className="w-5 h-5" />
                {tBanner("waitlistBtn")}
                <ArrowRight className="w-4 h-4" />
            </BnLink>
            <BnLink
                href="/sotuvchi"
                className="flex items-center justify-center gap-1.5 h-10 rounded-xl text-[12.5px] font-bold transition-colors"
                style={{ background: "transparent", color: BN.text3 }}
            >
                {tBanner("haveDocs")}
                <ChevronRight className="w-3.5 h-3.5" />
            </BnLink>
        </div>
    );
}

function ProductSection({
    title, subtitle, icon, items, href,
}: {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    items: BnProductDTO[];
    href: string;
}) {
    const t = useTranslations("bn.home");
    const [rows, setRows] = useState(INITIAL_ROWS);
    const [busy, setBusy] = useState(false);

    const visible = items.slice(0, rows * COLS);
    const hasMore = visible.length < items.length;

    function loadMore() {
        setBusy(true);
        // FAZA 4 da bu API chaqiruvi bo'ladi
        setTimeout(() => { setRows(r => r + LOAD_ROWS); setBusy(false); }, 320);
    }

    if (items.length === 0) return null;

    return (
        <section className="mb-10">
            <SectionHead title={title} subtitle={subtitle} icon={icon} href={href} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {visible.map(p => <BnProductCard key={p.id} p={p} compact />)}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-5">
                    <button
                        onClick={loadMore}
                        disabled={busy}
                        className="flex items-center gap-2 h-11 px-6 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98] disabled:opacity-60"
                        style={{ background: BN.surface, border: `1px solid ${BN.borderGold}`, color: BN.gold }}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {t("loadMore")}
                    </button>
                </div>
            )}
        </section>
    );
}

// ── Yordamchilar ────────────────────────────────────────────────────────────

function SectionHead({
    title, subtitle, icon, href, hrefLabel,
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    href?: string;
    hrefLabel?: string;
}) {
    const t = useTranslations("bn.home");
    const label = hrefLabel ?? t("allBtn");
    return (
        <div className="flex items-end justify-between gap-3 mb-4">
            <div className="min-w-0 flex items-center gap-2.5">
                {icon && (
                    <span
                        className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        {icon}
                    </span>
                )}
                <div className="min-w-0">
                    <h2 className="text-[18px] sm:text-[21px] font-black tracking-tight leading-none">{title}</h2>
                    {subtitle && (
                        <p className="text-[12.5px] mt-1.5" style={{ color: BN.text3 }}>{subtitle}</p>
                    )}
                </div>
            </div>
            {href && (
                <BnLink
                    href={href}
                    className="flex items-center gap-1 text-[13px] font-bold flex-shrink-0 whitespace-nowrap"
                    style={{ color: BN.gold }}
                >
                    {label}
                    <ChevronRight className="w-4 h-4" />
                </BnLink>
            )}
        </div>
    );
}

function EntryCard({
    href, icon, title, text, count, cover,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    text: string;
    count: string;
    cover: string;
}) {
    return (
        <BnLink
            href={href}
            className="group relative overflow-hidden rounded-2xl sm:rounded-3xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${BN.border}` }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={cover}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(105deg, var(--bn-surface) 42%, rgba(0,0,0,0.35) 100%)" }}
            />

            <div className="relative flex flex-col justify-between p-3 sm:p-5 min-h-[140px] sm:min-h-[168px]">
                <span
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl grid place-items-center"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    {icon}
                </span>

                <div>
                    <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <h2 className="text-[16px] sm:text-[22px] font-black tracking-tight leading-none">{title}</h2>
                        <ArrowRight
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1"
                            style={{ color: BN.gold }}
                        />
                    </div>
                    <p className="hidden sm:block text-[13px] leading-snug max-w-[260px]" style={{ color: BN.text2 }}>{text}</p>
                    <p className="text-[10.5px] sm:text-[11.5px] font-bold mt-1 sm:mt-2" style={{ color: BN.gold }}>{count}</p>
                </div>
            </div>
        </BnLink>
    );
}
