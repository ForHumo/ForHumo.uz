"use client";

import { useState, useMemo } from "react";
import {
    Store, MapPin, ArrowRight, ChevronRight, Star, Package,
    TrendingDown, Sparkles, Crown, Loader2, Globe, ShoppingBag,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnHeroSlider } from "./bn-hero-slider";
import { BnLink } from "./bn-nav";
import { shopLocationText } from "./bn-cards";
import { MOCK_MARKETS, MOCK_PRODUCTS, MOCK_SHOPS, type MockProduct } from "@/lib/bn-mock";

const COLS = 5;          // chapdan o'ngga 5 ta
const INITIAL_ROWS = 2;  // tepadan pastga 2 qator
const LOAD_ROWS = 5;     // "Yuklash" har bosishda 5 qator qo'shadi

export function BnHome() {
    // FAZA 1 — mock ro'yxatni ko'paytiramiz (yuklash tugmasini ko'rsatish uchun).
    // Nusxalar turli do'konlarning bir xil mahsulotga qo'ygan narxi sifatida
    // yaratiladi — bu BN ning "bozor narxi" g'oyasini real ko'rsatadi.
    // FAZA 4 da haqiqiy API paginatsiyasi bilan almashtiriladi.
    const pool = useMemo(() => {
        const out: MockProduct[] = [];
        const shops = MOCK_SHOPS;
        for (let r = 0; r < 6; r++) {
            for (let k = 0; k < MOCK_PRODUCTS.length; k++) {
                const p = MOCK_PRODUCTS[k];
                if (r === 0) { out.push(p); continue; }
                const s = shops[(k + r) % shops.length];
                const factor = 0.88 + ((k * 7 + r * 13) % 40) / 100;   // 0.88 – 1.27
                out.push({
                    ...p,
                    id: `${p.id}-r${r}`,
                    slug: p.slug,
                    price: Math.round((p.price * factor) / 1000) * 1000,
                    oldPrice: null,
                    shopSlug: s.slug,
                    shopName: s.name,
                    shopVerified: s.tier === "VERIFIED" || s.tier === "PREMIUM",
                    marketName: s.marketName,
                    district: s.district ?? null,
                    branchName: s.branchName ?? null,
                    stock: 1 + ((k + r * 3) % 9),
                    rating: Math.round((3.8 + ((k * 3 + r * 5) % 12) / 10) * 10) / 10,
                    ratingCount: 4 + ((k * 11 + r * 7) % 60),
                });
            }
        }
        return out;
    }, []);

    const cheap = useMemo(
        () => pool.filter(p => p.marketAvgPrice && p.price < p.marketAvgPrice)
            .sort((a, b) => (a.price / (a.marketAvgPrice || 1)) - (b.price / (b.marketAvgPrice || 1))),
        [pool],
    );
    const fresh = pool;
    const top = useMemo(() => [...pool].sort((a, b) => b.rating - a.rating), [pool]);
    const seasonal = useMemo(
        () => pool.filter(p => ["kiyim", "sport", "uy"].some(k => p.categorySlug.startsWith(k))),
        [pool],
    );

    // AI reytingi bo'yicha TOP 10 do'kon (FAZA 6 da haqiqiy tahlil)
    const topShops = useMemo(
        () => [...MOCK_SHOPS]
            .sort((a, b) => (b.rating * Math.log10(b.ratingCount + 10)) - (a.rating * Math.log10(a.ratingCount + 10)))
            .slice(0, 10),
        [],
    );

    return (
        <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-10">
            {/* ── Reklama slayder (Bozor/Do'kondan TEPADA) ── */}
            <BnHeroSlider />

            {/* ── Ikkita asosiy kirish nuqtasi ── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                <EntryCard
                    href="/bozorlar"
                    icon={<Store className="w-6 h-6" />}
                    title="Bozorlar"
                    text="Jismoniy bozorlar — borib ko'rish mumkin"
                    count={`${MOCK_MARKETS.length} ta bozor`}
                    cover={MOCK_MARKETS[0].coverUrl}
                />
                <EntryCard
                    href="/dokonlar"
                    icon={<ShoppingBag className="w-6 h-6" />}
                    title="Do'konlar"
                    text="Bozordagi, ko'chadagi va onlayn do'konlar"
                    count={`${MOCK_SHOPS.length} ta do'kon`}
                    cover={MOCK_MARKETS[2].coverUrl}
                />
            </section>

            {/* ── TOP 10 ishonchli do'kon ── */}
            <section className="mb-10">
                <SectionHead
                    title="Ishonchli do'konlar"
                    subtitle="Reyting va xaridor faolligiga qarab AI tuzgan TOP 10"
                    href="/dokonlar"
                    hrefLabel="Barchasini ko'rish"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {topShops.map((s, i) => (
                        <BnLink
                            key={s.id}
                            href={`/d/${s.slug}`}
                            className="group flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.99]"
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
                                    <span className="truncate">{shopLocationText(s)}</span>
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

            {/* ── Mahsulot bo'limlari ── */}
            <ProductSection
                title="Bozor narxidan arzon"
                subtitle="Bozordagi o'rtacha narxdan pastda"
                icon={<TrendingDown className="w-[18px] h-[18px]" />}
                items={cheap}
                href="/qidiruv?sort=cheap"
            />
            <ProductSection
                title="Yangi mahsulotlar"
                icon={<Sparkles className="w-[18px] h-[18px]" />}
                items={fresh}
                href="/qidiruv?sort=new"
            />
            <ProductSection
                title="Top mahsulotlar"
                subtitle="Eng yuqori baholangan"
                icon={<Star className="w-[18px] h-[18px]" />}
                items={top}
                href="/qidiruv?sort=rating"
            />
            <ProductSection
                title="Mavsumiy mahsulotlar"
                subtitle="Hozirgi faslga mos"
                icon={<Package className="w-[18px] h-[18px]" />}
                items={seasonal}
                href="/qidiruv?sort=seasonal"
            />

            {/* ── Sotuvchi CTA ── */}
            <section className="mt-4">
                <div
                    className="relative overflow-hidden rounded-3xl p-7 sm:p-10"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                >
                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight mb-3">
                                Do&apos;koningiz bormi? Onlaynga chiqaring
                            </h3>
                            <p className="text-[14px] leading-relaxed max-w-[560px]" style={{ color: BN.text2 }}>
                                Bozordagi do&apos;kon ham, ko&apos;chadagi do&apos;kon ham bo&apos;ladi.
                                Mahsulot rasmini yuklaysiz — Humo AI nomi, tavsifi va narx tavsiyasini o&apos;zi yozadi.
                                Komissiya 5%, naqd savdodan olinmaydi.
                            </p>
                        </div>
                        <BnLink
                            href="/sotuvchi"
                            className="flex items-center justify-center gap-2 px-7 rounded-2xl text-[15px] font-black flex-shrink-0 transition-transform active:scale-[0.97]"
                            style={{ height: 52, background: BN.gold, color: BN.onGold }}
                        >
                            <Store className="w-5 h-5" />
                            Sotuvchi bo&apos;lish
                            <ArrowRight className="w-4 h-4" />
                        </BnLink>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ── Mahsulot bo'limi: 5 ustun × 2 qator, "Yuklash" 5 qatordan qo'shadi ──────

function ProductSection({
    title, subtitle, icon, items, href,
}: {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    items: MockProduct[];
    href: string;
}) {
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
                        Yana yuklash
                    </button>
                </div>
            )}
        </section>
    );
}

// ── Yordamchilar ────────────────────────────────────────────────────────────

function SectionHead({
    title, subtitle, icon, href, hrefLabel = "Barchasi",
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    href?: string;
    hrefLabel?: string;
}) {
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
                    {hrefLabel}
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
            className="group relative overflow-hidden rounded-3xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${BN.border}`, minHeight: 168 }}
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

            <div className="relative h-full flex flex-col justify-between p-5" style={{ minHeight: 168 }}>
                <span
                    className="w-12 h-12 rounded-2xl grid place-items-center"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    {icon}
                </span>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[22px] font-black tracking-tight leading-none">{title}</h2>
                        <ArrowRight
                            className="w-4 h-4 transition-transform group-hover:translate-x-1"
                            style={{ color: BN.gold }}
                        />
                    </div>
                    <p className="text-[13px] leading-snug max-w-[260px]" style={{ color: BN.text2 }}>{text}</p>
                    <p className="text-[11.5px] font-bold mt-2" style={{ color: BN.gold }}>{count}</p>
                </div>
            </div>
        </BnLink>
    );
}
