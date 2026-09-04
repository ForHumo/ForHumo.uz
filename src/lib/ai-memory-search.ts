// AI xabar tarixi — semantic search (pgvector).
// Yangi xabar keldi → so'nggi 12'ga qo'shimcha eng semantik yaqin 3-5 ta qadimgi xabar
// system prompt'ga qo'shiladi (RAG-lite).

import { prisma } from "@/lib/prisma";
import { aiEmbed } from "@/lib/ai";

/** Xabar embeddingini yozib qo'yish (after() ichida chaqiriladi). */
export async function embedAiMessage(messageId: string, body: string): Promise<void> {
    if (!body || body.length < 5) return;
    try {
        const vec = await aiEmbed(body.slice(0, 2000));
        if (!vec || vec.length !== 768) return;
        // Prisma vector'ni bilmaydi → raw SQL
        const vecLit = `[${vec.join(",")}]`;
        await prisma.$executeRawUnsafe(
            `UPDATE "AiMessage" SET embedding = $1::vector WHERE id = $2`,
            vecLit,
            messageId,
        );
    } catch (e) {
        console.error("embedAiMessage failed:", e);
    }
}

/** Qadimgi eng mos xabarlarni topish (cross-conversation, foydalanuvchi o'ziniki). */
export async function findRelevantOldMessages(
    profileId: string,
    query: string,
    limit: number = 3,
    excludeConversationIds: string[] = [],
): Promise<Array<{ id: string; body: string; conversationId: string; createdAt: Date }>> {
    if (!query || query.length < 5) return [];
    try {
        const vec = await aiEmbed(query.slice(0, 2000));
        if (!vec) return [];
        const vecLit = `[${vec.join(",")}]`;

        // Raw SQL: pgvector cosine similarity + foydalanuvchi filtri
        const excludeClause = excludeConversationIds.length
            ? `AND m."conversationId" NOT IN (${excludeConversationIds.map((_, i) => `$${i + 3}`).join(",")})`
            : "";
        const sql = `
            SELECT m.id, m.body, m."conversationId", m."createdAt"
            FROM "AiMessage" m
            JOIN "AiConversation" c ON c.id = m."conversationId"
            WHERE c."profileId" = $1
              AND m.embedding IS NOT NULL
              AND length(m.body) > 20
              ${excludeClause}
            ORDER BY m.embedding <=> $2::vector
            LIMIT ${Math.max(1, Math.min(10, limit))}
        `;
        const params = [profileId, vecLit, ...excludeConversationIds];
        const rows = await prisma.$queryRawUnsafe<
            Array<{ id: string; body: string; conversationId: string; createdAt: Date }>
        >(sql, ...params);
        return rows ?? [];
    } catch (e) {
        console.error("findRelevantOldMessages failed:", e);
        return [];
    }
}
