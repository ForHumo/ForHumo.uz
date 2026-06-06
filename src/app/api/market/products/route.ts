import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category    = searchParams.get("cat")      ?? undefined;
    const subcategory = searchParams.get("sub")      ?? undefined;
    const featured    = searchParams.get("featured") === "1";
    const search      = searchParams.get("q")        ?? undefined;
    const limit       = Number(searchParams.get("limit") ?? 20);

    const products = await prisma.marketProduct.findMany({
        where: {
            isActive: true,
            ...(category    && { category }),
            ...(subcategory && { subcategory }),
            ...(featured    && { isFeatured: true }),
            ...(search      && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ]
            }),
        },
        include: { brand: { select: { name: true, slug: true, verified: true, logo: true } } },
        orderBy: [{ isFeatured: "desc" }, { sold: "desc" }],
        take: limit,
    });

    return NextResponse.json({ products });
}

// POST — yangi mahsulot qo'shish (faqat o'z brendiga)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json();
    const { brandSlug, name, description, price, oldPrice, stock, category, subcategory, images } = body;

    if (!brandSlug) return NextResponse.json({ error: "Brend tanlang" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Mahsulot nomi kerak" }, { status: 400 });
    if (!price || Number(price) < 1) return NextResponse.json({ error: "Narx kerak (kamida 1 Ƶ)" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Kategoriya tanlang" }, { status: 400 });

    // Brend egasi tekshiruvi — faqat o'z brendiga qo'sha oladi
    const brand = await prisma.marketBrand.findUnique({ where: { slug: brandSlug } });
    if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
    if (brand.ownerId !== profile.id)
        return NextResponse.json({ error: "Bu brend sizniki emas" }, { status: 403 });

    // Slug yaratish (noyob bo'lishi uchun random suffix)
    const baseSlug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    // Rasm: berilmasa picsum mock
    const finalImages: string[] = (Array.isArray(images) && images.filter(Boolean).length)
        ? images.filter(Boolean)
        : [`https://picsum.photos/seed/${slug}/600/600`, `https://picsum.photos/seed/${slug}b/600/600`];

    const product = await prisma.marketProduct.create({
        data: {
            brandId: brand.id,
            name: name.trim(),
            slug,
            description: description?.trim() ?? null,
            images: finalImages,
            price: Number(price),
            oldPrice: oldPrice ? Number(oldPrice) : null,
            stock: stock ? Number(stock) : 0,
            category,
            subcategory: subcategory ?? null,
        },
    });
    return NextResponse.json({ product });
}
