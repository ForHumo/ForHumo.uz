"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    Search, Store, Car, Smartphone, Shirt, Sofa, Hammer, ShoppingBasket,
    Baby, Dumbbell, Sparkles, Wrench, ArrowRight, TrendingDown, Eye, Shield,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnMarketCard, BnSectionTitle, BnShopCard } from "./bn-cards";
import { MOCK_CATEGORIES, MOCK_MARKETS, MOCK_PRODUCTS, MOCK_SHOPS } from "@/lib/bn-mock";

const CAT_ICONS: Record<string, React.ReactNode> = {
    Car:            <Car className="w-6 h-6" />,
    Smartphone:     <Smartphone className="w-6 h-6" />,
    Shirt:          <Shirt className="w-6 h-6" />,
    Sofa:           <Sofa className="w-6 h-6" />,
    Hammer:         <Hammer className="w-6 h-6" />,
    ShoppingBasket: <ShoppingBasket className="w-6 h-6" />,
    Baby:           <Baby className="w-6 h-6" />,
    Dumbbell:       <Dumbbell className="w-6 h-6" />,
    Sparkles:       <Sparkles className="w-6 h-6" />,
    Wrench:         <Wrench className="w-6 h-6" />,
};

const QUICK = ["Nexia tormoz", "iPhone", "Damas radiator", "Kir yuvish mashinasi", "Divan"];

