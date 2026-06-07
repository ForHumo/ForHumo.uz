import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/market/profile — foydalanuvchining Market profili + statistikasi (avtomatik)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: {
            id: true, name: true, firstName: true, fatherName: true,
            username: true, humoId: true, image: true, coverImage: true, phone: true,
        },
    });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // ── Brendlar + har biri statistikasi ──
    const brands = await prisma.marketBrand.findMany({
        where: { ownerId: profile.id },
        include: {
            products: { select: { sold: true, rating: true, reviewCount: true, price: true } },
            _count: { select: { products: true, reviews: true } },
        },
        orderBy: { createdAt: "asc" },
    });

    const brandList = brands.map(b => {
        const sales = b.products.reduce((s, p) => s + p.sold, 0);
        const rev = b.products.reduce((s, p) => s + p.reviewCount, 0);
        const rated = b.products.filter(p => p.reviewCount > 0);
        const avg = rated.length ? Number((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2)) : 0;
        return {
            id: b.id, slug: b.slug, name: b.name, logo: b.logo,
            verified: b.verified, productCount: b._count.products,
            brandReviewCount: b._count.reviews, totalSales: sales, totalReviews: rev, avgRating: avg,
        };
    });

    // ── Sharhlar (bergan) + olingan "qo'shilaman" ──
    const reviewsGiven = await prisma.marketReview.count({ where: { profileId: profile.id } });
    const brandReviewsGiven = await prisma.marketBrandReview.count({ where: { profileId: profile.id } });
    const likesReceived = await prisma.marketReviewLike.count({
        where: { review: { profileId: profile.id } },
    });
    const likesGiven = await prisma.marketReviewLike.count({ where: { profileId: profile.id } });

    // ── Haridlar + sarflangan Zij ──
    const orders = await prisma.marketOrder.findMany({
        where: { profileId: profile.id },
        select: { total: true, paymentMethod: true },
    });
    const ordersCount = orders.length;
    const zijSpent = orders
        .filter(o => o.paymentMethod === "ZIJ")
        .reduce((s, o) => s + Number(o.total), 0);

    // ── Ishlab olingan Zij (o'z brendlari mahsulotlari sotuvidan) ──
    const myBrandIds = brands.map(b => b.id);
    let zijEarned = 0;
    if (myBrandIds.length) {
        const soldItems = await prisma.marketOrderItem.findMany({
            where: { product: { brandId: { in: myBrandIds } } },
            select: { price: true, quantity: true },
        });
        zijEarned = soldItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    }

    return NextResponse.json({
        profile,
        brands: brandList,
        stats: {
            brandCount: brands.length,
            reviewsGiven: reviewsGiven + brandReviewsGiven,
            likesReceived,
            likesGiven,
            ordersCount,
            zijSpent: Number(zijSpent.toFixed(2)),
            zijEarned: Number(zijEarned.toFixed(2)),
        },
    });
}
