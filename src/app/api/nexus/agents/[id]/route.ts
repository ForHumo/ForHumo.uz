// Agentni o'chirish (yoki webhookUrl yangilash).
//   DELETE /api/nexus/agents/[id]         — faqat egasi
//   PATCH  /api/nexus/agents/[id]         body: { webhookUrl?, name?, image? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function meAndAgent(id: string) {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return { me: null, agent: null };
    const me = await prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
    if (!me) return { me: null, agent: null };
    const agent = await prisma.nexusAgent.findUnique({ where: { id }, include: { profile: true } });
    return { me, agent };
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { me, agent } = await meAndAgent(id);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (agent.isSystem) return NextResponse.json({ error: "Tizim agenti o'chirilmaydi" }, { status: 403 });

    // Agent profili va NexusAgent yozuvi bilan birga suhbatlarni ham o'chirish
    // (cascade orqali NexusMessage'lar ham ketadi)
    await prisma.userProfile.delete({ where: { id: agent.profileId } }).catch(() => null);
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { me, agent } = await meAndAgent(id);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (agent.isSystem) return NextResponse.json({ error: "Tizim agenti tahrirlanmaydi" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const webhookUrl = typeof body?.webhookUrl === "string" ? body.webhookUrl.trim().slice(0, 500) : undefined;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 50) : undefined;
    const image = typeof body?.image === "string" ? body.image.trim().slice(0, 500) : undefined;

    if (webhookUrl !== undefined) {
        await prisma.nexusAgent.update({ where: { id }, data: { webhookUrl: webhookUrl || null } });
    }
    if (name !== undefined || image !== undefined) {
        await prisma.userProfile.update({
            where: { id: agent.profileId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(image !== undefined ? { image } : {}),
            },
        });
    }
    return NextResponse.json({ ok: true });
}
