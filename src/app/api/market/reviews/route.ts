import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

// GET /api/market/reviews?productId=...
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ reviews: [], canReview: false });

    const reviews = await prisma.marketReview.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { _count: { select: { likes: true } } },
    });

    // Foydalanuvchi sharh yoza oladimi? (harid qilgan + hali yozmagan) + qaysilarni like qilgan
    let canReview = false;
    let alreadyReviewed = false;
    let myProfileId: string | null = null;
    let likedIds: string[] = [];
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
        if (profile) {
            myProfileId = profile.id;
            const purchased = await prisma.marketOrderItem.findFirst({
                where: { productId, order: { profileId: profile.id } },
            });
            const existing = await prisma.marketReview.findUnique({
                where: { profileId_productId: { profileId: profile.id, productId } },
            });
            alreadyReviewed = !!existing;
            canReview = !!purchased && !existing;
            const myLikes = await prisma.marketReviewLike.findMany({
                where: { profileId: profile.id, reviewId: { in: reviews.map(r => r.id) } },
                select: { reviewId: true },
            });
            likedIds = myLikes.map(l => l.reviewId);
        }
    }

    const profileIds = [...new Set(reviews.map(r => r.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    const enriched = reviews.map(r => ({
        id: r.id, rating: r.rating, text: r.text, createdAt: r.createdAt,
        author: pMap[r.profileId] ?? null,
        likeCount: r._count.likes,
        likedByMe: likedIds.includes(r.id),
        isMine: r.profileId === myProfileId,
    }));

    return NextResponse.json({ reviews: enriched, canReview, alreadyReviewed });
}

// POST — sharh qoldirish (faqat harid qilganlar)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, rating, text } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Baho 1-5 oralig'ida" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Harid tekshiruvi
    const purchased = await prisma.marketOrderItem.findFirst({
        where: { productId, order: { profileId: profile.id } },
    });
    if (!purchased)
        return NextResponse.json({ error: "Sharh qoldirish uchun avval mahsulotni harid qiling" }, { status: 403 });

    // Takroriy sharh
    const existing = await prisma.marketReview.findUnique({
        where: { profileId_productId: { profileId: profile.id, productId } },
    });
    if (existing) return NextResponse.json({ error: "Siz allaqachon sharh qoldirgansiz" }, { status: 409 });

    const review = await prisma.marketReview.create({
        data: { profileId: profile.id, productId, orderId: purchased.orderId, rating, text: text?.trim() ?? null },
    });

    // Mahsulot reytingini qayta hisoblash
    const agg = await prisma.marketReview.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: true,
    });
    await prisma.marketProduct.update({
        where: { id: productId },
        data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });

    // Brend egasiga bildirishnoma (o'z mahsulotiga emas)
    const prod = await prisma.marketProduct.findUnique({
        where: { id: productId },
        select: { slug: true, name: true, images: true, brand: { select: { ownerId: true } } },
    });
    if (prod && prod.brand.ownerId !== profile.id) {
        await notify(prod.brand.ownerId, {
            type: "PRODUCT_REVIEW",
            title: `Mahsulotingizga ${rating}★ sharh`,
            body: `${profile.name ?? "Mijoz"}: ${prod.name}`,
            link: `/market/product/${prod.slug}`,
            image: prod.images?.[0],
        });
    }

    return NextResponse.json({ review });
}
