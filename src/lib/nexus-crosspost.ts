// Cross-post: post/video/live/track → foydalanuvchining o'z kanaliga xabar sifatida.
// Fail-safe: kanal bo'lmasa yoki xato bo'lsa, jimgina o'tib ketadi.

import { prisma } from "@/lib/prisma";

export type CrossType = "post" | "video" | "live" | "track";

// Foydalanuvchining birinchi o'z egaligidagi kanalini topamiz (CHANNEL type)
async function findOwnedChannel(profileId: string): Promise<string | null> {
    const c = await prisma.nexusChannel.findFirst({
        where: { ownerId: profileId, type: "CHANNEL", systemOwned: false },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    return c?.id ?? null;
}

interface Args {
    authorId: string;
    type: CrossType;
    id: string;
    title: string;              // linkedTitle
    thumb?: string | null;      // linkedThumb (cover image)
    description?: string | null;
    media?: string[];           // asosiy postda bo'lgan media (rasm/video)
}

export async function crossPostToOwnChannel(a: Args): Promise<{ channelId: string | null; messageId: string | null }> {
    try {
        const channelId = await findOwnedChannel(a.authorId);
        if (!channelId) return { channelId: null, messageId: null };

        // Matn tuzish: nom + tavsif
        const parts: string[] = [];
        if (a.title) parts.push(a.title);
        if (a.description) parts.push(a.description.slice(0, 500));
        const text = parts.join("\n\n").slice(0, 2000);

        // Thumb bor va media bo'sh bo'lsa — mavjud kanal renderer'i ko'rsata olishi uchun
        // media[0]'ga thumbnail'ni ham qo'shamiz.
        const mediaOut = (a.media && a.media.length > 0)
            ? a.media
            : (a.thumb ? [a.thumb] : []);
        const msg = await prisma.nexusChannelMessage.create({
            data: {
                channelId,
                senderId: a.authorId,
                text: text || null,
                media: mediaOut,
                linkedType: a.type,
                linkedId: a.id,
                linkedTitle: a.title.slice(0, 200),
                linkedThumb: a.thumb ?? null,
            },
        });
        return { channelId, messageId: msg.id };
    } catch { return { channelId: null, messageId: null }; }
}

// Bir marta yoqib qo'yilgan avto-cross-post (UserProfile.autoRepostToOwnChannel).
// Ijodkor har safar bosishi shart emas — sozlamada aytib qo'yiladi.
export async function shouldAutoCrosspost(profileId: string): Promise<boolean> {
    const p = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { autoRepostToOwnChannel: true },
    }).catch(() => null);
    return !!p?.autoRepostToOwnChannel;
}
