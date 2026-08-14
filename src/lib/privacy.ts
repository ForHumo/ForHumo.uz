// Foydalanuvchi privacy tekshiruvlari — DM, last seen, avatar ko'rinishi.
//
// "all"      → hamma
// "contacts" → bir-birini follow qilganlar (mutual follow)
// "none"     → hech kim (self istisno)

import { prisma } from "@/lib/prisma";

export type PrivacyLevel = "all" | "contacts" | "none";

// Ikkala foydalanuvchi bir-birini follow qilganmi?
export async function areContacts(profileAId: string, profileBId: string): Promise<boolean> {
    if (profileAId === profileBId) return true;
    const [a2b, b2a] = await Promise.all([
        prisma.nexusFollow.findUnique({
            where: { followerId_followingId: { followerId: profileAId, followingId: profileBId } },
            select: { id: true },
        }),
        prisma.nexusFollow.findUnique({
            where: { followerId_followingId: { followerId: profileBId, followingId: profileAId } },
            select: { id: true },
        }),
    ]);
    return !!(a2b && b2a);
}

// Umumiy privacy tekshiruv: sender viewerId, target profileId.
// Target'ning privacy sozlamasi asosida true/false.
export async function checkPrivacy(
    viewerId: string,
    targetProfileId: string,
    level: PrivacyLevel,
): Promise<boolean> {
    if (viewerId === targetProfileId) return true;                   // O'ziga har doim ochiq
    if (level === "all") return true;
    if (level === "none") return false;
    // "contacts"
    return areContacts(viewerId, targetProfileId);
}
