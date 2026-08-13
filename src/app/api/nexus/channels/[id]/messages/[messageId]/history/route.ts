// Kanal xabarining tahrirlash tarixi.
//   GET /api/nexus/channels/[id]/messages/[messageId]/history

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId },
        select: { id: true, channelId: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    // Faqat kanal a'zolari ko'ra oladi
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true },
    });
    if (!member) {
        // Agar ommaviy kanal bo'lsa tekshirish
        const ch = await prisma.nexusChannel.findUnique({ where: { id }, select: { isPrivate: true } });
        if (!ch || ch.isPrivate) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const edits = await prisma.nexusChannelMessageEdit.findMany({
        where: { messageId },
        orderBy: { editedAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ edits });
}
