// pgvector raw SQL quvurini tekshiradi: insert (::vector) + AVG + cosine (<=>).
// Ishga tushirish: DATABASE_URL="..." node scripts/test-pgvector.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const dim = 768;
const v1 = Array.from({ length: dim }, (_, i) => (i % 7) / 7);
const v2 = Array.from({ length: dim }, (_, i) => (i % 5) / 5);
const lit = (v) => `[${v.join(",")}]`;

try {
    // 1) insert ikkita test embedding
    await prisma.$executeRaw`INSERT INTO "NexusPostEmbedding" ("postId", embedding) VALUES ('__t1', ${lit(v1)}::vector) ON CONFLICT ("postId") DO UPDATE SET embedding = EXCLUDED.embedding`;
    await prisma.$executeRaw`INSERT INTO "NexusPostEmbedding" ("postId", embedding) VALUES ('__t2', ${lit(v2)}::vector) ON CONFLICT ("postId") DO UPDATE SET embedding = EXCLUDED.embedding`;
    console.log("✔ vector insert (::vector) ishladi");

    // 2) AVG (user-vektor uchun) + user-embedding upsert
    await prisma.$executeRaw`INSERT INTO "NexusUserEmbedding" ("profileId", embedding) SELECT '__u1', AVG(e.embedding) FROM "NexusPostEmbedding" e WHERE e."postId" IN ('__t1','__t2') HAVING COUNT(e.*) > 0 ON CONFLICT ("profileId") DO UPDATE SET embedding = EXCLUDED.embedding`;
    console.log("✔ AVG(vector) + user-embedding ishladi");

    // 3) cosine qidiruv (<=>)
    const rows = await prisma.$queryRaw`SELECT pe."postId" AS id, (1 - (pe.embedding <=> ue.embedding)) AS sim FROM "NexusPostEmbedding" pe CROSS JOIN "NexusUserEmbedding" ue WHERE ue."profileId" = '__u1' ORDER BY pe.embedding <=> ue.embedding LIMIT 5`;
    console.log("✔ cosine (<=>) qidiruv:", rows.map(r => `${r.id}=${Number(r.sim).toFixed(3)}`).join(", "));

    // 4) tozalash
    await prisma.$executeRawUnsafe(`DELETE FROM "NexusPostEmbedding" WHERE "postId" IN ('__t1','__t2')`);
    await prisma.$executeRawUnsafe(`DELETE FROM "NexusUserEmbedding" WHERE "profileId" = '__u1'`);
    console.log("✔ tozalandi — quvur to'liq ishlaydi");
} catch (e) {
    console.error("XATO:", e.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
