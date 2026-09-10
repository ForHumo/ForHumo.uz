// Sotuvchining aktiv do'konlari ro'yxati (reklama modal uchun havola tanlash).
//
//   GET /api/bn/seller/my-shops → { shops: [{ slug, name }] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shops = await prisma.bnShop.findMany({
        where: { profileId: auth.profileId, status: { not: "TERMINATED" } },
        select: { slug: true, name: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ shops });
}
