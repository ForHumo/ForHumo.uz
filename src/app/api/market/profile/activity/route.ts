import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/market/profile/activity — profil kartalari tafsilotlari (avtomatik)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const me = profile.id;

    // ── Sharhlar (mahsulot sharhlari) ──
    const productReviews = await prisma.marketReview.findMany({
        where: { profileId: me },
        orderBy: { createdAt: "desc" },
        include: { product: { select: { slug: true, name: true, images: true } } },
    });

    // ── Javoblar (sharhga yozgan javoblarim, media bilan) ──
    const replies = await prisma.marketReviewReply.findMany({
        where: { profileId: me },
        orderBy: { createdAt: "desc" },
        include: { review: { include: { product: { select: { slug: true, name: true } } } } },
    });

    // ── Qo'shilishlar (like bosgan sharhlarim) ──
    const likes = await prisma.marketReviewLike.findMany({
        where: { profileId: me },
        orderBy: { createdAt: "desc" },
        include: { review: { include: { product: { select: { slug: true, name: true, images: true } } } } },
    });

    // ── Sarflangan (PURCHASE/SAFE_IN tranzaksiyalar) ──
    const wallet = await prisma.wallet.findUnique({ where: { profileId: me } });
    const spent = wallet ? await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id, type: { in: ["PURCHASE", "TRANSFER_OUT", "SAFE_IN"] } },
        orderBy: { createdAt: "desc" }, take: 100,
    }) : [];

    // ── Ishlab olingan (o'z brendlarim mahsulotlari sotuvi) ──
    const myBrands = await prisma.marketBrand.findMany({ where: { ownerId: me }, select: { id: true } });
    const brandIds = myBrands.map(b => b.id);
    const soldRaw = brandIds.length ? await prisma.marketOrderItem.findMany({
        where: { product: { brandId: { in: brandIds } } },
        orderBy: { id: "desc" }, take: 100,
        include: {
            product: { select: { name: true, slug: true, images: true } },
            order: { select: { createdAt: true, profileId: true } },
        },
    }) : [];
    // Xaridor ismlari
    const buyerIds = [...new Set(soldRaw.map(s => s.order.profileId))];
    const buyers = await prisma.userProfile.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true, username: true } });
    const bMap = Object.fromEntries(buyers.map(b => [b.id, b]));
    const earned = soldRaw.map(s => ({
        id: s.id, productName: s.product.name, productSlug: s.product.slug, image: s.product.images?.[0] ?? null,
        quantity: s.quantity, price: String(s.price), total: Number(s.price) * s.quantity,
        createdAt: s.order.createdAt, buyer: bMap[s.order.profileId]?.name ?? bMap[s.order.profileId]?.username ?? "Mijoz",
    }));

    return NextResponse.json({
        reviews: productReviews.map(r => ({
            id: r.id, rating: r.rating, text: r.text, media: r.media, createdAt: r.createdAt,
            product: { slug: r.product.slug, name: r.product.name, image: r.product.images?.[0] ?? null },
        })),
        replies: replies.map(r => ({
            id: r.id, text: r.text, media: r.media, createdAt: r.createdAt,
            product: { slug: r.review.product.slug, name: r.review.product.name },
        })),
        likes: likes.map(l => ({
            id: l.id, createdAt: l.createdAt,
            product: { slug: l.review.product.slug, name: l.review.product.name, image: l.review.product.images?.[0] ?? null },
        })),
        spent: spent.map(t => ({ id: t.id, type: t.type, amount: String(t.amount), description: t.description, createdAt: t.createdAt })),
        earned,
    });
}
