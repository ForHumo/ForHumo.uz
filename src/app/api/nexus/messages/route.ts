import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { normalizePair, otherId, hasUnread } from "@/lib/nexus-dm";
import { isBlockedBetween } from "@/lib/nexus-block";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// GET /api/nexus/messages — mening suhbatlarim
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ conversations: [], totalUnread: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ conversations: [], totalUnread: 0 });

    const convs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        orderBy: { lastMessageAt: "desc" }, take: 50,
    });
    const otherIds = [...new Set(convs.map(c => otherId(c, me.id)))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: otherIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    let totalUnread = 0;
    const conversations = convs.map(c => {
        const oid = otherId(c, me.id);
        const p = pMap[oid];
        const unread = hasUnread(c, me.id);
        if (unread) totalUnread++;
        return {
            conversationId: c.id,
            other: p ? {
                id: p.id, name: p.name, username: p.username, image: p.image,
                verified: isVerifiedProfile(p),
                verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
            } : null,
            lastMessageText: c.lastMessageText,
            lastMessageAt: c.lastMessageAt,
            lastMine: c.lastSenderId === me.id,
            unread,
        };
    });

    return NextResponse.json({ conversations, totalUnread });
}

// POST /api/nexus/messages — suhbatni topish/yaratish ({username|profileId})
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { username, profileId } = await req.json();
    let targetId: string | null = profileId ?? null;
    if (!targetId && username) {
        const t = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        targetId = t?.id ?? null;
    }
    if (!targetId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (targetId === me.id) return NextResponse.json({ error: "O'zingizga yoza olmaysiz" }, { status: 400 });
    if (await isBlockedBetween(me.id, targetId)) return NextResponse.json({ error: "Bu foydalanuvchiga yoza olmaysiz" }, { status: 403 });
    if (await nexusRateLimited(me.id, "convStart")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const [u1, u2] = normalizePair(me.id, targetId);
    const conv = await prisma.nexusConversation.upsert({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        create: { user1Id: u1, user2Id: u2 },
        update: {},
    });

    const p = await prisma.userProfile.findUnique({ where: { id: targetId }, select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } });
    return NextResponse.json({
        conversationId: conv.id,
        other: p ? {
            name: p.name, username: p.username, image: p.image,
            verified: isVerifiedProfile(p),
            verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
        } : null,
    });
}
