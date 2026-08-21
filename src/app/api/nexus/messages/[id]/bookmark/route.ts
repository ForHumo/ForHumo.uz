// Xabarni bookmark qilish / olib tashlash (per-user).
//   GET  /api/nexus/messages/[convId]/bookmark        → { items: [...] } — men saqlaganlar
//   POST /api/nexus/messages/[convId]/bookmark  { messageId, note? }
//   DELETE /api/nexus/messages/[convId]/bookmark?messageId=X

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(convId: string, email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "profile", status: 404 as const };
    const conv = await prisma.nexusConversation.findUnique({ where: { id: convId } });
    if (!conv) return { error: "conv", status: 404 as const };
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return { error: "forbidden", status: 403 as const };
    return { me, conv };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const a = await auth(id, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
    // Foydalanuvchining shu suhbatdagi barcha bookmark'lari (yangi birinchi)
    const bookmarks = await prisma.nexusMessageBookmark.findMany({
        where: { profileId: a.me.id, message: { conversationId: id } },
        select: { messageId: true, note: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
    });
    if (bookmarks.length === 0) return NextResponse.json({ items: [] });
    // Har biri uchun xabar snapshot
    const msgs = await prisma.nexusMessage.findMany({
        where: { id: { in: bookmarks.map(b => b.messageId) } },
        select: { id: true, text: true, senderId: true, createdAt: true, mediaType: true, mediaUrl: true, mediaName: true },
    });
    const items = bookmarks.map(b => {
        const m = msgs.find(x => x.id === b.messageId);
        if (!m) return null;
        return {
            id: m.id,
            text: m.text,
            mine: m.senderId === a.me.id,
            createdAt: m.createdAt,
            mediaType: m.mediaType,
            mediaUrl: m.mediaUrl,
            mediaName: m.mediaName,
            note: b.note,
            bookmarkedAt: b.createdAt,
        };
    }).filter(Boolean);
    return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId ?? "").trim();
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : null;
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const a = await auth(id, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.nexusMessageBookmark.upsert({
        where: { messageId_profileId: { messageId, profileId: a.me.id } },
        create: { messageId, profileId: a.me.id, note },
        update: { note },
    });
    return NextResponse.json({ ok: true, bookmarked: true });
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

    await prisma.nexusMessageBookmark.deleteMany({
        where: { messageId, profileId: a.me.id },
    });
    return NextResponse.json({ ok: true, bookmarked: false });
}
