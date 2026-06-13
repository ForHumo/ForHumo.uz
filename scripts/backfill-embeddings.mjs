// Mavjud postlarni embed qiladi (4-bosqich seed). Idempotent — embeddingi yo'qlarni oladi.
// Ishga tushirish: DATABASE_URL="..." GEMINI_API_KEY="..." node scripts/backfill-embeddings.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const DIM = 768;

async function embed(text) {
    const clean = (text || "").trim().slice(0, 8000);
    if (!clean) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${KEY}`;
    const body = { model: `models/${MODEL}`, content: { parts: [{ text: clean }] }, outputDimensionality: DIM };
    for (let i = 0; i < 3; i++) {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (r.ok) { const d = await r.json(); const v = d?.embedding?.values; return Array.isArray(v) && v.length ? v : null; }
        if (r.status === 503 || r.status === 429) { await new Promise(x => setTimeout(x, 800 * (i + 1))); continue; }
        return null;
    }
    return null;
}

try {
    if (!KEY) throw new Error("GEMINI_API_KEY yo'q");
    const rows = await prisma.$queryRawUnsafe(`
        SELECT p.id, p.text, p.hashtags FROM "NexusPost" p
        LEFT JOIN "NexusPostEmbedding" e ON e."postId" = p.id
        WHERE e."postId" IS NULL AND p.hidden = false AND (p.text IS NOT NULL OR array_length(p.hashtags,1) > 0)
        ORDER BY p."createdAt" DESC LIMIT 500`);
    console.log(`Embed qilinadigan postlar: ${rows.length}`);
    let ok = 0;
    for (const r of rows) {
        const content = [r.text, (r.hashtags || []).map(h => "#" + h).join(" ")].filter(Boolean).join(" ");
        const v = await embed(content);
        if (!v) { console.log("  skip", r.id); continue; }
        const lit = `[${v.join(",")}]`;
        await prisma.$executeRawUnsafe(`INSERT INTO "NexusPostEmbedding" ("postId", embedding) VALUES ($1, $2::vector) ON CONFLICT ("postId") DO UPDATE SET embedding = EXCLUDED.embedding`, r.id, lit);
        ok++;
    }
    console.log(`✔ ${ok} ta post embed qilindi`);
} catch (e) {
    console.error("XATO:", e.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
