// pgvector extension + HNSW indekslarni o'rnatadi (semantik tavsiya 4-bosqich).
// Idempotent — IF NOT EXISTS. db push'dan OLDIN extension, KEYIN indekslar uchun ishlatiladi.
// Ishga tushirish: DATABASE_URL="..." node scripts/setup-pgvector.mjs [--index]
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const withIndex = process.argv.includes("--index");

try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✔ vector extension tayyor");

    if (withIndex) {
        await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS nexus_post_emb_idx ON "NexusPostEmbedding" USING hnsw (embedding vector_cosine_ops)`,
        );
        console.log("✔ NexusPostEmbedding HNSW indeksi tayyor");
    }
} catch (e) {
    console.error("XATO:", e.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
