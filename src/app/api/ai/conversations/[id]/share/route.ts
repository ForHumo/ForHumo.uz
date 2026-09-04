// AI suhbat share link — foydalanuvchi shareId yaratadi/o'chiradi.
// POST /api/ai/conversations/[id]/share — shareId generate (random 32 hex)
// DELETE — shareId ni null qilib qo'yish (link ishlamaydi)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

async function requireOwner(id: string, email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const conv = await prisma.aiConversation.findFirst({
        where: { id, profileId: me.id },
        select: { id: true, shareId: true },
    });
    return conv;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const conv = await requireOwner(id, session.user.email);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Agar allaqachon share bo'lsa — mavjud shareId qaytaramiz
    if (conv.shareId) {
        return NextResponse.json({ shareId: conv.shareId, url: `/ai/c/${conv.shareId}` });
    }

    // Yangi shareId — 32 hex = 128 bit random
    const shareId = randomBytes(16).toString("hex");
    await prisma.aiConversation.update({
        where: { id },
        data: { shareId, sharedAt: new Date() },
    });

    return NextResponse.json({ shareId, url: `/ai/c/${shareId}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const conv = await requireOwner(id, session.user.email);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.aiConversation.update({
        where: { id },
        data: { shareId: null, sharedAt: null },
    });
    return NextResponse.json({ ok: true });
}
