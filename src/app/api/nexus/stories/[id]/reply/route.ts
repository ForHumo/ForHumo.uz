import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/nexus-dm";
import { isBlockedBetween } from "@/lib/nexus-block";
import { banGuard } from "@/lib/moderation-guard";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { moderateDmMessage } from "@/lib/moderation-dm";
import { after } from "next/server";

// POST /api/nexus/stories/[id]/reply — story'ga DM javob (Instagram uslubi)
// body: { text: string, slideId?: string }
// Yaratiladigan xabar oddiy DM xabari — matn oldida "Story'ga javob:" prefixi bilan.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: storyId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { text } = (await req.json()) as { text?: string; slideId?: string };
    const clean = String(text || "").trim().slice(0, 2000);
    if (!clean) return NextResponse.json({ error: "Javob bo'sh bo'lmasin" }, { status: 400 });

    const story = await prisma.nexusStory.findUnique({
        where: { id: storyId }, select: { profileId: true, expiresAt: true },
    });
    if (!story) return NextResponse.json({ error: "Story topilmadi" }, { status: 404 });
    if (story.expiresAt < new Date()) return NextResponse.json({ error: "Story muddati tugagan" }, { status: 400 });
    if (story.profileId === me.id) return NextResponse.json({ error: "O'zingizga javob bera olmaysiz" }, { status: 400 });

    if (await isBlockedBetween(me.id, story.profileId)) {
        return NextResponse.json({ error: "Bu foydalanuvchiga xabar yubora olmaysiz" }, { status: 403 });
    }
    const banned = await banGuard(me.id); if (banned) return banned;
    // Reply DM xabari kabi hisoblanadi — dm rate-limit
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // 1:1 suhbatni topamiz/yaratamiz, keyin xabar yozamiz (story'ga havola bilan)
    const [u1, u2] = normalizePair(me.id, story.profileId);
    const conv = await prisma.nexusConversation.upsert({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        create: { user1Id: u1, user2Id: u2 },
        update: {},
    });

    const msg = await prisma.nexusMessage.create({
        data: {
            conversationId: conv.id,
            senderId: me.id,
            text: `[Story'ga javob] ${clean}`,
        },
    });
    await prisma.nexusConversation.update({
        where: { id: conv.id },
        data: {
            lastMessageAt: new Date(),
            lastMessageText: `Story: ${clean.slice(0, 100)}`,
            lastSenderId: me.id,
            ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
        },
    });

    // Story reply DM xabari kabi hisoblanadi — AI moderatsiya (yaqin do'st konteksti bilan)
    after(() => moderateDmMessage({
        messageId: msg.id,
        senderId: me.id,
        recipientId: story.profileId,
        text: msg.text,
    }));

    return NextResponse.json({ ok: true, conversationId: conv.id, messageId: msg.id });
}
