// Nexus bildirishnoma yaratish — o'ziga yubormaydi, hech qachon xato tashlamaydi.
import { prisma } from "@/lib/prisma";

export type NexusNotifType =
    | "LIKE" | "COMMENT" | "FOLLOW" | "REPLY"
    | "VIDEO_LIKE" | "VIDEO_COMMENT" | "TRACK_LIKE" | "PURCHASE" | "LIVE";

export async function nexusNotify(opts: {
    recipientId: string;
    actorId: string;
    type: NexusNotifType;
    postId?: string | null;
    commentId?: string | null;
    videoId?: string | null;
    trackId?: string | null;
    liveId?: string | null;
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
            },
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
