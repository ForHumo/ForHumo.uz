// Nexus tavsiya algoritmi — 1-bosqich: "Senga mos" feed reytingi.
// Sof Postgres/JS (qo'shimcha ML infra yo'q). Kam ma'lumotda ham ishlaydi,
// engagement to'plangani sari aniqroq bo'ladi. Keyingi bosqichlar (qiziqish vektori,
// collaborative filtering, pgvector+Gemini embeddings) shu poydevorga qo'shiladi.

import { prisma } from "@/lib/prisma";

export interface InterestProfile {
    followingSet: Set<string>;       // kuzatadigan mualliflar
    authorWeights: Map<string, number>;  // muallifga yaqinlik (follow + like'lardan)
    tagWeights: Map<string, number>;     // teg qiziqishi (like qilingan postlar teglaridan)
}

const EMPTY: InterestProfile = { followingSet: new Set(), authorWeights: new Map(), tagWeights: new Map() };

// Qiziqish profilini quradi. 2-bosqich: avval saqlangan vektorni (NexusInterest, kunlik
// cron) o'qiydi — tez + kuchli signal. Yo'q bo'lsa (yangi user / cron hali ishlamagan)
// jonli hisoblaydi (1-bosqich fallback). Follow'lar har doim yangilanadi (cron orasida o'zgaradi).
export async function buildInterestProfile(myId: string | null): Promise<InterestProfile> {
    if (!myId) return EMPTY;
    try {
        const [stored, follows] = await Promise.all([
            prisma.nexusInterest.findUnique({ where: { profileId: myId } }),
            prisma.nexusFollow.findMany({ where: { followerId: myId }, select: { followingId: true } }),
        ]);
        const followingSet = new Set(follows.map(f => f.followingId));

        if (!stored) return liveInterestProfile(myId, follows);

        const authorWeights = new Map<string, number>(Object.entries((stored.authors ?? {}) as unknown as Record<string, number>));
        const tagWeights = new Map<string, number>(Object.entries((stored.tags ?? {}) as unknown as Record<string, number>));

        // 3-bosqich CF — kashfiyot in'ektsiyasi: tavsiya mualliflar (kuzatmaganlar)
        // kamroq og'irlik bilan qo'shiladi → feed'da bubble'dan tashqari yangi mualliflar paydo bo'ladi.
        const rec = (stored.recAuthors ?? {}) as unknown as Record<string, number>;
        for (const [id, w] of Object.entries(rec)) {
            if (followingSet.has(id)) continue;
            authorWeights.set(id, Math.max(authorWeights.get(id) ?? 0, Math.min(w * 0.4, 2.5)));
        }

        // Follow'lar har doim joriy (cron orasida qo'shilgan/olib tashlanganlar)
        for (const f of follows) authorWeights.set(f.followingId, Math.max(authorWeights.get(f.followingId) ?? 0, 2));
        return { followingSet, authorWeights, tagWeights };
    } catch {
        return EMPTY; // algoritm xatosi feed'ni buzmaydi (fail-safe → xronologik)
    }
}

// 1-bosqich uslubidagi jonli hisoblash (saqlangan vektor yo'q bo'lganda fallback).
async function liveInterestProfile(myId: string, follows: { followingId: string }[]): Promise<InterestProfile> {
    const likes = await prisma.nexusLike.findMany({
        where: { profileId: myId }, orderBy: { createdAt: "desc" }, take: 150,
        select: { post: { select: { profileId: true, hashtags: true } } },
    });
    const followingSet = new Set(follows.map(f => f.followingId));
    const authorWeights = new Map<string, number>();
    const tagWeights = new Map<string, number>();
    for (const f of follows) authorWeights.set(f.followingId, (authorWeights.get(f.followingId) ?? 0) + 2);
    for (const l of likes) {
        const p = l.post;
        if (!p) continue;
        authorWeights.set(p.profileId, (authorWeights.get(p.profileId) ?? 0) + 1);
        for (const t of p.hashtags) tagWeights.set(t, (tagWeights.get(t) ?? 0) + 1);
    }
    return { followingSet, authorWeights, tagWeights };
}

export interface RankablePost {
    profileId: string;
    hashtags: string[];
    createdAt: Date;
    _count: { likes: number; comments: number };
}

// Post skori (yuqori = mosroq). Og'irliklar tajriba bilan sozlanadi.
export function scorePost(post: RankablePost, profile: InterestProfile, now: number): number {
    const ageHours = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
    const recency = Math.exp(-ageHours / 48);                       // yarim-umr ~33 soat
    const engagement = Math.log1p(post._count.likes + 2 * post._count.comments);
    const authorAffinity = Math.min(profile.authorWeights.get(post.profileId) ?? 0, 5);
    let tagAffinity = 0;
    for (const t of post.hashtags) tagAffinity += profile.tagWeights.get(t) ?? 0;
    tagAffinity = Math.min(tagAffinity, 6);
    return 1.0 * recency + 0.6 * engagement + 0.8 * authorAffinity + 0.5 * tagAffinity;
}
