// Kanal xabarini bookmark qilish / olib tashlash (per-user).
//   POST/DELETE /api/nexus/channels/[id]/messages/[messageId]/bookmark

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(channelId: string, messageId: string, email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "profile", status: 404 as const };
    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true },
    });
    if (!msg || msg.channelId !== channelId) return { error: "not_found", status: 404 as const };
    // A'zolik talab (kanal xabarni ko'rish uchun)
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } }, select: { id: true },
    });
    if (!member) return { error: "forbidden", status: 403 as const };
    return { me };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const body = await req.json().catch(() => ({}));
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : null;

    const a = await auth(id, messageId, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

    await prisma.nexusChannelMessageBookmark.upsert({
        where: { messageId_profileId: { messageId, profileId: a.me.id } },
        create: { messageId, profileId: a.me.id, note },
        update: { note },
    });
    return NextResponse.json({ ok: true, bookmarked: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;

    const a = await auth(id, messageId, session.user.email);
    if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

    await prisma.nexusChannelMessageBookmark.deleteMany({
        where: { messageId, profileId: a.me.id },
    });
    return NextResponse.json({ ok: true, bookmarked: false });
}
