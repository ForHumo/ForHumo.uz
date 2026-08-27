// Guruh botlari (Nexus Agents kengaytmasi).
//   GET  /channels/[id]/bots                        — guruhdagi bot ro'yxati
//   POST /channels/[id]/bots  { agentId, autoListen? } — bot qo'shish (OWNER/ADMIN)
//   DELETE /channels/[id]/bots?agentId=X            — bot olib tashlash

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
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!member) return NextResponse.json({ bots: [] });

    const bots = await prisma.nexusChannelBot.findMany({
        where: { channelId: id }, orderBy: { createdAt: "asc" },
    });
    const agents = bots.length ? await prisma.nexusAgent.findMany({
        where: { id: { in: bots.map(b => b.agentId) } },
        select: { id: true, profileId: true },
    }) : [];
    const profiles = agents.length ? await prisma.userProfile.findMany({
        where: { id: { in: agents.map(a => a.profileId) } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));
    const aMap = new Map(agents.map(a => [a.id, {
        id: a.id,
        name: pMap.get(a.profileId)?.name ?? null,
        handle: pMap.get(a.profileId)?.username ?? null,
        avatarUrl: pMap.get(a.profileId)?.image ?? null,
        verified: false,
    }]));

    return NextResponse.json({
        canManage: member.role === "OWNER" || member.role === "ADMIN",
        bots: bots.map(b => ({
            id: b.id, agentId: b.agentId, autoListen: b.autoListen, createdAt: b.createdAt,
            agent: aMap.get(b.agentId) ?? null,
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
    const agentId = String(body?.agentId ?? "");
    const autoListen = !!body?.autoListen;
    if (!agentId) return NextResponse.json({ error: "agentId kerak" }, { status: 400 });

    const agent = await prisma.nexusAgent.findUnique({ where: { id: agentId }, select: { id: true, profileId: true } });
    if (!agent) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });
    const agentProfile = await prisma.userProfile.findUnique({ where: { id: agent.profileId }, select: { name: true, username: true } });

    const bot = await prisma.nexusChannelBot.upsert({
        where: { channelId_agentId: { channelId: id, agentId } },
        create: { channelId: id, agentId, addedById: me.id, autoListen },
        update: { autoListen },
    });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: `Bot qo'shildi: ${agentProfile?.name ?? agentProfile?.username ?? agentId}` });
    return NextResponse.json({ bot });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guardAdmin(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId kerak" }, { status: 400 });

    await prisma.nexusChannelBot.deleteMany({ where: { channelId: id, agentId } });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "change-info", detail: "Bot olib tashlandi" });
    return NextResponse.json({ ok: true });
}
