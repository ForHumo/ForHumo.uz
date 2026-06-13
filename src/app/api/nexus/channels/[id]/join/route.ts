import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/channels/[id]/join — a'zo bo'lish / chiqish (toggle)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { id: true, ownerId: true, isPrivate: true, hidden: true } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const existing = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
    });

    if (existing) {
        if (channel.ownerId === me.id) return NextResponse.json({ error: "Egasi chiqa olmaydi (o'chiring)" }, { status: 400 });
        await prisma.$transaction([
            prisma.nexusChannelMember.delete({ where: { id: existing.id } }),
            prisma.nexusChannel.update({ where: { id }, data: { memberCount: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ ok: true, isMember: false });
    }

    if (channel.isPrivate) return NextResponse.json({ error: "Yopiq kanalga taklif kerak" }, { status: 403 });
    await prisma.$transaction([
        prisma.nexusChannelMember.create({ data: { channelId: id, profileId: me.id, role: "MEMBER" } }),
        prisma.nexusChannel.update({ where: { id }, data: { memberCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ ok: true, isMember: true });
}
