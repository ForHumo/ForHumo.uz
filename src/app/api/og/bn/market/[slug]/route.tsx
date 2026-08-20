// BN bozor uchun dinamik OG (1200×630)
//   URL: /api/og/bn/market/<slug>

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BN_GOLD    = "#F5B301";
const BN_ONGOLD  = "#0A0A0A";
const BN_BG      = "#0F0F10";
const BN_SURFACE = "#191919";
const BN_TEXT    = "#F7F7F7";
const BN_TEXT2   = "#B8B8B8";
const BN_TEXT3   = "#8A8A8A";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const market = await prisma.bnMarket.findUnique({
        where: { slug },
        select: {
            name: true, description: true, coverUrl: true, city: true,
            district: true, shopCount: true, workHours: true,
        },
    }).catch(() => null);

    if (!market) return fallbackOg();

    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%",
                display: "flex", position: "relative",
                background: BN_BG,
                color: BN_TEXT, fontFamily: "sans-serif",
            }}>
                {/* Fon rasm */}
                {market.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={market.coverUrl} alt=""
                        width={1200} height={630}
                        style={{
                            position: "absolute", inset: 0,
                            width: "100%", height: "100%",
                            objectFit: "cover", opacity: 0.35,
                        }} />
                )}
                <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg, rgba(15,15,16,0.65) 0%, rgba(15,15,16,0.95) 85%)`,
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

                    {/* Nom */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{
                            fontSize: 76, fontWeight: 900,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.05,
                            maxWidth: 1050,
                        }}>
                            {market.name.length > 60 ? market.name.slice(0, 60) + "…" : market.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: BN_TEXT2 }}>
                                {market.district ? `${market.district}, ` : ""}{market.city}
                            </div>
                            {market.workHours && (
                                <>
                                    <div style={{ fontSize: 26, color: BN_TEXT3 }}>·</div>
                                    <div style={{ fontSize: 22, color: BN_TEXT3 }}>{market.workHours}</div>
                                </>
                            )}
                        </div>
                        {market.description && (
                            <div style={{
                                fontSize: 22, marginTop: 20, color: BN_TEXT2,
                                lineHeight: 1.4,
                                maxHeight: 96,
                                overflow: "hidden",
                                maxWidth: 950,
                            }}>
                                {market.description.length > 180 ? market.description.slice(0, 180) + "…" : market.description}
                            </div>
                        )}
                    </div>

                    {/* Do'kon soni */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        <div style={{
                            fontSize: 54, fontWeight: 900,
                            color: BN_GOLD, letterSpacing: "-0.02em",
                        }}>
                            {market.shopCount}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: BN_TEXT2 }}>
                            ta do&apos;kon
                        </div>
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
