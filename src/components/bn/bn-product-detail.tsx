"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BnReviews } from "./bn-reviews";
import { BnPriceChart } from "./bn-price-chart";
import { BnBuyBox } from "./bn-buy-box";
import { BnOneClickBuy } from "./bn-one-click-buy";
import { BnMobileActions } from "./bn-mobile-actions";
import { BnInspectHoldModal } from "./bn-inspect-modal";
import {
    Store, MapPin, Star, ShoppingCart, Eye, Truck, Package, Shield, Check,
    ChevronLeft, ChevronRight, Heart, Share2, Phone, TrendingDown, Info, Globe, Loader2, BellRing, MessageCircle,
} from "lucide-react";
import {
    BN, fmtPrice, priceRankOf, PRICE_RANK_META, priceDiffLabel, TIER_META,
} from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnSectionTitle, useShopLocationText } from "./bn-cards";
import type { BnProductDTO, BnShopDTO } from "@/lib/bn-data";

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
    /** Oxirgi 7 kunda sotilgan (ijtimoiy proof — order-item count) */
    soldRecent?: number;
    /** Oxirgi 7 kunda noyob xaridorlar (distinct order.buyerId) */
    buyersRecent?: number;
    /** Oxirgi 7 kunda noyob ko'ruvchilar (VIEW event distinct profileId) */
    viewersRecent?: number;
    /** Xaridor sharh reels (Nexus video tag=bn-review-<productId>) */
    reviewVideos?: ReviewVideo[];
}

