// Broadcast yuborish — ro'yxatdagi barcha a'zolarga individual DM tarzida.
// Qabul qiluvchi buni oddiy shaxsiy xabar deb ko'radi (WhatsApp uslub).
//
//   POST /api/nexus/broadcast/[id]/send   Body: { text, mediaUrl?, mediaType?, mediaMime?, mediaName?, mediaSize? }
//   → { sent: number, skipped: [{ profileId, reason }], total: number }
//
// Skip sabablari: BLOCKED (blok), PRIVACY (privacyDm=none/contacts), NOT_FOUND (profil o'chgan).
// Broadcast'ni ratelim: min 60s intervaldan ko'p tez-tez ishlatib bo'lmaydi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { after } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/nexus-dm";
import { isBlockedBetween } from "@/lib/nexus-block";
import { checkPrivacy } from "@/lib/privacy";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

interface SkipEntry { profileId: string; reason: "BLOCKED" | "PRIVACY" | "NOT_FOUND" }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, name: true, username: true, image: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const list = await prisma.nexusBroadcastList.findUnique({
        where: { id }, select: { id: true, ownerId: true, name: true },
    });
    if (!list) return NextResponse.json({ error: "Ro'yxat topilmadi" }, { status: 404 });
    if (list.ownerId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 2000);
    const mediaUrl  = typeof body?.mediaUrl === "string" ? body.mediaUrl : null;
    const mediaType = typeof body?.mediaType === "string" ? body.mediaType : null;
    const mediaMime = typeof body?.mediaMime === "string" ? body.mediaMime : null;
    const mediaName = typeof body?.mediaName === "string" ? body.mediaName : null;
    const mediaSize = typeof body?.mediaSize === "number" ? body.mediaSize : null;
    const hasMedia = !!(mediaUrl && mediaType);
    if (!text && !hasMedia) return NextResponse.json({ error: "Xabar bo'sh bo'lmasin" }, { status: 400 });

    // Media turi cheklovi (broadcast'da faqat oddiy media, joylashuv/so'rovnoma/o'tkazma yo'q)
    const VALID_TYPES = ["image", "video", "audio", "file", "video-circle"];
    if (mediaType && !VALID_TYPES.includes(mediaType)) {
        return NextResponse.json({ error: "Noto'g'ri media turi" }, { status: 400 });
    }

    if (await nexusRateLimited(me.id, "broadcast")) {
        return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    }

    const members = await prisma.nexusBroadcastListMember.findMany({
        where: { listId: id },
        select: { profileId: true },
    });
    if (members.length === 0) return NextResponse.json({ error: "Ro'yxat bo'sh" }, { status: 400 });

    // Barcha qabul qiluvchilar profil va privacy'sini bir marta yig'ib olamiz
    const recipientIds = members.map(m => m.profileId);
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, privacyDm: true },
    });
    const profMap = new Map(profiles.map(p => [p.id, p]));

    const skipped: SkipEntry[] = [];
    const okRecipients: string[] = [];

    for (const rid of recipientIds) {
        const p = profMap.get(rid);
        if (!p) { skipped.push({ profileId: rid, reason: "NOT_FOUND" }); continue; }
        if (await isBlockedBetween(me.id, rid)) { skipped.push({ profileId: rid, reason: "BLOCKED" }); continue; }
        if (p.privacyDm !== "all") {
            // Oldingi xabarlar bo'lsa (qabul qiluvchi javob bergan) — o'tkazamiz
            const [u1, u2] = normalizePair(me.id, rid);
            const conv = await prisma.nexusConversation.findUnique({
                where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } }, select: { id: true },
            });
            let hasPrior = false;
            if (conv) {
                hasPrior = (await prisma.nexusMessage.count({
                    where: { conversationId: conv.id, senderId: rid },
                })) > 0;
            }
            if (!hasPrior) {
                const allowed = await checkPrivacy(me.id, rid, p.privacyDm as "all" | "contacts" | "none");
                if (!allowed) { skipped.push({ profileId: rid, reason: "PRIVACY" }); continue; }
            }
        }
        okRecipients.push(rid);
    }

    if (okRecipients.length === 0) {
        return NextResponse.json({ sent: 0, skipped, total: recipientIds.length });
    }

    // Har biriga suhbat topish/yaratish + xabar joylash. Bir necha DB round-trip'da qilamiz.
    const senderSnapshot = {
        id: me.id,
        name: me.name,
        username: me.username,
        image: me.image,
    };
    const now = new Date();
    const createdMsgs: Array<{ id: string; conversationId: string; recipientId: string; text: string }> = [];

    for (const rid of okRecipients) {
        const [u1, u2] = normalizePair(me.id, rid);
        const conv = await prisma.nexusConversation.upsert({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
            create: { user1Id: u1, user2Id: u2 },
            update: {},
            select: { id: true },
        });
        const msg = await prisma.nexusMessage.create({
            data: {
                conversationId:  conv.id,
                senderId:        me.id,
                text,
                mediaUrl:        mediaUrl ?? undefined,
                mediaType:       mediaType ?? undefined,
                mediaMime:       mediaMime ?? undefined,
                mediaName:       mediaName ?? undefined,
                mediaSize:       mediaSize ?? undefined,
                broadcastListId: id,
            },
            select: { id: true, text: true, createdAt: true },
        });
        await prisma.nexusConversation.update({
            where: { id: conv.id },
            data:  { lastMessageAt: now, lastMessageText: text || (mediaType ?? ""), lastSenderId: me.id },
        });
        createdMsgs.push({ id: msg.id, conversationId: conv.id, recipientId: rid, text: msg.text });
    }

    // Real-time push — background
    after(async () => {
        await Promise.all(createdMsgs.map(m =>
            pusherTrigger(userChannel(m.recipientId), "nx:msg:new", {
                messageId:      m.id,
                conversationId: m.conversationId,
                senderId:       me.id,
                sender:         senderSnapshot,
                text:           m.text,
                mediaType:      mediaType,
                mediaUrl:       mediaUrl,
                createdAt:      now.toISOString(),
            }),
        ));
    });

    return NextResponse.json({
        sent: createdMsgs.length,
        skipped,
        total: recipientIds.length,
    });
}
