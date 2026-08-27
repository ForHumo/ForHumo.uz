// POST /api/nexus/channels/[id]/messages/[messageId]/delete-for-everyone
// "Hamma uchun o'chirish" (WhatsApp uslub) — 60 daqiqa ichida yozuvchi
// xabarni ikkalasi uchun ham o'chira oladi. Client tomon tombstone ko'rsatadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { id: true, channelId: true, senderId: true, createdAt: true, deletedForEveryoneAt: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.deletedForEveryoneAt) return NextResponse.json({ ok: true, alreadyDeleted: true });

    // Owner/admin ham hamma uchun o'chira oladi (moderatsiya). Aks holda faqat o'z xabari.
    if (msg.senderId !== me.id) {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: id, profileId: me.id } },
            select: { role: true },
        });
        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            return NextResponse.json({ error: "Faqat o'z xabaringizni o'chirasiz" }, { status: 403 });
        }
    }
    // Vaqt cheklovi olib tashlandi — istalgan vaqt o'chiriladi

    const now = new Date();
    await prisma.nexusChannelMessage.update({
        where: { id: messageId },
        data: {
            deletedForEveryoneAt: now,
            // Matn va media'ni tozalash (server javobida ham null qaytariladi)
            text: null,
            media: [],
            pollQuestion: null,
            pollOptions: [],
            contactName: null,
            contactPhone: null,
            contactUsername: null,
            locLat: null,
            locLng: null,
        },
    });

    // Real-time push — a'zolarga tombstone
    after(async () => {
        const members = await prisma.nexusChannelMember.findMany({
            where: { channelId: id },
            select: { profileId: true }, take: 500,
        });
        await Promise.all(members.map(m =>
            pusherTrigger(userChannel(m.profileId), "nx:msg:deleted-for-everyone", {
                channelId: id, messageId, deletedForEveryoneAt: now.toISOString(),
            }).catch(() => {})
        ));
    });

    return NextResponse.json({ ok: true, deletedForEveryoneAt: now.toISOString() });
}
