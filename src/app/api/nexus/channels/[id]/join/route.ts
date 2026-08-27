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
    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { id: true, ownerId: true, isPrivate: true, hidden: true, isSystem: true } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const existing = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
    });

    if (existing) {
        if (channel.isSystem) {
            return NextResponse.json({
                error: "Rasmiy For Humo kanal/guruhidan chiqib bo'lmaydi. Ovozsizlantirish (mute) uchun sozlamalardan foydalaning.",
            }, { status: 403 });
        }
        if (channel.ownerId === me.id) return NextResponse.json({ error: "Egasi chiqa olmaydi (o'chiring)" }, { status: 400 });
        await prisma.$transaction([
            prisma.nexusChannelMember.delete({ where: { id: existing.id } }),
            prisma.nexusChannel.update({ where: { id }, data: { memberCount: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ ok: true, isMember: false });
    }

    // Ban tekshiruvi
    const banned = await prisma.nexusChannelBan.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { reason: true },
    });
    if (banned) return NextResponse.json({ error: "Siz bu guruh/kanaldan bloklangansiz" }, { status: 403 });

    if (channel.isPrivate) {
        // Yopiq guruh — kirish so'rovi yaratamiz (Telegram uslub)
        await prisma.nexusChannelJoinRequest.upsert({
            where: { channelId_profileId: { channelId: id, profileId: me.id } },
            create: { channelId: id, profileId: me.id, status: "PENDING" },
            update: { status: "PENDING", decidedAt: null, decidedById: null },
        });
        return NextResponse.json({ ok: true, joinRequested: true });
    }
    await prisma.$transaction([
        prisma.nexusChannelMember.create({ data: { channelId: id, profileId: me.id, role: "MEMBER" } }),
        prisma.nexusChannel.update({ where: { id }, data: { memberCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ ok: true, isMember: true });
}
