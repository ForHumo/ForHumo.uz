// Humo Live suhbatini tarixga saqlash — transkriptdan AiConversation + AiMessage yaratadi.
// POST /api/ai/live/save  { turns: [{ role: "user"|"ai", body }], lang? }
// Faqat kamida bitta foydalanuvchi gapi bo'lsa saqlanadi (bo'sh/salom-only session saqlanmaydi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const data = await req.json().catch(() => null) as { turns?: { role?: string; body?: string }[] } | null;
    const raw = Array.isArray(data?.turns) ? data!.turns! : [];
    const turns = raw
        .map(m => ({ role: m.role === "ai" ? "ai" : "user", body: String(m.body ?? "").trim().slice(0, 4000) }))
        .filter(m => m.body.length > 0)
        .slice(0, 200);   // xavfsizlik chegarasi

    const hasUser = turns.some(m => m.role === "user");
    if (turns.length === 0 || !hasUser) return NextResponse.json({ ok: false, skipped: true });

    const firstUser = turns.find(m => m.role === "user")?.body;
    const title = ((firstUser ?? turns[0].body).replace(/\s+/g, " ").slice(0, 60)) || "Jonli suhbat";

    const conv = await prisma.aiConversation.create({
        data: {
            profileId: me.id,
            title,
            mode: "chat",            // asosiy chat tarixida ko'rinsin
            moduleOrigin: "live",    // jonli suhbatdan — belgilash uchun
            lastMsgAt: new Date(),
            messages: { create: turns.map(m => ({ role: m.role, body: m.body })) },
        },
        select: { id: true },
    });

    return NextResponse.json({ ok: true, conversationId: conv.id });
}
