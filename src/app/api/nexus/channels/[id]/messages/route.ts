import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { moderateOnCreate } from "@/lib/moderation";
import { filterMediaUrls } from "@/lib/media-url";
import { banGuard } from "@/lib/moderation-guard";
import { sendPushToProfile, pushAvailable } from "@/lib/push";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { effectivePermissions, slowModeRemaining, containsUrl } from "@/lib/channel-permissions";
import { getBlockedIds } from "@/lib/nexus-block";

async function meAndMember(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } });
    if (!me) return { me: null, channel: null, member: null };
    const channel = await prisma.nexusChannel.findUnique({ where: { id: channelId } });
    const member = channel ? await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId, profileId: me.id } } }) : null;
    return { me, channel, member };
}

// GET /api/nexus/channels/[id]/messages?since=<ISO> — xabarlar (polling)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (channel.isPrivate && !member) return NextResponse.json({ error: "Yopiq" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    // Blok: men bloklaganlar va meni bloklaganlar xabarlarini yashiramiz.
    // O'z xabarim doim ko'rinadi (blok o'z-o'ziga qo'llanmaydi).
    const blockedIds = await getBlockedIds(me.id);
    // Inkremental polling (since bor) → asc. Birinchi yuklash (since yo'q) → eng yangi 100 (desc),
    // so'ng xronologik tartibga qaytaramiz. Aks holda 100+ xabarli kanalda yangilar ko'rinmay qolardi.
    // Jadvalga qo'yilgan xabarlar: ?scheduled=1 → faqat yozuvchi'ning kelajakdagi post'lari.
    // Aks holda: o'tib ketgan yoki jadvalsiz xabarlar (yozuvchi o'zi ko'rishi mumkin bo'lgan kelajakdagilarni ham).
    const scheduledOnly = searchParams.get("scheduled") === "1";
    const now = new Date();
    const rows = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: id, hidden: false,
            ...(blockedIds.size > 0 ? { senderId: { notIn: [...blockedIds] } } : {}),
            ...(since ? { createdAt: { gt: new Date(since) } } : {}),
            ...(scheduledOnly
                ? { senderId: me.id, scheduledFor: { gt: now } }
                : {
                    OR: [
                        { scheduledFor: null },
                        { scheduledFor: { lte: now } },
                        { senderId: me.id },
                    ],
                }),
        },
        orderBy: { createdAt: since ? "asc" : "desc" }, take: 100,
    });
    // Fon rejimda: muddati kelgan jadvallarni faollashtirish (createdAt yangilanmaydi)
    if (!scheduledOnly) {
        prisma.nexusChannelMessage.updateMany({
            where: { channelId: id, scheduledFor: { lte: now, not: null } },
            data: { scheduledFor: null },
        }).catch(() => {});
    }
    const msgs = since ? rows : rows.reverse();
    const ids = [...new Set(msgs.map(m => m.senderId))];
    const profs = ids.length ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } }) : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    // Poll statistikalari
    const pollIds = msgs.filter(m => !!m.pollQuestion).map(m => m.id);
    const pollVoteMap = new Map<string, { counts: number[]; myVotes: number[]; total: number }>();
    if (pollIds.length > 0) {
        const allVotes = await prisma.nexusChannelPollVote.findMany({
            where: { messageId: { in: pollIds } },
            select: { messageId: true, profileId: true, optionIndex: true },
        });
        for (const pmId of pollIds) {
            const m = msgs.find(x => x.id === pmId)!;
            const votes = allVotes.filter(v => v.messageId === pmId);
            const counts = m.pollOptions.map((_, i) => votes.filter(v => v.optionIndex === i).length);
            const myVotes = votes.filter(v => v.profileId === me.id).map(v => v.optionIndex);
            const total = new Set(votes.map(v => v.profileId)).size;
            pollVoteMap.set(pmId, { counts, myVotes, total });
        }
    }

    // Reply preview: shu 100 xabar orasidan yoki alohida fetch bilan
    const replyIds = msgs.map(m => m.replyToId).filter((x): x is string => !!x);
    const replyMap = new Map<string, { id: string; text: string | null; senderName: string | null }>();
    if (replyIds.length) {
        const originals = await prisma.nexusChannelMessage.findMany({
            where: { id: { in: [...new Set(replyIds)] } },
            select: { id: true, text: true, senderId: true, media: true },
        });
        const senderIds = [...new Set(originals.map(o => o.senderId))];
        const senders = await prisma.userProfile.findMany({
            where: { id: { in: senderIds } }, select: { id: true, name: true, username: true },
        });
        const senderMap = new Map(senders.map(s => [s.id, s.name ?? s.username ?? ""]));
        for (const o of originals) {
            replyMap.set(o.id, {
                id: o.id,
                text: o.text ? o.text.slice(0, 120) : (o.media?.length ? "[media]" : null),
                senderName: senderMap.get(o.senderId) ?? null,
            });
        }
    }

    // Mening bookmark qilgan xabarlarim (shu 100 ichida)
    const myBookmarks = await prisma.nexusChannelMessageBookmark.findMany({
        where: { profileId: me.id, messageId: { in: msgs.map(m => m.id) } },
        select: { messageId: true },
    });
    const bookmarkedSet = new Set(myBookmarks.map(b => b.messageId));

    // View-once ochilgan xabarlarim
    const viewOnceIds = msgs.filter(m => m.viewOnce).map(m => m.id);
    const openedViewOnce = viewOnceIds.length ? await prisma.nexusChannelMessageViewOnceOpen.findMany({
        where: { messageId: { in: viewOnceIds }, profileId: me.id },
        select: { messageId: true },
    }) : [];
    const openedSet = new Set(openedViewOnce.map(o => o.messageId));

    // Reaksiyalarni yig'ish
    const allReactions = await prisma.nexusChannelMessageReaction.findMany({
        where: { messageId: { in: msgs.map(m => m.id) } },
        select: { messageId: true, emoji: true, profileId: true },
    });
    const reactionMap = new Map<string, Map<string, { count: number; mine: boolean }>>();
    for (const r of allReactions) {
        if (!reactionMap.has(r.messageId)) reactionMap.set(r.messageId, new Map());
        const m2 = reactionMap.get(r.messageId)!;
        const cur = m2.get(r.emoji) ?? { count: 0, mine: false };
        cur.count++;
        if (r.profileId === me.id) cur.mine = true;
        m2.set(r.emoji, cur);
    }

    // o'qildi belgilash
    if (member) after(() => prisma.nexusChannelMember.update({ where: { id: member.id }, data: { lastReadAt: new Date() } }).catch(() => { }));

    // Kanal komment: har top-level xabar uchun izoh (reply) soni
    // Faqat channel.allowComments && kanal xabari uchun (guruh emas) mazmunli.
    const commentCounts = new Map<string, number>();
    if (channel.type === "CHANNEL" && channel.allowComments && msgs.length > 0) {
        // Faqat replyToId=null bo'lgan xabarlar top-level
        const topLevelIds = msgs.filter(m => !m.replyToId).map(m => m.id);
        if (topLevelIds.length > 0) {
            const grouped = await prisma.nexusChannelMessage.groupBy({
                by: ["replyToId"],
                where: { channelId: id, replyToId: { in: topLevelIds }, hidden: false },
                _count: { _all: true },
            });
            for (const g of grouped) {
                if (g.replyToId) commentCounts.set(g.replyToId, g._count._all);
            }
        }
    }

    // Anonim admin — owner o'z anonim xabarini ko'radi (mine=true), lekin
    // boshqa a'zolar author o'rniga guruh nomi ko'radi va senderId yashiriladi.
    const isOwner = member?.role === "OWNER";

    return NextResponse.json({
        messages: msgs.map(m => {
            const p = pMap[m.senderId];
            const pv = pollVoteMap.get(m.id);
            const mine = m.senderId === me.id;
            const anon = m.anonymous;
            // Owner har doim real author'ni ko'radi (moderatsiya uchun);
            // boshqa a'zolar anonim bo'lsa faqat guruh nomi.
            const publicAuthor = anon && !mine && !isOwner
                ? { name: channel.name, username: null, image: channel.avatarUrl, verified: false, verifiedCategory: null }
                : (p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null);
            // Delete-for-everyone → tombstone
            const isDeleted = !!m.deletedForEveryoneAt;
            // View-once — ochilgan bo'lsa yoki o'z xabari emas + ochilmagan → tombstone/blur
            const isViewOnce = m.viewOnce;
            const viewOnceOpened = openedSet.has(m.id);
            const viewOnceHide = isViewOnce && !mine && viewOnceOpened;
            return {
                id: m.id,
                text: isDeleted || viewOnceHide ? null : m.text,
                media: isDeleted || viewOnceHide ? [] : m.media,
                createdAt: m.createdAt, mine,
                anonymous: anon,
                author: publicAuthor,
                pollQuestion: isDeleted ? null : m.pollQuestion,
                pollOptions: isDeleted ? [] : m.pollOptions,
                pollExpiresAt: isDeleted ? null : m.pollExpiresAt,
                pollMulti: isDeleted ? false : m.pollMulti,
                pollVoteCounts: isDeleted ? null : (pv?.counts ?? null),
                pollMyVotes: isDeleted ? null : (pv?.myVotes ?? null),
                pollTotal: isDeleted ? null : (pv?.total ?? null),
                pinnedAt: m.pinnedAt,
                editedAt: m.editedAt,
                commentCount: commentCounts.get(m.id) ?? 0,
                replyToId: m.replyToId,
                replyTo: m.replyToId ? (replyMap.get(m.replyToId) ?? null) : null,
                bookmarked: bookmarkedSet.has(m.id),
                reactions: reactionMap.get(m.id)
                    ? [...reactionMap.get(m.id)!.entries()].map(([e, s]) => ({ emoji: e, count: s.count, mine: s.mine }))
                    : [],
                viewCount: m.viewCount,
                scheduledFor: m.scheduledFor,
                // Rich media
                mediaType: isDeleted ? null : m.mediaType,
                mediaMime: isDeleted ? null : m.mediaMime,
                mediaName: isDeleted ? null : m.mediaName,
                mediaSize: isDeleted ? null : m.mediaSize,
                durationMs: isDeleted ? null : m.durationMs,
                locLat: isDeleted ? null : m.locLat,
                locLng: isDeleted ? null : m.locLng,
                locExpiresAt: isDeleted ? null : m.locExpiresAt,
                contactName: isDeleted ? null : m.contactName,
                contactPhone: isDeleted ? null : m.contactPhone,
                contactUsername: isDeleted ? null : m.contactUsername,
                viewOnce: m.viewOnce,
                viewOnceOpened: viewOnceOpened,
                mentions: m.mentions,
                deletedForEveryone: isDeleted,
                deletedForEveryoneAt: m.deletedForEveryoneAt,
            };
        }),
    });
}

