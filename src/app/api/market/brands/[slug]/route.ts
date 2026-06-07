import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
            category: brand.category, categories: brand.categories, verified: brand.verified,
            createdAt: brand.createdAt,
        },
        owner,
        products,
        stats: { productCount: products.length, totalSales, totalReviews, avgRating },
    });
}

// PATCH — brendni tahrirlash (faqat egasi)
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const brand = await prisma.marketBrand.findUnique({ where: { slug } });
    if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
    if (brand.ownerId !== profile.id) return NextResponse.json({ error: "Bu brend sizniki emas" }, { status: 403 });

    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
    if (b.description !== undefined) data.description = b.description?.trim() || null;
    if (b.logo !== undefined) data.logo = b.logo || null;
    if (Array.isArray(b.categories) && b.categories.length) {
        const cats = b.categories.filter((x: unknown) => typeof x === "string");
        data.categories = cats; data.category = cats[0];
    }
    const updated = await prisma.marketBrand.update({ where: { id: brand.id }, data });
    return NextResponse.json({ brand: updated });
}
