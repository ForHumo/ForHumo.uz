// BN do'kon uchun dinamik OG (1200×630)
//   URL: /api/og/bn/shop/<slug>?l=<uz|ru|en>

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { liveShopStats } from "@/lib/bn-data";
import { bnCity } from "@/lib/bn-seo";
import { OG, OgBrand, OgStar, clip, fallbackOg, ogHandler, ogImageSrc, ogLocale, renderOg } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const TIER_COLOR: Record<string, string> = {
    NEW:      OG.text3,
    TRUSTED:  OG.info,
    VERIFIED: OG.ok,
    PREMIUM:  OG.gold,
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return ogHandler(async () => {
        const { slug } = await params;
        const locale = ogLocale(req);
        const t = await getTranslations({ locale, namespace: "bn" });

        const shop = await prisma.bnShop.findUnique({
            where: { slug },
            select: {
                id: true, name: true, description: true, logoUrl: true, tier: true,
                city: true,
                market: { select: { name: true, nameRu: true } },
            },
        }).catch(() => null);

        if (!shop || !shop.name) return fallbackOg(t("tagline"));
        // Sahifadagi bilan bir xil HAQIQIY sonlar (saqlangan seed qiymatlari emas)
        const stats = (await liveShopStats([shop.id]).catch(() => null))?.get(shop.id)
            ?? { productCount: 0, rating: 0, ratingCount: 0 };

        const tierColor = TIER_COLOR[shop.tier] ?? OG.text3;
        const marketName = shop.market ? (locale === "ru" && shop.market.nameRu ? shop.market.nameRu : shop.market.name) : null;
        const location = marketName || bnCity(shop.city, locale);
        const logo = await ogImageSrc(shop.logoUrl);

        return renderOg(
            (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex",
                    background: `linear-gradient(135deg, ${OG.bg} 0%, ${OG.surface} 100%)`,
                    color: OG.text,
                    fontFamily: "sans-serif",
                    padding: "56px 64px",
                }}>
                    {/* Logo (chap) */}
                    <div style={{
                        width: 280, height: 280,
                        borderRadius: 32, overflow: "hidden",
                        background: OG.surface, border: `2px solid ${OG.gold}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 60,
                    }}>
                        {logo ? (
                            <img src={logo} alt="" width={280} height={280}
                                style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                        ) : (
                            <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: OG.gold }}>
                                {shop.name.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* O'ng */}
                    <div style={{
                        display: "flex", flexDirection: "column",
                        marginLeft: 48, flex: 1,
                        justifyContent: "space-between",
                    }}>
                        <OgBrand />

                        {/* Nom + tier */}
                        <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                                <div style={{
                                    display: "flex",
                                    fontSize: 60, fontWeight: 900,
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1,
                                    maxWidth: 620,
                                    overflow: "hidden",
                                }}>
                                    {clip(shop.name, 40)}
                                </div>
                                {shop.tier !== "NEW" && (
                                    <div style={{
                                        display: "flex",
                                        background: `${tierColor}22`,
                                        color: tierColor,
                                        padding: "8px 16px", borderRadius: 12,
                                        fontSize: 20, fontWeight: 900,
                                    }}>{t(`tier.${shop.tier}`)}</div>
                                )}
                            </div>
                            {location && (
                                <div style={{ display: "flex", fontSize: 24, marginTop: 12, color: OG.text3 }}>{location}</div>
                            )}
                            {shop.description && (
                                <div style={{
                                    display: "flex",
                                    fontSize: 22, marginTop: 20, color: OG.text2,
                                    lineHeight: 1.35,
                                    maxHeight: 90,
                                    overflow: "hidden",
                                }}>
                                    {clip(shop.description, 140)}
                                </div>
                            )}
                        </div>

                        {/* Statistika */}
                        <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 20 }}>
                            {stats.ratingCount > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <OgStar size={36} />
                                    <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: OG.gold }}>
                                        {stats.rating.toFixed(1)}
                                    </div>
                                    <div style={{ display: "flex", fontSize: 20, color: OG.text3 }}>
                                        {`(${stats.ratingCount})`}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: "flex", fontSize: 32, fontWeight: 900, color: OG.text }}>
                                {t("seo.ogProductsN", { n: stats.productCount })}
                            </div>
                        </div>
                    </div>
                </div>
            ),
            t("tagline"),
        );
    });
}
