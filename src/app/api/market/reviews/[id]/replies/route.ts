import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

// POST /api/market/reviews/[id]/replies — javob (cheksiz ichma-ich)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { parentId, text, media } = await req.json();
    const mediaArr: string[] = Array.isArray(media) ? media.filter((x: unknown) => typeof x === "string") : [];
    if (!text?.trim() && !mediaArr.length)
        return NextResponse.json({ error: "Javob bo'sh bo'lmasin" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const review = await prisma.marketReview.findUnique({
        where: { id },
        include: { product: { select: { slug: true, name: true, images: true, brand: { select: { ownerId: true } } } } },
    });
    if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });
    const isAuthor = review.product.brand.ownerId === profile.id;

    const reply = await prisma.marketReviewReply.create({
        data: { reviewId: id, parentId: parentId ?? null, profileId: profile.id, text: text?.trim() ?? null, media: mediaArr },
    });

    // Kimga javob berilganini aniqlab, bildirishnoma
    let targetProfileId = review.profileId;
    if (parentId) {
        const parent = await prisma.marketReviewReply.findUnique({ where: { id: parentId }, select: { profileId: true } });
        if (parent) targetProfileId = parent.profileId;
    }
    if (targetProfileId !== profile.id) {
        await notify(targetProfileId, {
            type: "REPLY",
            title: `${profile.name ?? "Kimdir"} javob yozdi`,
            body: text?.trim()?.slice(0, 80) || "Rasm/video",
            link: `/market/product/${review.product.slug}`,
            image: review.product.images?.[0],
        });
    }

    return NextResponse.json({
        reply: {
            id: reply.id, parentId: reply.parentId, text: reply.text, media: reply.media, createdAt: reply.createdAt,
            author: { name: profile.name, username: profile.username, image: profile.image },
            isMine: true, isAuthor,
        },
    });
}
