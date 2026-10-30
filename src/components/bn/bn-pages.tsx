"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BnLink } from "./bn-nav";
import {
    Store, MapPin, Clock, Phone, ChevronRight, Package,
    ShoppingCart, Heart, Globe, Navigation, AtSign,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { useBnFormat } from "./bn-format-hook";
import { directionsUrl } from "@/lib/bn-directions";
import { BnProductCard } from "./bn-product-card";
import { BnShopCard, BnSectionTitle, BnEmpty, BnMarketCover, BnShopRating, useShopLocationText } from "./bn-cards";
import { BnBackButton } from "./bn-back-button";
import { BnBuyCta } from "./bn-buy-cta";
import { BnShopFollowButton } from "./bn-shop-follow-button";
import { BnShopChatButton } from "./bn-shop-chat-button";
import { BnSellerCallButton } from "./bn-seller-call-button";
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
    const t = useTranslations("bn.markets");
    const tp = useTranslations("bn.marketPage");
    const tCrumb = useTranslations("bn.breadcrumb");
    // Muqova bo'sh/buzuq bo'lsa — BN fon; foto uchun mo'ljallangan qorong'i qatlam va oq
    // breadcrumb faqat foto ustida (kunduzgi rejimda och fonda ko'rinmay qolardi)
    const [hasCover, setHasCover] = useState(!!m.coverUrl);

    return (
        <div className="pb-16">
            {/* Muqova */}
            <div className="relative h-[220px] sm:h-[300px] overflow-hidden" style={{ background: BN.surfaceUp }}>
                <BnMarketCover
                    src={m.coverUrl}
                    alt={m.name}
                    eager
                    // Mobil'da kichikroq va yuqoriroq — pastdagi breadcrumb/sarlavha bilan to'qnashmasin
                    iconClass="w-14 h-14 -translate-y-8 sm:w-28 sm:h-28 sm:translate-y-0"
                    onFallback={() => setHasCover(false)}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background: hasCover
                            ? `linear-gradient(to top, ${BN.bg} 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)`
                            : `linear-gradient(to top, ${BN.bg} 0%, transparent 65%)`,
                    }}
                />
                <div className="absolute inset-x-0 top-4 pointer-events-none">
                    <div className="mx-auto max-w-[1280px] px-4 pointer-events-auto">
                        <BnBackButton fallbackHref="/bozorlar" />
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0">
                    <div className="mx-auto max-w-[1280px] px-4 pb-5">
                        <nav className="flex items-center gap-1.5 text-[12px] mb-2" style={{ color: hasCover ? "rgba(255,255,255,0.72)" : BN.text3 }}>
                            <BnLink href="/" className="hover:opacity-70 transition-colors">{tCrumb("home")}</BnLink>
                            <ChevronRight className="w-3 h-3" />
                            <BnLink href="/bozorlar" className="hover:opacity-70 transition-colors">{t("title")}</BnLink>
                        </nav>
                        <h1 className="text-[26px] sm:text-[34px] font-black tracking-tight leading-tight">{m.name}</h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1280px] px-4 -mt-1">
                {/* Ma'lumot */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    {/* Manzil / ish vaqti — DB'dagi erkin matn, tarjima qilinmaydi */}
                    <Info icon={<MapPin className="w-4 h-4" />} label={tp("address")} value={m.address} />
                    <Info icon={<Clock className="w-4 h-4" />} label={tp("hours")} value={m.workHours} />
                    {/* Soni — pastdagi ro'yxatning o'zidan (kesh shopCount bilan ziddiyat bo'lmasin) */}
                    <Info icon={<Store className="w-4 h-4" />} label={tp("shops")}
                        value={shops.length > 0 ? t("shopN", { n: shops.length }) : t("shopsSoon")} />
                </div>

                {/* Bo'limlar */}
                {m.lat != null && m.lng != null && (
                    <section className="mb-8">
                        <BnSectionTitle title={tp("mapTitle")} subtitle={tp("mapSub")} />
                        <BnMapView lat={m.lat} lng={m.lng} label={m.name} height={260} />
                    </section>
                )}

                {m.sections.length > 0 && (
                    <section className="mb-8">
                        <BnSectionTitle title={tp("sections")} />
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
                    <BnSectionTitle title={tp("shopsTitle")} subtitle={tp("shopsOnline", { n: shops.length })} />
                    {shops.length === 0 ? (
                        <BnEmpty icon={<Store className="w-6 h-6" />} title={tp("emptyTitle")}
                            text={tp("emptyText")} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {shops.map(s => <BnShopCard key={s.id} s={s} />)}
                        </div>
                    )}
                </section>

                {/* Mahsulotlar */}
                {products.length > 0 && (
                    <section>
                        <BnSectionTitle title={tp("productsTitle")} />
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
    const fmt = useBnFormat();
    const tc = useTranslations("bn.shopCard");
    const tp = useTranslations("bn.product");
    const ts = useTranslations("bn.shopPage");
    const tCrumb = useTranslations("bn.breadcrumb");
    const tShops = useTranslations("bn.shops");
    const locText = useShopLocationText();
    const hasMap = s.lat != null && s.lng != null;

    // Yo'nalish — do'kon koordinatasi, bo'lmasa (bozordagi do'kon) bozor koordinatasi.
    // Onlayn do'kon yoki koordinata yo'q bo'lsa tugma chiqmaydi.
    const dirLat = s.lat ?? (s.locationType === "IN_MARKET" ? s.marketLat ?? null : null);
    const dirLng = s.lng ?? (s.locationType === "IN_MARKET" ? s.marketLng ?? null : null);
    const directionsHref = s.locationType !== "ONLINE" && dirLat != null && dirLng != null
        ? directionsUrl(dirLat, dirLng) : null;
    // Qo'ng'iroq — mahsulot sahifasidagi jonli BN qo'ng'iroq (raqam yashirin). Sotuvchi id'si
    // bo'lmasa — faqat TASDIQLANGAN raqamga tel:. Ikkalasi ham yo'q bo'lsa tugma chiqmaydi.
    const telHref = !s.sellerId && s.phoneVerified && s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : null;
    const canCall = !!s.sellerId || !!telHref;
    const ctaCls = "flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[13.5px] font-bold whitespace-nowrap";

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <BnBackButton className="mb-4" fallbackHref="/dokonlar" />
            <nav className="flex items-center gap-1.5 text-[12px] mb-5" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70 transition-colors">{tCrumb("home")}</BnLink>
                <ChevronRight className="w-3 h-3" />
                <BnLink href="/dokonlar" className="hover:opacity-70 transition-colors">{tShops("title")}</BnLink>
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
                                {fmt.tier(s.tier)}
                            </span>
                        )}
                        <BnShopFollowButton shopSlug={s.slug} />
                    </div>

                    <p className="flex items-center gap-1.5 text-[13px] mb-2" style={{ color: BN.text2 }}>
                        {s.locationType === "IN_MARKET"
                            ? <Store className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                            : s.locationType === "STANDALONE"
                                ? <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                                : <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />}
                        {locText(s)}
                    </p>

                    {/* Sonlar — haqiqiy qatorlardan (bn-data): mahsulot = pastdagi ro'yxat, baho = sharhlar */}
                    <div className="flex items-center gap-x-4 gap-y-1.5 text-[12.5px] flex-wrap" style={{ color: BN.text3 }}>
                        {s.productCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Package className="w-3.5 h-3.5" />{tc("productsLabel", { n: s.productCount })}
                            </span>
                        )}
                        <BnShopRating rating={s.rating} ratingCount={s.ratingCount} showCount />
                        {s.ownerUsername && (
                            <a
                                href={`https://forhumo.uz/uz/nexus/u/${s.ownerUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 transition-colors hover:text-[color:var(--bn-gold)]"
                                aria-label={ts("nexusProfileAria")}
                            >
                                <AtSign className="w-3.5 h-3.5" />
                                {s.ownerUsername}
                            </a>
                        )}
                        {/* "Xarid qildim" — ikkinchi darajali amal, matnli havola ko'rinishida */}
                        <BnBuyCta shopSlug={s.slug} shopName={s.name} />
                    </div>
                </div>

                {/* Aloqa: bitta chat (asosiy) + qo'ng'iroq + yo'nalish. Mobil'da chat to'liq
                    kenglikda, qolgan ikkitasi yonma-yon; desktop'da 180px ustun. flex-1 YO'Q —
                    flex-col ichida u h-11 ni bosib, tugmalarni 20px'ga siqib qo'yardi. */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:w-[180px] flex-shrink-0">
                    <div className="col-span-2 [&>button]:w-full [&>button]:h-11 [&>button]:justify-center [&>button]:gap-2 [&>button]:rounded-xl [&>button]:text-[13.5px] [&>button_svg]:w-4 [&>button_svg]:h-4">
                        <BnShopChatButton shopSlug={s.slug} shopName={s.name} triggerLabel={tp("sellerMessage")} />
                    </div>
                    {s.sellerId ? (
                        <BnSellerCallButton
                            sellerId={s.sellerId}
                            shopName={s.name}
                            shopLogo={s.logoUrl}
                            ownerUsername={s.ownerUsername}
                            workHours={s.workHours}
                            className={`w-full ${directionsHref ? "" : "col-span-2"}`}
                        />
                    ) : telHref ? (
                        <a
                            href={telHref}
                            className={`${ctaCls} ${directionsHref ? "" : "col-span-2"}`}
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                        >
                            <Phone className="w-4 h-4" />
                            {tp("sellerCall")}
                        </a>
                    ) : null}
                    {directionsHref && (
                        <a
                            href={directionsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${ctaCls} ${canCall ? "" : "col-span-2"}`}
                            style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}`, color: BN.gold }}
                        >
                            <Navigation className="w-4 h-4" />
                            {tp("showroom.directions")}
                        </a>
                    )}
                </div>
            </div>

            {/* Mahsulotlar */}
            <BnSectionTitle title={ts("productsTitle")} subtitle={fmt.products(products.length)} />
            {products.length === 0 ? (
                <BnEmpty title={ts("emptyTitle")} text={ts("emptyText")} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {products.map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            )}

            {/* Xarita — STANDALONE/IN_MARKET do'kon uchun */}
            {hasMap && (
                <section className="mt-10">
                    <BnSectionTitle title={ts("mapTitle")} subtitle={ts("mapSub")} />
                    <BnMapView lat={s.lat!} lng={s.lng!} label={s.name} height={240} />
                    <div className="mt-3 flex">
                        <a href={directionsUrl(s.lat!, s.lng!)}
                            target="_blank" rel="noopener"
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-black transition-transform active:scale-[0.97]"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            <Navigation className="w-4 h-4" />
                            {ts("openRoute")}
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
