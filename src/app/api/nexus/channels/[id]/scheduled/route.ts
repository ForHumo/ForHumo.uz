// GET /api/nexus/channels/[id]/scheduled
// Kelajakdagi jadvalga qo'yilgan postlar ro'yxati (owner/admin uchun).
// Draft box uslubidagi ko'rinish.
// DELETE /api/nexus/channels/[id]/scheduled?msgId=... — jadvaldan olib tashlash.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guard(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const m = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!m || (m.role !== "OWNER" && m.role !== "ADMIN")) return null;
    return me;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const now = new Date();
    const msgs = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: id, hidden: false, deletedForEveryoneAt: null,
            scheduledFor: { gt: now },
        },
        orderBy: { scheduledFor: "asc" }, take: 100,
        select: {
            id: true, text: true, media: true, mediaType: true,
            pollQuestion: true, scheduledFor: true, senderId: true, createdAt: true,
        },
    });
    const senderIds = Array.from(new Set(msgs.map(m => m.senderId)));
    const senders = await prisma.userProfile.findMany({
        where: { id: { in: senderIds } }, select: { id: true, name: true, username: true, image: true },
    });
    const sMap = new Map(senders.map(s => [s.id, s]));
    return NextResponse.json({
        items: msgs.map(m => ({
            id: m.id,
            text: m.text,
            hasMedia: m.media.length > 0,
            mediaCount: m.media.length,
            firstMedia: m.media[0] ?? null,
            mediaType: m.mediaType,
            isPoll: !!m.pollQuestion,
            pollQuestion: m.pollQuestion,
            scheduledFor: m.scheduledFor,
            createdAt: m.createdAt,
            sender: sMap.get(m.senderId)
                ? { name: sMap.get(m.senderId)!.name, username: sMap.get(m.senderId)!.username, image: sMap.get(m.senderId)!.image }
                : null,
        })),
    });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const msgId = url.searchParams.get("msgId");
    if (!msgId) return NextResponse.json({ error: "msgId kerak" }, { status: 400 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: msgId }, select: { channelId: true, scheduledFor: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!msg.scheduledFor || msg.scheduledFor <= new Date()) {
        return NextResponse.json({ error: "Faqat kelajakdagi jadval o'chiriladi" }, { status: 400 });
    }
    await prisma.nexusChannelMessage.delete({ where: { id: msgId } });
    return NextResponse.json({ ok: true });
}
