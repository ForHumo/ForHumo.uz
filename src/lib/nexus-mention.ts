// @mention — matndan @username larni ajratib, eslatilgan foydalanuvchilarga bildirishnoma.
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { getBlockedIds } from "@/lib/nexus-block";

// Matndan @username larni ajratish (maks 10, takrorsiz, kichik harf).
export function extractMentions(text: string | null | undefined): string[] {
    if (!text) return [];
    const set = new Set<string>();
    const re = /@([a-z0-9_]{3,20})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) set.add(m[1].toLowerCase());
    return [...set].slice(0, 10);
}

// Eslatilgan (mavjud, o'zi emas, bloklanmagan) foydalanuvchilarga MENTION bildirishnoma.
export async function notifyMentions(opts: {
    text: string | null | undefined;
    actorId: string;
    postId?: string | null;
    videoId?: string | null;
    commentId?: string | null;
}): Promise<void> {
    const names = extractMentions(opts.text);
    if (!names.length) return;
    try {
        const users = await prisma.userProfile.findMany({
            where: { username: { in: names } }, select: { id: true },
        });
        const blocked = await getBlockedIds(opts.actorId);
        for (const u of users) {
            if (u.id === opts.actorId || blocked.has(u.id)) continue;
            await nexusNotify({
                recipientId: u.id, actorId: opts.actorId, type: "MENTION",
                postId: opts.postId ?? null, videoId: opts.videoId ?? null, commentId: opts.commentId ?? null,
            });
        }
    } catch {
        /* eslatma bildirishnomasi asosiy amalni buzmaydi */
    }
}
