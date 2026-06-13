// Tavsiya algoritmi 3-bosqich: collaborative filtering (umumiy-follow qo'shnilari).
// "Senga o'xshaganlar kuzatadigan, lekin sen kuzatmaydigan" mualliflarni topadi —
// kashfiyot (bubble'dan tashqari yangi mualliflar). Sof relational (NexusFollow),
// kunlik cron ichida (nexus-interest) hisoblanadi. take cheklovlari ishni chegaralaydi.

import { prisma } from "@/lib/prisma";

type Scores = Record<string, number>;

// Foydalanuvchi uchun tavsiya mualliflar { authorId: score }.
// Mantiq: men kuzatadigan mualliflarni kuzatadigan boshqalar (qo'shnilar) →
// ular kuzatadigan, lekin men kuzatmaydigan mualliflar (ovoz soni bo'yicha).
export async function computeRecommendedAuthors(profileId: string, myFollowingIds: string[]): Promise<Scores> {
    if (myFollowingIds.length === 0) return {};

    // 1) Qo'shnilar — men kuzatadigan mualliflarni kuzatadigan boshqa foydalanuvchilar
    const sharedRows = await prisma.nexusFollow.findMany({
        where: { followingId: { in: myFollowingIds }, followerId: { not: profileId } },
        select: { followerId: true }, take: 3000,
    });
    const neighborCount: Scores = {};
    for (const r of sharedRows) neighborCount[r.followerId] = (neighborCount[r.followerId] ?? 0) + 1;
    const topNeighbors = Object.entries(neighborCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id);
    if (topNeighbors.length === 0) return {};

    // 2) Qo'shnilar kuzatadigan, lekin men kuzatmaydigan (va men emas) mualliflar
    const exclude = new Set([...myFollowingIds, profileId]);
    const neighborFollows = await prisma.nexusFollow.findMany({
        where: { followerId: { in: topNeighbors } },
        select: { followingId: true }, take: 5000,
    });
    const recCount: Scores = {};
    for (const r of neighborFollows) {
        if (exclude.has(r.followingId)) continue;
        recCount[r.followingId] = (recCount[r.followingId] ?? 0) + 1;
    }

    // Top-30 tavsiya muallif
    return Object.fromEntries(
        Object.entries(recCount).sort((a, b) => b[1] - a[1]).slice(0, 30),
    );
}
