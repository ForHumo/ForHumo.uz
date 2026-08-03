"use client";

import { Link } from "@/i18n/routing";
import {
    Store, MapPin, Clock, Phone, ChevronRight, Star, Package,
    ShoppingCart, Heart, Globe, Navigation,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnShopCard, BnSectionTitle, BnEmpty, shopLocationText } from "./bn-cards";
import {
    MOCK_SHOPS, mockMarketBySlug, mockShopBySlug,
    mockShopsByMarket, mockProductsByShop, MOCK_PRODUCTS,
} from "@/lib/bn-mock";

// ── Bozor sahifasi ──────────────────────────────────────────────────────────

export function BnMarketPage({ slug }: { slug: string }) {
    const m = mockMarketBySlug(slug);
    if (!m) return <NotFound what="Bozor" />;

    const shops = mockShopsByMarket(slug);
    const products = MOCK_PRODUCTS.filter(p => p.marketName === m.name);

    return (
        <div className="pb-16">
            {/* Muqova */}
            <div className="relative h-[220px] sm:h-[300px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.coverUrl} alt={m.name} className="w-full h-full object-cover" />
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.55) 40%, rgba(10,10,10,0.2) 100%)" }}
                />
                <div className="absolute inset-x-0 bottom-0">
                    <div className="mx-auto max-w-[1280px] px-4 pb-5">
                        <nav className="flex items-center gap-1.5 text-[12px] mb-2" style={{ color: "rgba(250,250,250,0.65)" }}>
                            <Link href="/bn" className="hover:text-white transition-colors">Bosh sahifa</Link>
                            <ChevronRight className="w-3 h-3" />
                            <Link href="/bn/bozorlar" className="hover:text-white transition-colors">Bozorlar</Link>
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

export function BnShopPage({ slug }: { slug: string }) {
    const s = mockShopBySlug(slug);
    if (!s) return <NotFound what="Do'kon" />;

    const products = mockProductsByShop(slug);
    const tier = TIER_META[s.tier];

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <nav className="flex items-center gap-1.5 text-[12px] mb-5" style={{ color: BN.text3 }}>
                <Link href="/bn" className="hover:text-white transition-colors">Bosh sahifa</Link>
                <ChevronRight className="w-3 h-3" />
                <Link href="/bn/dokonlar" className="hover:text-white transition-colors">Do&apos;konlar</Link>
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

                    <div className="flex items-center gap-4 text-[12.5px]" style={{ color: BN.text3 }}>
                        <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />{s.productCount} mahsulot
                        </span>
                        {s.ratingCount > 0 && (
                            <span className="flex items-center gap-1" style={{ color: BN.gold }}>
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {s.rating.toFixed(1)} ({s.ratingCount})
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex sm:flex-col gap-2 flex-shrink-0">
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
        </div>
    );
}

// ── Do'konlar ro'yxati ──────────────────────────────────────────────────────

export function BnShopsList() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-2">Do&apos;konlar</h1>
            <p className="text-[13.5px] mb-6 max-w-[600px] leading-relaxed" style={{ color: BN.text2 }}>
                Bozordagi do&apos;konlar, ko&apos;chadagi do&apos;konlar va onlayn sotuvchilar — hammasi bir ro&apos;yxatda.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {MOCK_SHOPS.map(s => <BnShopCard key={s.id} s={s} />)}
            </div>
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
                    <Link
                        href="/bn"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: "#0A0A0A" }}
                    >
                        Xaridni boshlash
                    </Link>
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
                    <Link
                        href="/bn"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: "#0A0A0A" }}
                    >
                        Mahsulotlarni ko&apos;rish
                    </Link>
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
                    <Link
                        href="/bn"
                        className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: "#0A0A0A" }}
                    >
                        Xarid qilish
                    </Link>
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

function NotFound({ what }: { what: string }) {
    return (
        <BnEmpty
            title={`${what} topilmadi`}
            text="Bu havola eskirgan bo'lishi mumkin."
            action={
                <Link
                    href="/bn"
                    className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                    style={{ background: BN.gold, color: "#0A0A0A" }}
                >
                    Bosh sahifaga
                </Link>
            }
        />
    );
}
