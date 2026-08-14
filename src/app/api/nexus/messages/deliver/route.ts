// Xabar yetkazildi confirm — client Pusher orqali xabarni qabul qilgach POST qiladi.
// Batch: qurilma bir necha xabarni bir requestda bildiradi.
//
//   POST /api/nexus/messages/deliver
//     body: { messageIds: string[] }
//   Faqat qabul qiluvchi (mine=false bo'lgan) xabarlar deliveredAt yangilanadi.
//   Sender'ga Pusher orqali nx:msg:delivered event yuboriladi (tik ✓✓ ko'rsatish uchun).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { after } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.messageIds)
        ? body.messageIds.filter((x: unknown) => typeof x === "string").slice(0, 100)
        : [];
    if (ids.length === 0) return NextResponse.json({ ok: true });

    // Faqat qabul qiluvchi men bo'lgan (sender emas) va hali deliveredAt=null xabarlar
    const now = new Date();
    const targets = await prisma.nexusMessage.findMany({
        where: {
            id: { in: ids },
            senderId: { not: me.id },
            deliveredAt: null,
        },
        select: { id: true, senderId: true },
    });
    if (targets.length === 0) return NextResponse.json({ ok: true });

    await prisma.nexusMessage.updateMany({
        where: { id: { in: targets.map(t => t.id) } },
        data: { deliveredAt: now },
    });

    // Sender'lar bo'yicha guruhlab, har biriga real-time bildirish
    const bySender = new Map<string, string[]>();
    for (const t of targets) {
        const arr = bySender.get(t.senderId) ?? [];
        arr.push(t.id);
        bySender.set(t.senderId, arr);
    }
    after(async () => {
        for (const [senderId, msgIds] of bySender.entries()) {
            await pusherTrigger(userChannel(senderId), "nx:msg:delivered", {
                messageIds: msgIds,
                deliveredAt: now.toISOString(),
            });
        }
    });

    return NextResponse.json({ ok: true, updated: targets.length });
}
