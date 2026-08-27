// POST /api/nexus/messages/[id]/screenshot-alert
// Client tomon (view-once xabar ochilgan payt) tab yashirinishi/Visibility API orqali
// screenshot detect qilsa yuboriladi. Sender'ga notif ketadi.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToProfile, pushAvailable } from "@/lib/push";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id }, select: { id: true, senderId: true, viewOnce: true, conversationId: true },
    });
    if (!msg || !msg.viewOnce) return NextResponse.json({ error: "Faqat view-once xabarlar" }, { status: 400 });
    if (msg.senderId === me.id) return NextResponse.json({ ok: true }); // o'zim ko'rgan bo'lsam alert kerak emas

    // Dedup — bir xil xabar+viewer bir marta yoziladi
    const existing = await prisma.nexusScreenshotAlert.findFirst({
        where: { messageId: msg.id, viewerId: me.id },
    });
    if (existing) return NextResponse.json({ ok: true, alreadyReported: true });

    await prisma.nexusScreenshotAlert.create({
        data: { messageId: msg.id, viewerId: me.id, senderId: msg.senderId },
    });

    // Push notif senderga
    if (pushAvailable()) {
        const viewerName = me.name ?? me.username ?? "Foydalanuvchi";
        after(() =>
            sendPushToProfile(msg.senderId, {
                title: "Screenshot alert",
                body: `${viewerName} view-once xabaringizga screenshot olishga urindi`,
                url: `/nexus?dm=${me.username ?? ""}`,
                tag: `ss-alert-${msg.id}`,
            }).catch(() => {})
        );
    }

    return NextResponse.json({ ok: true });
}
