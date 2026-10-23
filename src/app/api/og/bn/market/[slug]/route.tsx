// BN bozor uchun dinamik OG (1200×630)
//   URL: /api/og/bn/market/<slug>?l=<uz|ru|en>

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { bnCity } from "@/lib/bn-seo";
import { OG, OgBrand, clip, fallbackOg, ogHandler, ogImageSrc, ogLocale, renderOg } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return ogHandler(async () => {
        const { slug } = await params;
        const locale = ogLocale(req);
        const t = await getTranslations({ locale, namespace: "bn" });

        const market = await prisma.bnMarket.findUnique({
            where: { slug },
            select: {
                name: true, nameRu: true, description: true, coverUrl: true, city: true,
                district: true, shopCount: true, workHours: true,
            },
        }).catch(() => null);

        if (!market) return fallbackOg(t("tagline"));

        const name = locale === "ru" && market.nameRu ? market.nameRu : market.name;
        // Bitta matn bola — Satori ko'p bolali div'da display:flex talab qiladi
        const place = [market.district, bnCity(market.city, locale)].filter(Boolean).join(", ");
        const cover = await ogImageSrc(market.coverUrl);

        return renderOg(
            (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex", position: "relative",
                    background: OG.bg,
                    color: OG.text, fontFamily: "sans-serif",
                }}>
                    {/* Fon rasm */}
                    {cover && (
                        <img src={cover} alt=""
                            width={1200} height={630}
                            style={{
                                position: "absolute", top: 0, left: 0,
                                width: "100%", height: "100%",
                                objectFit: "cover", opacity: 0.35,
                            }} />
                    )}
                    <div style={{
                        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                        background: "linear-gradient(180deg, rgba(15,15,16,0.65) 0%, rgba(15,15,16,0.95) 85%)",
                    }} />

                    {/* Kontent */}
                    <div style={{
                        position: "relative",
                        display: "flex", flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "56px 64px", flex: 1,
                    }}>
                        <OgBrand />

                        {/* Nom */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{
                                display: "flex",
                                fontSize: 76, fontWeight: 900,
                                letterSpacing: "-0.02em",
                                lineHeight: 1.05,
                                maxWidth: 1050,
                            }}>
                                {clip(name, 60)}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
                                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: OG.text2 }}>
                                    {place}
                                </div>
                                {market.workHours && (
                                    <div style={{ display: "flex", fontSize: 22, color: OG.text3 }}>
                                        {`· ${market.workHours}`}
                                    </div>
                                )}
                            </div>
                            {market.description && (
                                <div style={{
                                    display: "flex",
                                    fontSize: 22, marginTop: 20, color: OG.text2,
                                    lineHeight: 1.4,
                                    maxHeight: 96,
                                    overflow: "hidden",
                                    maxWidth: 950,
                                }}>
                                    {clip(market.description, 180)}
                                </div>
                            )}
                        </div>

                        {/* Do'kon soni */}
                        <div style={{
                            display: "flex",
                            fontSize: 48, fontWeight: 900,
                            color: OG.gold, letterSpacing: "-0.02em",
                        }}>
                            {t("markets.shopN", { n: market.shopCount })}
                        </div>
                    </div>
                </div>
            ),
            t("tagline"),
        );
    });
}
