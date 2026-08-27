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
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { seedAgentWelcomeIfNeeded } from "@/lib/agent-welcome";

async function meAndConv(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, conv: null };
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    return { me, conv };
}

// GET /api/nexus/messages/[id] — xabarlar + o'qildi belgilash
// Cursor pagination: ?limit=50&before=<ISO createdAt> — eski xabarlarni load more uchun
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100);
    const beforeStr = url.searchParams.get("before");
    const beforeDate = beforeStr ? new Date(beforeStr) : null;
    const isPagination = !!(beforeDate && !isNaN(beforeDate.getTime()));

    // Rasmiy agent bilan birinchi ochilishda avto-welcome xabar yuboriladi
    // (faqat initial load'da — pagination'da emas)
    if (!isPagination) {
        const otherProfileId = otherId(conv, me.id);
        await seedAgentWelcomeIfNeeded(id, me.id, otherProfileId);
    }

    // Cursor pagination: eng yangi `limit` xabar (desc) — reverse'dan keyin klient asc oladi.
    // `before` berilsa — undan oldingi (eskiroq) xabarlar. `hasMore` — yuqorida yana bor-yo'qligini bildiradi.
    // Self-destruct: muddati o'tgan xabarlarni chiqarmaymiz.
    // Jadvalga qo'yilgan xabarlar faqat jo'natuvchining o'ziga ko'rinadi (draft-like).
    // Tozalangan (clearedBeforeUserN) suhbatlar shu vaqtdan oldingi xabarlarni yashiradi.
    const now = new Date();
    const clearedBefore = conv.user1Id === me.id ? conv.clearedBeforeUser1 : conv.clearedBeforeUser2;
    const recentPlus1 = await prisma.nexusMessage.findMany({
        where: {
            conversationId: id,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            AND: [
                { OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }, { senderId: me.id }] },
                ...(clearedBefore ? [{ createdAt: { gt: clearedBefore } }] : []),
                ...(isPagination ? [{ createdAt: { lt: beforeDate! } }] : []),
            ],
        },
        orderBy: { createdAt: "desc" }, take: limit + 1,
    });
    const hasMore = recentPlus1.length > limit;
    const recent = hasMore ? recentPlus1.slice(0, limit) : recentPlus1;
    const messages = recent.reverse();
    // Fon rejimda: allaqachon muddati o'tgan xabarlarni tozalash (fire-and-forget)
    // Faqat initial load'da — pagination'da har safar takroriy chaqirmaymiz
    if (!isPagination) {
        prisma.nexusMessage.deleteMany({
            where: { conversationId: id, expiresAt: { lte: now } },
        }).catch(() => {});
        // Muddati kelgan jadvalli xabarlarni "faollashtirish" — cron kelgunga qadar
        prisma.nexusMessage.updateMany({
            where: { conversationId: id, scheduledFor: { lte: now, not: null } },
            data: { scheduledFor: null },
        }).catch(() => {});
    }

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
                text: (o.text ?? "").slice(0, 240),
                senderName: senderMap.get(o.senderId) ?? null,
                mine: o.senderId === me.id,
            });
        }
    }

    // Forwarded manba profillari — username + image bilan enrich qilish
    // (client tomonida "Yuborilgan xabar" kartochkasi profilga link berishi uchun)
    const fwdIds = messages.map(m => m.forwardedFromId).filter((x): x is string => !!x);
    const fwdMap = new Map<string, { username: string | null; image: string | null }>();
    if (fwdIds.length) {
        const fwdProfiles = await prisma.userProfile.findMany({
            where: { id: { in: [...new Set(fwdIds)] } },
            select: { id: true, username: true, image: true },
        });
        for (const p of fwdProfiles) fwdMap.set(p.id, { username: p.username, image: p.image });
    }

    // Peer'ning oxirgi o'qigan vaqti (mening xabarlarim uchun 2 ptichka hisoblash)
    const peerReadAt = conv.user1Id === me.id ? conv.user2ReadAt : conv.user1ReadAt;

    // o'qildi (menikini — yangilash). Faqat initial load'da; pagination'da yangilamaymiz.
    if (!isPagination) {
        await prisma.nexusConversation.update({
            where: { id },
            data: conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() },
        });
    }

    // `other` profil ma'lumoti faqat initial load'da kerak (pagination'da o'zgarmaydi)
    const oid = otherId(conv, me.id);
    const p = isPagination ? null : await prisma.userProfile.findUnique({
        where: { id: oid },
        select: { id: true, name: true, username: true, image: true, humoId: true, bio: true, verified: true, verifiedCategory: true, statusEmoji: true, statusText: true, statusExpiresAt: true, lastSeenAt: true, privacyLastSeen: true, privacyProfilePhoto: true },
    });
    // Muddati o'tgan statusni yashirish
    const statusActive = p?.statusExpiresAt ? new Date(p.statusExpiresAt) > new Date() : true;

    return NextResponse.json({
        messages: messages.map(m => {
            const pv = pollVotesMap.get(m.id);
            const mine = m.senderId === me.id;
            // View-once — sender har doim ko'radi; qabul qiluvchi faqat ochilmagan
            // bo'lsa placeholder ko'radi ("Ochish" tugmasi UI). Ochilgach media hidden.
            const hideMedia = m.viewOnce && !mine && !m.viewedAt;      // hali ochilmagan → placeholder
            const alreadyViewed = m.viewOnce && !mine && !!m.viewedAt; // ochilib bo'lgan
            return {
                id: m.id,
                text: hideMedia || alreadyViewed ? "" : m.text,
                mine, createdAt: m.createdAt,
                // View-once: URL yashirilgan, faqat mediaType turi qoladi (UI badge uchun).
                mediaUrl: hideMedia || alreadyViewed ? null : m.mediaUrl,
                mediaType: m.mediaType,
                mediaMime: hideMedia || alreadyViewed ? null : m.mediaMime,
                mediaName: hideMedia || alreadyViewed ? null : m.mediaName,
                mediaSize: hideMedia || alreadyViewed ? null : m.mediaSize,
                durationMs: hideMedia || alreadyViewed ? null : m.durationMs,
                viewOnce: m.viewOnce,
                viewedAt: m.viewedAt,
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
                forwardedFromUsername: m.forwardedFromId ? (fwdMap.get(m.forwardedFromId)?.username ?? null) : null,
                forwardedFromImage: m.forwardedFromId ? (fwdMap.get(m.forwardedFromId)?.image ?? null) : null,
                forwardedChannelId: m.forwardedChannelId,
                forwardedChannelName: m.forwardedChannelName,
                forwardedChannelHandle: m.forwardedChannelHandle,
                deliveredAt: m.deliveredAt,
                deletedForEveryoneAt: m.deletedForEveryoneAt,
                albumId: m.albumId,
                buttons: m.buttons,
                invoice: m.invoice,
                invoicePaidAt: m.invoicePaidAt,
                e2ePayload: m.e2ePayload,
            };
        }),
        hasMore,
        other: p ? await (async () => {
            const { checkPrivacy } = await import("@/lib/privacy");
            const canSeeLastSeen = await checkPrivacy(me.id, oid, p.privacyLastSeen as "all" | "contacts" | "none");
            const canSeePhoto = await checkPrivacy(me.id, oid, p.privacyProfilePhoto as "all" | "contacts" | "none");
            return {
                id: p.id,
                name: p.name, username: p.username,
                image: canSeePhoto ? p.image : null,
                humoId: p.humoId,
                bio: p.bio,
                verified: isVerifiedProfile(p),
                verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
                statusEmoji: statusActive ? p.statusEmoji : null,
                statusText: statusActive ? p.statusText : null,
                lastSeenAt: canSeeLastSeen ? p.lastSeenAt : null,
            };
        })() : null,
        peerReadAt,
        streak: isPagination ? undefined : await computeStreak(id, me.id, otherId(conv, me.id)),
    });
}

