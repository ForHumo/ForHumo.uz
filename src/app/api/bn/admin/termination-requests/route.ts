// BN admin: chiqarib yuborishga so'rov (MODERATOR yuboradi, OWNER hal qiladi).
//
//   GET  /api/bn/admin/termination-requests?status=PENDING
//   POST /api/bn/admin/termination-requests  { shopId, reason }  (MODERATOR)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnAdmin } from "@/lib/bn-admin";

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED";

    const items = await prisma.bnTerminationRequest.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    const shopIds = Array.from(new Set(items.map(i => i.shopId)));
    const requesterIds = Array.from(new Set(items.map(i => i.requestedById)));
    const [shops, requesters] = await Promise.all([
        prisma.bnShop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, name: true, slug: true, status: true, profileId: true },
        }),
        prisma.userProfile.findMany({
            where: { id: { in: requesterIds } },
            select: { id: true, username: true, humoId: true, name: true },
        }),
    ]);
    const sById = new Map(shops.map(s => [s.id, s]));
    const rById = new Map(requesters.map(r => [r.id, r]));

    return NextResponse.json({
        items: items.map(i => ({
            ...i,
            shop: sById.get(i.shopId) ?? null,
            requestedBy: rById.get(i.requestedById) ?? null,
        })),
    });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const b = await req.json().catch(() => ({}));
    const shopId = typeof b?.shopId === "string" ? b.shopId : "";
    const reason = typeof b?.reason === "string" ? b.reason.trim() : "";
    if (!shopId) return NextResponse.json({ error: "shop_required" }, { status: 400 });
    if (reason.length < 5) return NextResponse.json({ error: "reason_short" }, { status: 400 });

    const shop = await prisma.bnShop.findUnique({ where: { id: shopId }, select: { profileId: true } });
    if (!shop) return NextResponse.json({ error: "shop_not_found" }, { status: 404 });

    // Kunlik/haftalik dublikatni oldini olish
    const dup = await prisma.bnTerminationRequest.findFirst({
        where: { shopId, status: "PENDING" }, select: { id: true },
    });
    if (dup) return NextResponse.json({ error: "already_pending" }, { status: 409 });

    const created = await prisma.bnTerminationRequest.create({
        data: {
            shopId,
            profileId: shop.profileId,
            reason,
            requestedById: auth.profileId,
        },
    });
    return NextResponse.json({ ok: true, request: created });
}
