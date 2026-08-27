// GET /api/nexus/channels/[id]/messages/[messageId]/reactors
// Xabar reaksiyalari + har biriga kimlar qo'yganini qaytaradi (OWNER/ADMIN only).
// Response: { groups: [{ emoji, users: [{ id, name, username, image }] }] }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Faqat egasi/admin" }, { status: 403 });
    }

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const reactions = await prisma.nexusChannelMessageReaction.findMany({
        where: { messageId },
        orderBy: { createdAt: "asc" },
    });
    if (reactions.length === 0) return NextResponse.json({ groups: [] });

    const profileIds = Array.from(new Set(reactions.map(r => r.profileId)));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));

    const byEmoji = new Map<string, Array<typeof profiles[0]>>();
    for (const r of reactions) {
        const p = pMap.get(r.profileId);
        if (!p) continue;
        if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
        byEmoji.get(r.emoji)!.push(p);
    }

    return NextResponse.json({
        groups: Array.from(byEmoji.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(([emoji, users]) => ({ emoji, count: users.length, users })),
    });
}
