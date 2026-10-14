"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { BnLink, useBnHref } from "./bn-nav";
import { bnToast } from "./bn-toast";
import { BnInspectDaysPicker } from "./bn-inspect-days-picker";
import { BnReviews } from "./bn-reviews";
import { BnPriceChart } from "./bn-price-chart";
import { BnBuyBox } from "./bn-buy-box";
import { BnInspectHoldModal } from "./bn-inspect-modal";
import { BnProductReferralCta } from "./bn-product-referral-cta";
import { BnProductShowroom } from "./bn-product-showroom";
import { Eye, ChevronRight, Globe, Car, Hash, Search } from "lucide-react";
import { BN, fmtPrice, groupThousands } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnProductCompareCard } from "./bn-product-compare-card";
import { BnSectionTitle } from "./bn-cards";
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
    /** Avto moslik — bu qism mos keladigan mashinalar */
    fits?: { makeName: string; makeSlug: string; modelName: string; modelSlug: string }[];
    partNumber?: string | null;
    oemNumbers?: string[];
    universalFit?: boolean;
}

export function BnProductDetail({
    product, shop, similar, others, soldRecent = 0, buyersRecent = 0, viewersRecent = 0, reviewVideos = [],
    fits = [], partNumber = null, oemNumbers = [], universalFit = false,
}: Props) {
    const p = product;
    const router = useRouter();
    const { status } = useSession();
    const t = useTranslations("bn.product");
    const tCrumb = useTranslations("bn.breadcrumb");
    const tAttr = useTranslations("bn.attr");
    const locale = useLocale();
    const to = useBnHref();
    // Ulgurji mahsulot bo'lsa boshlang'ich qty = minWholesaleQty (buyer'ni majburiy chegaraga
    // olib boradi, aks holda cart 400 qaytarardi).
    const [qty, setQty] = useState(() => {
        if (p.isWholesale) return Math.max(2, p.minWholesaleQty ?? 2);
        return 1;
    });
    // Joriy narx — ulgurji tier'lariga qarab hisoblanadi.
    const wholesaleTiersSorted = (p.wholesaleTiers ?? []).slice().sort((a, b) => a.minQty - b.minQty);
    const unitPrice = (() => {
        if (!p.isWholesale || wholesaleTiersSorted.length === 0) return p.price;
        let chosen = p.price;
        for (const t of wholesaleTiersSorted) {
            if (qty >= t.minQty) chosen = t.price;
            else break;
        }
        return chosen;
    })();
    const minWholesaleQtyN = p.isWholesale ? Math.max(2, p.minWholesaleQty ?? 2) : 1;
    const [fav, setFav] = useState(false);
    const [cartBusy, setCartBusy] = useState(false);
    const [cartDone, setCartDone] = useState(false);
    const [favBusy, setFavBusy] = useState(false);
    const [inspectHold, setInspectHold] = useState<{ code: string; expiresAt: string; productTitle?: string } | null>(null);
    const [inspectDaysOpen, setInspectDaysOpen] = useState(false);
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

    // "Sotib olish" — tanlangan miqdorni savatga qo'yib, darhol savatga o'tadi
    // (set: true — qayta bosilsa miqdor ikki barobar bo'lib ketmaydi).
    async function buyNow() {
        if (status === "unauthenticated") { signIn("google"); return; }
        setCartBusy(true);
        try {
            const r = await fetch("/api/bn/cart", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id, qty, set: true }),
            });
            if (r.ok) {
                router.push(to("/savat"));
            } else if (r.status === 401) {
                signIn("google");
            } else {
                const d = await r.json().catch(() => null);
                bnToast(d?.message ?? t("holdError"), "error");
            }
        } catch {
            bnToast(t("holdError"), "error");
        } finally { setCartBusy(false); }
    }

    async function shareProduct() {
        const url = typeof location !== "undefined" ? location.href : "";
        try {
            if (navigator.share) { await navigator.share({ title: p.title, url }); return; }
            await navigator.clipboard.writeText(url);
            bnToast(t("showroom.linkCopied"), "success");
        } catch { /* foydalanuvchi bekor qildi */ }
    }

    function startInspect() {
        if (status === "unauthenticated") { signIn("google"); return; }
        // Kun tanlash oynasini ochamiz — foydalanuvchi 1-7 kun tanlaydi
        setInspectDaysOpen(true);
    }

    async function confirmInspect(days: number) {
        setInspectDaysOpen(false);
        setCartBusy(true);
        try {
            const r = await fetch("/api/bn/inspect", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id, qty, holdDays: days }),
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
                bnToast(d?.error ?? t("holdError"), "error");
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
        <div>
            {/* ── Vitrina: media + narx + harakatlar (4 bob) ── */}
            <BnProductShowroom
                product={p}
                shop={shop}
                others={others}
                locale={locale}
                unitPrice={unitPrice}
                qty={qty}
                minQty={minWholesaleQtyN}
                onQtyChange={setQty}
                wholesaleTiers={wholesaleTiersSorted}
                fav={fav}
                favBusy={favBusy}
                onToggleFav={toggleFav}
                onShare={shareProduct}
                priceWatch={priceWatch}
                pwBusy={pwBusy}
                onTogglePriceWatch={togglePriceWatch}
                cartBusy={cartBusy}
                cartDone={cartDone}
                onAddToCart={addToCart}
                onBuyNow={buyNow}
                onStartInspect={startInspect}
                matureRevealed={matureRevealed}
                onAcceptMature={acceptMature}
                soldRecent={soldRecent}
                buyersRecent={buyersRecent}
                viewersRecent={viewersRecent}
            />

            {/* pb-24 (mobil) — navbar ustidagi xarid paneli kontentni yopmasin */}
            <div className="relative z-[1] mx-auto max-w-[1280px] px-4 pt-8 pb-24 lg:pb-16">
                {/* Non-ushoq */}
                <nav aria-label={tCrumb("home")} className="flex items-center gap-1.5 text-[13px] mb-6 flex-wrap" style={{ color: BN.text3 }}>
                    <BnLink href="/" className="hover:opacity-70 transition-colors">{tCrumb("home")}</BnLink>
                    <ChevronRight className="w-3 h-3" />
                    {p.categorySlug && (
                        <>
                            {/* Haqiqiy kategoriya nomi (ru'da nameRu); eski kesh yozuvida bo'lmasa — umumiy yorliq */}
                            <BnLink href={`/k/${p.categorySlug}`} className="hover:opacity-70 transition-colors">
                                {(locale === "ru" && p.categoryNameRu) || p.categoryName || tCrumb("category")}
                            </BnLink>
                            <ChevronRight className="w-3 h-3" />
                        </>
                    )}
                    <span className="truncate max-w-[260px]" style={{ color: BN.text2 }}>{p.title}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <div className="min-w-0 space-y-4">
                        {/* Tavsif + xususiyatlar */}
                        {(p.description || Object.keys(p.attributes).length > 0) && (
                            <Panel>
                                <h2 className="text-[16px] font-black mb-3">{t("about")}</h2>
                                {p.description && (
                                    <p className="text-[14.5px] leading-relaxed mb-3 whitespace-pre-line" style={{ color: BN.text2 }}>
                                        {p.description}
                                    </p>
                                )}
                                {Object.keys(p.attributes).length > 0 && (
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                        {Object.entries(p.attributes).map(([k, v]) => (
                                            <div
                                                key={k}
                                                className="flex items-center justify-between gap-3 py-2.5 text-[14px]"
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

                        {/* Avto moslik — bu qism qaysi mashinalarga to'g'ri keladi */}
                        {(universalFit || fits.length > 0 || partNumber || oemNumbers.length > 0) && (
                            <Panel>
                                <div className="flex items-center gap-2 mb-3">
                                    <Car className="w-4 h-4" style={{ color: BN.gold }} />
                                    <h2 className="text-[16px] font-black">Mashina mosligi</h2>
                                </div>

                                {partNumber && (
                                    <div className="flex items-center justify-between gap-3 py-2.5 text-[14px]" style={{ borderBottom: `1px solid ${BN.border}` }}>
                                        <span className="flex items-center gap-1.5" style={{ color: BN.text3 }}>
                                            <Hash className="w-3.5 h-3.5" /> Qism raqami
                                        </span>
                                        <BnLink
                                            href={`/qidiruv?q=${encodeURIComponent(partNumber)}`}
                                            className="font-black tabular-nums inline-flex items-center gap-1 transition-colors hover:opacity-80"
                                            style={{ color: BN.gold }}
                                            title="Shu raqam bo'yicha boshqa sotuvchilardan qidirish"
                                        >
                                            {partNumber}
                                            <Search className="w-3.5 h-3.5" />
                                        </BnLink>
                                    </div>
                                )}
                                {oemNumbers.length > 0 && (
                                    <div className="flex items-start justify-between gap-3 py-2.5 text-[14px]" style={{ borderBottom: `1px solid ${BN.border}` }}>
                                        <span style={{ color: BN.text3 }}>Analog raqamlar</span>
                                        <span className="font-semibold text-right select-all" style={{ color: BN.text2 }}>{oemNumbers.join(", ")}</span>
                                    </div>
                                )}

                                {universalFit ? (
                                    <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl text-[14px] font-bold"
                                        style={{ background: BN.goldSoft, color: BN.gold }}>
                                        <Globe className="w-4 h-4" /> Universal — barcha mashinaga to'g'ri keladi
                                    </div>
                                ) : fits.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[13px] mb-2" style={{ color: BN.text3 }}>Quyidagi mashinalarga to'g'ri keladi:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {fits.map(f => (
                                                <span
                                                    key={f.modelSlug}
                                                    className="inline-flex items-center h-8 px-3 rounded-full text-[13px] font-bold"
                                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text2 }}
                                                >
                                                    {f.makeName} {f.modelName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        )}

                        {/* Boshqa do'konlar — vitrinada 3 tasi, bu yerda to'liq ro'yxat */}
                        {others.length > 3 && (
                            <Panel>
                                <h2 className="text-[16px] font-black mb-1">{t("othersTitle")}</h2>
                                <p className="text-[13px] mb-3" style={{ color: BN.text3 }}>{t("othersSub")}</p>
                                <div className="space-y-2">
                                    {others.map(o => (
                                        <BnLink
                                            key={o.id}
                                            href={o.shopSlug ? `/d/${o.shopSlug}/${o.slug}` : `/p/${o.slug}`}
                                            className="group flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                                        >
                                            <span className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BN.surface }}>
                                                {o.images[0] && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={o.images[0]} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[14px] font-bold truncate transition-colors group-hover:text-[color:var(--bn-gold)]">{o.shopName}</span>
                                                <span className="block text-[12.5px]" style={{ color: BN.text3 }}>{o.marketName ?? o.city}</span>
                                            </span>
                                            <span className="text-right flex-shrink-0">
                                                <span className="block text-[15px] font-black tabular-nums leading-none">{fmtPrice(o.price)}</span>
                                                {o.price < p.price && (
                                                    <span className="block text-[12px] mt-1" style={{ color: BN.ok }}>
                                                        {t("othersCheaper", { pct: Math.round(((p.price - o.price) / p.price) * 100) })}
                                                    </span>
                                                )}
                                            </span>
                                        </BnLink>
                                    ))}
                                </div>
                            </Panel>
                        )}
                    </div>

                    <div className="min-w-0 space-y-4">
                        {/* Narx tarixi grafigi — vaqt bo'yicha narx dinamikasi (BN uniqueness) */}
                        <BnPriceChart slug={p.slug} />
                        {/* Buy Box — bir xil mahsulot uchun eng arzon+ishonchli sotuvchi */}
                        <BnBuyBox slug={p.slug} />
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
                                        <p className="text-[12px] font-bold text-white line-clamp-2">{v.title}</p>
                                        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                                            {groupThousands(v.views)} {t("reviewViews")}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Sharhlar */}
                <BnReviews kind="product" slug={p.slug} />

                {/* Referral viral loop CTA (M4) */}
                <BnProductReferralCta productSlug={p.slug} productTitle={p.title} />

                {/* O'xshash mahsulotlar */}
                {similar.length > 0 && (
                    <section className="mt-12">
                        <BnSectionTitle title={t("similar")} subtitle={t("similarSub")} />
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {similar.map(s => <BnProductCard key={s.id} p={s} compact />)}
                        </div>
                    </section>
                )}

                {/* Cross-shop narx solishtirish — BN'ning asosiy va'dasi */}
                <BnProductCompareCard productId={p.id} />
            </div>

            {/* Kun tanlash oynasi — band qilishdan oldin (1 kun bepul, keyingi kunlar +3%) */}
            {inspectDaysOpen && (
                <BnInspectDaysPicker
                    productPrice={p.price}
                    onCancel={() => setInspectDaysOpen(false)}
                    onConfirm={days => confirmInspect(days)}
                />
            )}

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
