// Tavsiya algoritmi 4-bosqich: semantik embeddinglar (pgvector + Gemini).
// Prisma vector turini bilmaydi → barcha vector amallari raw SQL orqali.
// Hammasi fail-safe: kalit/embedding yo'q bo'lsa jim o'tadi (feed Faza 1-3'ga tushadi).

import { prisma } from "@/lib/prisma";
import { aiEmbed } from "@/lib/ai";

// vector literal: [a,b,c] (raqamlar — injection xavfsiz)
const toVec = (v: number[]) => `[${v.join(",")}]`;

// Bitta postni embed qilib saqlaydi (yaratishda after() yoki backfill chaqiradi).
export async function embedPost(postId: string, text: string, hashtags: string[] = []): Promise<boolean> {
    const content = [text, hashtags.map(h => `#${h}`).join(" ")].filter(Boolean).join(" ").trim();
    const vec = await aiEmbed(content);
    if (!vec) return false;
    try {
        await prisma.$executeRaw`
            INSERT INTO "NexusPostEmbedding" ("postId", embedding)
            VALUES (${postId}, ${toVec(vec)}::vector)
            ON CONFLICT ("postId") DO UPDATE SET embedding = EXCLUDED.embedding`;
        return true;
    } catch { return false; }
}

// Foydalanuvchi "ta'm vektori" = like/save qilingan postlar embeddinglarining markazi (centroid).
// Embeddingli post yo'q bo'lsa hech narsa yozmaydi (mavjud vektor saqlanadi).
export async function embedUserFromEngagement(profileId: string): Promise<void> {
    try {
        await prisma.$executeRaw`
            INSERT INTO "NexusUserEmbedding" ("profileId", embedding, "computedAt")
            SELECT ${profileId}, AVG(e.embedding), now()
            FROM "NexusPostEmbedding" e
            WHERE e."postId" IN (
                SELECT "postId" FROM "NexusLike" WHERE "profileId" = ${profileId}
                UNION
                SELECT "postId" FROM "NexusSave" WHERE "profileId" = ${profileId}
            )
            HAVING COUNT(e.*) > 0
            ON CONFLICT ("profileId") DO UPDATE SET embedding = EXCLUDED.embedding, "computedAt" = now()`;
    } catch { /* fail-safe */ }
}

// Foydalanuvchiga semantik eng yaqin postlar: { postId: o'xshashlik(0..1) }.
export async function semanticPostScores(profileId: string, limit = 120): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    try {
        const rows = await prisma.$queryRaw<{ id: string; sim: number }[]>`
            SELECT pe."postId" AS id, (1 - (pe.embedding <=> ue.embedding)) AS sim
            FROM "NexusPostEmbedding" pe
            CROSS JOIN "NexusUserEmbedding" ue
            WHERE ue."profileId" = ${profileId}
              AND ue.embedding IS NOT NULL AND pe.embedding IS NOT NULL
            ORDER BY pe.embedding <=> ue.embedding
            LIMIT ${limit}`;
        for (const r of rows) out.set(r.id, Number(r.sim));
    } catch { /* fail-safe → bo'sh */ }
    return out;
}

// Embeddingi yo'q postlarni to'ldiradi (cron, cheklangan partiya). Yaratilgan sonni qaytaradi.
export async function backfillPostEmbeddings(limit = 40): Promise<number> {
    let rows: { id: string; text: string | null; hashtags: string[] }[] = [];
    try {
        rows = await prisma.$queryRaw<{ id: string; text: string | null; hashtags: string[] }[]>`
            SELECT p.id, p.text, p.hashtags
            FROM "NexusPost" p
            LEFT JOIN "NexusPostEmbedding" e ON e."postId" = p.id
            WHERE e."postId" IS NULL AND p.hidden = false AND (p.text IS NOT NULL OR array_length(p.hashtags, 1) > 0)
            ORDER BY p."createdAt" DESC
            LIMIT ${limit}`;
    } catch { return 0; }

    let count = 0;
    for (const r of rows) {
        if (await embedPost(r.id, r.text ?? "", r.hashtags)) count++;
    }
    return count;
}
