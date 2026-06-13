// Tavsiya algoritmi 2-bosqich: qiziqish vektorini hisoblash (kunlik cron chaqiradi).
// Per-user signallarni jamlaydi → NexusInterest'ga saqlaydi. Feed reytingi (nexus-rank)
// shu saqlangan profilni o'qiydi (har so'rovda qayta hisoblamaydi → tez + kuchli signal).

import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;

type Weights = Record<string, number>;
const add = (m: Weights, k: string, w: number) => { if (k) m[k] = (m[k] ?? 0) + w; };
const topN = (m: Weights, n: number): Weights =>
    Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n));

// Bitta foydalanuvchi uchun qiziqish vektorini hisoblab saqlaydi.
export async function computeUserInterest(profileId: string): Promise<void> {
    const [follows, likes, saves, views] = await Promise.all([
        prisma.nexusFollow.findMany({ where: { followerId: profileId }, select: { followingId: true } }),
        prisma.nexusLike.findMany({
            where: { profileId }, orderBy: { createdAt: "desc" }, take: 200,
            select: { post: { select: { profileId: true, hashtags: true } } },
        }),
        prisma.nexusSave.findMany({
            where: { profileId }, orderBy: { createdAt: "desc" }, take: 100,
            select: { post: { select: { profileId: true, hashtags: true } } },
        }),
        prisma.nexusVideoView.findMany({
            where: { profileId }, orderBy: { createdAt: "desc" }, take: 200, select: { videoId: true },
        }),
    ]);

    // Video ko'rishlar — videoId'lardan muallif/kategoriya/teg (NexusVideoView'da relation yo'q)
    const videoIds = [...new Set(views.map(v => v.videoId))];
    const videos = videoIds.length
        ? await prisma.nexusVideo.findMany({ where: { id: { in: videoIds } }, select: { id: true, profileId: true, category: true, tags: true } })
        : [];
    const vMap = new Map(videos.map(v => [v.id, v]));

    const authors: Weights = {}, tags: Weights = {}, categories: Weights = {};
    // Follow = kuchli muallif signali
    for (const f of follows) add(authors, f.followingId, 2);
    // Like = muallif + teg
    for (const l of likes) if (l.post) { add(authors, l.post.profileId, 1); for (const t of l.post.hashtags) add(tags, t, 1); }
    // Save = kuchliroq (saqlash = jiddiy qiziqish)
    for (const s of saves) if (s.post) { add(authors, s.post.profileId, 2); for (const t of s.post.hashtags) add(tags, t, 2); }
    // Video ko'rish = muallif + kategoriya + teg (zaifroq)
    for (const v of views) {
        const vid = vMap.get(v.videoId);
        if (!vid) continue;
        add(authors, vid.profileId, 0.5);
        if (vid.category) add(categories, vid.category, 0.5);
        for (const t of vid.tags) add(tags, t, 0.3);
    }

    const data = { authors: topN(authors, 60), tags: topN(tags, 60), categories: topN(categories, 20) };
    await prisma.nexusInterest.upsert({
        where: { profileId },
        create: { profileId, ...data },
        update: { ...data, computedAt: new Date() },
    });
}

// So'nggi faol foydalanuvchilarning qiziqishini qayta hisoblaydi (cron, cheklangan partiya).
export async function rebuildInterests(limit = 1000): Promise<number> {
    const since = new Date(Date.now() - 30 * DAY);
    const [likers, viewers, followers] = await Promise.all([
        prisma.nexusLike.findMany({ where: { createdAt: { gt: since } }, select: { profileId: true }, distinct: ["profileId"], take: limit }),
        prisma.nexusVideoView.findMany({ where: { createdAt: { gt: since } }, select: { profileId: true }, distinct: ["profileId"], take: limit }),
        prisma.nexusFollow.findMany({ where: { createdAt: { gt: since } }, select: { followerId: true }, distinct: ["followerId"], take: limit }),
    ]);
    const userSet = new Set<string>();
    for (const x of likers) userSet.add(x.profileId);
    for (const x of viewers) userSet.add(x.profileId);
    for (const x of followers) userSet.add(x.followerId);

    const users = [...userSet].slice(0, limit);
    let count = 0;
    for (const uid of users) {
        try { await computeUserInterest(uid); count++; } catch { /* bitta user xatosi qolganini to'xtatmasin */ }
    }
    return count;
}
