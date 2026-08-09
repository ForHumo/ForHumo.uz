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
    const recent = await prisma.nexusMessage.findMany({
        where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 100,
    });
    const messages = recent.reverse();

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

    // Peer'ning oxirgi o'qigan vaqti (mening xabarlarim uchun 2 ptichka hisoblash)
    const peerReadAt = conv.user1Id === me.id ? conv.user2ReadAt : conv.user1ReadAt;

    // o'qildi (menikini — yangilash)
    await prisma.nexusConversation.update({
        where: { id },
        data: conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() },
    });

    const oid = otherId(conv, me.id);
    const p = await prisma.userProfile.findUnique({ where: { id: oid }, select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } });

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
            };
        }),
        other: p ? {
            name: p.name, username: p.username, image: p.image,
            verified: isVerifiedProfile(p),
            verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
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

    const msg = await prisma.nexusMessage.create({
        data: {
            conversationId: id,
            senderId: me.id,
            text: clean,
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

    await prisma.nexusConversation.update({
        where: { id },
        data: {
            lastMessageAt: new Date(),
            lastMessageText: preview.slice(0, 120),
            lastSenderId: me.id,
            ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
        },
    });

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

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, mine: true, createdAt: msg.createdAt,
            mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
            mediaName: msg.mediaName, mediaSize: msg.mediaSize, durationMs: msg.durationMs,
            locLat: msg.locLat, locLng: msg.locLng, locUpdatedAt: msg.locUpdatedAt, locExpiresAt: msg.locExpiresAt,
            pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions, pollExpiresAt: msg.pollExpiresAt, pollMulti: msg.pollMulti,
            pollVoteCounts: isPoll ? msg.pollOptions.map(() => 0) : null,
            pollMyVotes: isPoll ? [] : null, pollTotal: isPoll ? 0 : null,
        },
    });
}
