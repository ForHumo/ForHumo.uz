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
    const rows = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: id, hidden: false,
            ...(blockedIds.size > 0 ? { senderId: { notIn: [...blockedIds] } } : {}),
            ...(since ? { createdAt: { gt: new Date(since) } } : {}),
        },
        orderBy: { createdAt: since ? "asc" : "desc" }, take: 100,
    });
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
            return {
                id: m.id, text: m.text, media: m.media, createdAt: m.createdAt, mine,
                anonymous: anon,
                author: publicAuthor,
                pollQuestion: m.pollQuestion, pollOptions: m.pollOptions, pollExpiresAt: m.pollExpiresAt, pollMulti: m.pollMulti,
                pollVoteCounts: pv?.counts ?? null, pollMyVotes: pv?.myVotes ?? null, pollTotal: pv?.total ?? null,
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
    const { text, media, pollQuestion, pollOptions, pollExpiresAt, pollMulti, replyToId } = body as {
        text?: string; media?: unknown;
        pollQuestion?: string; pollOptions?: string[]; pollExpiresAt?: string; pollMulti?: boolean;
        replyToId?: string;
    };
    const cleanText = typeof text === "string" ? text.trim().slice(0, 4000) : "";
    const cleanMedia: string[] = filterMediaUrls(media, 9);
    const isPoll = !!pollQuestion?.trim() && Array.isArray(pollOptions) && pollOptions.length >= 2 && pollOptions.length <= 10;
    if (!cleanText && !cleanMedia.length && !isPoll) return NextResponse.json({ error: "Bo'sh bo'lmasin" }, { status: 400 });

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

    const msg = await prisma.nexusChannelMessage.create({
        data: {
            channelId: id, senderId: me.id, text: cleanText || null, media: cleanMedia,
            anonymous: isAnonymous,
            replyToId: validReplyToId,
            pollQuestion: isPoll ? pollQuestion!.trim().slice(0, 300) : null,
            pollOptions: isPoll ? pollOptions!.map(o => String(o).trim().slice(0, 100)).filter(Boolean).slice(0, 10) : [],
            pollExpiresAt: isPoll && pollExpiresAt ? new Date(pollExpiresAt) : null,
            pollMulti: isPoll ? !!pollMulti : false,
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

    // Push notif — barcha a'zolarga (senderdan tashqari), 500 tagacha
    if (pushAvailable()) {
        after(async () => {
            const members = await prisma.nexusChannelMember.findMany({
                where: { channelId: id, profileId: { not: me.id } },
                select: { profileId: true }, take: 500,
            });
            if (members.length === 0) return;
            const senderName = me.name ?? me.username ?? "Foydalanuvchi";
            const chLabel = channel.name;
            const preview = cleanText || (cleanMedia.length ? "[media]" : isPoll ? "[so'rovnoma]" : "Yangi xabar");
            const url = channel.handle ? `/nexus?channel=${channel.handle}` : "/nexus";
            await Promise.all(members.map(m => sendPushToProfile(m.profileId, {
                title: `${chLabel} · ${senderName}`,
                body: preview.slice(0, 120),
                url,
                tag: `ch-${id}`,
            }).catch(() => {})));
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

    return NextResponse.json({
        message: { ...outMsg, mine: true },
    });
}
