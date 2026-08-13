// Xabarni suhbatda pin qilish/olib tashlash.
//   POST /api/nexus/messages/[convId]/pin  body: { messageId }
//   DELETE /api/nexus/messages/[convId]/pin?messageId=X
// Ikkala ishtirokchi ham ko'radi (global pin — Telegram uslubi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PINNED = 3;

async function auth(convId: string, email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "profile", status: 404 as const };
    const conv = await prisma.nexusConversation.findUnique({ where: { id: convId } });
    if (!conv) return { error: "conv", status: 404 as const };
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return { error: "forbidden", status: 403 as const };
    return { me, conv };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId ?? "").trim();
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const a = await auth(id, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { conversationId: true, pinnedAt: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Pin limitidan oshib ketmasin — eng eski pinni avtomatik olib tashlaymiz
    const pinnedCount = await prisma.nexusMessage.count({
        where: { conversationId: id, pinnedAt: { not: null } },
    });
    if (pinnedCount >= MAX_PINNED) {
        const oldest = await prisma.nexusMessage.findFirst({
            where: { conversationId: id, pinnedAt: { not: null } },
            orderBy: { pinnedAt: "asc" }, select: { id: true },
        });
        if (oldest) {
            await prisma.nexusMessage.update({ where: { id: oldest.id }, data: { pinnedAt: null } });
        }
    }

    await prisma.nexusMessage.update({ where: { id: messageId }, data: { pinnedAt: new Date() } });
    return NextResponse.json({ ok: true, pinned: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const a = await auth(id, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.nexusMessage.update({ where: { id: messageId }, data: { pinnedAt: null } });
    return NextResponse.json({ ok: true, pinned: false });
}
