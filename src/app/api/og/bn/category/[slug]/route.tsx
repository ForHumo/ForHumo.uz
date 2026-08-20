// BN kategoriya uchun dinamik OG (1200×630).
// URL: /api/og/bn/category/<slug>
// Nima ko'rsatiladi: kategoriya nomi + mahsulot soni + narx diapazoni (min-max).

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BN_GOLD    = "#F5B301";
const BN_ONGOLD  = "#0A0A0A";
const BN_BG      = "#0F0F10";
const BN_TEXT    = "#F7F7F7";
const BN_TEXT2   = "#B8B8B8";
const BN_TEXT3   = "#8A8A8A";

function formatUZS(n: number): string {
    return n.toLocaleString("uz-Latn-UZ", { maximumFractionDigits: 0 }) + " so'm";
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const cat = await prisma.bnCategory.findUnique({
        where: { slug },
        select: { name: true, productCount: true, id: true, icon: true,
            children: { where: { isActive: true }, select: { id: true } } },
    }).catch(() => null);

    if (!cat) return fallbackOg();

    const catIds = [cat.id, ...cat.children.map(c => c.id)];
    const priceAgg = await prisma.bnProduct.aggregate({
        where: { isActive: true, hidden: false, isWholesale: false, categoryId: { in: catIds } },
        _min: { price: true }, _max: { price: true },
    }).catch(() => ({ _min: { price: null }, _max: { price: null } }));

    const minP = priceAgg._min.price;
    const maxP = priceAgg._max.price;
    const priceLine = minP && maxP
        ? (minP === maxP ? formatUZS(minP) : `${formatUZS(minP)} — ${formatUZS(maxP)}`)
        : null;

    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%",
                display: "flex", position: "relative",
                background: `linear-gradient(135deg, ${BN_BG} 0%, #1A1614 100%)`,
                color: BN_TEXT, fontFamily: "sans-serif",
            }}>
                {/* Dekorativ tilla nur */}
                <div style={{
                    position: "absolute", top: -80, right: -80,
                    width: 400, height: 400, borderRadius: "50%",
                    background: `radial-gradient(circle, ${BN_GOLD}22 0%, transparent 70%)`,
                }} />

                {/* Kontent */}
                <div style={{
                    position: "relative",
                    display: "flex", flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "56px 64px", flex: 1,
                }}>
                    {/* Brend */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: BN_GOLD, color: BN_ONGOLD,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, fontWeight: 900,
                        }}>BN</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: BN_TEXT2 }}>Bozor Narxida</div>
                    </div>

                    {/* Kategoriya nomi */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{
                            fontSize: 32, fontWeight: 700, color: BN_GOLD,
                            marginBottom: 12, textTransform: "uppercase", letterSpacing: 2,
                        }}>
                            Kategoriya
                        </div>
                        <div style={{
                            fontSize: 88, fontWeight: 900,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.02,
                            maxWidth: 1050,
                        }}>
                            {cat.name.length > 50 ? cat.name.slice(0, 50) + "…" : cat.name}
                        </div>
                    </div>

                    {/* Statistika: mahsulot soni + narx diapazoni */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 48 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: BN_TEXT3, marginBottom: 4 }}>
                                MAHSULOT
                            </div>
                            <div style={{
                                fontSize: 54, fontWeight: 900,
                                color: BN_GOLD, letterSpacing: "-0.02em",
                            }}>
                                {cat.productCount}
                            </div>
                        </div>
                        {priceLine && (
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: BN_TEXT3, marginBottom: 4 }}>
                                    NARX DIAPAZONI
                                </div>
                                <div style={{
                                    fontSize: 40, fontWeight: 900,
                                    color: BN_TEXT, letterSpacing: "-0.02em",
                                }}>
                                    {priceLine}
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
                <div style={{ fontSize: 96, fontWeight: 900, color: BN_GOLD }}>Bozor Narxida</div>
            </div>
        ),
        { width: 1200, height: 630 },
    );
}
