// Suhbatni arxivga qo'yish/olib tashlash (per-user).
//   POST /api/nexus/messages/[convId]/archive-conv  { archive: true|false }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const archive = body?.archive !== false;

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
    await prisma.nexusConversation.update({
        where: { id },
        data: isUser1
            ? { archivedByUser1: archive ? new Date() : null }
            : { archivedByUser2: archive ? new Date() : null },
    });
    return NextResponse.json({ ok: true, archived: archive });
}
