"use client";

import { BnLink } from "./bn-nav";
import {
    Store, MapPin, Clock, Phone, ChevronRight, Star, Package,
    ShoppingCart, Heart, Globe, Navigation, MessageCircle, AtSign,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnShopCard, BnSectionTitle, BnEmpty, shopLocationText } from "./bn-cards";
import { BnBackButton } from "./bn-back-button";
import { BnReviews } from "./bn-reviews";
import { BnMapView } from "./bn-map-view";
import type { BnMarketDTO, BnProductDTO, BnShopDTO } from "@/lib/bn-data";

// ── Bozor sahifasi ──────────────────────────────────────────────────────────

export interface BnMarketPageDTO {
    slug: string;
    name: string;
    coverUrl: string;
    address: string;
    workHours: string;
    shopCount: number;
    sections: string[];
    lat?: number | null;
    lng?: number | null;
}

export function BnMarketPage({
    market, shops, products,
}: { market: BnMarketPageDTO; shops: BnShopDTO[]; products: BnProductDTO[] }) {
    const m = market;

    return (
        <div className="pb-16">
            {/* Muqova */}
            <div className="relative h-[220px] sm:h-[300px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.coverUrl} alt={m.name} className="w-full h-full object-cover" />
                <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(to top, ${BN.bg} 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)` }}
                />
                <div className="absolute inset-x-0 top-4 pointer-events-none">
                    <div className="mx-auto max-w-[1280px] px-4 pointer-events-auto">
                        <BnBackButton fallbackHref="/bozorlar" />
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0">
                    <div className="mx-auto max-w-[1280px] px-4 pb-5">
                        <nav className="flex items-center gap-1.5 text-[12px] mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                            <BnLink href="/" className="hover:opacity-70 transition-colors">Bosh sahifa</BnLink>
                            <ChevronRight className="w-3 h-3" />
                            <BnLink href="/bozorlar" className="hover:opacity-70 transition-colors">Bozorlar</BnLink>
                        </nav>
                        <h1 className="text-[26px] sm:text-[34px] font-black tracking-tight leading-tight">{m.name}</h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1280px] px-4 -mt-1">
                {/* Ma'lumot */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    <Info icon={<MapPin className="w-4 h-4" />} label="Manzil" value={m.address} />
                    <Info icon={<Clock className="w-4 h-4" />} label="Ish vaqti" value={m.workHours} />
                    <Info icon={<Store className="w-4 h-4" />} label="Do'konlar" value={`${m.shopCount} ta`} />
                </div>

                {/* Bo'limlar */}
                {m.lat != null && m.lng != null && (
                    <section className="mb-8">
                        <BnSectionTitle title="Xarita" subtitle="Bozor joylashuvi" />
                        <BnMapView lat={m.lat} lng={m.lng} label={m.name} height={260} />
                    </section>
                )}

                {m.sections.length > 0 && (
                    <section className="mb-8">
                        <BnSectionTitle title="Bo'limlar" />
                        <div className="flex flex-wrap gap-2">
                            {m.sections.map(s => (
                                <span
                                    key={s}
                                    className="px-3.5 py-2 rounded-xl text-[13px] font-bold"
                                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Do'konlar */}
                <section className="mb-8">
                    <BnSectionTitle title="Bu bozordagi do'konlar" subtitle={`${shops.length} ta do'kon onlaynda`} />
                    {shops.length === 0 ? (
                        <BnEmpty icon={<Store className="w-6 h-6" />} title="Hali do'kon yo'q"
                            text="Bu bozordan birinchi bo'lib siz chiqing." />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {shops.map(s => <BnShopCard key={s.id} s={s} />)}
                        </div>
                    )}
                </section>

                {/* Mahsulotlar */}
                {products.length > 0 && (
                    <section>
                        <BnSectionTitle title="Bu bozordagi mahsulotlar" />
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {products.map(p => <BnProductCard key={p.id} p={p} compact />)}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

// ── Do'kon sahifasi ─────────────────────────────────────────────────────────

export function BnShopPage({
    shop, products,
}: { shop: BnShopDTO; products: BnProductDTO[] }) {
    const s = shop;
    const tier = TIER_META[s.tier];
    const hasMap = s.lat != null && s.lng != null;

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <BnBackButton className="mb-4" fallbackHref="/dokonlar" />
            <nav className="flex items-center gap-1.5 text-[12px] mb-5" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70 transition-colors">Bosh sahifa</BnLink>
                <ChevronRight className="w-3 h-3" />
                <BnLink href="/dokonlar" className="hover:opacity-70 transition-colors">Do&apos;konlar</BnLink>
            </nav>

            {/* Shapka */}
            <div
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl mb-8"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <div
                    className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 grid place-items-center"
                    style={{ background: BN.surfaceUp }}
                >
                    {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Store className="w-8 h-8" style={{ color: BN.text3 }} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h1 className="text-[22px] font-black tracking-tight">{s.name}</h1>
                        {s.tier !== "NEW" && (
                            <span
                                className="px-2 py-1 rounded-lg text-[10.5px] font-black leading-none"
                                style={{ background: `${tier.color}1F`, color: tier.color }}
                            >
                                {tier.label}
                            </span>
                        )}
                    </div>

                    <p className="flex items-center gap-1.5 text-[13px] mb-2" style={{ color: BN.text2 }}>
                        {s.locationType === "IN_MARKET"
                            ? <Store className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                            : s.locationType === "STANDALONE"
                                ? <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                                : <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />}
                        {shopLocationText(s)}
                    </p>

                    <div className="flex items-center gap-4 text-[12.5px] flex-wrap" style={{ color: BN.text3 }}>
                        <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />{s.productCount} mahsulot
                        </span>
                        {s.ratingCount > 0 && (
                            <span className="flex items-center gap-1" style={{ color: BN.gold }}>
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {s.rating.toFixed(1)} ({s.ratingCount})
                            </span>
                        )}
                        {s.ownerUsername && (
                            <a
                                href={`https://forhumo.uz/uz/nexus/u/${s.ownerUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 transition-colors hover:text-[color:var(--bn-gold)]"
                                aria-label="Nexus profilga o'tish"
                            >
                                <AtSign className="w-3.5 h-3.5" />
                                {s.ownerUsername}
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    {s.ownerUsername && (
                        <a
                            href={`https://forhumo.uz/uz/nexus?dm=${s.ownerUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 flex-1 sm:w-[180px] h-11 rounded-xl text-[13.5px] font-bold"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Yozishish
                        </a>
                    )}
                    <button
                        className="flex items-center justify-center gap-2 flex-1 sm:w-[180px] h-11 rounded-xl text-[13.5px] font-bold"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                    >
                        <Phone className="w-4 h-4" />
                        Qo&apos;ng&apos;iroq
                    </button>
                    {s.locationType === "IN_MARKET" && (
                        <button
                            className="flex items-center justify-center gap-2 flex-1 sm:w-[180px] h-11 rounded-xl text-[13.5px] font-bold"
                            style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}`, color: BN.gold }}
                        >
                            <Navigation className="w-4 h-4" />
                            Yo&apos;lni ko&apos;rsatish
                        </button>
                    )}
                </div>
            </div>

            {/* Mahsulotlar */}
            <BnSectionTitle title="Mahsulotlar" subtitle={`${products.length} ta`} />
            {products.length === 0 ? (
                <BnEmpty title="Hali mahsulot yo'q" text="Bu do'kon hozircha mahsulot qo'shmagan." />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {products.map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            )}

            {/* Xarita — STANDALONE/IN_MARKET do'kon uchun */}
            {hasMap && (
                <section className="mt-10">
                    <BnSectionTitle title="Xarita" subtitle="Do'konga borish uchun" />
                    <BnMapView lat={s.lat!} lng={s.lng!} label={s.name} height={240} />
                    <div className="mt-3 flex">
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                            target="_blank" rel="noopener"
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-black transition-transform active:scale-[0.97]"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            <Navigation className="w-4 h-4" />
                            Route ochish
                        </a>
                    </div>
                </section>
            )}

            {/* Sharhlar */}
            <BnReviews kind="shop" slug={s.slug} />
        </div>
    );
}

// ── Do'konlar ro'yxati ──────────────────────────────────────────────────────

export function BnShopsList({ shops }: { shops: BnShopDTO[] }) {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-2">Do&apos;konlar</h1>
            <p className="text-[13.5px] mb-6 max-w-[600px] leading-relaxed" style={{ color: BN.text2 }}>
                Bozordagi do&apos;konlar, ko&apos;chadagi do&apos;konlar va onlayn sotuvchilar — hammasi bir ro&apos;yxatda.
            </p>
            {shops.length === 0 ? (
                <BnEmpty icon={<Store className="w-6 h-6" />} title="Hozircha do'kon yo'q" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {shops.map(s => <BnShopCard key={s.id} s={s} />)}
                </div>
            )}
        </div>
    );
}

// ── Savat (FAZA 5 da real bo'ladi) ──────────────────────────────────────────

export function BnCartPage() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">Savat</h1>
            <BnEmpty
                icon={<ShoppingCart className="w-6 h-6" />}
                title="Savat bo'sh"
                text="Yoqqan mahsulotni savatga qo'shing — keyin bir marta buyurtma berasiz."
                action={
                    <BnLink
                        href="/"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Xaridni boshlash
                    </BnLink>
                }
            />
        </div>
    );
}

// ── Sevimlilar ──────────────────────────────────────────────────────────────

export function BnFavoritesPage() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">Sevimlilar</h1>
            <BnEmpty
                icon={<Heart className="w-6 h-6" />}
                title="Hali saqlangan mahsulot yo'q"
                text="Mahsulot sahifasida yurak belgisini bosing — bu yerda to'planadi."
                action={
                    <BnLink
                        href="/"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Mahsulotlarni ko&apos;rish
                    </BnLink>
                }
            />
        </div>
    );
}

// ── Buyurtmalarim ───────────────────────────────────────────────────────────

export function BnOrdersPage() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">Buyurtmalarim</h1>
            <BnEmpty
                icon={<Package className="w-6 h-6" />}
                title="Hali buyurtma yo'q"
                text="Birinchi buyurtmangizni bergach, holati shu yerda kuzatiladi."
                action={
                    <BnLink
                        href="/"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Xarid qilish
                    </BnLink>
                }
            />
        </div>
    );
}

// ── Yordamchilar ────────────────────────────────────────────────────────────

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            <span
                className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                style={{ background: BN.goldSoft, color: BN.gold }}
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider font-black" style={{ color: BN.text3 }}>
                    {label}
                </span>
                <span className="block text-[13.5px] font-bold mt-0.5 leading-snug">{value}</span>
            </span>
        </div>
    );
}
