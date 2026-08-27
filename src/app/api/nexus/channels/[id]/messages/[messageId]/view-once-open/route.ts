// POST /channels/[id]/messages/[messageId]/view-once-open
// View-once xabarni "ochilgan" deb belgilaydi (per-user). Bir marta ko'rgach
// server GET javobida text/media null qaytariladi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { id: true, channelId: true, viewOnce: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!msg.viewOnce) return NextResponse.json({ ok: true, notViewOnce: true });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    await prisma.nexusChannelMessageViewOnceOpen.upsert({
        where: { messageId_profileId: { messageId, profileId: me.id } },
        create: { messageId, profileId: me.id },
        update: {},
    });
    return NextResponse.json({ ok: true });
}
