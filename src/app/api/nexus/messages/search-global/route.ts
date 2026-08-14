// Global xabar qidiruvi — barcha suhbatlarim va kanallarim bo'yicha.
//
//   GET /api/nexus/messages/search-global?q=<query>&limit=30
//   → { dm: [...], channel: [...] }
//
// Har natija: xabar snippet + kim/qaerda (peer nom yoki kanal nomi) + convId/channelId.
// Foydalanuvchi bosishi → o'sha suhbatga o'tadi (client tomon).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBlockedIds } from "@/lib/nexus-block";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ dm: [], channel: [] });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ dm: [], channel: [] });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json({ dm: [], channel: [] });
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 30)));

    // DM — mening suhbatlarim ichida
    const myConvs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        select: { id: true, user1Id: true, user2Id: true },
    });
    const convIds = myConvs.map(c => c.id);
    // Blok: bloklangan foydalanuvchilar xabarlari qidiruv natijasidan chiqmaydi
    const blockedIds = await getBlockedIds(me.id);
    const dmMsgs = convIds.length ? await prisma.nexusMessage.findMany({
        where: {
            conversationId: { in: convIds },
            text: { contains: q, mode: "insensitive" },
            ...(blockedIds.size > 0 ? { senderId: { notIn: [...blockedIds] } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true, text: true, createdAt: true, senderId: true,
            conversationId: true, mediaType: true,
        },
    }) : [];

    // DM peer ma'lumoti
    const peerIds = new Set<string>();
    for (const c of myConvs) peerIds.add(c.user1Id === me.id ? c.user2Id : c.user1Id);
    const peers = peerIds.size ? await prisma.userProfile.findMany({
        where: { id: { in: [...peerIds] } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const peerMap = new Map(peers.map(p => [p.id, p]));
    const convMap = new Map(myConvs.map(c => [c.id, c]));

    // Kanal — mening kanallarim
    const myMemberships = await prisma.nexusChannelMember.findMany({
        where: { profileId: me.id, channel: { hidden: false } },
        select: { channelId: true },
    });
    const channelIds = myMemberships.map(m => m.channelId);
    const chMsgs = channelIds.length ? await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: { in: channelIds },
            text: { contains: q, mode: "insensitive" },
            hidden: false,
            ...(blockedIds.size > 0 ? { senderId: { notIn: [...blockedIds] } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true, text: true, createdAt: true, senderId: true, channelId: true,
        },
    }) : [];
    const channels = channelIds.length ? await prisma.nexusChannel.findMany({
        where: { id: { in: channelIds } },
        select: { id: true, name: true, avatarUrl: true, type: true, handle: true },
    }) : [];
    const chMap = new Map(channels.map(c => [c.id, c]));
    const chSenderIds = [...new Set(chMsgs.map(m => m.senderId))];
    const chSenders = chSenderIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: chSenderIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const chSenderMap = new Map(chSenders.map(s => [s.id, s]));

    return NextResponse.json({
        query: q,
        dm: dmMsgs.map(m => {
            const conv = convMap.get(m.conversationId);
            const peerId = conv ? (conv.user1Id === me.id ? conv.user2Id : conv.user1Id) : null;
            const peer = peerId ? peerMap.get(peerId) : null;
            return {
                messageId: m.id, convId: m.conversationId,
                text: m.text?.slice(0, 200) ?? "",
                createdAt: m.createdAt,
                mine: m.senderId === me.id,
                mediaType: m.mediaType,
                peer: peer ? { id: peer.id, name: peer.name, username: peer.username, image: peer.image } : null,
            };
        }),
        channel: chMsgs.map(m => {
            const ch = chMap.get(m.channelId);
            const sender = chSenderMap.get(m.senderId);
            return {
                messageId: m.id, channelId: m.channelId,
                text: m.text?.slice(0, 200) ?? "",
                createdAt: m.createdAt,
                mine: m.senderId === me.id,
                channel: ch ? {
                    id: ch.id, name: ch.name, avatarUrl: ch.avatarUrl,
                    type: ch.type, handle: ch.handle,
                } : null,
                sender: sender ? { id: sender.id, name: sender.name, username: sender.username, image: sender.image } : null,
            };
        }),
    });
}
