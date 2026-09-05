// Xaridor uchun AI xarid yordamchi.
// Tabiiy tildagi so'rov ("menga arzon 5kg guruch topib ber") — AI qidiruv
// so'zlariga aylantiradi, mahsulotlarni topadi va tavsiya bilan qaytaradi.
//
//   POST /api/bn/shopping-assistant  { text: string }
//
// Rate-limited (30/kun/user).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBnAuth } from "@/lib/bn-auth";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { belisRate } from "@/lib/belis-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TEXT = 400;

interface AiFilter {
    keywords: string[];        // qidiruv so'zlar
    categorySlug?: string;     // aniq kategoriya
    maxPrice?: number;         // so'm
    minPrice?: number;         // so'm
    preference?: "cheapest" | "best_rated" | "newest";
    reply: string;             // sotuvchiga qisqa javob (uz)
}

interface Product {
    id: string; slug: string; title: string;
    price: number; oldPrice: number | null; marketAvgPrice: number | null;
    images: string[]; rating: number; ratingCount: number; stock: number;
    shop: { name: string; slug: string; city: string } | null;
    category: { name: string; slug: string } | null;
}

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const auth = await getBnAuth();
    // Anonim ham chaqirishi mumkin, lekin rate-limit auth bo'lsa qattiqroq

    // Rate limit (auth bo'lsa)
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

    // Kategoriya ro'yxati AI'ga tanish uchun (top-level)
    const categories = await prisma.bnCategory.findMany({
        where: { isActive: true, parentId: null },
        select: { slug: true, name: true },
        take: 40,
    });
    const catList = categories.map(c => `${c.slug} (${c.name})`).join(", ");

    // AI parse
    const filter = await aiJSON<AiFilter>(
`Sen O'zbekistondagi Bozor Narxida marketpleysining xarid yordamchisisan.
Xaridor tabiiy o'zbek tilida so'rov qiladi. Uni qidiruv filtriga aylantirasan.

Xaridor so'rovi: "${text}"

Mavjud kategoriyalar (slug ishlat): ${catList}

JSON qaytar:
{
  "keywords": ["so'z1", "so'z2"],   // qidiruv so'zlari, 1-4 dona (masalan: ["guruch", "5kg"])
  "categorySlug": "guruch",           // agar aniq kategoriya bo'lsa
  "maxPrice": 100000,                 // so'm, "arzon" degan bo'lsa
  "minPrice": null,
  "preference": "cheapest",           // cheapest | best_rated | newest
  "reply": "Sizga arzon 5kg guruch qidiryapman"    // qisqa javob (uz)
}`,
        { temperature: 0.3 },
    );

    if (!filter || !filter.keywords || filter.keywords.length === 0) {
        return NextResponse.json({
            ok: true,
            reply: "Tushunmadim. Aniqroq yozing — masalan: 'arzon 5kg guruch' yoki 'sifatli sut'",
            products: [],
        });
    }

    // Qidiruv (o'z filtri bilan)
    const whereBase = {
        isActive: true,
        hidden: false,
        stock: { gt: 0 },
    };
    const orConds = filter.keywords.map(kw => ({
        title: { contains: kw, mode: "insensitive" as const },
    }));

    const category = filter.categorySlug
        ? await prisma.bnCategory.findUnique({ where: { slug: filter.categorySlug }, select: { id: true } })
        : null;

    const priceFilter: { gte?: number; lte?: number } = {};
    if (filter.minPrice && filter.minPrice > 0) priceFilter.gte = filter.minPrice;
    if (filter.maxPrice && filter.maxPrice > 0) priceFilter.lte = filter.maxPrice;

    const order = filter.preference === "best_rated"
        ? [{ rating: "desc" as const }, { ratingCount: "desc" as const }]
        : filter.preference === "newest"
        ? [{ createdAt: "desc" as const }]
        : [{ price: "asc" as const }];

    const productsRaw = await prisma.bnProduct.findMany({
        where: {
            ...whereBase,
            ...(category ? { categoryId: category.id } : {}),
            ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
            OR: orConds,
        },
        select: {
            id: true, slug: true, title: true,
            price: true, oldPrice: true, marketAvgPrice: true,
            images: true, rating: true, ratingCount: true, stock: true,
            shop: { select: { name: true, slug: true, city: true } },
            category: { select: { name: true, slug: true } },
        },
        orderBy: order,
        take: 12,
    });

    const products: Product[] = productsRaw.map(p => ({
        id: p.id, slug: p.slug, title: p.title,
        price: p.price, oldPrice: p.oldPrice, marketAvgPrice: p.marketAvgPrice,
        images: p.images, rating: p.rating, ratingCount: p.ratingCount, stock: p.stock,
        shop: p.shop, category: p.category,
    }));

    // aiUsage log
    if (auth) {
        try {
            await prisma.aiUsage.create({
                data: { profileId: auth.profileId, kind: "bn-shopping" },
            });
        } catch { /* fail-safe */ }
    }

    return NextResponse.json({
        ok: true,
        query: text,
        filter,
        reply: filter.reply || `${products.length} ta mos mahsulot topildi.`,
        products,
    });
}
