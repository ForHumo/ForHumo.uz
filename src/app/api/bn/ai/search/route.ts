// BN AI Search — foydalanuvchi tabiiy tilda so'rov beradi
// ("Sergeli bozoridan Nexia 3 ga arzon amortizator toping"),
// AI filtrlarni chiqarib, mahsulotlarni topib qaytaradi.
//
// POST /api/bn/ai/search   body: { q: string }
//   → { filter, products[], reply, sourceQuery }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiJSON, aiAvailable } from "@/lib/ai";
import { searchProducts } from "@/lib/bn-data";

interface AIFilter {
    categorySlug: string | null;
    marketSlug: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    sort: "new" | "cheap" | "rating" | null;
    keywords: string;
    intent: "search" | "browse" | "unclear";
    reply: string;   // qisqa javob foydalanuvchiga
}

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const q = String(body?.q ?? "").trim().slice(0, 300);
    if (!q) return NextResponse.json({ error: "q_required" }, { status: 400 });

    const [cats, mkts] = await Promise.all([
        prisma.bnCategory.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: { slug: true, name: true, parentId: true },
        }),
        prisma.bnMarket.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }],
            select: { slug: true, name: true },
        }),
    ]);
    const catList = cats.map(c => `${c.parentId ? "  " : ""}${c.slug} — ${c.name}`).join("\n");
    const marketList = mkts.map(m => `${m.slug} — ${m.name}`).join("\n");

    const prompt = `
Sen ForHumo.uz Bozor Narxida marketplace uchun qidiruv yordamchisisan.
Foydalanuvchi tabiiy tilda so'rov berdi. Sen JSON qaytar:

{
  "categorySlug": "eng mos kategoriya slug (bo'lmasa null)",
  "marketSlug": "agar so'rovda bozor nomi bo'lsa (bo'lmasa null)",
  "minPrice": null,       // UZS
  "maxPrice": null,       // UZS
  "sort": null,           // "cheap" (arzon) | "new" (yangi) | "rating" (top) | null
  "keywords": "so'rovdan mahsulot nomi/xarakteristikalari",
  "intent": "search",     // "search" (aniq mahsulot) | "browse" (umumiy ko'rish) | "unclear"
  "reply": "qisqa foydalanuvchiga javob (uzbek, 1 gap)"
}

Kategoriyalar:
${catList}

Bozorlar:
${marketList}

Foydalanuvchi so'rovi: "${q}"

Muhim:
- EMOJI ISHLATMA
- Faqat mavjud kategoriya/bozor slug'ini yoz. Aniqmasa null
- narx: "arzon", "20-50 ming" kabi iboralarni tushun. Aniqmasa null
- reply — uzbek tilida, do'stona
`.trim();

    const filter = await aiJSON<AIFilter>(prompt);
    if (!filter) {
        // AI xatosi — mahsulot nomi bo'yicha oddiy qidiruv
        const products = await searchProducts({ q, limit: 30 });
        return NextResponse.json({ ok: true, filter: null, products, reply: null, fallback: true });
    }

    // Tekshirib qaytaramiz
    if (filter.categorySlug && !cats.some(c => c.slug === filter.categorySlug)) filter.categorySlug = null;
    if (filter.marketSlug && !mkts.some(m => m.slug === filter.marketSlug)) filter.marketSlug = null;

    const products = await searchProducts({
        q: filter.keywords || q,
        categorySlug: filter.categorySlug ?? undefined,
        marketSlug: filter.marketSlug ?? undefined,
        sort: filter.sort ?? "new",
        limit: 40,
    });

    // Narx filtrlash (AI dan kelgan bo'lsa)
    let filtered = products;
    if (filter.minPrice) filtered = filtered.filter(p => p.price >= filter.minPrice!);
    if (filter.maxPrice) filtered = filtered.filter(p => p.price <= filter.maxPrice!);

    return NextResponse.json({
        ok: true,
        filter,
        products: filtered,
        reply: filter.reply,
        sourceQuery: q,
    });
}
