// Suhbatni tozalash (o'z tomonim uchun) — barcha oldingi xabarlar yashiriladi.
//   POST /api/nexus/messages/[convId]/clear

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const isUser1 = conv.user1Id === me.id;
    const now = new Date();
    await prisma.nexusConversation.update({
        where: { id },
        data: isUser1 ? { clearedBeforeUser1: now } : { clearedBeforeUser2: now },
    });
    return NextResponse.json({ ok: true, clearedAt: now });
}
