// BN Premium tier obuna — sotib olish va joriy holatni ko'rish.
// GET  — do'kon egasi ko'radi: current tier, endsAt, mumkin bo'lgan tier'lar.
// POST — { tier, months? } — Wallet'dan pul yechib obuna ochish/uzaytirish.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { activatePremium, PREMIUM_TIER_PRICE, PREMIUM_TIER_META, isPremiumActive } from "@/lib/bn-premium";
import type { BnPremiumTier } from "@prisma/client";

export const dynamic = "force-dynamic";

const TIERS: BnPremiumTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId, status: "APPROVED" },
        select: { id: true, name: true, premiumTier: true, premiumUntil: true },
        orderBy: { createdAt: "asc" },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 404 });

    return NextResponse.json({
        shop: { id: shop.id, name: shop.name },
        current: {
            tier: shop.premiumTier,
            endsAt: shop.premiumUntil?.toISOString() ?? null,
            active: isPremiumActive(shop),
        },
        tiers: TIERS.map(t => ({
            tier: t,
            priceMonthly: PREMIUM_TIER_PRICE[t],
            meta: PREMIUM_TIER_META[t],
        })),
    });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const tier = String(body?.tier ?? "").toUpperCase() as BnPremiumTier;
    const months = Math.max(1, Math.min(12, Math.floor(Number(body?.months) || 1)));
    if (!TIERS.includes(tier)) return NextResponse.json({ error: "invalid_tier" }, { status: 400 });

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId, status: "APPROVED" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 404 });

    const r = await activatePremium({
        shopId: shop.id,
        tier,
        ownerProfileId: auth.profileId,
        monthsCount: months,
    });
    if (!r.ok) {
        const code = r.reason === "insufficient_balance" ? 402 : 400;
        return NextResponse.json({ error: r.reason ?? "failed" }, { status: code });
    }
    return NextResponse.json({ ok: true, subscriptionId: r.subscriptionId, endsAt: r.endsAt });
}
