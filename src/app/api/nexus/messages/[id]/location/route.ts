import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/nexus/messages/[id]/location — jonli joylashuv koordinatlarini yangilash.
// Faqat message egasi (jo'natgan odam) va faqat locExpiresAt hali tugamagan bo'lsa.
// Body: { lat: number, lng: number }
// Yoki bekor qilish: { stop: true } — locExpiresAt = now (darhol tugatiladi)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id }, select: { id: true, senderId: true, mediaType: true, locExpiresAt: true },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (msg.mediaType !== "location") return NextResponse.json({ error: "Bu joylashuv xabari emas" }, { status: 400 });

    const body = (await req.json()) as { lat?: number; lng?: number; stop?: boolean };

    // Bekor qilish
    if (body.stop) {
        await prisma.nexusMessage.update({
            where: { id }, data: { locExpiresAt: new Date() },
        });
        return NextResponse.json({ ok: true, stopped: true });
    }

    // Yangilanish faqat hali muddat tugamagan bo'lsa
    if (!msg.locExpiresAt || msg.locExpiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "Jonli joylashuv muddati tugagan" }, { status: 400 });
    }

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
        return NextResponse.json({ error: "Koordinatalar noto'g'ri" }, { status: 400 });
    }
    if (Math.abs(body.lat) > 90 || Math.abs(body.lng) > 180) {
        return NextResponse.json({ error: "Koordinatalar chegaradan tashqarida" }, { status: 400 });
    }

    await prisma.nexusMessage.update({
        where: { id },
        data: { locLat: body.lat, locLng: body.lng, locUpdatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
