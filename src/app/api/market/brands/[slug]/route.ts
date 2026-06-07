import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/market/brands/[slug] — brend profili + mahsulotlari + statistika
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const brand = await prisma.marketBrand.findUnique({
        where: { slug },
        include: {
            products: {
                where: { isActive: true },
                orderBy: [{ isFeatured: "desc" }, { sold: "desc" }],
                include: { brand: { select: { name: true, slug: true, verified: true } } },
            },
        },
    });
    if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });

    // Statistika (avtomatik hisoblanadi — qo'lda o'zgartirib bo'lmaydi)
    const products = brand.products;
    const totalSales = products.reduce((s, p) => s + p.sold, 0);
    const totalReviews = products.reduce((s, p) => s + p.reviewCount, 0);
    const rated = products.filter(p => p.reviewCount > 0);
    const avgRating = rated.length
        ? Number((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2))
        : 0;

    // Egasi (ism uchun)
    const owner = await prisma.userProfile.findUnique({
        where: { id: brand.ownerId },
        select: { name: true, username: true, image: true },
    });

    return NextResponse.json({
        brand: {
            id: brand.id, slug: brand.slug, name: brand.name,
            logo: brand.logo, description: brand.description,
            category: brand.category, verified: brand.verified,
            createdAt: brand.createdAt,
        },
        owner,
        products,
        stats: { productCount: products.length, totalSales, totalReviews, avgRating },
    });
}
