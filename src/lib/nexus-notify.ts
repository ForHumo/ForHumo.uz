// Nexus bildirishnoma yaratish — o'ziga yubormaydi, hech qachon xato tashlamaydi.
import { prisma } from "@/lib/prisma";

export type NexusNotifType = "LIKE" | "COMMENT" | "FOLLOW" | "REPLY";

export async function nexusNotify(opts: {
    recipientId: string;
    actorId: string;
    type: NexusNotifType;
    postId?: string | null;
    commentId?: string | null;
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
            },
        });
    } catch {
        /* bildirishnoma asosiy amalни buzmaydi */
    }
}
