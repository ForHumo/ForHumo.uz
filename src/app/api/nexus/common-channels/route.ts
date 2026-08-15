// GET /api/nexus/common-channels?peerId=X
// Men va peer ikkalasi ham a'zo bo'lgan channel/gruoplarni qaytaradi.
// Info panel'da 'Umumiy guruh N' + 'Umumiy kanal N' ro'yxati uchun ishlatiladi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ groups: [], channels: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ groups: [], channels: [] });

    const url = new URL(req.url);
    const peerId = url.searchParams.get("peerId");
    if (!peerId || peerId === me.id) return NextResponse.json({ groups: [], channels: [] });

    // Men a'zo bo'lgan channel'lar
    const myMembership = await prisma.nexusChannelMember.findMany({
        where: { profileId: me.id },
        select: { channelId: true },
    });
    const myChannelIds = myMembership.map(m => m.channelId);
    if (myChannelIds.length === 0) return NextResponse.json({ groups: [], channels: [] });

    // Ular ichida peer ham a'zo bo'lganlarini topamiz
    const bothMembership = await prisma.nexusChannelMember.findMany({
        where: { profileId: peerId, channelId: { in: myChannelIds } },
        select: { channelId: true },
    });
    const commonIds = bothMembership.map(m => m.channelId);
    if (commonIds.length === 0) return NextResponse.json({ groups: [], channels: [] });

    const channels = await prisma.nexusChannel.findMany({
        where: { id: { in: commonIds }, hidden: false },
        orderBy: [{ isSystem: "desc" }, { memberCount: "desc" }],
        select: {
            id: true, type: true, name: true, handle: true,
            avatarUrl: true, memberCount: true, isSystem: true,
        },
    });

    return NextResponse.json({
        groups: channels.filter(c => c.type === "GROUP"),
        channels: channels.filter(c => c.type === "CHANNEL"),
    });
}
