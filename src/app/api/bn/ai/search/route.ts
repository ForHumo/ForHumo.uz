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
import { aiGate } from "@/lib/ai-gate";

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

    // Auth + tezlik cheklovi (Gemini xarajatini himoya qilish)
    const gate = await aiGate("bn-search");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

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

    const keywords = filter.keywords || q;
    // Bosqichma-bosqich fallback: kategoriya ba'zan noto'g'ri chiqadi
    // yoki mahsulotlar hali kategoriyaga tegilmagan bo'ladi (ayniqsa yangi do'konlar).
    // Shuning uchun agar to'liq filter 0 natija bersa, tor filter'larni olib tashlaymiz.
    let products = await searchProducts({
        q: keywords,
        categorySlug: filter.categorySlug ?? undefined,
        marketSlug: filter.marketSlug ?? undefined,
        sort: filter.sort ?? "new",
        limit: 40,
    });

    let fallbackNote: string | null = null;
    // 1-fallback: kategoriya olib tashlansin, faqat kalit so'z + bozor
    if (products.length === 0 && filter.categorySlug) {
        products = await searchProducts({
            q: keywords,
            marketSlug: filter.marketSlug ?? undefined,
            sort: filter.sort ?? "new",
            limit: 40,
        });
        if (products.length > 0) fallbackNote = "category_dropped";
    }
    // 2-fallback: bozor ham olib tashlansin — faqat kalit so'z bo'yicha barcha bozorlar
    if (products.length === 0 && (filter.marketSlug || filter.categorySlug)) {
        products = await searchProducts({
            q: keywords,
            sort: filter.sort ?? "new",
            limit: 40,
        });
        if (products.length > 0) fallbackNote = "filters_dropped";
    }
    // 3-fallback: kalit so'zni qisqartirib qayta qidirish (birinchi so'z, "kolbasa kerak" → "kolbasa")
    if (products.length === 0) {
        const firstWord = keywords.split(/\s+/)[0];
        if (firstWord && firstWord !== keywords && firstWord.length >= 3) {
            products = await searchProducts({ q: firstWord, sort: "new", limit: 40 });
            if (products.length > 0) fallbackNote = "keyword_shortened";
        }
    }

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
        fallbackNote,   // debug uchun; UI ko'rsatmasa ham
    });
}
