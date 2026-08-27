// Guruh voice chat (Telegram uslub) — LiveKit orqali.
//   GET  /channels/[id]/voice-chat        — joriy faol chat (agar bor bo'lsa)
//   POST /channels/[id]/voice-chat        — yangi voice chat boshlash (OWNER/ADMIN)
//   DELETE /channels/[id]/voice-chat      — voice chat'ni tugatish (OWNER/ADMIN yoki host)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLiveKitEnabled } from "@/lib/livekit";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const active = await prisma.nexusGroupCall.findFirst({
        where: { channelId: id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { participants: true } } },
    });
    if (!active) return NextResponse.json({ active: null });
    return NextResponse.json({
        active: {
            id: active.id, roomName: active.roomName, title: active.title,
            startedAt: active.createdAt, participantCount: active._count.participants,
            hostId: active.hostId,
        },
    });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!isLiveKitEnabled()) return NextResponse.json({ error: "LiveKit sozlanmagan" }, { status: 503 });
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Faqat OWNER/ADMIN boshlaydi" }, { status: 403 });
    }

    // Faol chat bo'lsa qaytar (idempotent)
    const existing = await prisma.nexusGroupCall.findFirst({
        where: { channelId: id, status: "ACTIVE" },
    });
    if (existing) return NextResponse.json({ call: { id: existing.id, roomName: existing.roomName, existed: true } });

    const roomId = Math.random().toString(36).slice(2, 12);
    const roomName = `nx-ch-${id.slice(0, 6)}-${roomId}`;
    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { name: true } });
    const call = await prisma.nexusGroupCall.create({
        data: {
            roomName, title: `${channel?.name ?? "Guruh"} voice chat`,
            hostId: me.id, channelId: id, status: "ACTIVE",
            participants: { create: { profileId: me.id, role: "HOST" } },
        },
        select: { id: true, roomName: true, title: true, createdAt: true },
    });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: "Voice chat boshlandi" });
    return NextResponse.json({ call });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const active = await prisma.nexusGroupCall.findFirst({
        where: { channelId: id, status: "ACTIVE" },
    });
    if (!active) return NextResponse.json({ ok: true, noActive: true });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    const canEnd = active.hostId === me.id || member?.role === "OWNER" || member?.role === "ADMIN";
    if (!canEnd) return NextResponse.json({ error: "Faqat host/admin tugatadi" }, { status: 403 });

    await prisma.nexusGroupCall.update({
        where: { id: active.id }, data: { status: "ENDED", endedAt: new Date() },
    });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: "Voice chat tugatildi" });
    return NextResponse.json({ ok: true });
}
