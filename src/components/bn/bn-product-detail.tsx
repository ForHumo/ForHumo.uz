"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import {
    Store, MapPin, Star, ShoppingCart, Eye, Truck, Package, Shield, Check,
    ChevronLeft, ChevronRight, Heart, Share2, Phone, TrendingDown, Info, Globe, Loader2, BellRing,
} from "lucide-react";
import {
    BN, fmtPrice, priceRankOf, PRICE_RANK_META, priceDiffLabel, TIER_META,
} from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnSectionTitle, shopLocationText } from "./bn-cards";
import type { BnProductDTO, BnShopDTO } from "@/lib/bn-data";

// Atribut kalitlarini o'zbekcha yorliqqa aylantirish (FAZA 6 da kategoriya sxemasidan keladi)
const ATTR_LABELS: Record<string, string> = {
    brand: "Marka", model: "Model", yearFrom: "Yildan", yearTo: "Yilgacha",
    condition: "Holati", origin: "Turi", memory: "Xotira", color: "Rang",
    warranty: "Kafolat", material: "Material", size: "O'lcham", season: "Mavsum",
    length: "Uzunligi (sm)", assembled: "Yig'ilgan", power: "Quvvat (Vt)",
    volume: "Hajmi (L)", weight: "Og'irligi (kg)",
};

interface ReviewVideo {
    id: string;
    title: string;
    thumbUrl: string | null;
    views: number;
}

interface Props {
    product: BnProductDTO;
    shop: BnShopDTO | null;
    similar: BnProductDTO[];
    /** Boshqa do'konlar shu mahsulotni qanday narxda sotmoqda */
    others: BnProductDTO[];
    /** Oxirgi 7 kunda sotilgan (ijtimoiy proof) */
    soldRecent?: number;
    /** Xaridor sharh reels (Nexus video tag=bn-review-<productId>) */
    reviewVideos?: ReviewVideo[];
}

