// BN bildirishnomalar API.
//
//   GET  /api/bn/notifications        — mening bildirishnomalar (oxirgi 50 + unreadCount)
//   POST /api/bn/notifications/read   — bitta yoki hammasi o'qildi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const [items, unreadCount] = await Promise.all([
        prisma.bnNotification.findMany({
            where: { profileId: auth.profileId },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        prisma.bnNotification.count({
            where: { profileId: auth.profileId, read: false },
        }),
    ]);
    return NextResponse.json({ items, unreadCount });
}