export function BnHome() {
    const router = useRouter();
    const [q, setQ] = useState("");

    function go(e: React.FormEvent) {
        e.preventDefault();
        const t = q.trim();
        router.push(t ? `/bn/qidiruv?q=${encodeURIComponent(t)}` : "/bn/qidiruv");
    }

    const cheap = MOCK_PRODUCTS
        .filter(p => p.marketAvgPrice && p.price < p.marketAvgPrice)
        .sort((a, b) =>
            (a.price / (a.marketAvgPrice || 1)) - (b.price / (b.marketAvgPrice || 1)))
        .slice(0, 6);

    const latest = MOCK_PRODUCTS.slice(0, 12);

    return (
        <div className="pb-16">
            {/* ── Hero ── */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 70% 60% at 50% -10%, rgba(245,179,1,0.13) 0%, transparent 70%)" }}
                />
                <div className="relative mx-auto max-w-[1280px] px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
                    <h1 className="text-[30px] sm:text-[44px] font-black tracking-tight leading-[1.08] text-center max-w-[720px] mx-auto">
                        Bozorlar va do&apos;konlar —{" "}
                        <span style={{ color: BN.gold }}>bitta joyda</span>
                    </h1>
                    <p
                        className="text-[14px] sm:text-[16px] text-center mt-4 max-w-[560px] mx-auto leading-relaxed"
                        style={{ color: BN.text2 }}
                    >
                        Har mahsulot narxi bozor o&apos;rtachasi bilan solishtiriladi.
                        Ko&apos;rib olishni xohlasangiz — band qiling, borib ko&apos;ring, keyin to&apos;lang.
                    </p>

                    <form onSubmit={go} className="mt-7 max-w-[620px] mx-auto">
                        <div className="relative">
                            <Search
                                className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                                style={{ color: BN.text3 }}
                            />
                            <input
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Mahsulot, do'kon yoki bozor qidiring..."
                                className="w-full h-14 rounded-2xl pl-13 pr-32 text-[15px] outline-none transition-shadow focus:shadow-lg"
                                style={{
                                    paddingLeft: 52,
                                    background: BN.surface,
                                    border: `1px solid ${BN.borderGold}`,
                                    color: BN.text,
                                    caretColor: BN.gold,
                                }}
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 h-10 px-5 rounded-xl text-[14px] font-black transition-transform active:scale-95"
                                style={{ background: BN.gold, color: "#0A0A0A" }}
                            >
                                Qidirish
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {QUICK.map(k => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => router.push(`/bn/qidiruv?q=${encodeURIComponent(k)}`)}
                                    className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors hover:text-white"
                                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </form>

                    {/* Farqlovchi 3 ta va'da */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-[880px] mx-auto">
                        <Promise
                            icon={<TrendingDown className="w-[18px] h-[18px]" />}
                            title="Bozor narxi ko'rinadi"
                            text="Bu do'kon arzonmi yoki qimmatmi — darrov bilasiz"
                        />
                        <Promise
                            icon={<Eye className="w-[18px] h-[18px]" />}
                            title="Ko'rib sotib olish"
                            text="24 soat band qilamiz, bozorga borib ko'rasiz"
                        />
                        <Promise
                            icon={<Shield className="w-[18px] h-[18px]" />}
                            title="Pul kafolat ostida"
                            text="Qabul qilmaguningizcha sotuvchiga o'tmaydi"
                        />
                    </div>
                </div>
            </section>

            {/* ── Kategoriyalar ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <BnSectionTitle title="Kategoriyalar" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {MOCK_CATEGORIES.map(c => (
                        <Link
                            key={c.slug}
                            href={`/bn/k/${c.slug}`}
                            className="group flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <span
                                className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 transition-colors"
                                style={{ background: BN.goldSoft, color: BN.gold }}
                            >
                                {CAT_ICONS[c.icon] ?? <Store className="w-6 h-6" />}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[13.5px] font-bold leading-tight truncate transition-colors group-hover:text-[#F5B301]">
                                    {c.name}
                                </span>
                                <span className="block text-[11px] mt-0.5" style={{ color: BN.text3 }}>
                                    {c.productCount.toLocaleString("uz-UZ")} ta
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Bozor narxidan arzon ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <BnSectionTitle
                    title="Bozor narxidan arzon"
                    subtitle="Bozordagi o'rtacha narxdan pastda turgan mahsulotlar"
                    href="/bn/qidiruv?sort=cheap"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {cheap.map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            </section>

            {/* ── Bozorlar ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <BnSectionTitle
                    title="Bozorlar"
                    subtitle="Jismoniy bozorlar — borib ko'rish mumkin"
                    href="/bn/bozorlar"
                />
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {MOCK_MARKETS.slice(0, 6).map(m => <BnMarketCard key={m.id} m={m} />)}
                </div>
            </section>

            {/* ── Yangi mahsulotlar ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <BnSectionTitle title="Yangi mahsulotlar" href="/bn/qidiruv" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {latest.map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            </section>

            {/* ── Do'konlar ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <BnSectionTitle title="Ishonchli do'konlar" href="/bn/dokonlar" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {MOCK_SHOPS.slice(0, 6).map(s => <BnShopCard key={s.id} s={s} />)}
                </div>
            </section>

            {/* ── Sotuvchi CTA ── */}
            <section className="mx-auto max-w-[1280px] px-4 py-8">
                <div
                    className="relative overflow-hidden rounded-3xl p-7 sm:p-10"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                >
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(ellipse 60% 100% at 100% 0%, rgba(245,179,1,0.12) 0%, transparent 65%)" }}
                    />
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
                            <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[13px]" style={{ color: BN.text2 }}>
                                <li>YaTT yoki MChJ kerak</li>
                                <li>Humo ID bilan kirasiz</li>
                                <li>Pul ALKH Pay orqali</li>
                            </ul>
                        </div>
                        <Link
                            href="/bn/sotuvchi"
                            className="flex items-center justify-center gap-2 h-13 px-7 rounded-2xl text-[15px] font-black flex-shrink-0 transition-transform active:scale-[0.97]"
                            style={{ height: 52, background: BN.gold, color: "#0A0A0A" }}
                        >
                            <Store className="w-5 h-5" />
                            Sotuvchi bo&apos;lish
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Promise({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
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
                <span className="block text-[13px] font-black leading-tight">{title}</span>
                <span className="block text-[12px] mt-1 leading-snug" style={{ color: BN.text3 }}>{text}</span>
            </span>
        </div>
    );
}
