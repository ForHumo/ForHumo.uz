// BN Featured mahsulot boost — sotuvchi to'lab 24/72/168 soatga top'ga chiqaradi.
// GET  — joriy boost holati (agar bor bo'lsa) + narxlar
// POST — { hours: 24|72|168 } — Wallet'dan pul yechib boost yaratish.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { activateFeatured, FEATURED_PRICING, type FeaturedHours } from "@/lib/bn-premium";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const product = await prisma.bnProduct.findUnique({
        where: { slug },
        select: { id: true, shopId: true, shop: { select: { profileId: true, name: true } } },
    });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (product.shop.profileId !== auth.profileId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const active = await prisma.bnFeaturedListing.findFirst({
        where: { productId: product.id, active: true, expiresAt: { gt: new Date() } },
        select: { id: true, paidAmount: true, startsAt: true, expiresAt: true },
        orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({
        active: active ? { ...active, startsAt: active.startsAt.toISOString(), expiresAt: active.expiresAt.toISOString() } : null,
        pricing: FEATURED_PRICING,
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const body = await req.json().catch(() => ({}));
    const hours = Number(body?.hours) as FeaturedHours;
    if (!FEATURED_PRICING.some(p => p.hours === hours)) {
        return NextResponse.json({ error: "invalid_duration" }, { status: 400 });
    }

    const product = await prisma.bnProduct.findUnique({
        where: { slug },
        select: { id: true, shopId: true, shop: { select: { profileId: true } } },
    });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (product.shop.profileId !== auth.profileId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const r = await activateFeatured({
        productId: product.id,
        shopId: product.shopId,
        hours,
        ownerProfileId: auth.profileId,
    });
    if (!r.ok) {
        const code = r.reason === "insufficient_balance" ? 402 : 400;
        return NextResponse.json({ error: r.reason ?? "failed" }, { status: code });
    }
    return NextResponse.json({ ok: true, expiresAt: r.expiresAt });
}
