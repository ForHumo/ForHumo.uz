import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Draft cross-device sync — foydalanuvchi yozayotgan matni server tomonida saqlanadi.
// Har foydalanuvchi (user1/user2) alohida draft.
// GET  → { draft: string, updatedAt: string | null }
// PATCH → { text: string } — bo'sh string tozalaydi

async function meAndConv(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, conv: null };
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    return { me, conv };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me || !conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const isUser1 = conv.user1Id === me.id;
    return NextResponse.json({
        draft: (isUser1 ? conv.draftUser1 : conv.draftUser2) ?? "",
        updatedAt: isUser1 ? conv.draftUser1At : conv.draftUser2At,
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me || !conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const body = (await req.json()) as { text?: string };
    const text = String(body.text ?? "").slice(0, 2000);
    const isUser1 = conv.user1Id === me.id;
    const now = text ? new Date() : null;
    await prisma.nexusConversation.update({
        where: { id },
        data: isUser1
            ? { draftUser1: text || null, draftUser1At: now }
            : { draftUser2: text || null, draftUser2At: now },
    });
    return NextResponse.json({ ok: true });
}
