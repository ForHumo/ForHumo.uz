// GET /api/nexus/agents/[id]/logs — so'nggi 100 webhook chaqiruv (owner only).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const agent = await prisma.nexusAgent.findUnique({
        where: { id }, select: { ownerId: true },
    });
    if (!agent) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const logs = await prisma.nexusAgentLog.findMany({
        where: { agentId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    return NextResponse.json({
        items: logs.map(l => ({
            id: l.id,
            event: l.event,
            ok: l.ok,
            statusCode: l.statusCode,
            elapsedMs: l.elapsedMs,
            error: l.error,
            preview: l.preview,
            createdAt: l.createdAt,
        })),
    });
}
