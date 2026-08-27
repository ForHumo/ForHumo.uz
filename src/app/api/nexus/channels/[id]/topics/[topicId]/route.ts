// Guruh mavzu — o'chirish / yopish / ochish (OWNER/ADMIN).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

async function guardAdmin(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) return null;
    return me;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; topicId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, topicId } = await params;
    const me = await guardAdmin(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const topic = await prisma.nexusChannelTopic.findUnique({ where: { id: topicId } });
    if (!topic || topic.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string") data.name = String(body.name).trim().slice(0, 80);
    if (typeof body?.icon === "string") data.icon = String(body.icon).slice(0, 40);
    if (typeof body?.closed === "boolean") data.closed = body.closed;

    const updated = await prisma.nexusChannelTopic.update({ where: { id: topicId }, data });
    return NextResponse.json({ topic: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; topicId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, topicId } = await params;
    const me = await guardAdmin(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const topic = await prisma.nexusChannelTopic.findUnique({ where: { id: topicId } });
    if (!topic || topic.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Xabarlarni umumiyga qaytaramiz (topicId=null) yoki o'chirmaymiz
    await prisma.nexusChannelMessage.updateMany({
        where: { channelId: id, topicId }, data: { topicId: null },
    });
    await prisma.nexusChannelTopic.delete({ where: { id: topicId } });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: `Mavzu o'chirildi: ${topic.name}` });
    return NextResponse.json({ ok: true });
}
