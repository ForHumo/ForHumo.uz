import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mahsulot reytingini qayta hisoblash
async function recalc(productId: string) {
    const agg = await prisma.marketReview.aggregate({
        where: { productId }, _avg: { rating: true }, _count: true,
    });
    await prisma.marketProduct.update({
        where: { id: productId },
        data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
}

// PATCH /api/market/reviews/[id] — o'z sharhini tahrirlash
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { rating, text, media } = await req.json();

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const review = await prisma.marketReview.findUnique({ where: { id }, select: { id: true, profileId: true, productId: true } });
    if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });
    if (review.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning sharhingiz emas" }, { status: 403 });

    if (rating != null && (rating < 1 || rating > 5))
        return NextResponse.json({ error: "Baho 1-5 oralig'ida" }, { status: 400 });
    const mediaArr: string[] | undefined = Array.isArray(media) ? media.filter((x: unknown) => typeof x === "string") : undefined;

    await prisma.marketReview.update({
        where: { id },
        data: {
            ...(rating != null ? { rating } : {}),
            ...(text !== undefined ? { text: text?.trim() || null } : {}),
            ...(mediaArr !== undefined ? { media: mediaArr } : {}),
        },
    });

    if (rating != null) await recalc(review.productId);
    return NextResponse.json({ ok: true });
}

// DELETE /api/market/reviews/[id] — o'z sharhini o'chirish
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const review = await prisma.marketReview.findUnique({ where: { id }, select: { profileId: true, productId: true } });
    if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });
    if (review.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning sharhingiz emas" }, { status: 403 });

    // likes + replies onDelete:Cascade orqali o'chadi
    await prisma.marketReview.delete({ where: { id } });
    await recalc(review.productId);
    return NextResponse.json({ ok: true });
}
