// AI suhbatlar ro'yxati (foydalanuvchi o'zi uchun).
// GET  /api/ai/conversations?topic=X&archived=1
// DELETE /api/ai/conversations (barchasini o'chirish — GDPR)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic");
    const archived = url.searchParams.get("archived") === "1";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { profileId: me.id, archived };
    if (topic) where.topic = topic;

    const rows = await prisma.aiConversation.findMany({
        where,
        orderBy: { lastMsgAt: "desc" },
        take: 100,
        select: {
            id: true, title: true, topic: true, moduleOrigin: true,
            lastMsgAt: true, createdAt: true, archived: true,
            _count: { select: { messages: true } },
        },
    });

    return NextResponse.json({
        conversations: rows.map(r => ({
            id: r.id, title: r.title, topic: r.topic, moduleOrigin: r.moduleOrigin,
            lastMsgAt: r.lastMsgAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
            archived: r.archived,
            messageCount: r._count.messages,
        })),
    });
}

// GDPR — foydalanuvchi barcha AI suhbatini o'chirish
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const r = await prisma.aiConversation.deleteMany({ where: { profileId: me.id } });
    return NextResponse.json({ ok: true, deleted: r.count });
}
