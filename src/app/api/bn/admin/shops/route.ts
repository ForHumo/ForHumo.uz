// BN admin — barcha do'konlar ro'yxati (status filtri bilan).
// Faqat OWNER yoki MODERATOR admin.
//
// GET /api/bn/admin/shops?status=PENDING&limit=50

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(200, Number(searchParams.get("limit")) || 50);

    const shops = await prisma.bnShop.findMany({
        where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { market: { select: { slug: true, name: true } } },
    });

    // Profil ma'lumotlarini alohida yuklaymiz (BnShop.profile relation yo'q)
    const profileIds = shops.map(s => s.profileId);
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, email: true, name: true, username: true, humoId: true },
    }) : [];
    const byId = new Map(profiles.map(p => [p.id, p]));

    const enriched = shops.map(s => ({
        ...s,
        profile: byId.get(s.profileId) ?? null,
    }));

    return NextResponse.json({ shops: enriched });
}
