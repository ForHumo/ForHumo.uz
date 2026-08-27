// POST /channels/[id]/typing — Pusher event yuborish (per-channel typing indicator).
// Client 3 soniya debounce bilan chaqiradi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ ok: true });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ ok: true });

    // A'zoligini tekshirish
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true },
    });
    if (!member) return NextResponse.json({ ok: true });

    // A'zolarga typing event
    const members = await prisma.nexusChannelMember.findMany({
        where: { channelId: id, profileId: { not: me.id } },
        select: { profileId: true }, take: 100,
    });
    await Promise.all(members.map(m =>
        pusherTrigger(userChannel(m.profileId), "nx:ch:typing", {
            channelId: id,
            profileId: me.id,
            name: me.name ?? me.username ?? "Foydalanuvchi",
        }).catch(() => {})
    ));
    return NextResponse.json({ ok: true });
}