export function BnProductDetail({
    product, shop, similar, others, soldRecent = 0, buyersRecent = 0, viewersRecent = 0, reviewVideos = [],
}: Props) {
    const p = product;
    const router = useRouter();
    const { status } = useSession();
    const t = useTranslations("bn.product");
    const tCrumb = useTranslations("bn.breadcrumb");
    const tAttr = useTranslations("bn.attr");
    const locale = useLocale();
    const locText = useShopLocationText();
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [fav, setFav] = useState(false);
    const [cartBusy, setCartBusy] = useState(false);
    const [cartDone, setCartDone] = useState(false);
    const [favBusy, setFavBusy] = useState(false);
    const [inspectHold, setInspectHold] = useState<{ code: string; expiresAt: string; productTitle?: string } | null>(null);
    const [priceWatch, setPriceWatch] = useState(false);
    const [pwBusy, setPwBusy] = useState(false);
    // 18+ tovar — foydalanuvchi tasdiqlagunicha rasm xiralashadi
    const [matureRevealed, setMatureRevealed] = useState(false);
    useEffect(() => {
        if (!p.isMature) { setMatureRevealed(true); return; }
        try {
            if (localStorage.getItem("bn-mature-accepted") === "1") setMatureRevealed(true);
        } catch {}
    }, [p.isMature]);
    function acceptMature() {
        try { localStorage.setItem("bn-mature-accepted", "1"); } catch {}
        setMatureRevealed(true);
    }

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
                setInspectHold({ code: d.code, expiresAt: d.expiresAt, productTitle: p.title });
                router.refresh();
            } else if (d?.error === "already_held" && d?.hold?.code && d?.hold?.expiresAt) {
                setInspectHold({ code: d.hold.code, expiresAt: d.hold.expiresAt, productTitle: p.title });
            } else if (r.status === 401) {
                signIn("google");
            } else {
                alert(d?.error ?? t("holdError"));
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
                <BnLink href="/" className="hover:opacity-70 transition-colors">{tCrumb("home")}</BnLink>
                <ChevronRight className="w-3 h-3" />
                {p.categorySlug && (
                    <>
                        <BnLink href={`/k/${p.categorySlug}`} className="hover:opacity-70 transition-colors">
                            {tCrumb("category")}
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
                            <img
                                src={p.images[imgIdx]}
                                alt={p.title}
                                className="w-full h-full object-cover"
                                style={p.isMature && !matureRevealed ? { filter: "blur(24px)" } : undefined}
                            />
                        ) : (
                            <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                <Package className="w-12 h-12" />
                            </div>
                        )}
                        {p.isMature && !matureRevealed && (
                            <div className="absolute inset-0 grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
                                <div className="max-w-sm text-center">
                                    <span className="inline-block px-3 py-1 rounded-full text-[12px] font-black mb-3" style={{ background: "#ef4444", color: "#fff" }}>{t("matureBadge")}</span>
                                    <p className="text-[15px] font-bold mb-1">{t("matureTitle")}</p>
                                    <p className="text-[13px] mb-4" style={{ color: BN.text2 }}>
                                        {t("matureAsk")}
                                    </p>
                                    <button
                                        onClick={acceptMature}
                                        className="w-full h-11 rounded-xl text-[14px] font-bold"
                                        style={{ background: BN.gold, color: BN.onGold }}
                                    >
                                        {t("matureConfirm")}
                                    </button>
                                </div>
                            </div>
                        )}
                        {p.images.length > 1 && (
                            <>
                                <GalleryBtn side="left" onClick={() => setImgIdx(i => (i - 1 + p.images.length) % p.images.length)} label={t("galleryPrev")} />
                                <GalleryBtn side="right" onClick={() => setImgIdx(i => (i + 1) % p.images.length)} label={t("galleryNext")} />
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {p.images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setImgIdx(i)}
                                            aria-label={t("galleryImageN", { n: i + 1 })}
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
                            <h2 className="text-[15px] font-black mb-3">{t("about")}</h2>
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
                                            <dt style={{ color: BN.text3 }}>{tAttr.has(k) ? tAttr(k) : k}</dt>
                                            <dd className="font-bold text-right">
                                                {typeof v === "boolean" ? (v ? t("yes") : t("no")) : String(v)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </Panel>
                    )}

                    {/* Buy Box — bir xil mahsulot uchun eng arzon+ishonchli sotuvchi */}
                    <BnBuyBox slug={p.slug} />

                    {/* Narx tarixi grafigi — vaqt bo'yicha narx dinamikasi (BN uniqueness) */}
                    <div className="mt-4">
                        <BnPriceChart slug={p.slug} />
                    </div>


                    {/* Boshqa do'konlar — narx solishtirish (BN ning asosiy va'dasi) */}
                    {others.length > 0 && (
                        <Panel className="mt-4">
                            <h2 className="text-[15px] font-black mb-1">{t("othersTitle")}</h2>
                            <p className="text-[12.5px] mb-3" style={{ color: BN.text3 }}>
                                {t("othersSub")}
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
                                                    {t("othersCheaper", { pct: Math.round(((p.price - o.price) / p.price) * 100) })}
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
                            <h2 className="text-[15px] font-black mb-3">{t("seller")}</h2>
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
                                        <span className="truncate">{locText(shop)}</span>
                                    </span>
                                    {shop.ratingCount > 0 && (
                                        <span className="flex items-center gap-1 text-[12px] mt-1" style={{ color: BN.gold }}>
                                            <Star className="w-3 h-3 fill-current" />
                                            {shop.rating.toFixed(1)}
                                            <span style={{ color: BN.text3 }}>· {t("sellerRatings", { n: shop.ratingCount, p: shop.productCount })}</span>
                                        </span>
                                    )}
                                </span>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                            </BnLink>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <button
                                    className="flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-bold transition-colors"
                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                                >
                                    <Phone className="w-4 h-4" />
                                    {t("sellerCall")}
                                </button>
                                {shop.ownerUsername ? (
                                    <a
                                        href={`https://forhumo.uz/${locale}/nexus?dm=${shop.ownerUsername}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-bold transition-colors"
                                        style={{ background: BN.gold, color: BN.onGold }}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        {t("sellerMessage")}
                                    </a>
                                ) : (
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-bold opacity-40"
                                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text3 }}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        {t("sellerMessage")}
                                    </button>
                                )}
                            </div>
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
                                    {p.oldPrice.toLocaleString(locale)}
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
                                        {rank === "fair" ? t("atMarketPrice") : diff}
                                    </p>
                                    <p style={{ color: BN.text2 }}>
                                        {t("marketAvgLabel")}{" "}
                                        <span className="font-bold tabular-nums" style={{ color: BN.text }}>
                                            {p.marketAvgPrice.toLocaleString(locale)} {t("currencySom")}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {p.isNegotiable && (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-4" style={{ color: BN.text2 }}>
                                <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                                {t("negotiableNote")}
                            </p>
                        )}

                        {/* Ijtimoiy proof — prioritet: buyers > sold > viewers.
                            Buyers (noyob xaridorlar) ijtimoiy signal sifatida "N kishi sotib
                            oldi" (item count 5 lekin buyer 1 bo'lsa aldash bo'lardi). */}
                        {buyersRecent >= 3 ? (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: BN.ok }}>
                                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ transform: "scaleY(-1)" }} />
                                <strong className="tabular-nums">{buyersRecent}</strong> {t("buyersRecent")}
                            </p>
                        ) : soldRecent >= 3 ? (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: BN.ok }}>
                                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ transform: "scaleY(-1)" }} />
                                <strong className="tabular-nums">{soldRecent}</strong> {t("soldRecent")}
                            </p>
                        ) : viewersRecent >= 20 ? (
                            <p className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: BN.text2 }}>
                                <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
                                <strong className="tabular-nums">{viewersRecent}</strong> {t("viewersRecent")}
                            </p>
                        ) : null}

                        <button
                            onClick={togglePriceWatch}
                            disabled={pwBusy}
                            className="flex items-center gap-1.5 mb-4 text-[12px] font-bold transition-colors disabled:opacity-60"
                            style={{ color: priceWatch ? BN.gold : BN.text3 }}
                        >
                            <BellRing className="w-3.5 h-3.5" style={{ fill: priceWatch ? BN.gold : "none" }} />
                            {priceWatch ? t("watchOn") : t("watchOff")}
                        </button>

                        {/* Miqdor */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[13px]" style={{ color: BN.text2 }}>
                                {t("stockLabel")} <span className="font-bold" style={{ color: BN.text }}>{p.stock} {t("stockUnit")}</span>
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
                                : cartDone ? <><Check className="w-5 h-5" /> {t("addedToCart")}</>
                                : <><ShoppingCart className="w-5 h-5" /> {t("addToCart")}</>}
                        </button>

                        {/* Bir bosishda sotib olish (express order) */}
                        {p.stock > 0 && (
                            <BnOneClickBuy
                                productId={p.id}
                                qty={qty}
                                disabled={cartBusy}
                                className="mt-2"
                            />
                        )}
                        {cartDone && (
                            <BnLink
                                href="/savat"
                                className="block w-full text-center mt-2 text-[12.5px] font-bold"
                                style={{ color: BN.gold }}
                            >
                                {t("goToCart")}
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
                                {t("inspectAction")}
                            </button>
                        )}

                        <div className="flex gap-2 mt-2.5">
                            <SecondaryBtn onClick={toggleFav} disabled={favBusy}>
                                <Heart className="w-4 h-4" style={{ fill: fav ? BN.err : "none", color: fav ? BN.err : undefined }} />
                                {fav ? t("favSaved") : t("fav")}
                            </SecondaryBtn>
                            <SecondaryBtn onClick={() => navigator.share?.({ title: p.title, url: location.href })}>
                                <Share2 className="w-4 h-4" />
                                {t("share")}
                            </SecondaryBtn>
                            {/* WhatsApp share — deep-link, prefilled matn */}
                            <a href={`https://wa.me/?text=${encodeURIComponent(`${p.title} — ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                                target="_blank" rel="noopener noreferrer"
                                aria-label="WhatsApp'ga yuborish"
                                className="flex items-center justify-center gap-1.5 h-11 px-3 rounded-2xl text-[12.5px] font-bold transition-transform active:scale-[0.97]"
                                style={{ background: "#25D366", color: "#fff" }}>
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        </div>

                        <a
                            href={`https://forhumo.uz/${locale}/nexus?bnProduct=${p.slug}&text=${encodeURIComponent(p.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-11 mt-2.5 rounded-2xl text-[13px] font-bold"
                            style={{ background: "linear-gradient(90deg, #2B3EE8 0%, #00CEC8 100%)", color: "#fff" }}
                        >
                            {t("shareOnNexus")}
                        </a>

                        {/* Olish usullari */}
                        <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: `1px solid ${BN.border}` }}>
                            {p.allowPickup && (
                                <Way icon={<Package className="w-4 h-4" />} title={t("wayPickup")} text={t("wayPickupFree")} />
                            )}
                            {p.allowDelivery && (
                                <Way icon={<Truck className="w-4 h-4" />} title={t("wayDelivery")} text={t("wayDeliveryText")} />
                            )}
                            {p.allowInspect && (
                                <Way
                                    icon={<Eye className="w-4 h-4" />}
                                    title={t("wayInspect")}
                                    text={t("wayInspectText")}
                                />
                            )}
                            <Way
                                icon={<Shield className="w-4 h-4" />}
                                title={t("wayEscrow")}
                                text={t("wayEscrowText")}
                            />
                        </div>
                    </Panel>
                </div>
            </div>

            {/* Xaridor sharh reels (Nexus) */}
            {reviewVideos.length > 0 && (
                <section className="mt-12">
                    <BnSectionTitle title={t("reviewReels")} subtitle={t("reviewReelsSub")} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {reviewVideos.map(v => (
                            <a
                                key={v.id}
                                href={`https://forhumo.uz/${locale}/nexus/v/${v.id}`}
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
                                        {v.views.toLocaleString(locale)} {t("reviewViews")}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* Sharhlar */}
            <BnReviews kind="product" slug={p.slug} />

            {/* O'xshash mahsulotlar */}
            {similar.length > 0 && (
                <section className="mt-12">
                    <BnSectionTitle title={t("similar")} subtitle={t("similarSub")} />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {similar.map(s => <BnProductCard key={s.id} p={s} compact />)}
                    </div>
                </section>
            )}

            {/* Mobile sticky bottom action bar — scroll pastga tushganda ko'rinadi */}
            <BnMobileActions
                productId={p.id}
                price={p.price}
                stock={p.stock}
                onAddToCart={addToCart}
                cartBusy={cartBusy}
            />

            {/* Inspect hold modal — startInspect() muvaffaqiyatli bo'lganda ochiladi */}
            {inspectHold && (
                <BnInspectHoldModal
                    hold={inspectHold}
                    onClose={() => setInspectHold(null)}
                    onCancelled={() => router.refresh()}
                />
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

function GalleryBtn({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
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
