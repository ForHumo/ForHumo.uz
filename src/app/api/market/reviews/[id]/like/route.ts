import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

// POST /api/market/reviews/[id]/like — toggle "qo'shilaman"
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const existing = await prisma.marketReviewLike.findUnique({
        where: { reviewId_profileId: { reviewId: id, profileId: profile.id } },
    });

    if (existing) {
        await prisma.marketReviewLike.delete({ where: { id: existing.id } });
    } else {
        await prisma.marketReviewLike.create({ data: { reviewId: id, profileId: profile.id } });
        // Sharh muallifiga bildirishnoma (o'ziga emas)
        const review = await prisma.marketReview.findUnique({
            where: { id },
            include: { product: { select: { slug: true, name: true, images: true } } },
        });
        if (review && review.profileId !== profile.id) {
            await notify(review.profileId, {
                type: "REVIEW_LIKE",
                title: `${profile.name ?? "Kimdir"} sharhingizga qo'shildi`,
                body: review.product.name,
                link: `/market/product/${review.product.slug}`,
                image: review.product.images?.[0],
            });
        }
    }

    const count = await prisma.marketReviewLike.count({ where: { reviewId: id } });
    return NextResponse.json({ liked: !existing, count });
}
