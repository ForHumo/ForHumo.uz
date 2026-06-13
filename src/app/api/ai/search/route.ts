import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { aiGate } from "@/lib/ai-gate";
import { MARKET_CATEGORIES } from "@/lib/market-categories";

interface Filters {
    keywords?: string;
    category?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    sort?: "price_asc" | "price_desc" | "rating" | "popular" | null;
}

// POST /api/ai/search — tabiiy tildagi qidiruvni filtrlarga aylantirib, mahsulot qaytaradi
export async function POST(req: Request) {
    if (!aiAvailable())
        return NextResponse.json({ error: "AI hali sozlanmagan", code: "AI_NO_KEY" }, { status: 503 });
    const gate = await aiGate("search");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "Qidiruv bo'sh" }, { status: 400 });

    const catList = MARKET_CATEGORIES.map(c => `${c.slug} (${c.name})`).join(", ");
    const prompt = `Foydalanuvchi onlayn-do'konda qidirmoqda: "${query.trim()}"
Buni qidiruv filtrlariga aylantir. Narxlar Ƶ (Zij) da, 1 Ƶ = 1 USD.
Kategoriya FAQAT shu ro'yxatdan (yoki null): ${catList}

Faqat JSON qaytar:
{"keywords": "mahsulot nomi uchun qisqa kalit so'z(lar), o'zbekcha", "category": "slug yoki null", "minPrice": son yoki null, "maxPrice": son yoki null, "sort": "price_asc|price_desc|rating|popular yoki null"}`;

    let f: Filters | null = null;
    try {
        f = await aiJSON<Filters>(prompt, { temperature: 0.2 });
    } catch (e) {
        return NextResponse.json({ error: "AI xatosi: " + (e as Error).message.slice(0, 120) }, { status: 502 });
    }
    if (!f) f = { keywords: query.trim() };

    const validCat = f.category && MARKET_CATEGORIES.some(c => c.slug === f!.category) ? f.category : null;
    const price: { gte?: number; lte?: number } = {};
    if (typeof f.minPrice === "number" && f.minPrice > 0) price.gte = f.minPrice;
    if (typeof f.maxPrice === "number" && f.maxPrice > 0) price.lte = f.maxPrice;

    const where: Prisma.MarketProductWhereInput = {
        isActive: true,
        ...(validCat ? { category: validCat } : {}),
        ...(Object.keys(price).length ? { price } : {}),
        ...(f.keywords?.trim() ? {
            OR: [
                { name: { contains: f.keywords.trim(), mode: "insensitive" } },
                { description: { contains: f.keywords.trim(), mode: "insensitive" } },
            ],
        } : {}),
    };

    const orderBy: Prisma.MarketProductOrderByWithRelationInput[] =
        f.sort === "price_asc" ? [{ price: "asc" }] :
        f.sort === "price_desc" ? [{ price: "desc" }] :
        f.sort === "rating" ? [{ rating: "desc" }] :
        [{ isFeatured: "desc" }, { sold: "desc" }];

    const products = await prisma.marketProduct.findMany({
        where, orderBy, take: 24,
        include: { brand: { select: { name: true, slug: true, verified: true, logo: true } } },
    });

    return NextResponse.json({
        products,
        interpretation: {
            keywords: f.keywords?.trim() || null,
            category: validCat,
            categoryName: validCat ? MARKET_CATEGORIES.find(c => c.slug === validCat)?.name ?? null : null,
            minPrice: price.gte ?? null,
            maxPrice: price.lte ?? null,
            sort: f.sort ?? null,
        },
    });
}
