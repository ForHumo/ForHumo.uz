import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { normalizePair, otherId, hasUnread } from "@/lib/nexus-dm";
import { isBlockedBetween } from "@/lib/nexus-block";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// GET /api/nexus/messages — mening suhbatlarim
//   ?archived=1  — faqat arxivlanganlar
//   ?hidden=1    — faqat yashirin (vaqtinchalik o'chirilgan) chatlar
//   default      — arxivlanmagan va yashirilmaganlar
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ conversations: [], totalUnread: 0, archivedCount: 0, hiddenCount: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ conversations: [], totalUnread: 0, archivedCount: 0, hiddenCount: 0 });

    const url = new URL(req.url);
    const wantArchived = url.searchParams.get("archived") === "1";
    const wantHidden = url.searchParams.get("hidden") === "1";

    // Har foydalanuvchi uchun 'Saqlangan xabarlar' self-chat avto-yaratiladi (Telegram uslub)
    await prisma.nexusConversation.upsert({
        where: { user1Id_user2Id: { user1Id: me.id, user2Id: me.id } },
        create: { user1Id: me.id, user2Id: me.id, lastMessageText: null },
        update: {},
    });

    const convs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        orderBy: { lastMessageAt: "desc" }, take: 100,
    });
    const archivedCount = convs.filter(c =>
        c.user1Id === me.id ? !!c.archivedByUser1 : !!c.archivedByUser2
    ).length;
    const hiddenCount = convs.filter(c =>
        c.user1Id === me.id ? !!c.hiddenByUser1 : !!c.hiddenByUser2
    ).length;
    // Filtr: yashirin/arxiv (menga nisbatan)
    const filtered = convs.filter(c => {
        const isU1 = c.user1Id === me.id;
        const arch = isU1 ? !!c.archivedByUser1 : !!c.archivedByUser2;
        const hidden = isU1 ? !!c.hiddenByUser1 : !!c.hiddenByUser2;
        if (wantHidden) return hidden;
        if (wantArchived) return arch && !hidden;   // yashirin arxivda ham chiqmaydi
        return !arch && !hidden;
    });
    // Sort: 1) self-chat (Saqlangan) doim tepada, 2) pinlangan, 3) sana
    filtered.sort((a, b) => {
        const aSelf = a.user1Id === me.id && a.user2Id === me.id;
        const bSelf = b.user1Id === me.id && b.user2Id === me.id;
        if (aSelf && !bSelf) return -1;
        if (!aSelf && bSelf) return 1;
        const aPin = a.user1Id === me.id ? a.pinnedByUser1 : a.pinnedByUser2;
        const bPin = b.user1Id === me.id ? b.pinnedByUser1 : b.pinnedByUser2;
        if (aPin && !bPin) return -1;
        if (!aPin && bPin) return 1;
        if (aPin && bPin) return bPin.getTime() - aPin.getTime();
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
    const otherIds = [...new Set(filtered.map(c => otherId(c, me.id)))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: otherIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    let totalUnread = 0;
    const conversations = filtered.map(c => {
        const isSelf = c.user1Id === me.id && c.user2Id === me.id;
        const oid = isSelf ? me.id : otherId(c, me.id);
        const p = pMap[oid];
        const unread = isSelf ? false : hasUnread(c, me.id);
        const isUser1 = c.user1Id === me.id;
        const pinned = !!(isUser1 ? c.pinnedByUser1 : c.pinnedByUser2);
        const muted = !!(isUser1 ? c.mutedByUser1 : c.mutedByUser2);
        const archived = !!(isUser1 ? c.archivedByUser1 : c.archivedByUser2);
        // Muted chatlar unread badge'iga qo'shilmaydi (Telegram uslubi)
        if (unread && !muted) totalUnread++;
        return {
            conversationId: c.id,
            isSelf,
            other: isSelf
                ? { id: me.id, name: "Saqlangan xabarlar", username: null, image: null, verified: false, verifiedCategory: null }
                : p ? {
                    id: p.id, name: p.name, username: p.username, image: p.image,
                    verified: isVerifiedProfile(p),
                    verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
                } : null,
            lastMessageText: c.lastMessageText,
            lastMessageAt: c.lastMessageAt,
            lastMine: c.lastSenderId === me.id,
            unread,
            pinned,
            muted,
            archived,
        };
    });

    return NextResponse.json({ conversations, totalUnread, archivedCount, hiddenCount });
}

// POST /api/nexus/messages — suhbatni topish/yaratish ({username|profileId})
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json();
    const { username, profileId, selfChat } = body ?? {};
    let targetId: string | null = profileId ?? null;
    if (selfChat) targetId = me.id;
    if (!targetId && username) {
        const t = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        targetId = t?.id ?? null;
    }
    if (!targetId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    const isSelf = targetId === me.id;
    if (!isSelf) {
        if (await isBlockedBetween(me.id, targetId)) return NextResponse.json({ error: "Bu foydalanuvchiga yoza olmaysiz" }, { status: 403 });
    }
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
