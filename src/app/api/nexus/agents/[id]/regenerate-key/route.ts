// Agent API kalitini qayta yaratish. Faqat agent egasi.
// Eski kalit darhol ishlamay qoladi — foydalanuvchi yangisini o'z serveriga
// joylashi kerak. Bir marta ko'rsatiladi (JSON javobda), hash saqlanmaydi.
//
//   POST /api/nexus/agents/[id]/regenerate-key

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/agent-webhook";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: s.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const agent = await prisma.nexusAgent.findUnique({
        where: { id }, select: { id: true, ownerId: true, isSystem: true },
    });
    if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 404 });
    if (agent.isSystem) return NextResponse.json({ error: "Tizim agentini o'zgartirib bo'lmaydi" }, { status: 403 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const apiKey = generateApiKey();
    await prisma.nexusAgent.update({ where: { id }, data: { apiKey } });

    return NextResponse.json({ ok: true, apiKey });
}
