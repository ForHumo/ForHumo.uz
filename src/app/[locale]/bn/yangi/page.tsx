// BN yangi kelgan mahsulotlar sahifasi — SEO landing + katalog.
// So'nggi 30 kunda qo'shilgan mahsulotlar, yangilikdan boshlab tartiblangan.

import type { Metadata } from "next";
import { BnProductCard } from "@/components/bn/bn-product-card";
import { getMarkets, searchProducts } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "@/components/bn/bn-nav";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    const total = await prisma.bnProduct.count({
        where: {
            isActive: true, hidden: false,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
    }).catch(() => 0);

    const title = locale === "ru"
        ? `Новые товары — Bozor Narxida (${total})`
        : locale === "en"
        ? `New products — Bozor Narxida (${total})`
        : `Yangi mahsulotlar — Bozor Narxida (${total})`;
    const description = locale === "ru"
        ? `${total}+ товаров, добавленных за последние 30 дней. Свежий каталог от продавцов Ташкента.`
        : locale === "en"
        ? `${total}+ products added in the last 30 days. Fresh catalog from Tashkent sellers.`
        : `Oxirgi 30 kun ichida qo'shilgan ${total}+ mahsulot. Toshkent sotuvchilaridan yangi katalog.`;

    return {
        title,
        description,
        alternates: {
            canonical: "https://bozornarxida.uz/yangi",
            languages: {
                uz: "https://bozornarxida.uz/uz/yangi",
                ru: "https://bozornarxida.uz/ru/yangi",
                en: "https://bozornarxida.uz/en/yangi",
            },
        },
        openGraph: {
            title, description,
            url: `https://bozornarxida.uz/${locale}/yangi`,
            siteName: "Bozor Narxida",
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const auth = await getBnAuth();

    const [fresh, markets] = await Promise.all([
        // sort=new — searchProducts createdAt DESC bo'yicha qaytaradi
        searchProducts({ sort: "new", limit: 60, profileId: auth?.profileId ?? null }),
        getMarkets(20),
    ]);

    const heroTitle = locale === "ru" ? "Новые товары" : locale === "en" ? "New products" : "Yangi mahsulotlar";
    const heroSub = locale === "ru"
        ? "Последние 30 дней · свежий каталог от продавцов Ташкента"
        : locale === "en"
        ? "Last 30 days · fresh catalog from Tashkent sellers"
        : "Oxirgi 30 kun · Toshkent sotuvchilaridan yangi katalog";

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6">
            <div
                className="rounded-2xl p-5 mb-6 flex items-start gap-3"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 grid place-items-center"
                    style={{ background: `${BN.gold}22`, color: BN.gold }}
                >
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[22px] font-black tracking-tight">{heroTitle}</h1>
                    <p className="text-[13px] mt-1" style={{ color: BN.text3 }}>{heroSub}</p>
                </div>
                <div className="text-right">
                    <div className="text-[24px] font-black" style={{ color: BN.gold }}>{fresh.length}</div>
                    <div className="text-[10px] uppercase" style={{ color: BN.text3 }}>
                        {locale === "ru" ? "товаров" : locale === "en" ? "items" : "mahsulot"}
                    </div>
                </div>
            </div>

            {fresh.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <p className="text-[14px]" style={{ color: BN.text3 }}>
                        {locale === "ru" ? "Пока нет новых товаров." : locale === "en" ? "No new products yet." : "Hozircha yangi mahsulot yo'q."}
                    </p>
                    <BnLink
                        href="/"
                        className="inline-block mt-3 px-4 py-2 rounded-lg text-[13px] font-bold"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {locale === "ru" ? "Каталог" : locale === "en" ? "Catalog" : "Katalog"}
                    </BnLink>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {fresh.map(p => <BnProductCard key={p.id} p={p} />)}
                    </div>

                    {/* Bozorlar bo'yicha filtr */}
                    {markets.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-[14px] font-black mb-3" style={{ color: BN.text }}>
                                {locale === "ru" ? "Смотрите также по базарам:" : locale === "en" ? "Also browse by bazaars:" : "Bozorlar bo'yicha ham ko'ring:"}
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                                {markets.slice(0, 10).map(m => (
                                    <BnLink
                                        key={m.slug}
                                        href={`/m/${m.slug}`}
                                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                                        style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                                    >
                                        {m.name}
                                    </BnLink>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
