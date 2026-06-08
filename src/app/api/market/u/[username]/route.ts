import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/market/u/[username] — ommaviy market profili (har kim ko'ra oladi)
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    if (!username) return NextResponse.json({ error: "username kerak" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({
        where: { username },
        select: { id: true, name: true, username: true, image: true, bio: true, humoId: true, createdAt: true },
    });
    if (!profile) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    const brands = await prisma.marketBrand.findMany({
        where: { ownerId: profile.id },
        select: {
            id: true, slug: true, name: true, logo: true, verified: true, categories: true, category: true,
            _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const productCount = brands.reduce((s, b) => s + b._count.products, 0);
    const reviewsGiven = await prisma.marketReview.count({ where: { profileId: profile.id } });

    return NextResponse.json({
        profile,
        brands,
        stats: { brandCount: brands.length, productCount, reviewsGiven },
    });
}
