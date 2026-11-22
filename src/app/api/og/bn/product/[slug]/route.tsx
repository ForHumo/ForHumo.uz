// BN mahsulot uchun dinamik OG share preview (1200×630).
// Telegram/Instagram/Facebook'da link ulashilganda katta rasm sifatida ko'rinadi.
//
// URL: /api/og/bn/product/<slug>?l=<uz|ru|en>
// Har product/page.tsx metadata.openGraph.images shunga yo'naltiradi.

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { groupThousands } from "@/lib/bn-theme";
import { bnCity } from "@/lib/bn-seo";
import { OG, OgBrand, clip, fallbackOg, ogHandler, ogImageSrc, ogLocale, renderOg } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;   // 1 soat

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return ogHandler(async () => {
        const { slug } = await params;
        const locale = ogLocale(req);
        const t = await getTranslations({ locale, namespace: "bn" });

        const product = await prisma.bnProduct.findUnique({
            where: { slug },
            select: {
                title: true,
                price: true,
                marketAvgPrice: true,
                images: true,
                isActive: true,
                hidden: true,
                shop: {
                    select: {
                        name: true, city: true,
                        market: { select: { name: true, nameRu: true } },
                    },
                },
            },
        }).catch(() => null);

        // Yashirin/o'chirilgan mahsulot preview'da ko'rinmasin
        if (!product || !product.isActive || product.hidden) return fallbackOg(t("tagline"));

        // Vitrina bilan bir xil: o'rtacha narxdan >60% farq — ishonchsiz, chegirma ko'rsatilmaydi
        const avg = product.marketAvgPrice;
        const plausible = !!avg && avg > 0 && product.price > 0 && Math.abs(product.price - avg) / avg <= 0.6;
        const savedPct = plausible && avg && product.price < avg
            ? Math.round(((avg - product.price) / avg) * 100)
            : null;
        const cheap = savedPct != null && savedPct > 0;
        const shop = product.shop;
        const marketName = shop?.market ? (locale === "ru" && shop.market.nameRu ? shop.market.nameRu : shop.market.name) : null;
        const location = marketName || (shop?.city ? bnCity(shop.city, locale) : null);
        const shopLine = shop ? [shop.name, location].filter(Boolean).join(" · ") : null;
        const currency = t("currency");
        const image = await ogImageSrc(product.images?.[0] ?? null);

        return renderOg(
            (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex",
                    background: `linear-gradient(135deg, ${OG.bg} 0%, ${OG.surface} 100%)`,
                    color: OG.text,
                    fontFamily: "sans-serif",
                    padding: "56px 64px",
                    position: "relative",
                }}>
                    {/* Chap: rasm (yuklanmasa — BN monogramma) */}
                    {image ? (
                        <div style={{
                            width: 480,
                            height: 480,
                            borderRadius: 32,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#0A0A0A",
                            border: `1px solid ${OG.gold}22`,
                            flexShrink: 0,
                        }}>
                            <img src={image} alt="" width={480} height={480} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                        </div>
                    ) : (
                        <div style={{
                            width: 480, height: 480, borderRadius: 32,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: OG.surface, color: OG.text3, fontSize: 80,
                            flexShrink: 0,
                        }}>
                            BN
                        </div>
                    )}

                    {/* O'ng: matn */}
                    <div style={{
                        display: "flex", flexDirection: "column",
                        marginLeft: 48, flex: 1, minWidth: 0,
                        justifyContent: "space-between",
                    }}>
                        <OgBrand />

                        {/* Sarlavha */}
                        <div style={{
                            display: "flex", flexDirection: "column",
                            marginTop: 24,
                        }}>
                            <div style={{
                                display: "flex",
                                fontSize: 44,
                                fontWeight: 900,
                                lineHeight: 1.15,
                                letterSpacing: "-0.02em",
                                maxHeight: 202,
                                overflow: "hidden",
                            }}>
                                {clip(product.title, 90)}
                            </div>
                            {shopLine && (
                                <div style={{ display: "flex", fontSize: 22, marginTop: 16, color: OG.text2 }}>
                                    {shopLine}
                                </div>
                            )}
                        </div>

                        {/* Narx bloki */}
                        <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                                <div style={{
                                    display: "flex",
                                    fontSize: 68, fontWeight: 900,
                                    color: cheap ? OG.ok : OG.gold,
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1,
                                }}>
                                    {groupThousands(product.price)}
                                </div>
                                <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: OG.text2 }}>{currency}</div>
                            </div>
                            {cheap && avg && (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                                    <div style={{
                                        display: "flex",
                                        background: `${OG.ok}22`,
                                        color: OG.ok,
                                        padding: "8px 14px",
                                        borderRadius: 10,
                                        fontSize: 20,
                                        fontWeight: 900,
                                    }}>
                                        {t("product.showroom.cheaperBy", { pct: savedPct })}
                                    </div>
                                    <div style={{ display: "flex", fontSize: 18, color: OG.text3, textDecoration: "line-through" }}>
                                        {`${groupThousands(avg)} ${currency}`}
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
