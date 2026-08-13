// Kanal/guruh xabarini pinga qo'yish (a'zo bo'lish + admin/owner talab qiladi).
//   POST /api/nexus/channels/[id]/messages/[messageId]/pin
//   DELETE /api/nexus/channels/[id]/messages/[messageId]/pin

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PINNED = 3;

async function canManage(channelId: string, meId: string): Promise<boolean> {
    const m = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: meId } },
        select: { role: true },
    });
    return m?.role === "OWNER" || m?.role === "ADMIN";
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    if (!await canManage(id, me.id)) {
        return NextResponse.json({ error: "Faqat egasi yoki admin" }, { status: 403 });
    }

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Pin limitidan oshib ketmasin — eng eski pin avtomatik olib tashlanadi
    const pinnedCount = await prisma.nexusChannelMessage.count({
        where: { channelId: id, pinnedAt: { not: null } },
    });
    if (pinnedCount >= MAX_PINNED) {
        const oldest = await prisma.nexusChannelMessage.findFirst({
            where: { channelId: id, pinnedAt: { not: null } },
            orderBy: { pinnedAt: "asc" }, select: { id: true },
        });
        if (oldest) await prisma.nexusChannelMessage.update({ where: { id: oldest.id }, data: { pinnedAt: null } });
    }

    await prisma.nexusChannelMessage.update({ where: { id: messageId }, data: { pinnedAt: new Date() } });
    return NextResponse.json({ ok: true, pinned: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    if (!await canManage(id, me.id)) {
        return NextResponse.json({ error: "Faqat egasi yoki admin" }, { status: 403 });
    }

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.nexusChannelMessage.update({ where: { id: messageId }, data: { pinnedAt: null } });
    return NextResponse.json({ ok: true, pinned: false });
}
