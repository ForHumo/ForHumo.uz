// BN mahsulot uchun dinamik OG share preview (1200×630).
// Telegram/Instagram/Facebook'da link ulashilganda katta rasm sifatida ko'rinadi.
//
// URL: /api/og/bn/product/<slug>
// Har product/page.tsx metadata.openGraph.images shunga yo'naltiradi.

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;   // 1 soat

const BN_GOLD    = "#F5B301";
const BN_ONGOLD  = "#0A0A0A";
const BN_BG      = "#0F0F10";
const BN_SURFACE = "#191919";
const BN_TEXT    = "#F7F7F7";
const BN_TEXT2   = "#B8B8B8";
const BN_TEXT3   = "#8A8A8A";
const BN_OK      = "#22C55E";

function fmt(n: number): string {
    return new Intl.NumberFormat("uz-UZ").format(n);
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = await prisma.bnProduct.findUnique({
        where: { slug },
        select: {
            title: true,
            price: true,
            marketAvgPrice: true,
            images: true,
            shop: {
                select: {
                    name: true, city: true,
                    market: { select: { name: true } },
                },
            },
        },
    }).catch(() => null);

    if (!product) {
        return fallbackOg();
    }

    const cheap = product.marketAvgPrice && product.price < product.marketAvgPrice;
    const savedPct = cheap && product.marketAvgPrice
        ? Math.round(((product.marketAvgPrice - product.price) / product.marketAvgPrice) * 100)
        : null;
    const image = product.images?.[0] ?? null;
    const shop = product.shop;
    const location = shop?.market?.name || shop?.city || null;

    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%",
                display: "flex",
                background: `linear-gradient(135deg, ${BN_BG} 0%, ${BN_SURFACE} 100%)`,
                color: BN_TEXT,
                fontFamily: "sans-serif",
                padding: "56px 64px",
                position: "relative",
            }}>
                {/* Chap: rasm */}
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
                        border: `1px solid ${BN_GOLD}22`,
                        flexShrink: 0,
                    }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" width={480} height={480} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                    </div>
                ) : (
                    <div style={{
                        width: 480, height: 480, borderRadius: 32,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: BN_SURFACE, color: BN_TEXT3, fontSize: 80,
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
                    {/* Brend qatori */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: BN_GOLD, color: BN_ONGOLD,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, fontWeight: 900,
                        }}>
                            BN
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: BN_TEXT2 }}>
                            Bozor Narxida
                        </div>
                    </div>

                    {/* Sarlavha */}
                    <div style={{
                        display: "flex", flexDirection: "column",
                        marginTop: 24,
                    }}>
                        <div style={{
                            fontSize: 44,
                            fontWeight: 900,
                            lineHeight: 1.15,
                            letterSpacing: "-0.02em",
                            maxHeight: 202,
                            overflow: "hidden",
                        }}>
                            {product.title.length > 90 ? product.title.slice(0, 90) + "…" : product.title}
                        </div>
                        {shop && (
                            <div style={{
                                fontSize: 22, marginTop: 16, color: BN_TEXT3,
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <span style={{ fontWeight: 700, color: BN_TEXT2 }}>{shop.name}</span>
                                {location && (
                                    <>
                                        <span>·</span>
                                        <span>{location}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Narx bloki */}
                    <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
                        <div style={{
                            display: "flex", alignItems: "baseline", gap: 16,
                        }}>
                            <div style={{
                                fontSize: 68, fontWeight: 900,
                                color: cheap ? BN_OK : BN_GOLD,
                                letterSpacing: "-0.02em",
                                lineHeight: 1,
                            }}>
                                {fmt(product.price)}
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: BN_TEXT2 }}>so&apos;m</div>
                        </div>
                        {cheap && savedPct != null && product.marketAvgPrice && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 12,
                                marginTop: 12,
                            }}>
                                <div style={{
                                    background: `${BN_OK}22`,
                                    color: BN_OK,
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    fontSize: 20,
                                    fontWeight: 900,
                                }}>
                                    {savedPct}% arzon
                                </div>
                                <div style={{ fontSize: 18, color: BN_TEXT3, textDecoration: "line-through" }}>
                                    {fmt(product.marketAvgPrice)} so&apos;m
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 },
    );
}

function fallbackOg() {
    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: BN_BG, color: BN_TEXT, fontFamily: "sans-serif",
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                        fontSize: 96, fontWeight: 900, color: BN_GOLD,
                        letterSpacing: "-0.03em",
                    }}>
                        Bozor Narxida
                    </div>
                    <div style={{ fontSize: 28, marginTop: 16, color: BN_TEXT2 }}>
                        Toshkent bozorlari va do&apos;konlari onlayn
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 },
    );
}