// Chat streak (Snap/TikTok uslub) — ikkalasi ham xabar yuborgan ketma-ket kunlar soni.
// Bugundan orqaga qarab, har kun ham menda ham peerda kamida 1 xabar bo'lsa oshadi.
// Bugun kimdir yozmagan bo'lsa streak buzilmagan (ertagacha vaqt bor), lekin
// ko'rsatiladigan raqam kechagi streak bo'ladi. Kecha ham bo'sh bo'lsa 0.
async function computeStreak(convId: string, myId: string, peerId: string): Promise<{ days: number; activeToday: boolean }> {
    // Oxirgi 400 kun yetadi (juda uzun streak kam)
    const since = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    const msgs = await prisma.nexusMessage.findMany({
        where: {
            conversationId: convId,
            createdAt: { gte: since },
            deletedForEveryoneAt: null,
            senderId: { in: [myId, peerId] },
            scheduledFor: null,
        },
        select: { senderId: true, createdAt: true },
    });
    if (msgs.length === 0) return { days: 0, activeToday: false };
    // YYYY-MM-DD (UTC) → { mine, peer }
    const daysMap = new Map<string, { mine: boolean; peer: boolean }>();
    for (const m of msgs) {
        const key = m.createdAt.toISOString().slice(0, 10);
        const cur = daysMap.get(key) ?? { mine: false, peer: false };
        if (m.senderId === myId) cur.mine = true; else cur.peer = true;
        daysMap.set(key, cur);
    }
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const todayEntry = daysMap.get(today);
    const activeToday = !!(todayEntry && todayEntry.mine && todayEntry.peer);
    // Streak boshi: bugun mutual bo'lsa bugundan; aks holda kechadan (agar mutual bo'lsa).
    let cursor = activeToday ? today : yesterday;
    let days = 0;
    while (true) {
        const e = daysMap.get(cursor);
        if (!e || !e.mine || !e.peer) break;
        days++;
        const d = new Date(cursor + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        cursor = d.toISOString().slice(0, 10);
    }
    return { days, activeToday };
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

    // Privacy: qabul qiluvchining privacyDm sozlamasi. Agar suhbatda oldin
    // xabar bo'lgan bo'lsa (ya'ni qabul qiluvchi javob bergan) — ochiq deb hisoblaymiz.
    const recipientId = otherId(conv, me.id);
    const recipient = await prisma.userProfile.findUnique({
        where: { id: recipientId }, select: { privacyDm: true },
    });
    if (recipient && recipient.privacyDm !== "all") {
        // Recipient allaqachon javob bergan bo'lsa (mavjud xabar bo'lsa) — ruxsat
        const priorExists = await prisma.nexusMessage.count({
            where: { conversationId: id, senderId: recipientId },
        });
        if (priorExists === 0) {
            const { checkPrivacy } = await import("@/lib/privacy");
            const allowed = await checkPrivacy(me.id, recipientId, recipient.privacyDm as "all" | "contacts" | "none");
            if (!allowed) {
                return NextResponse.json({
                    error: recipient.privacyDm === "none"
                        ? "Bu foydalanuvchi xabar qabul qilmaydi"
                        : "Bu foydalanuvchi faqat kontaktlaridan xabar qabul qiladi",
                    code: "PRIVACY_DM",
                }, { status: 403 });
            }
        }
    }

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
        forwardedChannelId?: string;                           // Kanal'dan yuborilgan bo'lsa
        forwardedChannelName?: string;
        forwardedChannelHandle?: string;                       // @handle link uchun
        viewOnce?: boolean;                                    // View-once: 1 martalik xabar
        silent?: boolean;                                      // Silent send — bildirishnoma yubormaydi
        // End-to-end shifrlash payload — bo'lsa server plaintext ko'rmaydi;
        // moderatsiya/tarjima/qidiruv o'tkazib yuboriladi
        e2ePayload?: { ephemeralPub: string; iv: string; ciphertext: string; v: number; senderKeyId?: string };
    };
    const text = String(body.text ?? "").trim();
    const isLocation = body.mediaType === "location" && typeof body.locLat === "number" && typeof body.locLng === "number";
    const isPoll = body.mediaType === "poll" && !!body.pollQuestion?.trim() && Array.isArray(body.pollOptions) && body.pollOptions.length >= 2 && body.pollOptions.length <= 10;
    // Contact card — text = JSON string {name, username, humoId?, image?} (mediaUrl talab qilinmaydi)
    const isContact = body.mediaType === "contact" && !!text;
    const hasMedia = (!!body.mediaUrl && !!body.mediaType) || isLocation || isPoll || isContact;
    // E2E payload validatsiya
    const e2e = body.e2ePayload;
    const isE2e = !!(e2e && typeof e2e.ephemeralPub === "string" && typeof e2e.iv === "string" && typeof e2e.ciphertext === "string" && e2e.v === 1);
    if (isE2e) {
        // Format tekshiruv: base64 ko'rinishida bo'lsin, hajm cheklovi
        if (e2e!.ciphertext.length > 20_000 || e2e!.ephemeralPub.length > 800 || e2e!.iv.length > 40) {
            return NextResponse.json({ error: "E2E payload juda katta" }, { status: 400 });
        }
    }
    if (!text && !hasMedia && !isE2e) return NextResponse.json({ error: "Xabar bo'sh bo'lmasin" }, { status: 400 });
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    const clean = text.slice(0, 2000);

    // Media turini tekshirish (faqat ruxsat etilgan qiymatlar)
    const VALID_TYPES = ["image", "video", "audio", "file", "video-circle", "location", "poll", "contact", "gif", "sticker"];
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
    // Forward: kanal/guruh metadatasi
    const forwardedChannelId = typeof body.forwardedChannelId === "string" ? body.forwardedChannelId : null;
    const forwardedChannelName = typeof body.forwardedChannelName === "string"
        ? body.forwardedChannelName.trim().slice(0, 80) || null : null;
    const forwardedChannelHandle = typeof body.forwardedChannelHandle === "string"
        ? body.forwardedChannelHandle.trim().slice(0, 40) || null : null;
    // Restrict forwarding — agar manba guruh/kanal restrictForwarding=true bo'lsa, forward taqiq
    if (forwardedChannelId) {
        const src = await prisma.nexusChannel.findUnique({
            where: { id: forwardedChannelId },
            select: { restrictForwarding: true },
        });
        if (src?.restrictForwarding) {
            return NextResponse.json({ error: "Manba guruhi forward'ni taqiq qilgan" }, { status: 403 });
        }
    }

    const msg = await prisma.nexusMessage.create({
        data: {
            conversationId: id,
            senderId: me.id,
            // E2E'da matn saqlanmaydi (client'da payload deshifrlanadi)
            text: isE2e ? "" : clean,
            e2ePayload: isE2e ? JSON.parse(JSON.stringify(e2e)) : undefined,
            replyToId,
            expiresAt,
            scheduledFor,
            forwardedFromId,
            forwardedFromName,
            forwardedChannelId,
            forwardedChannelName,
            forwardedChannelHandle,
            // View-once — faqat media (image/video/audio) uchun mazmunli;
            // matn xabari view-once emas.
            viewOnce: !!body.viewOnce && !!body.mediaUrl,
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

    // Real-time push (Pusher) — qabul qiluvchi va yuboruvchi qurilmalariga.
    // Client'lar `private-user-<myId>` kanaliga subscribe bo'lgan.
    // Client-side event handler `convId`ni ko'radi va o'z suhbatiga append qiladi.
    if (!scheduledFor) {
        const recipientId = otherId(conv, me.id);
        const pushMsg = {
            convId: id,
            message: {
                id: msg.id, text: msg.text, mine: false, createdAt: msg.createdAt,
                mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
                mediaName: msg.mediaName, mediaSize: msg.mediaSize, durationMs: msg.durationMs,
                locLat: msg.locLat, locLng: msg.locLng, locUpdatedAt: msg.locUpdatedAt, locExpiresAt: msg.locExpiresAt,
                pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions,
                pollExpiresAt: msg.pollExpiresAt, pollMulti: msg.pollMulti,
                pollVoteCounts: isPoll ? msg.pollOptions.map(() => 0) : null,
                pollMyVotes: isPoll ? [] : null, pollTotal: isPoll ? 0 : null,
                senderId: me.id,
                replyToId,
                forwardedFromId: msg.forwardedFromId,
                forwardedFromName: msg.forwardedFromName,
                editedAt: null,
                pinnedAt: null,
                expiresAt: msg.expiresAt,
                bookmarked: false,
                reactions: [],
                e2ePayload: msg.e2ePayload,
            },
        };
        after(() => pusherTrigger(userChannel(recipientId), "nx:msg:new", pushMsg));
        // Yuboruvchi ham boshqa qurilmalarida ko'rishi uchun (multi-device sync foundation)
        after(() => pusherTrigger(userChannel(me.id), "nx:msg:new", { ...pushMsg, message: { ...pushMsg.message, mine: true } }));
    }

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
                    // Inline tugmalar (agar agent qaytargan bo'lsa)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(reply.buttons ? { buttons: reply.buttons as any } : {}),
                    // Invoice (to'lov so'rovi)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(reply.invoice ? { invoice: reply.invoice as any } : {}),
                },
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
            // Real-time — foydalanuvchi agent javobini darhol ko'rsin
            await pusherTrigger(userChannel(me.id), "nx:msg:new", {
                convId: id,
                message: {
                    id: agentMsg.id, text: agentMsg.text, mine: false, createdAt: agentMsg.createdAt,
                    mediaUrl: agentMsg.mediaUrl, mediaType: agentMsg.mediaType, mediaMime: agentMsg.mediaMime,
                    mediaName: agentMsg.mediaName, mediaSize: agentMsg.mediaSize, durationMs: agentMsg.durationMs,
                    senderId: recipientId,
                    buttons: agentMsg.buttons,
                    invoice: agentMsg.invoice,
                    invoicePaidAt: agentMsg.invoicePaidAt,
                    reactions: [],
                },
            });
        });
    }

    // WebPush bildirishnoma — jadvalli bo'lmasa va mute qilinmagan bo'lsa
    if (!scheduledFor && !body.silent && pushAvailable()) {
        after(async () => {
            const recipientId = otherId(conv, me.id);
            const isRecipientMuted = conv.user1Id === recipientId ? !!conv.mutedByUser1 : !!conv.mutedByUser2;
            if (isRecipientMuted) return;
            // Qabul qiluvchining push preview privacy sozlamasi:
            //   full   → yuboruvchi ismi + matn preview (default)
            //   name   → faqat yuboruvchi ismi ("Yangi xabar")
            //   hidden → hech qanday ma'lumot ("For Humo · Yangi xabar")
            const recipient = await prisma.userProfile.findUnique({
                where: { id: recipientId }, select: { privacyPushPreview: true },
            });
            const mode = (recipient?.privacyPushPreview ?? "full") as "full" | "name" | "hidden";
            const sender = mode === "hidden" ? null : await prisma.userProfile.findUnique({
                where: { id: me.id }, select: { name: true, username: true },
            });
            const senderName = sender?.name ?? sender?.username ?? "Foydalanuvchi";
            const preview = clean || (msg.mediaType ? `[${msg.mediaType}]` : "Yangi xabar");
            let title: string, body: string;
            if (mode === "hidden") { title = "For Humo"; body = "Yangi xabar"; }
            else if (mode === "name") { title = senderName; body = "Yangi xabar"; }
            else { title = senderName; body = preview.slice(0, 120); }
            await sendPushToProfile(recipientId, {
                title,
                body,
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
            e2ePayload: msg.e2ePayload,
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
