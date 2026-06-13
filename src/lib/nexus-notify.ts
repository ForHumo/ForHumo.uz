// Nexus bildirishnoma yaratish — o'ziga yubormaydi, hech qachon xato tashlamaydi.
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";

export type NexusNotifType =
    | "LIKE" | "COMMENT" | "FOLLOW" | "REPLY"
    | "VIDEO_LIKE" | "VIDEO_COMMENT" | "TRACK_LIKE" | "PURCHASE" | "LIVE" | "TIP" | "MENTION" | "SUB_EXPIRING";

const PUSH_TEXT: Record<NexusNotifType, string> = {
    LIKE: "postingizni yoqtirdi", COMMENT: "postingizga izoh qoldirdi", FOLLOW: "sizni kuzatdi",
    REPLY: "izohingizga javob berdi", VIDEO_LIKE: "videongizni yoqtirdi", VIDEO_COMMENT: "videongizga izoh qoldirdi",
    TRACK_LIKE: "trekingizni yoqtirdi", PURCHASE: "videongizni sotib oldi", LIVE: "jonli efir boshladi",
    TIP: "sizni qo'llab-quvvatladi", MENTION: "sizni eslatib o'tdi", SUB_EXPIRING: "obunangiz tugayapti",
};
function pushUrl(o: { postId?: string | null; videoId?: string | null; trackId?: string | null; liveId?: string | null }): string {
    if (o.videoId) return `/nexus/v/${o.videoId}`;
    if (o.trackId) return `/nexus/t/${o.trackId}`;
    if (o.liveId) return `/nexus/live/${o.liveId}`;
    if (o.postId) return `/nexus/p/${o.postId}`;
    return "/nexus";
}

export async function nexusNotify(opts: {
    recipientId: string;
    actorId: string;
    type: NexusNotifType;
    postId?: string | null;
    commentId?: string | null;
    videoId?: string | null;
    trackId?: string | null;
    liveId?: string | null;
    amountZij?: number | null;
}): Promise<void> {
    if (!opts.recipientId || opts.recipientId === opts.actorId) return; // o'ziga emas
    try {
        await prisma.nexusNotification.create({
            data: {
                recipientId: opts.recipientId,
                actorId: opts.actorId,
                type: opts.type,
                postId: opts.postId ?? null,
                commentId: opts.commentId ?? null,
                videoId: opts.videoId ?? null,
                trackId: opts.trackId ?? null,
                liveId: opts.liveId ?? null,
                amountZij: opts.amountZij ?? null,
            },
        });
        // Web push (fire-and-forget; kalit yo'q bo'lsa jim o'tadi)
        const actor = await prisma.userProfile.findUnique({ where: { id: opts.actorId }, select: { name: true, username: true } });
        const who = actor?.name || (actor?.username ? `@${actor.username}` : "Kimdir");
        void sendPushToProfile(opts.recipientId, {
            title: "Nexus", body: `${who} ${PUSH_TEXT[opts.type]}`, url: pushUrl(opts), tag: opts.type,
        });
    } catch {
        /* bildirishnoma asosiy amalни buzmaydi */
    }
}

// Jonli efir boshlanganda kuzatuvchilarga ommaviy bildirishnoma (fan-out, cheklangan).
export async function nexusNotifyFollowers(opts: {
    actorId: string;
    type: "LIVE";
    liveId: string;
    limit?: number;
}): Promise<void> {
    try {
        const follows = await prisma.nexusFollow.findMany({
            where: { followingId: opts.actorId },
            select: { followerId: true },
            take: opts.limit ?? 1000,
        });
        if (!follows.length) return;
        await prisma.nexusNotification.createMany({
            data: follows.map(f => ({
                recipientId: f.followerId,
                actorId: opts.actorId,
                type: opts.type,
                liveId: opts.liveId,
            })),
        });
    } catch {
        /* fan-out xatosi asosiy amalни buzmaydi */
    }
}
