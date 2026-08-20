// BN do'kon uchun dinamik OG (1200×630)
//   URL: /api/og/bn/shop/<slug>

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
const BN_INFO    = "#60A5FA";

const TIER_META: Record<string, { label: string; color: string }> = {
    NEW:      { label: "Yangi",        color: BN_TEXT3 },
    TRUSTED:  { label: "Ishonchli",    color: BN_INFO },
    VERIFIED: { label: "Tasdiqlangan", color: "#22C55E" },
    PREMIUM:  { label: "Premium",      color: BN_GOLD },
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: {
            name: true, description: true, logoUrl: true, tier: true,
            rating: true, ratingCount: true, productCount: true,
            city: true, marketId: true,
            market: { select: { name: true } },
        },
    }).catch(() => null);

    if (!shop || shop.name == null) return fallbackOg();

    const tier = TIER_META[shop.tier] ?? TIER_META.NEW;
    const location = shop.market?.name || shop.city;

    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%",
                display: "flex",
                background: `linear-gradient(135deg, ${BN_BG} 0%, ${BN_SURFACE} 100%)`,
                color: BN_TEXT,
                fontFamily: "sans-serif",
                padding: "56px 64px",
            }}>
                {/* Logo (chap) */}
                <div style={{
                    width: 280, height: 280,
                    borderRadius: 32, overflow: "hidden",
                    background: BN_SURFACE, border: `2px solid ${BN_GOLD}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 60,
                }}>
                    {shop.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shop.logoUrl} alt="" width={280} height={280}
                            style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                    ) : (
                        <div style={{ fontSize: 96, fontWeight: 900, color: BN_GOLD }}>
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
                    {/* Brend qatori */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: BN_GOLD, color: BN_ONGOLD,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, fontWeight: 900,
                        }}>BN</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: BN_TEXT2 }}>Bozor Narxida</div>
                    </div>

                    {/* Nom + tier */}
                    <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                            <div style={{
                                fontSize: 60, fontWeight: 900,
                                letterSpacing: "-0.02em",
                                lineHeight: 1,
                                maxWidth: 620,
                                overflow: "hidden",
                            }}>
                                {shop.name.length > 40 ? shop.name.slice(0, 40) + "…" : shop.name}
                            </div>
                            {shop.tier !== "NEW" && (
                                <div style={{
                                    background: `${tier.color}22`,
                                    color: tier.color,
                                    padding: "8px 16px", borderRadius: 12,
                                    fontSize: 20, fontWeight: 900,
                                }}>{tier.label}</div>
                            )}
                        </div>
                        {location && (
                            <div style={{ fontSize: 24, marginTop: 12, color: BN_TEXT3 }}>{location}</div>
                        )}
                        {shop.description && (
                            <div style={{
                                fontSize: 22, marginTop: 20, color: BN_TEXT2,
                                lineHeight: 1.35,
                                maxHeight: 90,
                                overflow: "hidden",
                            }}>
                                {shop.description.length > 140 ? shop.description.slice(0, 140) + "…" : shop.description}
                            </div>
                        )}
                    </div>

                    {/* Statistika */}
                    <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 20 }}>
                        {shop.ratingCount > 0 && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                <div style={{ fontSize: 40, fontWeight: 900, color: BN_GOLD }}>
                                    ★ {shop.rating.toFixed(1)}
                                </div>
                                <div style={{ fontSize: 20, color: BN_TEXT3 }}>
                                    ({shop.ratingCount})
                                </div>
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <div style={{ fontSize: 40, fontWeight: 900, color: BN_TEXT }}>
                                {shop.productCount}
                            </div>
                            <div style={{ fontSize: 20, color: BN_TEXT3 }}>mahsulot</div>
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
