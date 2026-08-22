import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin, belisSlug } from "@/lib/belis";
import type { Prisma } from "@prisma/client";

// GET /api/belis/products?category=slug&featured=1&sort=new|price-asc|price-desc&q=&skip=0&limit=24
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const featured = searchParams.get("featured") === "1";
    const sort = searchParams.get("sort") ?? "new";
    const q = searchParams.get("q")?.trim();
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10) || 0);
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24));

    const where: Prisma.BelisProductWhereInput = { isActive: true, hidden: false };
    if (categorySlug) where.category = { slug: categorySlug };
    if (featured) where.featured = true;
    if (q) {
        where.OR = [
            { nameUz: { contains: q, mode: "insensitive" } },
            { nameRu: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
        ];
    }
    const orderBy: Prisma.BelisProductOrderByWithRelationInput =
        sort === "price-asc"  ? { price: "asc" }
      : sort === "price-desc" ? { price: "desc" }
      : { createdAt: "desc" };

    const items = await prisma.belisProduct.findMany({
        where, orderBy, skip, take: limit,
        include: { category: { select: { slug: true, nameUz: true } } },
    });
    return NextResponse.json({
        items: items.map(p => ({
            id: p.id, slug: p.slug,
            nameUz: p.nameUz, nameRu: p.nameRu, nameEn: p.nameEn,
            images: p.images,
            price: Number(p.price), oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
            currency: p.currency, stock: p.stock, sold: p.sold,
            featured: p.featured,
            category: p.category,
        })),
        hasMore: items.length === limit,
    });
}

// POST /api/belis/products (admin)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => ({}));
    const nameUz = String(body?.nameUz ?? "").trim();
    const price = Number(body?.price ?? 0);
    if (!nameUz) return NextResponse.json({ error: "nameUz kerak" }, { status: 400 });
    if (!(price > 0)) return NextResponse.json({ error: "Narx > 0 bo'lsin" }, { status: 400 });

    const slug = body?.slug ? belisSlug(String(body.slug)) : belisSlug(nameUz + "-" + Date.now().toString(36).slice(-4));
    const images: string[] = Array.isArray(body?.images) ? body.images.filter((x: unknown): x is string => typeof x === "string" && x.startsWith("http")).slice(0, 12) : [];

    const p = await prisma.belisProduct.create({
        data: {
            slug, nameUz,
            nameRu: body?.nameRu ?? null,
            nameEn: body?.nameEn ?? null,
            descriptionUz: body?.descriptionUz ?? null,
            descriptionRu: body?.descriptionRu ?? null,
            descriptionEn: body?.descriptionEn ?? null,
            categoryId: body?.categoryId ?? null,
            images,
            price,
            oldPrice: body?.oldPrice ? Number(body.oldPrice) : null,
            currency: body?.currency ?? "UZS",
            stock: typeof body?.stock === "number" ? body.stock : 0,
            featured: !!body?.featured,
            tags: Array.isArray(body?.tags) ? body.tags.filter((x: unknown): x is string => typeof x === "string").slice(0, 12) : [],
        },
    });
    return NextResponse.json({ product: p });
}
