// Nexus pullik obuna yordamchilari.
// SUBSCRIBERS kontent faqat faol obunachilarga (expiresAt > now) ko'rinadi.

import { prisma } from "@/lib/prisma";

export const SUB_DAYS = 30;

// Men faol obuna bo'lgan ijodkorlar (creatorId) ro'yxati — feed gating uchun.
export async function getActiveSubscribedCreatorIds(myId: string | null): Promise<string[]> {
    if (!myId) return [];
    const subs = await prisma.nexusSubscription.findMany({
        where: { subscriberId: myId, expiresAt: { gt: new Date() } },
        select: { creatorId: true },
    });
    return subs.map(s => s.creatorId);
}

// Men shu ijodkorga faol obunachimanmi?
export async function isActiveSubscriber(myId: string | null, creatorId: string): Promise<boolean> {
    if (!myId || myId === creatorId) return myId === creatorId; // o'ziga doim ochiq
    const sub = await prisma.nexusSubscription.findUnique({
        where: { subscriberId_creatorId: { subscriberId: myId, creatorId } },
        select: { expiresAt: true },
    });
    return !!sub && sub.expiresAt.getTime() > Date.now();
}
