"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import {
    Store, MapPin, Star, ShoppingCart, Eye, Truck, Package, Shield,
    ChevronLeft, ChevronRight, Heart, Share2, Phone, TrendingDown, Info, Globe,
} from "lucide-react";
import {
    BN, fmtPrice, priceRankOf, PRICE_RANK_META, priceDiffLabel, TIER_META,
} from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnSectionTitle, BnEmpty, shopLocationText } from "./bn-cards";
import { mockProductBySlug, mockShopBySlug, MOCK_PRODUCTS, type MockProduct } from "@/lib/bn-mock";

// Atribut kalitlarini o'zbekcha yorliqqa aylantirish (FAZA 2 da kategoriya sxemasidan keladi)
const ATTR_LABELS: Record<string, string> = {
    brand: "Marka", model: "Model", yearFrom: "Yildan", yearTo: "Yilgacha",
    condition: "Holati", origin: "Turi", memory: "Xotira", color: "Rang",
    warranty: "Kafolat", material: "Material", size: "O'lcham", season: "Mavsum",
    length: "Uzunligi (sm)", assembled: "Yig'ilgan", power: "Quvvat (Vt)",
    volume: "Hajmi (L)", weight: "Og'irligi (kg)",
};

export function BnProductDetail({ slug }: { slug: string }) {
    const p = mockProductBySlug(slug);
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [fav, setFav] = useState(false);

    if (!p) {
        return (
            <BnEmpty
                title="Mahsulot topilmadi"
                text="Bu havola eskirgan yoki mahsulot olib tashlangan bo'lishi mumkin."
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

    const shop = mockShopBySlug(p.shopSlug);
    const rank = priceRankOf(p.price, p.marketAvgPrice);
    const rankMeta = rank ? PRICE_RANK_META[rank] : null;
    const diff = priceDiffLabel(p.price, p.marketAvgPrice);
    const similar = MOCK_PRODUCTS.filter(x => x.categorySlug === p.categorySlug && x.id !== p.id).slice(0, 6);
    const tier = shop ? TIER_META[shop.tier] : null;

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            {/* Non-ushoq */}
            <nav className="flex items-center gap-1.5 text-[12px] mb-5 flex-wrap" style={{ color: BN.text3 }}>
                <Link href="/bn" className="hover:text-white transition-colors">Bosh sahifa</Link>
                <ChevronRight className="w-3 h-3" />
                <Link href={`/bn/k/${p.categorySlug}`} className="hover:text-white transition-colors">Kategoriya</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="truncate max-w-[220px]" style={{ color: BN.text2 }}>{p.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6">
                {/* ── Chap: rasm + tafsilot ── */}
                <div className="min-w-0">
                    {/* Galereya */}
                    <div
                        className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={p.images[imgIdx]}
                            alt={p.title}
                            className="w-full h-full object-cover"
                        />
                        {p.images.length > 1 && (
                            <>
                                <GalleryBtn side="left" onClick={() => setImgIdx(i => (i - 1 + p.images.length) % p.images.length)} />
                                <GalleryBtn side="right" onClick={() => setImgIdx(i => (i + 1) % p.images.length)} />
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {p.images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setImgIdx(i)}
                                            aria-label={`Rasm ${i + 1}`}
                                            className="w-1.5 h-1.5 rounded-full transition-all"
                                            style={{
                                                background: i === imgIdx ? BN.gold : "rgba(250,250,250,0.4)",
                                                width: i === imgIdx ? 18 : 6,
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Kichik rasmlar */}
                    {p.images.length > 1 && (
                        <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
                            {p.images.map((src, i) => (
                                <button
                                    key={i}
                                    onClick={() => setImgIdx(i)}
                                    className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all"
                                    style={{
                                        border: `2px solid ${i === imgIdx ? BN.gold : BN.border}`,
                                        opacity: i === imgIdx ? 1 : 0.6,
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tavsif */}
                    <Panel className="mt-5">
                        <h2 className="text-[15px] font-black mb-3">Mahsulot haqida</h2>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            {Object.entries(p.attributes).map(([k, v]) => (
                                <div
                                    key={k}
                                    className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                                    style={{ borderBottom: `1px solid ${BN.border}` }}
                                >
                                    <dt style={{ color: BN.text3 }}>{ATTR_LABELS[k] ?? k}</dt>
                                    <dd className="font-bold text-right">
                                        {typeof v === "boolean" ? (v ? "Ha" : "Yo'q") : String(v)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>

                    {/* Sotuvchi */}
                    {shop && (
                        <Panel className="mt-4">
                            <h2 className="text-[15px] font-black mb-3">Sotuvchi</h2>
                            <Link href={`/bn/d/${shop.slug}`} className="group flex items-center gap-3">
                                <span
                                    className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    {shop.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="w-6 h-6" style={{ color: BN.text3 }} />
                                    )}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="text-[14px] font-black truncate transition-colors group-hover:text-[#F5B301]">
                                            {shop.name}
                                        </span>
                                        {tier && shop.tier !== "NEW" && (
                                            <span
                                                className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black leading-none flex-shrink-0"
                                                style={{ background: `${tier.color}1F`, color: tier.color }}
                                            >
                                                {tier.label}
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-1 text-[12px] mt-1" style={{ color: BN.text3 }}>
                                        {shop.locationType === "IN_MARKET"
                                            ? <Store className="w-3 h-3 flex-shrink-0" />
                                            : shop.locationType === "STANDALONE"
                                                ? <MapPin className="w-3 h-3 flex-shrink-0" />
                                                : <Globe className="w-3 h-3 flex-shrink-0" />}
                                        <span className="truncate">{shopLocationText(shop)}</span>
                                    </span>
                                    {shop.ratingCount > 0 && (
                                        <span className="flex items-center gap-1 text-[12px] mt-1" style={{ color: BN.gold }}>
                                            <Star className="w-3 h-3 fill-current" />
                                            {shop.rating.toFixed(1)}
                                            <span style={{ color: BN.text3 }}>· {shop.ratingCount} baho · {shop.productCount} mahsulot</span>
                                        </span>
                                    )}
                                </span>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                            </Link>

                            <button
                                className="flex items-center justify-center gap-2 w-full h-11 mt-4 rounded-xl text-[14px] font-bold transition-colors"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                            >
                                <Phone className="w-4 h-4" />
                                Sotuvchiga qo&apos;ng&apos;iroq qilish
                            </button>
                        </Panel>
                    )}
                </div>

                {/* ── O'ng: narx va harakat ── */}
                <div className="lg:sticky lg:top-[132px] lg:self-start">
                    <Panel>
                        <h1 className="text-[18px] font-black leading-snug mb-4">{p.title}</h1>

                        {/* Narx */}
                        <div className="flex items-baseline gap-2.5 mb-2">
                            <span className="text-[30px] font-black tabular-nums leading-none">
                                {fmtPrice(p.price)}
                            </span>
                            {p.oldPrice && p.oldPrice > p.price && (
                                <span className="text-[15px] line-through tabular-nums" style={{ color: BN.text3 }}>
                                    {p.oldPrice.toLocaleString("uz-UZ")}
                                </span>
                            )}
                        </div>

                        {/* Bozor narxi bloki — BN ning asosiy va'dasi */}
                        {rankMeta && p.marketAvgPrice && (
                            <div
                                className="flex items-start gap-2.5 p-3 rounded-xl mb-4"
                                style={{ background: rankMeta.soft, border: `1px solid ${rankMeta.color}33` }}
                            >
                                <TrendingDown
                                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                                    style={{ color: rankMeta.color, transform: rank === "expensive" ? "scaleY(-1)" : undefined }}
                                />
                                <div className="min-w-0 text-[12.5px] leading-relaxed">
                                    <p className="font-black" style={{ color: rankMeta.color }}>
                                        {rank === "fair" ? "Bozor narxida" : diff}
                                    </p>
                                    <p style={{ color: BN.text2 }}>
                                        Bozordagi o&apos;rtacha narx:{" "}
                                        <span className="font-bold tabular-nums" style={{ color: BN.text }}>
                                            {p.marketAvgPrice.toLocaleString("uz-UZ")} so&apos;m
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {p.isNegotiable && (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-4" style={{ color: BN.text2 }}>
                                <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                                Sotuvchi bilan narx kelishilishi mumkin
                            </p>
                        )}

                        {/* Miqdor */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[13px]" style={{ color: BN.text2 }}>
                                Omborda: <span className="font-bold" style={{ color: BN.text }}>{p.stock} ta</span>
                            </span>
                            <div
                                className="flex items-center rounded-xl overflow-hidden"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                            >
                                <QtyBtn onClick={() => setQty(v => Math.max(1, v - 1))} disabled={qty <= 1}>−</QtyBtn>
                                <span className="w-10 text-center text-[14px] font-black tabular-nums">{qty}</span>
                                <QtyBtn onClick={() => setQty(v => Math.min(p.stock, v + 1))} disabled={qty >= p.stock}>+</QtyBtn>
                            </div>
                        </div>

                        {/* Asosiy harakatlar */}
                        <button
                            className="flex items-center justify-center gap-2 w-full h-13 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98]"
                            style={{ height: 52, background: BN.gold, color: "#0A0A0A" }}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Savatga qo&apos;shish
                        </button>

                        {p.allowInspect && (
                            <button
                                className="flex items-center justify-center gap-2 w-full h-12 mt-2.5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98]"
                                style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}`, color: BN.gold }}
                            >
                                <Eye className="w-[18px] h-[18px]" />
                                Ko&apos;rib sotib olaman
                            </button>
                        )}

                        <div className="flex gap-2 mt-2.5">
                            <SecondaryBtn onClick={() => setFav(v => !v)}>
                                <Heart className="w-4 h-4" style={{ fill: fav ? BN.err : "none", color: fav ? BN.err : undefined }} />
                                Saqlash
                            </SecondaryBtn>
                            <SecondaryBtn onClick={() => navigator.share?.({ title: p.title, url: location.href })}>
                                <Share2 className="w-4 h-4" />
                                Ulashish
                            </SecondaryBtn>
                        </div>

                        {/* Olish usullari */}
                        <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: `1px solid ${BN.border}` }}>
                            {p.allowPickup && (
                                <Way icon={<Package className="w-4 h-4" />} title="Do'kondan olib ketish" text="Bepul" />
                            )}
                            {p.allowDelivery && (
                                <Way icon={<Truck className="w-4 h-4" />} title="Yetkazib berish" text="Toshkent bo'ylab 20 000 so'm" />
                            )}
                            {p.allowInspect && (
                                <Way
                                    icon={<Eye className="w-4 h-4" />}
                                    title="Ko'rib sotib olish"
                                    text="24 soat band qilamiz — borib ko'rasiz, yoqsa to'laysiz"
                                />
                            )}
                            <Way
                                icon={<Shield className="w-4 h-4" />}
                                title="Pul kafolat ostida"
                                text="Qabul qilmaguningizcha sotuvchiga o'tmaydi"
                            />
                        </div>
                    </Panel>
                </div>
            </div>

            {/* O'xshash mahsulotlar */}
            {similar.length > 0 && (
                <section className="mt-12">
                    <BnSectionTitle title="O'xshash mahsulotlar" subtitle="Narxlarni solishtiring" />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {similar.map((s: MockProduct) => <BnProductCard key={s.id} p={s} compact />)}
                    </div>
                </section>
            )}
        </div>
    );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl p-4 sm:p-5 ${className}`}
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            {children}
        </div>
    );
}

function GalleryBtn({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label={side === "left" ? "Oldingi" : "Keyingi"}
            className="absolute top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full backdrop-blur-sm transition-transform active:scale-90"
            style={{ [side]: 12, background: "rgba(10,10,10,0.65)" } as React.CSSProperties}
        >
            {side === "left" ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
    );
}

function QtyBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-9 h-10 grid place-items-center text-[16px] font-black transition-opacity disabled:opacity-30"
        >
            {children}
        </button>
    );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 flex-1 h-11 rounded-xl text-[13px] font-bold transition-colors"
            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text2 }}
        >
            {children}
        </button>
    );
}

function Way({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="flex-shrink-0 mt-0.5" style={{ color: BN.gold }}>{icon}</span>
            <span className="min-w-0 text-[12.5px] leading-snug">
                <span className="block font-bold">{title}</span>
                <span className="block mt-0.5" style={{ color: BN.text3 }}>{text}</span>
            </span>
        </div>
    );
}
