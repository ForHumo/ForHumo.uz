// BN kategoriya uchun dinamik OG (1200×630).
// URL: /api/og/bn/category/<slug>?l=<uz|ru|en>
// Nima ko'rsatiladi: kategoriya nomi + mahsulot soni + narx diapazoni (min-max).

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { bnCategoryName } from "@/lib/bn-category-names";
import { groupThousands } from "@/lib/bn-theme";
import { OG, OgBrand, clip, fallbackOg, ogHandler, ogLocale, renderOg } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return ogHandler(async () => {
        const { slug } = await params;
        const locale = ogLocale(req);
        const t = await getTranslations({ locale, namespace: "bn" });

        const cat = await prisma.bnCategory.findUnique({
            where: { slug },
            select: { name: true, nameRu: true, id: true,
                children: { where: { isActive: true }, select: { id: true } } },
        }).catch(() => null);

        if (!cat) return fallbackOg(t("tagline"));

        const catIds = [cat.id, ...cat.children.map(c => c.id)];
        const priceAgg = await prisma.bnProduct.aggregate({
            where: { isActive: true, hidden: false, isWholesale: false, categoryId: { in: catIds } },
            _min: { price: true }, _max: { price: true }, _count: { _all: true },
        }).catch(() => ({ _min: { price: null }, _max: { price: null }, _count: { _all: 0 } }));
        // HAQIQIY mahsulot soni (BnCategory.productCount saqlangan qiymat eskiradi)
        const productCount = priceAgg._count._all;

        const currency = t("currency");
        const fmt = (n: number) => `${groupThousands(n)} ${currency}`;
        const minP = priceAgg._min.price;
        const maxP = priceAgg._max.price;
        const priceLine = minP && maxP
            ? (minP === maxP ? fmt(minP) : `${fmt(minP)} — ${fmt(maxP)}`)
            : null;
        const name = bnCategoryName({ slug, name: cat.name, nameRu: cat.nameRu }, locale);

        return renderOg(
            (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex", position: "relative",
                    background: `linear-gradient(135deg, ${OG.bg} 0%, #1A1614 100%)`,
                    color: OG.text, fontFamily: "sans-serif",
                }}>
                    {/* Dekorativ tilla nur */}
                    <div style={{
                        position: "absolute", top: -80, right: -80,
                        width: 400, height: 400, borderRadius: "50%",
                        background: `radial-gradient(circle, ${OG.gold}22 0%, transparent 70%)`,
                    }} />

                    {/* Kontent */}
                    <div style={{
                        position: "relative",
                        display: "flex", flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "56px 64px", flex: 1,
                    }}>
                        <OgBrand />

                        {/* Kategoriya nomi */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{
                                display: "flex",
                                fontSize: 32, fontWeight: 700, color: OG.gold,
                                marginBottom: 12, textTransform: "uppercase", letterSpacing: 2,
                            }}>
                                {t("breadcrumb.category")}
                            </div>
                            <div style={{
                                display: "flex",
                                fontSize: 88, fontWeight: 900,
                                letterSpacing: "-0.02em",
                                lineHeight: 1.02,
                                maxWidth: 1050,
                            }}>
                                {clip(name, 50)}
                            </div>
                        </div>

                        {/* Statistika: mahsulot soni + narx diapazoni */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 48 }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: OG.text3, marginBottom: 4, textTransform: "uppercase" }}>
                                    {t("seo.ogProductsLabel")}
                                </div>
                                <div style={{
                                    display: "flex",
                                    fontSize: 54, fontWeight: 900,
                                    color: OG.gold, letterSpacing: "-0.02em",
                                }}>
                                    {String(productCount)}
                                </div>
                            </div>
                            {priceLine && (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: OG.text3, marginBottom: 4, textTransform: "uppercase" }}>
                                        {t("seo.ogPriceRange")}
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        fontSize: 40, fontWeight: 900,
                                        color: OG.text, letterSpacing: "-0.02em",
                                    }}>
                                        {priceLine}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
            t("tagline"),
        );
    });
}
