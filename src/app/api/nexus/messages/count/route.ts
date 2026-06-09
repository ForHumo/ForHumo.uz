import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasUnread } from "@/lib/nexus-dm";

// GET /api/nexus/messages/count — o'qilmagan suhbatlar soni (header badge)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ unread: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ unread: 0 });

    const convs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        select: { user1Id: true, lastSenderId: true, lastMessageAt: true, user1ReadAt: true, user2ReadAt: true },
    });
    const unread = convs.filter(c => hasUnread(c, me.id)).length;
    return NextResponse.json({ unread });
}
