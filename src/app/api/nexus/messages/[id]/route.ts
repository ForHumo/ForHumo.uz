import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { otherId } from "@/lib/nexus-dm";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { isBlockedBetween } from "@/lib/nexus-block";
import { checkBanned, moderateDmMessage } from "@/lib/moderation-dm";
import { BAN_LABELS } from "@/lib/moderation-ladder";
import { appendUserReplyToOpenReview } from "@/lib/agent-review-followup";
import { sendPushToProfile, pushAvailable } from "@/lib/push";
import { sendToAgentWebhook } from "@/lib/agent-webhook";

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

    // Eng yangi 100 xabar (desc) — keyin klient uchun xronologik tartibga (asc) qaytaramiz.
    // Avval asc edi → 100+ xabarli suhbatda eng yangilari ko'rinmay qolardi.
    // Self-destruct: muddati o'tgan xabarlarni chiqarmaymiz.
    // Jadvalga qo'yilgan xabarlar faqat jo'natuvchining o'ziga ko'rinadi (draft-like).
    // Tozalangan (clearedBeforeUserN) suhbatlar shu vaqtdan oldingi xabarlarni yashiradi.
    const now = new Date();
    const clearedBefore = conv.user1Id === me.id ? conv.clearedBeforeUser1 : conv.clearedBeforeUser2;
    const recent = await prisma.nexusMessage.findMany({
        where: {
            conversationId: id,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            AND: [
                { OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }, { senderId: me.id }] },
                ...(clearedBefore ? [{ createdAt: { gt: clearedBefore } }] : []),
            ],
        },
        orderBy: { createdAt: "desc" }, take: 100,
    });
    const messages = recent.reverse();
    // Fon rejimda: allaqachon muddati o'tgan xabarlarni tozalash (fire-and-forget)
    prisma.nexusMessage.deleteMany({
        where: { conversationId: id, expiresAt: { lte: now } },
    }).catch(() => {});
    // Muddati kelgan jadvalli xabarlarni "faollashtirish" — cron kelgunga qadar
    prisma.nexusMessage.updateMany({
        where: { conversationId: id, scheduledFor: { lte: now, not: null } },
        data: { scheduledFor: null },
    }).catch(() => {});

    // Poll xabarlar uchun ovoz statistikasini yig'ish
    const pollMsgIds = messages.filter(m => m.mediaType === "poll").map(m => m.id);
    const pollVotesMap = new Map<string, { counts: number[]; myVotes: number[]; total: number }>();
    if (pollMsgIds.length > 0) {
        const allVotes = await prisma.nexusDmPollVote.findMany({
            where: { messageId: { in: pollMsgIds } },
            select: { messageId: true, profileId: true, optionIndex: true },
        });
        for (const pmId of pollMsgIds) {
            const msg = messages.find(x => x.id === pmId)!;
            const votes = allVotes.filter(v => v.messageId === pmId);
            const counts = msg.pollOptions.map((_, i) => votes.filter(v => v.optionIndex === i).length);
            const myVotes = votes.filter(v => v.profileId === me.id).map(v => v.optionIndex);
            const total = new Set(votes.map(v => v.profileId)).size;
            pollVotesMap.set(pmId, { counts, myVotes, total });
        }
    }

    // Reaksiyalar (agar bor bo'lsa)
    const allReactions = await prisma.nexusMessageReaction.findMany({
        where: { messageId: { in: messages.map(m => m.id) } },
        select: { messageId: true, emoji: true, profileId: true },
    });
    // Mening bookmark qilgan xabarlarim (shu suhbatda)
    const myBookmarks = await prisma.nexusMessageBookmark.findMany({
        where: { profileId: me.id, messageId: { in: messages.map(m => m.id) } },
        select: { messageId: true },
    });
    const bookmarkedSet = new Set(myBookmarks.map(b => b.messageId));
    const reactionMap = new Map<string, Map<string, { count: number; mine: boolean }>>();
    for (const r of allReactions) {
        if (!reactionMap.has(r.messageId)) reactionMap.set(r.messageId, new Map());
        const m2 = reactionMap.get(r.messageId)!;
        const cur = m2.get(r.emoji) ?? { count: 0, mine: false };
        cur.count++;
        if (r.profileId === me.id) cur.mine = true;
        m2.set(r.emoji, cur);
    }

    // Reply preview: replyToId'lar → xabar snapshot (matn, sender)
    const replyIds = messages.map(m => m.replyToId).filter((x): x is string => !!x);
    const replyMap = new Map<string, { id: string; text: string; senderName: string | null; mine: boolean }>();
    if (replyIds.length) {
        const originals = await prisma.nexusMessage.findMany({
            where: { id: { in: [...new Set(replyIds)] } },
            select: { id: true, text: true, senderId: true },
        });
        const senderIds = [...new Set(originals.map(o => o.senderId))];
        const senders = await prisma.userProfile.findMany({
            where: { id: { in: senderIds } }, select: { id: true, name: true, username: true },
        });
        const senderMap = new Map(senders.map(s => [s.id, s.name ?? s.username ?? ""]));
        for (const o of originals) {
            replyMap.set(o.id, {
                id: o.id,
                text: (o.text ?? "").slice(0, 120),
                senderName: senderMap.get(o.senderId) ?? null,
                mine: o.senderId === me.id,
            });
        }
    }

    // Peer'ning oxirgi o'qigan vaqti (mening xabarlarim uchun 2 ptichka hisoblash)
    const peerReadAt = conv.user1Id === me.id ? conv.user2ReadAt : conv.user1ReadAt;

    // o'qildi (menikini — yangilash)
    await prisma.nexusConversation.update({
        where: { id },
        data: conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() },
    });

    const oid = otherId(conv, me.id);
    const p = await prisma.userProfile.findUnique({
        where: { id: oid },
        select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true, statusEmoji: true, statusText: true, statusExpiresAt: true },
    });
    // Muddati o'tgan statusni yashirish
    const statusActive = p?.statusExpiresAt ? new Date(p.statusExpiresAt) > new Date() : true;

    return NextResponse.json({
        messages: messages.map(m => {
            const pv = pollVotesMap.get(m.id);
            return {
                id: m.id, text: m.text, mine: m.senderId === me.id, createdAt: m.createdAt,
                mediaUrl: m.mediaUrl, mediaType: m.mediaType, mediaMime: m.mediaMime,
                mediaName: m.mediaName, mediaSize: m.mediaSize, durationMs: m.durationMs,
                locLat: m.locLat, locLng: m.locLng, locUpdatedAt: m.locUpdatedAt, locExpiresAt: m.locExpiresAt,
                pollQuestion: m.pollQuestion, pollOptions: m.pollOptions, pollExpiresAt: m.pollExpiresAt, pollMulti: m.pollMulti,
                pollVoteCounts: pv?.counts ?? null, pollMyVotes: pv?.myVotes ?? null, pollTotal: pv?.total ?? null,
                transferAmount: m.transferAmount ? Number(m.transferAmount) : null,
                transferCurrency: m.transferCurrency, transferNote: m.transferNote,
                agentKind: m.agentKind, agentPayload: m.agentPayload, agentActionRef: m.agentActionRef,
                replyTo: m.replyToId ? (replyMap.get(m.replyToId) ?? null) : null,
                editedAt: m.editedAt,
                pinnedAt: m.pinnedAt,
                expiresAt: m.expiresAt,
                scheduledFor: m.scheduledFor,
                bookmarked: bookmarkedSet.has(m.id),
                reactions: reactionMap.get(m.id)
                    ? [...reactionMap.get(m.id)!.entries()].map(([emoji, s]) => ({ emoji, count: s.count, mine: s.mine }))
                    : [],
                forwardedFromId: m.forwardedFromId,
                forwardedFromName: m.forwardedFromName,
            };
        }),
        other: p ? {
            name: p.name, username: p.username, image: p.image,
            verified: isVerifiedProfile(p),
            verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
            statusEmoji: statusActive ? p.statusEmoji : null,
            statusText: statusActive ? p.statusText : null,
        } : null,
        peerReadAt,
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

    // AI moderation bloki tekshiruvi — foydalanuvchi aktiv ban ostidami?
    const banCheck = await checkBanned(me.id);
    if (banCheck.banned) {
        const { ban } = banCheck;
        const remaining = ban.expiresAt
            ? `${BAN_LABELS[ban.level]} (${ban.expiresAt.toLocaleString("uz-UZ")} gacha)`
            : "Abadiy";
        return NextResponse.json({
            error: `Sizga xabar jo'natish taqiqlangan. Muddat: ${remaining}. Sabab: ${ban.reason}. Adolatsiz deb hisoblasangiz, ariza berishingiz mumkin.`,
            code: "USER_BANNED",
            banId: ban.id,
            expiresAt: ban.expiresAt,
            reason: ban.reason,
            category: ban.category,
            level: ban.level,
        }, { status: 403 });
    }

    const body = (await req.json()) as {
        text?: string;
        mediaUrl?: string; mediaType?: string; mediaMime?: string;
        mediaName?: string; mediaSize?: number; durationMs?: number;
        locLat?: number; locLng?: number; locExpiresAt?: string | null;
        pollQuestion?: string; pollOptions?: string[]; pollExpiresAt?: string | null; pollMulti?: boolean;
        replyToId?: string;
        selfDestructSeconds?: number;                          // TTL — shu sekunddan keyin o'chadi
        scheduledFor?: string;                                 // ISO vaqt — jadvalga qo'yish
        forwardedFromId?: string;                              // Forward: asl yozuvchi profil ID
        forwardedFromName?: string;                            // Forward: asl yozuvchi ismi/username (snapshot)
    };
    const text = String(body.text ?? "").trim();
    const isLocation = body.mediaType === "location" && typeof body.locLat === "number" && typeof body.locLng === "number";
    const isPoll = body.mediaType === "poll" && !!body.pollQuestion?.trim() && Array.isArray(body.pollOptions) && body.pollOptions.length >= 2 && body.pollOptions.length <= 10;
    const hasMedia = (!!body.mediaUrl && !!body.mediaType) || isLocation || isPoll;
    if (!text && !hasMedia) return NextResponse.json({ error: "Xabar bo'sh bo'lmasin" }, { status: 400 });
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    const clean = text.slice(0, 2000);

    // Media turini tekshirish (faqat ruxsat etilgan qiymatlar)
    const VALID_TYPES = ["image", "video", "audio", "file", "video-circle", "location", "poll"];
    if (body.mediaType && !VALID_TYPES.includes(body.mediaType)) {
        return NextResponse.json({ error: "Noto'g'ri media turi" }, { status: 400 });
    }

    // Reply — mavjud xabar aynan shu suhbatga tegishli bo'lishi shart
    let replyToId: string | null = null;
    if (typeof body.replyToId === "string" && body.replyToId) {
        const target = await prisma.nexusMessage.findUnique({
            where: { id: body.replyToId }, select: { id: true, conversationId: true },
        });
        if (target && target.conversationId === id) replyToId = target.id;
    }

    // Self-destruct: 5s..24soat oralig'ida ruxsat
    const ttl = typeof body.selfDestructSeconds === "number"
        ? Math.max(5, Math.min(86400, Math.floor(body.selfDestructSeconds)))
        : null;
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    // Jadvalga qo'yish — kelajakdagi vaqt bo'lishi shart (kamida 30s'dan keyin, maks 30 kun)
    let scheduledFor: Date | null = null;
    if (typeof body.scheduledFor === "string" && body.scheduledFor) {
        const t = new Date(body.scheduledFor);
        const nowMs = Date.now();
        if (!isNaN(t.getTime()) && t.getTime() > nowMs + 30_000 && t.getTime() < nowMs + 30 * 86400 * 1000) {
            scheduledFor = t;
        } else {
            return NextResponse.json({ error: "Jadval vaqti kamida 30 sekunddan keyin va 30 kundan oldin bo'lishi kerak" }, { status: 400 });
        }
    }

    // Forward: asl yozuvchi profil ID va nom snapshot (agar berilgan bo'lsa)
    const forwardedFromId = typeof body.forwardedFromId === "string" ? body.forwardedFromId : null;
    const forwardedFromName = typeof body.forwardedFromName === "string"
        ? body.forwardedFromName.trim().slice(0, 80) || null
        : null;

    const msg = await prisma.nexusMessage.create({
        data: {
            conversationId: id,
            senderId: me.id,
            text: clean,
            replyToId,
            expiresAt,
            scheduledFor,
            forwardedFromId,
            forwardedFromName,
            mediaUrl: hasMedia && !isLocation && !isPoll ? body.mediaUrl : null,
            mediaType: hasMedia ? body.mediaType : null,
            mediaMime: hasMedia && !isLocation && !isPoll ? (body.mediaMime ?? null) : null,
            mediaName: hasMedia && !isLocation && !isPoll ? (body.mediaName ?? null)?.slice(0, 200) : null,
            mediaSize: hasMedia && !isLocation && !isPoll && typeof body.mediaSize === "number" ? Math.max(0, Math.floor(body.mediaSize)) : null,
            durationMs: hasMedia && typeof body.durationMs === "number" ? Math.max(0, Math.floor(body.durationMs)) : null,
            locLat: isLocation ? body.locLat : null,
            locLng: isLocation ? body.locLng : null,
            locUpdatedAt: isLocation ? new Date() : null,
            locExpiresAt: isLocation && body.locExpiresAt ? new Date(body.locExpiresAt) : null,
            pollQuestion: isPoll ? body.pollQuestion!.trim().slice(0, 300) : null,
            pollOptions: isPoll ? body.pollOptions!.map(o => String(o).trim().slice(0, 100)).filter(Boolean).slice(0, 10) : [],
            pollExpiresAt: isPoll && body.pollExpiresAt ? new Date(body.pollExpiresAt) : null,
            pollMulti: isPoll ? !!body.pollMulti : false,
        },
    });

    // Suhbat ro'yxatida ko'rinadigan preview matni
    const previewLabels: Record<string, string> = {
        image: "Rasm", video: "Video", audio: "Ovozli xabar", file: "Fayl", "video-circle": "Dumaloq video",
        location: body.locExpiresAt ? "Jonli joylashuv" : "Joylashuv",
        poll: "So'rovnoma",
    };
    const preview = clean
        || (hasMedia ? (previewLabels[body.mediaType!] || "Media") : "")
        || "...";

    // Jadvalga qo'yilgan xabar suhbat preview'ini yangilamaydi — hali yuborilmagan
    if (!scheduledFor) {
        await prisma.nexusConversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                lastMessageText: preview.slice(0, 120),
                lastSenderId: me.id,
                ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
            },
        });
    }

    // AI moderatsiya asinxron ishga tushiriladi — javobni kechiktirmaydi
    after(async () => {
        await moderateDmMessage({
            messageId: msg.id,
            senderId: me.id,
            recipientId: otherId(conv, me.id),
            text: msg.text,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.mediaType,
        });
    });

    // Agent-review follow-up: agar suhbat @market_agent bilan bo'lsa va oxirgi
    // agent kartasida sharh yaratilgan bo'lsa, ushbu javob mediasi/matni
    // avtomatik ushbu sharhga qo'shiladi.
    after(() => appendUserReplyToOpenReview({
        conversationId: id,
        senderId: me.id,
        text: clean,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
    }));

    // Agent webhook — qabul qiluvchi agent bo'lsa, uning webhookUrl'iga POST.
    // Javob bo'lsa yangi agent xabari sifatida suhbatga yoziladi.
    if (!scheduledFor) {
        after(async () => {
            const recipientId = otherId(conv, me.id);
            const agent = await prisma.nexusAgent.findUnique({
                where: { profileId: recipientId },
                select: { profileId: true, webhookUrl: true, apiKey: true },
            });
            if (!agent || !agent.webhookUrl || !agent.apiKey) return;

            const senderProfile = await prisma.userProfile.findUnique({
                where: { id: me.id }, select: { username: true, name: true },
            });

            const reply = await sendToAgentWebhook(agent, {
                event: "message.created",
                chatId: id,
                messageId: msg.id,
                from: {
                    profileId: me.id,
                    username: senderProfile?.username ?? null,
                    name: senderProfile?.name ?? null,
                },
                text: msg.text,
                mediaUrl: msg.mediaUrl,
                mediaType: msg.mediaType,
                timestamp: Math.floor(Date.now() / 1000),
            });
            if (!reply) return;

            // Agent javobi — o'sha suhbatga yangi xabar
            const agentMsg = await prisma.nexusMessage.create({
                data: {
                    conversationId: id,
                    senderId: recipientId,
                    text: reply.text ?? "",
                    mediaUrl: reply.mediaUrl ?? null,
                    mediaType: reply.mediaType ?? null,
                    mediaMime: reply.mediaMime ?? null,
                    mediaName: reply.mediaName ?? null,
                },
                select: { id: true, text: true, mediaType: true },
            });
            const agentPreview = agentMsg.text || (agentMsg.mediaType ? `[${agentMsg.mediaType}]` : "Yangi xabar");
            await prisma.nexusConversation.update({
                where: { id },
                data: {
                    lastMessageAt: new Date(),
                    lastMessageText: agentPreview.slice(0, 120),
                    lastSenderId: recipientId,
                },
            });
        });
    }

    // WebPush bildirishnoma — jadvalli bo'lmasa va mute qilinmagan bo'lsa
    if (!scheduledFor && pushAvailable()) {
        after(async () => {
            const recipientId = otherId(conv, me.id);
            const isRecipientMuted = conv.user1Id === recipientId ? !!conv.mutedByUser1 : !!conv.mutedByUser2;
            if (isRecipientMuted) return;
            const sender = await prisma.userProfile.findUnique({
                where: { id: me.id }, select: { name: true, username: true },
            });
            const senderName = sender?.name ?? sender?.username ?? "Foydalanuvchi";
            const preview = clean || (msg.mediaType ? `[${msg.mediaType}]` : "Yangi xabar");
            await sendPushToProfile(recipientId, {
                title: senderName,
                body: preview.slice(0, 120),
                url: sender?.username ? `/nexus?dm=${sender.username}` : "/nexus",
                tag: `dm-${id}`,
            });
        });
    }

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, mine: true, createdAt: msg.createdAt,
            mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
            mediaName: msg.mediaName, mediaSize: msg.mediaSize, durationMs: msg.durationMs,
            locLat: msg.locLat, locLng: msg.locLng, locUpdatedAt: msg.locUpdatedAt, locExpiresAt: msg.locExpiresAt,
            pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions, pollExpiresAt: msg.pollExpiresAt, pollMulti: msg.pollMulti,
            pollVoteCounts: isPoll ? msg.pollOptions.map(() => 0) : null,
            pollMyVotes: isPoll ? [] : null, pollTotal: isPoll ? 0 : null,
            expiresAt: msg.expiresAt,
            scheduledFor: msg.scheduledFor,
            forwardedFromId: msg.forwardedFromId,
            forwardedFromName: msg.forwardedFromName,
        },
    });
}

// DELETE /api/nexus/messages/[id] — o'z xabarini o'chirish (messageId orqali)
// query: ?messageId=... (chunki [id] konversatsiya ID'si)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { id: true, senderId: true, conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Faqat o'z xabaringizni o'chirasiz" }, { status: 403 });

    await prisma.nexusMessage.delete({ where: { id: messageId } });
    return NextResponse.json({ ok: true });
}
