// Yopiq guruh kirish so'rovlari — OWNER/ADMIN boshqaradi.
//   GET   /channels/[id]/join-requests           — PENDING so'rovlar (profil bilan)
//   PATCH /channels/[id]/join-requests { requestId, decision: "APPROVE"|"REJECT" }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

async function guard(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } },
        select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) return null;
    return me;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const requests = await prisma.nexusChannelJoinRequest.findMany({
        where: { channelId: id, status: "PENDING" },
        orderBy: { createdAt: "asc" }, take: 100,
    });
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: requests.map(r => r.profileId) } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        requests: requests.map(r => ({
            id: r.id, profileId: r.profileId, message: r.message, createdAt: r.createdAt,
            profile: pMap.get(r.profileId) ?? null,
        })),
        pendingCount: requests.length,
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.requestId ?? "");
    const decision = String(body?.decision ?? "");
    if (!requestId || (decision !== "APPROVE" && decision !== "REJECT")) {
        return NextResponse.json({ error: "requestId va decision kerak" }, { status: 400 });
    }

    const request = await prisma.nexusChannelJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (request.status !== "PENDING") return NextResponse.json({ ok: true, alreadyDecided: true });

    if (decision === "APPROVE") {
        await prisma.$transaction([
            prisma.nexusChannelMember.upsert({
                where: { channelId_profileId: { channelId: id, profileId: request.profileId } },
                create: { channelId: id, profileId: request.profileId, role: "MEMBER" },
                update: {},
            }),
            prisma.nexusChannel.update({ where: { id }, data: { memberCount: { increment: 1 } } }),
            prisma.nexusChannelJoinRequest.update({
                where: { id: requestId },
                data: { status: "APPROVED", decidedAt: new Date(), decidedById: me.id },
            }),
        ]);
        await logChannelAudit({ channelId: id, actorId: me.id, action: "approve-join", targetId: request.profileId });
    } else {
        await prisma.nexusChannelJoinRequest.update({
            where: { id: requestId },
            data: { status: "REJECTED", decidedAt: new Date(), decidedById: me.id },
        });
        await logChannelAudit({ channelId: id, actorId: me.id, action: "reject-join", targetId: request.profileId });
    }
    return NextResponse.json({ ok: true });
}