// POST /api/nexus/channels/[id]/messages — xabar/post yuborish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!member) return NextResponse.json({ error: "Avval a'zo bo'ling" }, { status: 403 });

    // CHANNEL — faqat owner/admin yozadi (top-level).
    // Agar allowComments=true VA replyToId bor bo'lsa — oddiy a'zolar izoh yozishi mumkin.
    if (channel.type === "CHANNEL" && member.role !== "OWNER" && member.role !== "ADMIN") {
        const bodyPreview = await req.clone().json().catch(() => ({}));
        const hasReply = typeof bodyPreview?.replyToId === "string" && bodyPreview.replyToId.length > 0;
        if (!channel.allowComments || !hasReply) {
            return NextResponse.json({
                error: channel.allowComments
                    ? "Faqat izoh yozing (mavjud xabarga javob)"
                    : "Bu kanalga faqat adminlar yoza oladi",
            }, { status: 403 });
        }
    }
    // Guruh ruxsatlari (fine-grained)
    const perms = effectivePermissions(member.role, channel.defaultPermissions, member.permissions);
    if (channel.type === "GROUP" && !perms.sendMessages) {
        return NextResponse.json({ error: "Bu guruhda xabar yuborish taqiqlangan" }, { status: 403 });
    }

    // Slow mode — guruh a'zolar uchun (owner/admin bekor qilinadi)
    if (channel.type === "GROUP" && member.role === "MEMBER" && channel.slowModeSeconds > 0) {
        const remain = slowModeRemaining(channel.slowModeSeconds, member.lastMsgAt);
        if (remain > 0) {
            return NextResponse.json({
                error: `Slow mode: ${remain} sekunddan keyin yozing`,
                code: "SLOW_MODE",
                retryAfter: remain,
            }, { status: 429 });
        }
    }

    const body = await req.json();
    const {
        text, media, pollQuestion, pollOptions, pollExpiresAt, pollMulti, replyToId, scheduledFor, silent,
        // Rich media (voice/video-circle/location/contact) — DM parity
        mediaType, mediaMime, mediaName, mediaSize, durationMs,
        locLat, locLng, locExpiresAt,
        contactName, contactPhone, contactUsername,
        viewOnce,
    } = body as {
        text?: string; media?: unknown;
        pollQuestion?: string; pollOptions?: string[]; pollExpiresAt?: string; pollMulti?: boolean;
        replyToId?: string;
        scheduledFor?: string;
        silent?: boolean;
        mediaType?: string;
        mediaMime?: string;
        mediaName?: string;
        mediaSize?: number;
        durationMs?: number;
        locLat?: number;
        locLng?: number;
        locExpiresAt?: string;
        contactName?: string;
        contactPhone?: string;
        contactUsername?: string;
        viewOnce?: boolean;
    };
    const cleanText = typeof text === "string" ? text.trim().slice(0, 4000) : "";
    const cleanMedia: string[] = filterMediaUrls(media, 9);
    const isPoll = !!pollQuestion?.trim() && Array.isArray(pollOptions) && pollOptions.length >= 2 && pollOptions.length <= 10;
    // Rich media validation
    const allowedMediaTypes = ["image", "video", "audio", "file", "video-circle", "location", "contact"] as const;
    const cleanMediaType = typeof mediaType === "string" && (allowedMediaTypes as readonly string[]).includes(mediaType) ? mediaType : null;
    const isLocation = cleanMediaType === "location" && typeof locLat === "number" && typeof locLng === "number";
    const isContact = cleanMediaType === "contact" && typeof contactName === "string" && typeof contactPhone === "string";
    if (!cleanText && !cleanMedia.length && !isPoll && !isLocation && !isContact) {
        return NextResponse.json({ error: "Bo'sh bo'lmasin" }, { status: 400 });
    }
    // @mentions — parse @username from text, resolve to profileId
    let mentionsList: string[] = [];
    if (cleanText) {
        const mentionUsernames = Array.from(cleanText.matchAll(/@([a-z0-9_]{3,32})/gi)).map(m => m[1].toLowerCase());
        const uniq = Array.from(new Set(mentionUsernames)).slice(0, 20);
        if (uniq.length > 0) {
            const profiles = await prisma.userProfile.findMany({
                where: { username: { in: uniq } },
                select: { id: true },
            });
            mentionsList = profiles.map(p => p.id);
        }
    }

    // Fine-grained ruxsat: media va link cheklovi (guruh uchun)
    if (channel.type === "GROUP") {
        if (cleanMedia.length > 0 && !perms.sendMedia) {
            return NextResponse.json({ error: "Media yuborish taqiqlangan" }, { status: 403 });
        }
        if (cleanText && containsUrl(cleanText) && !perms.sendLinks) {
            return NextResponse.json({ error: "Havola yuborish taqiqlangan" }, { status: 403 });
        }
    }

    const banned = await banGuard(me.id); if (banned) return banned;
    if (await nexusRateLimited(me.id, "channelMsg")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // Reply — mavjud xabar shu kanalga tegishli bo'lishi kerak
    let validReplyToId: string | null = null;
    if (typeof replyToId === "string" && replyToId) {
        const target = await prisma.nexusChannelMessage.findUnique({
            where: { id: replyToId }, select: { id: true, channelId: true },
        });
        if (target && target.channelId === id) validReplyToId = target.id;
    }

    // Anonim admin — faqat OWNER/ADMIN uchun mazmunli, faqat GROUP tipida
    const isAnonymous = channel.type === "GROUP"
        && (member.role === "OWNER" || member.role === "ADMIN")
        && !!member.isAnonymous;

    // Jadvalga qo'yish — faqat kelajakdagi vaqt (30s..30d). Faqat kanal/guruh yozuvchilari uchun.
    let scheduledDate: Date | null = null;
    if (typeof scheduledFor === "string" && scheduledFor) {
        const t = new Date(scheduledFor);
        const nowMs = Date.now();
        if (!isNaN(t.getTime()) && t.getTime() > nowMs + 30_000 && t.getTime() < nowMs + 30 * 86400 * 1000) {
            scheduledDate = t;
        } else {
            return NextResponse.json({ error: "Jadval vaqti kamida 30 sekunddan keyin va 30 kundan oldin bo'lishi kerak" }, { status: 400 });
        }
    }

    const msg = await prisma.nexusChannelMessage.create({
        data: {
            channelId: id, senderId: me.id, text: cleanText || null, media: cleanMedia,
            anonymous: isAnonymous,
            replyToId: validReplyToId,
            pollQuestion: isPoll ? pollQuestion!.trim().slice(0, 300) : null,
            pollOptions: isPoll ? pollOptions!.map(o => String(o).trim().slice(0, 100)).filter(Boolean).slice(0, 10) : [],
            pollExpiresAt: isPoll && pollExpiresAt ? new Date(pollExpiresAt) : null,
            pollMulti: isPoll ? !!pollMulti : false,
            scheduledFor: scheduledDate,
            // Rich media
            mediaType: cleanMediaType,
            mediaMime: typeof mediaMime === "string" ? mediaMime.slice(0, 100) : null,
            mediaName: typeof mediaName === "string" ? mediaName.slice(0, 200) : null,
            mediaSize: typeof mediaSize === "number" && mediaSize > 0 ? Math.floor(mediaSize) : null,
            durationMs: typeof durationMs === "number" && durationMs > 0 ? Math.floor(durationMs) : null,
            locLat: isLocation ? locLat : null,
            locLng: isLocation ? locLng : null,
            locExpiresAt: isLocation && typeof locExpiresAt === "string" ? new Date(locExpiresAt) : null,
            locUpdatedAt: isLocation ? new Date() : null,
            contactName: isContact ? contactName!.slice(0, 100) : null,
            contactPhone: isContact ? contactPhone!.slice(0, 40) : null,
            contactUsername: isContact && typeof contactUsername === "string" ? contactUsername.slice(0, 40) : null,
            viewOnce: !!viewOnce,
            mentions: mentionsList,
        },
    });
    if (cleanText) after(() => moderateOnCreate({ module: "NEXUS", targetType: "CHANNEL_MESSAGE", targetId: msg.id, text: cleanText, kind: "kanal xabari", authorId: me.id }));

    // Slow mode uchun member.lastMsgAt yangilash
    if (channel.type === "GROUP" && channel.slowModeSeconds > 0) {
        after(() => prisma.nexusChannelMember.update({
            where: { channelId_profileId: { channelId: id, profileId: me.id } },
            data: { lastMsgAt: msg.createdAt },
        }).catch(() => {}));
    }

    // Push notif — barcha a'zolarga (senderdan tashqari), 500 tagacha.
    // Jadvalga qo'yilgan post'lar hali chiqarilmagan — push yubormaymiz (cron faollashtirsa keyin).
    // Silent post — a'zolar bildirishnomasiz oladi (Pusher haqiqiy vaqt hali bor).
    if (!scheduledDate && !silent && pushAvailable()) {
        after(async () => {
            const members = await prisma.nexusChannelMember.findMany({
                where: { channelId: id, profileId: { not: me.id } },
                select: { profileId: true, mutedUntil: true }, take: 500,
            });
            if (members.length === 0) return;
            const senderName = me.name ?? me.username ?? "Foydalanuvchi";
            const chLabel = channel.name;
            const previewBase = isLocation ? "[joylashuv]"
                : isContact ? `[kontakt: ${contactName}]`
                : cleanMediaType === "audio" ? "[ovoz]"
                : cleanMediaType === "video-circle" ? "[video]"
                : cleanText || (cleanMedia.length ? "[media]" : isPoll ? "[so'rovnoma]" : "Yangi xabar");
            const url = channel.handle ? `/nexus?channel=${channel.handle}` : "/nexus";
            const now = Date.now();
            const mentionsSet = new Set(mentionsList);
            await Promise.all(members.map(m => {
                // Muted a'zolarga push yubormaymiz (mention'lar bundan mustasno — muhim)
                const isMuted = m.mutedUntil && m.mutedUntil.getTime() > now;
                const isMentioned = mentionsSet.has(m.profileId);
                if (isMuted && !isMentioned) return Promise.resolve();
                const title = isMentioned
                    ? `${chLabel} · ${senderName} sizni tildi`
                    : `${chLabel} · ${senderName}`;
                return sendPushToProfile(m.profileId, {
                    title,
                    body: previewBase.slice(0, 120),
                    url,
                    tag: `ch-${id}`,
                }).catch(() => {});
            }));
        });
    }

    // Reply preview qaytarish (agar bor bo'lsa)
    let replyToOut: { id: string; text: string | null; senderName: string | null } | null = null;
    if (validReplyToId) {
        const r = await prisma.nexusChannelMessage.findUnique({
            where: { id: validReplyToId }, select: { id: true, text: true, senderId: true, media: true },
        });
        if (r) {
            const sender = await prisma.userProfile.findUnique({
                where: { id: r.senderId }, select: { name: true, username: true },
            });
            replyToOut = {
                id: r.id,
                text: r.text ? r.text.slice(0, 120) : (r.media?.length ? "[media]" : null),
                senderName: sender?.name ?? sender?.username ?? null,
            };
        }
    }

    // Real-time push — kanal a'zolariga (sender bilan birga) o'z private-user kanaliga.
    // Anonim rejim: umumiy javobda author o'rniga guruh nomi/avatari, senderId yashirilgan.
    // Real senderId serverda saqlanadi (moderatsiya + o'zim ko'rish uchun).
    const publicAuthor = isAnonymous
        ? { name: channel.name, username: null, image: channel.avatarUrl, verified: false }
        : { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me) };
    const outMsg = {
        id: msg.id, text: msg.text, media: msg.media, createdAt: msg.createdAt,
        // Anonim: senderId null bo'ladi push payload'da (owner o'zi ko'ra oladi lekin faqat mine flag orqali)
        senderId: isAnonymous ? null : me.id,
        anonymous: isAnonymous,
        author: publicAuthor,
        pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions,
        pollExpiresAt: msg.pollExpiresAt, pollMulti: msg.pollMulti,
        pollVoteCounts: isPoll ? msg.pollOptions.map(() => 0) : null,
        pollMyVotes: isPoll ? [] : null, pollTotal: isPoll ? 0 : null,
        replyTo: replyToOut,
        reactions: [],
    };
    // Jadvalga qo'yilgan post — hozir hech kim ko'rmaydi, Pusher yubormaymiz.
    if (!scheduledDate) {
        after(async () => {
            const members = await prisma.nexusChannelMember.findMany({
                where: { channelId: id },
                select: { profileId: true }, take: 500,
            });
            // Blok: sender bilan blok bo'lgan a'zolarga Pusher yubormaymiz (ular xabarni ko'rmaydi)
            const blockedPairs = await prisma.nexusBlock.findMany({
                where: {
                    OR: [
                        { blockerId: me.id, blockedId: { in: members.map(m => m.profileId) } },
                        { blockedId: me.id, blockerId: { in: members.map(m => m.profileId) } },
                    ],
                },
                select: { blockerId: true, blockedId: true },
            });
            const blockedOfSender = new Set<string>();
            for (const b of blockedPairs) {
                blockedOfSender.add(b.blockerId === me.id ? b.blockedId : b.blockerId);
            }
            await Promise.all(members
                .filter(m => !blockedOfSender.has(m.profileId))
                .map(m =>
                    pusherTrigger(userChannel(m.profileId), "nx:msg:new", {
                        channelId: id,
                        message: { ...outMsg, mine: m.profileId === me.id },
                    })
                ));
        });
    }

    return NextResponse.json({
        message: { ...outMsg, mine: true, scheduledFor: scheduledDate },
    });
}
