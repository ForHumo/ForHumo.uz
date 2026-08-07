// BN admin: ban ro'yxati (faol / lifted / expired).
//
//   GET /api/bn/admin/bans?status=ACTIVE&limit=100

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
    const status = (searchParams.get("status") ?? "ACTIVE") as "ACTIVE" | "LIFTED" | "EXPIRED";
    const limit = Math.min(200, Number(searchParams.get("limit")) || 100);

    const bans = await prisma.bnBan.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    // Enrich with profile + shop info
    const profileIds = Array.from(new Set(bans.map(b => b.profileId)));
    const shopIds = Array.from(new Set(bans.map(b => b.shopId).filter(Boolean) as string[]));
    const [profiles, shops] = await Promise.all([
        prisma.userProfile.findMany({
            where: { id: { in: profileIds } },
            select: { id: true, username: true, humoId: true, name: true, image: true },
        }),
        shopIds.length ? prisma.bnShop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, name: true, slug: true },
        }) : [],
    ]);
    const pById = new Map(profiles.map(p => [p.id, p]));
    const sById = new Map(shops.map(s => [s.id, s]));

    return NextResponse.json({
        bans: bans.map(b => ({
            ...b,
            profile: pById.get(b.profileId) ?? null,
            shop: b.shopId ? (sById.get(b.shopId) ?? null) : null,
        })),
    });
}
