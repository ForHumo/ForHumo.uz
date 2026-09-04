// Nexus bildirishnoma yaratish — o'ziga yubormaydi, hech qachon xato tashlamaydi.
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";
import { getBlockedIds } from "@/lib/nexus-block";

export type NexusNotifType =
    | "LIKE" | "COMMENT" | "FOLLOW" | "REPLY"
    | "VIDEO_LIKE" | "VIDEO_COMMENT" | "TRACK_LIKE" | "PURCHASE" | "LIVE" | "TIP" | "MENTION" | "SUB_EXPIRING"
    | "CALL_MISSED" | "MOD_WARN" | "SUPPORT";

const PUSH_TEXT: Record<NexusNotifType, string> = {
    LIKE: "postingizni yoqtirdi", COMMENT: "postingizga izoh qoldirdi", FOLLOW: "sizni kuzatdi",
    REPLY: "izohingizga javob berdi", VIDEO_LIKE: "videongizni yoqtirdi", VIDEO_COMMENT: "videongizga izoh qoldirdi",
    TRACK_LIKE: "trekingizni yoqtirdi", PURCHASE: "videongizni sotib oldi", LIVE: "jonli efir boshladi",
    TIP: "sizni qo'llab-quvvatladi", MENTION: "sizni eslatib o'tdi", SUB_EXPIRING: "obunangiz tugayapti",
    CALL_MISSED: "sizni chaqirdi (javob berilmadi)",
    MOD_WARN: "AI moderatsiya sizning oxirgi xabaringiz shubhali topdi (agar hazil bo'lsa, do'stingiz noto'g'ri tushunmasligiga ishonch hosil qiling)",
    SUPPORT: "yordam so'rovingizga javob berdi",
};
function pushUrl(o: { postId?: string | null; videoId?: string | null; trackId?: string | null; liveId?: string | null; callId?: string | null; ticketId?: string | null; type?: NexusNotifType }): string {
    if (o.type === "SUPPORT") return o.ticketId ? `/support?ticket=${o.ticketId}` : "/support";
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
    ticketId?: string | null;
    amount?: number | null;
    // SUPPORT/MOD_WARN kabi tizim bildirishnomalarida oldindan matn berish mumkin
    customBody?: string | null;
}): Promise<void> {
    // Odatda o'ziga bildirishnoma yubormaymiz — istisno: tizim ogohlantirishlari (MOD_WARN, SUPPORT)
    if (!opts.recipientId) return;
    const isSystem = opts.type === "MOD_WARN" || opts.type === "SUPPORT";
    if (opts.recipientId === opts.actorId && !isSystem) return;
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
                ticketId: opts.ticketId ?? null,
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
        const title = opts.type === "SUPPORT" ? "For Humo · Yordam" : "Nexus";
        const body = opts.customBody?.slice(0, 200) || `${who} ${PUSH_TEXT[opts.type]}`;
        void sendPushToProfile(opts.recipientId, {
            title, body, url: pushUrl({ ...opts, type: opts.type }), tag: opts.type,
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
