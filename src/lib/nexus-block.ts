// Nexus bloklash / ovozsizlantirish yordamchilari.
// Blok — ikki tomonlama (aloqani to'sadi). Mute — bir tomonlama (faqat kontentni yashiradi).

import { prisma } from "@/lib/prisma";

// Tasmadan/qidiruvdan yashirin profil ID'lari:
//   men bloklaganlar + meni bloklaganlar + men mute qilganlar.
export async function getHiddenAuthorIds(myId: string | null): Promise<string[]> {
    if (!myId) return [];
    const [blocks, mutes] = await Promise.all([
        prisma.nexusBlock.findMany({
            where: { OR: [{ blockerId: myId }, { blockedId: myId }] },
            select: { blockerId: true, blockedId: true },
        }),
        prisma.nexusMute.findMany({ where: { muterId: myId }, select: { mutedId: true } }),
    ]);
    const ids = new Set<string>();
    for (const b of blocks) ids.add(b.blockerId === myId ? b.blockedId : b.blockerId);
    for (const m of mutes) ids.add(m.mutedId);
    return [...ids];
}

// Faqat blok bo'lgan ID'lar (har ikki yo'nalish) — profil/DM/follow to'sish uchun.
export async function getBlockedIds(myId: string | null): Promise<Set<string>> {
    if (!myId) return new Set();
    const blocks = await prisma.nexusBlock.findMany({
        where: { OR: [{ blockerId: myId }, { blockedId: myId }] },
        select: { blockerId: true, blockedId: true },
    });
    const s = new Set<string>();
    for (const b of blocks) s.add(b.blockerId === myId ? b.blockedId : b.blockerId);
    return s;
}

// Ikki foydalanuvchi orasida (har qaysi yo'nalishda) blok bormi.
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
    if (!a || !b || a === b) return false;
    const found = await prisma.nexusBlock.findFirst({
        where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
        select: { id: true },
    });
    return !!found;
}
