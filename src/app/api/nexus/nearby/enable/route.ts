// Nearby — geolokatsiyani yoqish/yangilash.
//   POST /api/nexus/nearby/enable   Body: { lat, lng }
//   → { ok: true }
//
// Har chaqirilishda nearbyUpdatedAt yangilanadi (24 soatlik oyna).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lat = typeof body?.lat === "number" ? body.lat : parseFloat(String(body?.lat));
    const lng = typeof body?.lng === "number" ? body.lng : parseFloat(String(body?.lng));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return NextResponse.json({ error: "Noto'g'ri lat" }, { status: 400 });
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return NextResponse.json({ error: "Noto'g'ri lng" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    await prisma.userProfile.update({
        where: { id: me.id },
        data:  { nearbyEnabled: true, nearbyLat: lat, nearbyLng: lng, nearbyUpdatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
