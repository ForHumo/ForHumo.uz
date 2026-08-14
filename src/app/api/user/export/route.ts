// Foydalanuvchi ma'lumotlarini yuklab olish (GDPR data portability).
// Barcha profil + DM + kanal a'zoliklar + postlar + videolar + treklar JSON tarzida.
//
//   GET /api/user/export
//   → JSON download (Content-Disposition: attachment)
//
// Rate-limit: 7 kunda 1 marta (resurs talabchan, ko'p ma'lumot).
// Media fayllar URL sifatida qaytadi (foydalanuvchi o'zi yuklab olishi mumkin).
//
// Cheklovlar (juda katta hisoblarni himoya qilish):
//   - Har DM'da eng so'nggi 2000 xabar
//   - Eng so'nggi 500 post, 200 video, 200 track
//   - Eng so'nggi 1000 bookmark, 500 saqlangan post

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXPORT_WINDOW_MS = 7 * 24 * 3600 * 1000;   // 7 kun
const MSGS_PER_CONV = 2000;
const MAX_POSTS = 500;
const MAX_VIDEOS = 200;
const MAX_TRACKS = 200;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Rate-limit
    if (me.lastExportAt) {
        const elapsed = Date.now() - me.lastExportAt.getTime();
        if (elapsed < EXPORT_WINDOW_MS) {
            const nextAt = new Date(me.lastExportAt.getTime() + EXPORT_WINDOW_MS);
            return NextResponse.json({
                error: "Eksport 7 kunda 1 marta mumkin",
                nextAvailableAt: nextAt.toISOString(),
            }, { status: 429 });
        }
    }

    // Boshlaymiz — hammasi bir vaqtda parallel
    const [convs, channels, posts, videos, tracks, bookmarks, savedPosts, follows, blocks, tips] = await Promise.all([
        prisma.nexusConversation.findMany({
            where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
            select: {
                id: true, user1Id: true, user2Id: true, createdAt: true, lastMessageAt: true,
            },
        }),
        prisma.nexusChannelMember.findMany({
            where: { profileId: me.id },
            include: { channel: { select: { id: true, name: true, handle: true, type: true, isPrivate: true } } },
        }),
        prisma.nexusPost.findMany({
            where: { profileId: me.id },
            orderBy: { createdAt: "desc" }, take: MAX_POSTS,
        }),
        prisma.nexusVideo.findMany({
            where: { profileId: me.id },
            orderBy: { createdAt: "desc" }, take: MAX_VIDEOS,
        }),
        prisma.nexusTrack.findMany({
            where: { profileId: me.id },
            orderBy: { createdAt: "desc" }, take: MAX_TRACKS,
        }),
        prisma.nexusMessageBookmark.findMany({
            where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 1000,
            include: { message: { select: { id: true, text: true, createdAt: true, conversationId: true } } },
        }),
        prisma.nexusSave.findMany({
            where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 500,
            include: { post: { select: { id: true, text: true, createdAt: true } } },
        }),
        prisma.nexusFollow.findMany({
            where: { followerId: me.id }, orderBy: { createdAt: "desc" }, take: 5000,
        }),
        prisma.nexusBlock.findMany({
            where: { blockerId: me.id }, orderBy: { createdAt: "desc" }, take: 1000,
        }),
        prisma.nexusTip.findMany({
            where: { OR: [{ donorId: me.id }, { recipientId: me.id }] },
            orderBy: { createdAt: "desc" }, take: 1000,
            select: { id: true, donorId: true, recipientId: true, amount: true, currency: true, message: true, targetType: true, targetId: true, createdAt: true },
        }),
    ]);
    // followee profil ma'lumotini alohida so'rov bilan boyitamiz (schema'da relation yo'q)
    const followeeIds = follows.map(f => f.followingId);
    const followeeProfiles = followeeIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: followeeIds } }, select: { id: true, username: true, name: true },
    }) : [];
    const fMap = new Map(followeeProfiles.map(p => [p.id, p]));

    // Har suhbat uchun so'nggi 2000 xabar
    const conversationsFull = await Promise.all(convs.map(async c => {
        const messages = await prisma.nexusMessage.findMany({
            where: { conversationId: c.id },
            orderBy: { createdAt: "desc" },
            take: MSGS_PER_CONV,
            select: {
                id: true, senderId: true, text: true, mediaType: true, mediaUrl: true, mediaMime: true,
                mediaName: true, mediaSize: true, replyToId: true, editedAt: true, createdAt: true,
                deletedForEveryoneAt: true, forwardedFromName: true,
            },
        });
        const peerId = c.user1Id === me.id ? c.user2Id : c.user1Id;
        const peer = await prisma.userProfile.findUnique({
            where: { id: peerId }, select: { username: true, name: true, humoId: true },
        });
        return {
            id: c.id,
            peerId,
            peer: peer ? { username: peer.username, name: peer.name, humoId: peer.humoId } : null,
            createdAt: c.createdAt,
            lastMessageAt: c.lastMessageAt,
            messages: messages.reverse(),   // eski → yangi tartibda
        };
    }));

    const dataOut = {
        exportedAt: new Date().toISOString(),
        format:     "forhumo.export.v1",
        profile: {
            id:            me.id,
            humoId:        me.humoId,
            username:      me.username,
            name:          me.name,
            firstName:     me.firstName,
            lastName:      me.lastName,
            email:         me.email,
            country:       me.country,
            city:          me.city,
            bio:           me.bio,
            birthday:      me.birthday,
            image:         me.image,
            coverImage:    me.coverImage,
            phone:         me.phone,
            verified:      me.verified,
            verifiedCategory: me.verifiedCategory,
            level:         me.level,
            createdAt:     me.emailVerified,   // placeholder
            totpEnabled:   me.totpEnabled,
            privacyLastSeen: me.privacyLastSeen,
            privacyDm:     me.privacyDm,
            privacyProfilePhoto: me.privacyProfilePhoto,
            steamId64:     me.steamId64,
            steamPersona:  me.steamPersona,
        },
        conversations: conversationsFull,
        channels: channels.map(m => ({
            channelId:  m.channelId,
            role:       m.role,
            joinedAt:   m.joinedAt,
            channel:    m.channel,
        })),
        posts:  posts.map(p => ({ ...p, media: p.media })),
        videos: videos.map(v => ({
            id: v.id, title: v.title, description: v.description,
            videoUrl: v.videoUrl, thumbUrl: v.thumbUrl,
            durationSec: v.durationSec, kind: v.kind, orientation: v.orientation,
            views: v.views, isMature: v.isMature,
            createdAt: v.createdAt,
        })),
        tracks: tracks.map(t => ({
            id: t.id, title: t.title, kind: t.kind, audioUrl: t.audioUrl,
            coverUrl: t.coverUrl, durationSec: t.durationSec, plays: t.plays,
            createdAt: t.createdAt,
        })),
        bookmarks: bookmarks.map(b => ({
            messageId: b.messageId, createdAt: b.createdAt,
            snippet: b.message?.text?.slice(0, 200) ?? null,
        })),
        savedPosts: savedPosts.map(s => ({
            postId: s.postId, createdAt: s.createdAt,
            snippet: s.post?.text?.slice(0, 200) ?? null,
        })),
        follows: follows.map(f => {
            const p = fMap.get(f.followingId);
            return {
                followingId: f.followingId,
                following:   p ? { username: p.username, name: p.name } : null,
                createdAt:   f.createdAt,
            };
        }),
        blocks: blocks.map(b => ({ blockedId: b.blockedId, createdAt: b.createdAt })),
        tips: tips.map(t => ({
            id: t.id, direction: t.donorId === me.id ? "sent" : "received",
            counterpartyId: t.donorId === me.id ? t.recipientId : t.donorId,
            targetType: t.targetType, targetId: t.targetId,
            amount: t.amount, currency: t.currency, message: t.message, createdAt: t.createdAt,
        })),
        counts: {
            conversations: conversationsFull.length,
            channels:      channels.length,
            posts:         posts.length,
            videos:        videos.length,
            tracks:        tracks.length,
            bookmarks:     bookmarks.length,
            savedPosts:    savedPosts.length,
            follows:       follows.length,
            blocks:        blocks.length,
            tips:          tips.length,
        },
        notes: {
            capMessagesPerConversation: MSGS_PER_CONV,
            capPosts:  MAX_POSTS,
            capVideos: MAX_VIDEOS,
            capTracks: MAX_TRACKS,
            mediaNote: "Media fayllar (rasm/video/audio) URL sifatida — brauzerda ochib yuklab oling.",
        },
    };

    // Rate-limit belgisini yozamiz (muvaffaqiyatli yuklashdan keyin)
    await prisma.userProfile.update({
        where: { id: me.id },
        data:  { lastExportAt: new Date() },
    });

    const filename = `forhumo-export-${me.username || me.humoId || "user"}-${new Date().toISOString().slice(0, 10)}.json`;
    // Decimal'lar JSON.stringify uchun stringga o'tadi (Prisma default) — OK
    return new NextResponse(JSON.stringify(dataOut, null, 2), {
        status: 200,
        headers: {
            "Content-Type":        "application/json",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control":       "no-store",
        },
    });
}
