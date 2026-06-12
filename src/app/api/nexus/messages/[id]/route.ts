import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { otherId } from "@/lib/nexus-dm";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { isBlockedBetween } from "@/lib/nexus-block";

async function meAndConv(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, conv: null };
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    return { me, conv };
}

// GET /api/nexus/messages/[id] — xabarlar + o'qildi belgilash
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const messages = await prisma.nexusMessage.findMany({
        where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 100,
    });

    // o'qildi
    await prisma.nexusConversation.update({
        where: { id },
        data: conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() },
    });

    const oid = otherId(conv, me.id);
    const p = await prisma.userProfile.findUnique({ where: { id: oid }, select: { name: true, username: true, image: true, humoId: true, verified: true } });

    return NextResponse.json({
        messages: messages.map(m => ({ id: m.id, text: m.text, mine: m.senderId === me.id, createdAt: m.createdAt })),
        other: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
    });
}

// POST /api/nexus/messages/[id] — xabar yuborish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    if (await isBlockedBetween(me.id, otherId(conv, me.id))) return NextResponse.json({ error: "Bu suhbatga yoza olmaysiz" }, { status: 403 });

    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Xabar bo'sh bo'lmasin" }, { status: 400 });
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    const clean = String(text).trim().slice(0, 2000);

    const msg = await prisma.nexusMessage.create({ data: { conversationId: id, senderId: me.id, text: clean } });
    await prisma.nexusConversation.update({
        where: { id },
        data: {
            lastMessageAt: new Date(),
            lastMessageText: clean.slice(0, 120),
            lastSenderId: me.id,
            ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
        },
    });

    return NextResponse.json({ message: { id: msg.id, text: msg.text, mine: true, createdAt: msg.createdAt } });
}
