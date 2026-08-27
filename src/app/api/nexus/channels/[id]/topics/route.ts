// Guruh mavzulari (Telegram Forums uslub).
//   GET  /channels/[id]/topics             — barcha mavzular ro'yxati
//   POST /channels/[id]/topics { name, icon? }  — yangi mavzu (OWNER/ADMIN)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

async function guardAdmin(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) return null;
    return me;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ topics: [] });

    const rawTopics = await prisma.nexusChannelTopic.findMany({
        where: { channelId: id },
    });
    // Har mavzuda oxirgi xabar vaqti + soni
    const stats = await prisma.nexusChannelMessage.groupBy({
        by: ["topicId"],
        where: { channelId: id, hidden: false, deletedForEveryoneAt: null, topicId: { in: rawTopics.map(t => t.id) } },
        _count: { _all: true },
        _max: { createdAt: true },
    });
    const statsMap = new Map(stats.map(s => [s.topicId, { count: s._count._all, lastAt: s._max.createdAt }]));

    // Sortlash: oxirgi xabar vaqti bo'yicha desc, xabar yo'q bo'lsa createdAt desc
    const topics = rawTopics.sort((a, b) => {
        const aLast = statsMap.get(a.id)?.lastAt?.getTime() ?? a.createdAt.getTime();
        const bLast = statsMap.get(b.id)?.lastAt?.getTime() ?? b.createdAt.getTime();
        return bLast - aLast;
    });

    return NextResponse.json({
        topics: topics.map(t => ({
            id: t.id, name: t.name, icon: t.icon, closed: t.closed, createdAt: t.createdAt,
            messageCount: statsMap.get(t.id)?.count ?? 0,
            lastMessageAt: statsMap.get(t.id)?.lastAt ?? null,
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guardAdmin(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 80);
    const icon = typeof body?.icon === "string" ? body.icon.slice(0, 40) : null;
    if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });

    const topic = await prisma.nexusChannelTopic.create({
        data: { channelId: id, name, icon, createdById: me.id },
    });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: `Mavzu: ${name}` });
    return NextResponse.json({ topic });
}