export function BnProductDetail({
    product, shop, similar, others, soldRecent = 0, reviewVideos = [],
}: Props) {
    const p = product;
    const router = useRouter();
    const { status } = useSession();
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [fav, setFav] = useState(false);
    const [cartBusy, setCartBusy] = useState(false);
    const [cartDone, setCartDone] = useState(false);
    const [favBusy, setFavBusy] = useState(false);
    const [priceWatch, setPriceWatch] = useState(false);
    const [pwBusy, setPwBusy] = useState(false);

    const rank = priceRankOf(p.price, p.marketAvgPrice);
    const rankMeta = rank ? PRICE_RANK_META[rank] : null;
    const diff = priceDiffLabel(p.price, p.marketAvgPrice);
    const tier = shop ? TIER_META[shop.tier] : null;

    // Favorit + narx kuzatuv statusini yuklab olamiz (login bo'lsa)
    useEffect(() => {
        if (status !== "authenticated") return;
        let cancelled = false;
        fetch(`/api/bn/favorites?ids=${p.id}`)
            .then(r => r.json())
            .then(d => { if (!cancelled) setFav(!!d?.statuses?.[p.id]); })
            .catch(() => { /* ignore */ });
        fetch(`/api/bn/price-watch?productId=${p.id}`)
            .then(r => r.json())
            .then(d => { if (!cancelled) setPriceWatch(!!d?.watched); })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [status, p.id]);

    async function togglePriceWatch() {
        if (status === "unauthenticated") { signIn("google"); return; }
        setPwBusy(true);
        const prev = priceWatch;
        setPriceWatch(!prev);
        try {
            const r = await fetch("/api/bn/price-watch", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id, targetPct: 10 }),
            });
            const d = await r.json();
            if (!r.ok) setPriceWatch(prev);
            else setPriceWatch(!!d?.watched);
        } catch { setPriceWatch(prev); }
        finally { setPwBusy(false); }
    }

    async function addToCart() {
        if (status === "unauthenticated") { signIn("google"); return; }
        setCartBusy(true);
        try {
            const r = await fetch("/api/bn/cart", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id, qty }),
            });
            if (r.ok) {
                setCartDone(true);
                setTimeout(() => setCartDone(false), 2400);
                router.refresh();  // header savat badge yangilanadi
            } else if (r.status === 401) {
                signIn("google");
            }
        } finally { setCartBusy(false); }
    }

    async function startInspect() {
        if (status === "unauthenticated") { signIn("google"); return; }
        setCartBusy(true);
        try {
            const r = await fetch("/api/bn/inspect", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id, qty }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) {
                const exp = new Date(d.expiresAt).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                alert(`Band qilindi! Kod: ${d.code}\n\nSotuvchiga shu kodni ayting. Muddat: ${exp}gacha.`);
                router.refresh();
            } else if (d?.error === "already_held") {
                alert(`Bu mahsulot allaqachon band qilingan.\nKod: ${d.hold?.code}`);
            } else if (r.status === 401) {
                signIn("google");
            } else {
                alert(d?.error ?? "Xatolik yuz berdi");
            }
        } finally { setCartBusy(false); }
    }

    async function toggleFav() {
        if (status === "unauthenticated") { signIn("google"); return; }
        setFavBusy(true);
        const prev = fav;
        setFav(!prev);   // optimistik
        try {
            const r = await fetch("/api/bn/favorites", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id }),
            });
            if (!r.ok) setFav(prev);   // rollback
            else router.refresh();
        } catch { setFav(prev); }
        finally { setFavBusy(false); }
    }

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <BnBackButton className="mb-4" />
            {/* Non-ushoq */}
            <nav className="flex items-center gap-1.5 text-[12px] mb-5 flex-wrap" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70 transition-colors">Bosh sahifa</BnLink>
                <ChevronRight className="w-3 h-3" />
                {p.categorySlug && (
                    <>
                        <BnLink href={`/k/${p.categorySlug}`} className="hover:opacity-70 transition-colors">
                            Kategoriya
                        </BnLink>
                        <ChevronRight className="w-3 h-3" />
                    </>
                )}
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
                        {p.images[imgIdx] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[imgIdx]} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                <Package className="w-12 h-12" />
                            </div>
                        )}
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
                    {(p.description || Object.keys(p.attributes).length > 0) && (
                        <Panel className="mt-5">
                            <h2 className="text-[15px] font-black mb-3">Mahsulot haqida</h2>
                            {p.description && (
                                <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: BN.text2 }}>
                                    {p.description}
                                </p>
                            )}
                            {Object.keys(p.attributes).length > 0 && (
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
                            )}
                        </Panel>
                    )}

                    {/* Boshqa do'konlar — narx solishtirish (BN ning asosiy va'dasi) */}
                    {others.length > 0 && (
                        <Panel className="mt-4">
                            <h2 className="text-[15px] font-black mb-1">Bu mahsulotni boshqa do&apos;konlarda</h2>
                            <p className="text-[12.5px] mb-3" style={{ color: BN.text3 }}>
                                Bir xil mahsulot, turli narxda. Yaxshisini tanlang.
                            </p>
                            <div className="space-y-2">
                                {others.map(o => (
                                    <BnLink
                                        key={o.id}
                                        href={`/p/${o.slug}`}
                                        className="group flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                                    >
                                        <span
                                            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                                            style={{ background: BN.surface }}
                                        >
                                            {o.images[0] && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={o.images[0]} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-[13px] font-bold truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                                                {o.shopName}
                                            </span>
                                            <span className="block text-[11.5px]" style={{ color: BN.text3 }}>
                                                {o.marketName ?? o.city}
                                            </span>
                                        </span>
                                        <span className="text-right flex-shrink-0">
                                            <span className="block text-[15px] font-black tabular-nums leading-none">
                                                {fmtPrice(o.price)}
                                            </span>
                                            {o.price < p.price && (
                                                <span className="block text-[10.5px] mt-1" style={{ color: BN.ok }}>
                                                    {Math.round(((p.price - o.price) / p.price) * 100)}% arzon
                                                </span>
                                            )}
                                        </span>
                                    </BnLink>
                                ))}
                            </div>
                        </Panel>
                    )}

                    {/* Sotuvchi */}
                    {shop && (
                        <Panel className="mt-4">
                            <h2 className="text-[15px] font-black mb-3">Sotuvchi</h2>
                            <BnLink href={`/d/${shop.slug}`} className="group flex items-center gap-3">
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
                                        <span className="text-[14px] font-black truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
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
                            </BnLink>

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

                        {soldRecent >= 3 && (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: BN.ok }}>
                                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ transform: "scaleY(-1)" }} />
                                <strong className="tabular-nums">{soldRecent}</strong> ta bu haftada sotildi
                            </p>
                        )}

                        <button
                            onClick={togglePriceWatch}
                            disabled={pwBusy}
                            className="flex items-center gap-1.5 mb-4 text-[12px] font-bold transition-colors disabled:opacity-60"
                            style={{ color: priceWatch ? BN.gold : BN.text3 }}
                        >
                            <BellRing className="w-3.5 h-3.5" style={{ fill: priceWatch ? BN.gold : "none" }} />
                            {priceWatch ? "Narx tushsa xabar berilyapti" : "Narx tushsa xabar bering"}
                        </button>

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
                            onClick={addToCart}
                            disabled={cartBusy || p.stock < 1}
                            className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98] disabled:opacity-60"
                            style={{ height: 52, background: cartDone ? BN.ok : BN.gold, color: BN.onGold }}
                        >
                            {cartBusy ? <Loader2 className="w-5 h-5 animate-spin" />
                                : cartDone ? <><Check className="w-5 h-5" /> Savatga qo&apos;shildi</>
                                : <><ShoppingCart className="w-5 h-5" /> Savatga qo&apos;shish</>}
                        </button>
                        {cartDone && (
                            <BnLink
                                href="/savat"
                                className="block w-full text-center mt-2 text-[12.5px] font-bold"
                                style={{ color: BN.gold }}
                            >
                                Savatga o&apos;tish →
                            </BnLink>
                        )}

                        {p.allowInspect && (
                            <button
                                onClick={startInspect}
                                disabled={cartBusy}
                                className="flex items-center justify-center gap-2 w-full h-12 mt-2.5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98] disabled:opacity-60"
                                style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}`, color: BN.gold }}
                            >
                                <Eye className="w-[18px] h-[18px]" />
                                Ko&apos;rib sotib olaman (24 soat band)
                            </button>
                        )}

                        <div className="flex gap-2 mt-2.5">
                            <SecondaryBtn onClick={toggleFav} disabled={favBusy}>
                                <Heart className="w-4 h-4" style={{ fill: fav ? BN.err : "none", color: fav ? BN.err : undefined }} />
                                {fav ? "Saqlangan" : "Saqlash"}
                            </SecondaryBtn>
                            <SecondaryBtn onClick={() => navigator.share?.({ title: p.title, url: location.href })}>
                                <Share2 className="w-4 h-4" />
                                Ulashish
                            </SecondaryBtn>
                        </div>

                        <a
                            href={`https://forhumo.uz/uz/nexus?bnProduct=${p.slug}&text=${encodeURIComponent(p.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-11 mt-2.5 rounded-2xl text-[13px] font-bold"
                            style={{ background: "linear-gradient(90deg, #2B3EE8 0%, #00CEC8 100%)", color: "#fff" }}
                        >
                            Nexus&apos;da ulash
                        </a>

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

            {/* Xaridor sharh reels (Nexus) */}
            {reviewVideos.length > 0 && (
                <section className="mt-12">
                    <BnSectionTitle title="Xaridorlar ko'rgan" subtitle="Bu mahsulotni sotib olganlar Nexus'da qoldirgan reels" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {reviewVideos.map(v => (
                            <a
                                key={v.id}
                                href={`https://forhumo.uz/uz/nexus/v/${v.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative aspect-[9/16] rounded-2xl overflow-hidden group"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                {v.thumbUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                        <Eye className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                                    <p className="text-[11px] font-bold text-white line-clamp-2">{v.title}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                                        {v.views.toLocaleString("uz-UZ")} ko&apos;rildi
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* O'xshash mahsulotlar */}
            {similar.length > 0 && (
                <section className="mt-12">
                    <BnSectionTitle title="O'xshash mahsulotlar" subtitle="Narxlarni solishtiring" />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {similar.map(s => <BnProductCard key={s.id} p={s} compact />)}
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
            style={{ [side]: 12, background: BN.glass } as React.CSSProperties}
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

function SecondaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 flex-1 h-11 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60"
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
