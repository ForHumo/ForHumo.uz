// Suhbatni vaqtinchalik yashirish (tekshiruv rejimi).
//   POST /api/nexus/messages/[convId]/hide     — yashirish
//   DELETE /api/nexus/messages/[convId]/hide   — yashirishni bekor qilish
//
// Chat butunlay ro'yxatdan g'oyib bo'ladi (All, DM, Arxiv, hech qayerda). Xabarlar
// DB'da saqlanadi. "Yashirin chatlar" bo'limi orqali qaytariladi. Faqat men uchun.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function meAndConv(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return { error: "Profil topilmadi", status: 404 as const };
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return { error: "Suhbat topilmadi", status: 404 as const };
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return { error: "Ruxsat yo'q", status: 403 as const };
    }
    return { me, conv };
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const r = await meAndConv(id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    const { me, conv } = r;
    const isU1 = conv.user1Id === me.id;
    await prisma.nexusConversation.update({
        where: { id },
        data: isU1 ? { hiddenByUser1: new Date() } : { hiddenByUser2: new Date() },
    });
    return NextResponse.json({ ok: true, hidden: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const r = await meAndConv(id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    const { me, conv } = r;
    const isU1 = conv.user1Id === me.id;
    await prisma.nexusConversation.update({
        where: { id },
        data: isU1 ? { hiddenByUser1: null } : { hiddenByUser2: null },
    });
    return NextResponse.json({ ok: true, hidden: false });
}
