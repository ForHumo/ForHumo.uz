import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { moderateOnCreate } from "@/lib/moderation";
import { filterMediaUrls } from "@/lib/media-url";
import { banGuard } from "@/lib/moderation-guard";

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
    // Inkremental polling (since bor) → asc. Birinchi yuklash (since yo'q) → eng yangi 100 (desc),
    // so'ng xronologik tartibga qaytaramiz. Aks holda 100+ xabarli kanalda yangilar ko'rinmay qolardi.
    const rows = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id, hidden: false, ...(since ? { createdAt: { gt: new Date(since) } } : {}) },
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

    return NextResponse.json({
        messages: msgs.map(m => {
            const p = pMap[m.senderId];
            const pv = pollVoteMap.get(m.id);
            return {
                id: m.id, text: m.text, media: m.media, createdAt: m.createdAt, mine: m.senderId === me.id,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
                pollQuestion: m.pollQuestion, pollOptions: m.pollOptions, pollExpiresAt: m.pollExpiresAt, pollMulti: m.pollMulti,
                pollVoteCounts: pv?.counts ?? null, pollMyVotes: pv?.myVotes ?? null, pollTotal: pv?.total ?? null,
                pinnedAt: m.pinnedAt,
                editedAt: m.editedAt,
                replyTo: m.replyToId ? (replyMap.get(m.replyToId) ?? null) : null,
                reactions: reactionMap.get(m.id)
                    ? [...reactionMap.get(m.id)!.entries()].map(([e, s]) => ({ emoji: e, count: s.count, mine: s.mine }))
                    : [],
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

    // CHANNEL — faqat owner/admin yozadi; GROUP — har bir a'zo
    const canPost = channel.type === "GROUP" ? true : (member.role === "OWNER" || member.role === "ADMIN");
    if (!canPost) return NextResponse.json({ error: "Bu kanalga faqat adminlar yoza oladi" }, { status: 403 });

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

    const msg = await prisma.nexusChannelMessage.create({
        data: {
            channelId: id, senderId: me.id, text: cleanText || null, media: cleanMedia,
            replyToId: validReplyToId,
            pollQuestion: isPoll ? pollQuestion!.trim().slice(0, 300) : null,
            pollOptions: isPoll ? pollOptions!.map(o => String(o).trim().slice(0, 100)).filter(Boolean).slice(0, 10) : [],
            pollExpiresAt: isPoll && pollExpiresAt ? new Date(pollExpiresAt) : null,
            pollMulti: isPoll ? !!pollMulti : false,
        },
    });
    if (cleanText) after(() => moderateOnCreate({ module: "NEXUS", targetType: "CHANNEL_MESSAGE", targetId: msg.id, text: cleanText, kind: "kanal xabari", authorId: me.id }));

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

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, media: msg.media, createdAt: msg.createdAt, mine: true,
            author: { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me) },
            pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions, pollExpiresAt: msg.pollExpiresAt, pollMulti: msg.pollMulti,
            pollVoteCounts: isPoll ? msg.pollOptions.map(() => 0) : null,
            pollMyVotes: isPoll ? [] : null, pollTotal: isPoll ? 0 : null,
            replyTo: replyToOut,
            reactions: [],
        },
    });
}
