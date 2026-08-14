// Nearby — o'chirish va koordinatalarni tozalash.
//   POST /api/nexus/nearby/disable → { ok: true }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    await prisma.userProfile.update({
        where: { id: me.id },
        data:  { nearbyEnabled: false, nearbyLat: null, nearbyLng: null, nearbyUpdatedAt: null },
    });
    return NextResponse.json({ ok: true });
}
