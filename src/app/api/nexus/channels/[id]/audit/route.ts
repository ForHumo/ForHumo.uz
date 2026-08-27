// GET /channels/[id]/audit — admin audit log (OWNER/ADMIN uchun).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const cursor = url.searchParams.get("cursor");

    const events = await prisma.nexusChannelAudit.findMany({
        where: { channelId: id, ...(cursor ? { id: { lt: cursor } } : {}) },
        orderBy: { id: "desc" },
        take: limit,
    });
    const ids = Array.from(new Set(events.flatMap(e => [e.actorId, e.targetId].filter(Boolean) as string[])));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        events: events.map(e => ({
            id: e.id, action: e.action, detail: e.detail, createdAt: e.createdAt,
            actor: pMap.get(e.actorId) ?? null,
            target: e.targetId ? (pMap.get(e.targetId) ?? null) : null,
        })),
        nextCursor: events.length === limit ? events[events.length - 1].id : null,
    });
}
