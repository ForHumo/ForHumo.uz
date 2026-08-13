// DM xabarining tahrirlash tarixi.
//   GET /api/nexus/messages/[id]/history

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id },
        select: { conversationId: true, conversation: { select: { user1Id: true, user2Id: true } } },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    // Faqat suhbat qatnashchilari ko'ra oladi
    if (msg.conversation.user1Id !== me.id && msg.conversation.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const edits = await prisma.nexusMessageEdit.findMany({
        where: { messageId: id },
        orderBy: { editedAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ edits });
}
