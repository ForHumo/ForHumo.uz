// Jonli joylashuvni yangilash — mavjud xabarning locLat/locLng va locUpdatedAt'ini yangilaydi.
// Faqat xabar egasi yangilaydi va faqat locExpiresAt kelmagunicha.
//   PATCH /api/nexus/messages/[convId]/live-location
//     body: { messageId, lat, lng }
//   DELETE /api/nexus/messages/[convId]/live-location?messageId=X
//     — jonli joylashuvni to'xtatish (locExpiresAt=now)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId ?? "").trim();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!messageId || !isFinite(lat) || !isFinite(lng)) {
        return NextResponse.json({ error: "messageId, lat, lng kerak" }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "koordinatalar noto'g'ri" }, { status: 400 });
    }

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId },
        select: { id: true, senderId: true, conversationId: true, locExpiresAt: true, mediaType: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Faqat egasi yangilaydi" }, { status: 403 });
    if (msg.mediaType !== "location") return NextResponse.json({ error: "Bu joylashuv xabari emas" }, { status: 400 });
    if (!msg.locExpiresAt || msg.locExpiresAt <= new Date()) {
        return NextResponse.json({ error: "Jonli joylashuv muddati tugagan" }, { status: 400 });
    }

    await prisma.nexusMessage.update({
        where: { id: messageId },
        data: { locLat: lat, locLng: lng, locUpdatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { senderId: true, conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Faqat egasi to'xtatadi" }, { status: 403 });

    await prisma.nexusMessage.update({
        where: { id: messageId }, data: { locExpiresAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
