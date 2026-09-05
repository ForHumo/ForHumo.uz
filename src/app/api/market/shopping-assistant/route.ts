// Market xaridor uchun AI qidiruv (Humo Market B2C supermarket).
// Tabiiy tildagi so'rovni Gemini filtrga aylantiradi va mahsulotlarni topadi.
//
//   POST /api/market/shopping-assistant  { text }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBnAuth } from "@/lib/bn-auth";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { belisRate } from "@/lib/belis-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TEXT = 400;

interface AiFilter {
    keywords: string[];
    category?: string;
    maxPrice?: number;
    minPrice?: number;
    preference?: "cheapest" | "best_rated" | "newest";
    reply: string;
}

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const auth = await getBnAuth();
    if (auth) {
        try {
            const rate = await belisRate(auth.profileId, "aiChat");
            if (rate.limited) {
                return NextResponse.json({
                    error: "rate_limited",
                    message: `Kuniga ${rate.max} AI so'rov chegarasi.`,
                }, { status: 429 });
            }
        } catch { /* fail-open */ }
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });

    // Market kategoriyalari — MarketProduct.category (string)
    const cats = await prisma.marketProduct.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ["category"],
        take: 30,
    }).catch(() => []);
    const catList = cats.map(c => c.category).join(", ");

    const filter = await aiJSON<AiFilter>(
`Sen Humo Market onlayn supermarketining AI xarid yordamchisisan.
Xaridor tabiiy o'zbek tilida so'rov beradi. Uni qidiruv filtriga aylantirasan.

Xaridor so'rovi: "${text}"

Mavjud kategoriyalar (slug): ${catList}

JSON qaytar:
{
  "keywords": ["so'z1"],
  "category": "kategoriya slug (ixtiyoriy)",
  "maxPrice": 100000,
  "minPrice": null,
  "preference": "cheapest|best_rated|newest",
  "reply": "qisqa javob (uz)"
}`,
        { temperature: 0.3 },
    );

    if (!filter || !filter.keywords || filter.keywords.length === 0) {
        return NextResponse.json({
            ok: true,
            reply: "Tushunmadim. Aniqroq yozing.",
            products: [],
        });
    }

    const priceFilter: { gte?: number; lte?: number } = {};
    if (filter.minPrice && filter.minPrice > 0) priceFilter.gte = filter.minPrice;
    if (filter.maxPrice && filter.maxPrice > 0) priceFilter.lte = filter.maxPrice;

    const order = filter.preference === "best_rated"
        ? [{ rating: "desc" as const }, { reviewCount: "desc" as const }]
        : filter.preference === "newest"
        ? [{ createdAt: "desc" as const }]
        : [{ price: "asc" as const }];

    const productsRaw = await prisma.marketProduct.findMany({
        where: {
            isActive: true, stock: { gt: 0 },
            ...(filter.category ? { category: filter.category } : {}),
            ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
            OR: filter.keywords.map(kw => ({
                name: { contains: kw, mode: "insensitive" as const },
            })),
        },
        select: {
            id: true, slug: true, name: true, price: true, oldPrice: true, currency: true,
            images: true, rating: true, reviewCount: true,
            brand: { select: { name: true, slug: true } },
        },
        orderBy: order,
        take: 12,
    });

    if (auth) {
        try {
            await prisma.aiUsage.create({
                data: { profileId: auth.profileId, kind: "market-shopping" },
            });
        } catch { /* fail-safe */ }
    }

    return NextResponse.json({
        ok: true, query: text, filter,
        reply: filter.reply || `${productsRaw.length} ta mos mahsulot topildi.`,
        products: productsRaw.map(p => ({
            id: p.id, slug: p.slug, title: p.name,
            price: Number(p.price), oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
            currency: p.currency,
            images: p.images, rating: p.rating, reviewCount: p.reviewCount,
            brand: p.brand,
        })),
    });
}
