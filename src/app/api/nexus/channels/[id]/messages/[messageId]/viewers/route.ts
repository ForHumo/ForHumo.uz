// GET /api/nexus/channels/[id]/messages/[messageId]/viewers
// Xabarni ko'rgan so'nggi 50 profil (OWNER/ADMIN only).
// Response: { total, viewers: [{ id, name, username, image, viewedAt }] }

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
        where: { id: messageId }, select: { channelId: true, viewCount: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const views = await prisma.nexusChannelMessageView.findMany({
        where: { messageId }, orderBy: { viewedAt: "desc" }, take: 50,
    });
    if (views.length === 0) return NextResponse.json({ total: msg.viewCount, viewers: [] });

    const profileIds = Array.from(new Set(views.map(v => v.profileId)));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
        total: msg.viewCount,
        viewers: views.map(v => {
            const p = pMap.get(v.profileId);
            return p ? { ...p, viewedAt: v.viewedAt } : null;
        }).filter(Boolean),
    });
}
