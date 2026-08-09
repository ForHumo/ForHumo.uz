// Yengil endpoint: faqat foydalanuvchi sevimlilar ID'larini qaytaradi.
// bn-product-card N+1 muammosini yechish uchun — bitta so'rov barcha kartalar uchun.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBnAuth } from "@/lib/bn-auth";

export async function GET() {
    const auth = await getBnAuth();
    if (!auth) return NextResponse.json({ ids: [] });
    const favs = await prisma.bnFavorite.findMany({
        where: { profileId: auth.profileId },
        select: { productId: true },
    });
    return NextResponse.json({ ids: favs.map(f => f.productId) });
}
