// POST /api/nexus/broadcast-lists/[id]/send  { text }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { sendPushToProfile, pushAvailable } from "@/lib/push";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const list = await prisma.nexusBroadcastList.findUnique({
        where: { id }, include: { members: true },
    });
    if (!list || list.ownerId !== me.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4000) : "";
    if (!text) return NextResponse.json({ error: "Matn bo'sh" }, { status: 400 });
    if (list.members.length === 0) return NextResponse.json({ error: "Ro'yxat bo'sh" }, { status: 400 });

    if (await nexusRateLimited(me.id, "dm")) {
        return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    }

    let sent = 0;
    for (const m of list.members) {
        const peerId = m.profileId;
        const [u1, u2] = me.id < peerId ? [me.id, peerId] : [peerId, me.id];
        const conv = await prisma.nexusConversation.upsert({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
            create: {
                user1Id: u1, user2Id: u2,
                lastMessageAt: new Date(),
                lastMessageText: text.slice(0, 200),
                lastSenderId: me.id,
            },
            update: {
                lastMessageAt: new Date(),
                lastMessageText: text.slice(0, 200),
                lastSenderId: me.id,
            },
        });
        await prisma.nexusMessage.create({
            data: {
                conversationId: conv.id,
                senderId: me.id,
                text,
                broadcastListId: list.id,
            },
        });
        sent++;
    }

    await prisma.nexusBroadcastList.update({ where: { id }, data: { updatedAt: new Date() } });

    if (pushAvailable()) {
        const senderName = me.name ?? me.username ?? "Foydalanuvchi";
        after(async () => {
            await Promise.all(list.members.map(m =>
                sendPushToProfile(m.profileId, {
                    title: senderName,
                    body: text.slice(0, 120),
                    url: `/nexus?dm=${me.username ?? ""}`,
                    tag: `dm-${me.id}`,
                }).catch(() => {})
            ));
        });
    }

    return NextResponse.json({ ok: true, sent });
}
