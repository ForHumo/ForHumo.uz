// Nexus bildirishnoma yaratish — o'ziga yubormaydi, hech qachon xato tashlamaydi.
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";
import { getBlockedIds } from "@/lib/nexus-block";

export type NexusNotifType =
    | "LIKE" | "COMMENT" | "FOLLOW" | "REPLY"
    | "VIDEO_LIKE" | "VIDEO_COMMENT" | "TRACK_LIKE" | "PURCHASE" | "LIVE" | "TIP" | "MENTION" | "SUB_EXPIRING"
    | "CALL_MISSED" | "MOD_WARN";

const PUSH_TEXT: Record<NexusNotifType, string> = {
    LIKE: "postingizni yoqtirdi", COMMENT: "postingizga izoh qoldirdi", FOLLOW: "sizni kuzatdi",
    REPLY: "izohingizga javob berdi", VIDEO_LIKE: "videongizni yoqtirdi", VIDEO_COMMENT: "videongizga izoh qoldirdi",
    TRACK_LIKE: "trekingizni yoqtirdi", PURCHASE: "videongizni sotib oldi", LIVE: "jonli efir boshladi",
    TIP: "sizni qo'llab-quvvatladi", MENTION: "sizni eslatib o'tdi", SUB_EXPIRING: "obunangiz tugayapti",
    CALL_MISSED: "sizni chaqirdi (javob berilmadi)",
    MOD_WARN: "AI moderatsiya sizning oxirgi xabaringiz shubhali topdi (agar hazil bo'lsa, do'stingiz noto'g'ri tushunmasligiga ishonch hosil qiling)",
};
function pushUrl(o: { postId?: string | null; videoId?: string | null; trackId?: string | null; liveId?: string | null; callId?: string | null }): string {
    if (o.videoId) return `/nexus/v/${o.videoId}`;
    if (o.trackId) return `/nexus/t/${o.trackId}`;
    if (o.liveId) return `/nexus/live/${o.liveId}`;
    if (o.postId) return `/nexus/p/${o.postId}`;
    if (o.callId) return "/nexus?calls=1";
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
    callId?: string | null;
    amount?: number | null;
}): Promise<void> {
    // Odatda o'ziga bildirishnoma yubormaymiz — istisno: tizim ogohlantirishlari (MOD_WARN)
    if (!opts.recipientId) return;
    if (opts.recipientId === opts.actorId && opts.type !== "MOD_WARN") return;
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
                callId: opts.callId ?? null,
                amount: opts.amount ?? null,
            },
        });
        // Push preferences — bu tur o'chirilgan bo'lsa web push yubormaymiz (in-app baribir bor)
        const recipient = await prisma.userProfile.findUnique({
            where: { id: opts.recipientId }, select: { notifPrefs: true },
        });
        const prefs = (recipient?.notifPrefs ?? {}) as Record<string, boolean>;
        if (prefs[opts.type] === false) return;

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
        // Bloklangan foydalanuvchilarga jonli efir bildirishnomasi yubormaymiz
        const blocked = await getBlockedIds(opts.actorId);
        const recipients = follows.filter(f => !blocked.has(f.followerId));
        if (!recipients.length) return;
        await prisma.nexusNotification.createMany({
            data: recipients.map(f => ({
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
