import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function brandBySlug(slug: string) {
    return prisma.marketBrand.findUnique({ where: { slug }, select: { id: true } });
}

// GET — brend sharhlari + o'rtacha baho + foydalanuvchi yoza oladimi
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const brand = await brandBySlug(slug);
    if (!brand) return NextResponse.json({ reviews: [], avgRating: 0, canReview: false });

    const reviews = await prisma.marketBrandReview.findMany({
        where: { brandId: brand.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const avgRating = reviews.length
        ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
        : 0;

    let canReview = false, alreadyReviewed = false;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
        if (profile) {
            // Shu brenddan biror mahsulot harid qilganmi?
            const purchased = await prisma.marketOrderItem.findFirst({
                where: { order: { profileId: profile.id }, product: { brandId: brand.id } },
            });
            const existing = await prisma.marketBrandReview.findUnique({
                where: { brandId_profileId: { brandId: brand.id, profileId: profile.id } },
            });
            alreadyReviewed = !!existing;
            canReview = !!purchased && !existing;
        }
    }

    const ids = [...new Set(reviews.map(r => r.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    const enriched = reviews.map(r => ({
        id: r.id, rating: r.rating, text: r.text, createdAt: r.createdAt,
        author: pMap[r.profileId] ?? null,
    }));

    return NextResponse.json({ reviews: enriched, avgRating, canReview, alreadyReviewed });
}

// POST — brendga sharh (faqat shu brenddan harid qilganlar)
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const { rating, text } = await req.json();
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Baho 1-5" }, { status: 400 });

    const brand = await brandBySlug(slug);
    if (!brand) return NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const purchased = await prisma.marketOrderItem.findFirst({
        where: { order: { profileId: profile.id }, product: { brandId: brand.id } },
    });
    if (!purchased) return NextResponse.json({ error: "Sharh uchun avval shu brenddan harid qiling" }, { status: 403 });

    const existing = await prisma.marketBrandReview.findUnique({
        where: { brandId_profileId: { brandId: brand.id, profileId: profile.id } },
    });
    if (existing) return NextResponse.json({ error: "Siz allaqachon sharh qoldirgansiz" }, { status: 409 });

    const review = await prisma.marketBrandReview.create({
        data: { brandId: brand.id, profileId: profile.id, rating, text: text?.trim() ?? null },
    });
    return NextResponse.json({ review });
}
