import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    }

    const count = await prisma.marketReviewLike.count({ where: { reviewId: id } });
    return NextResponse.json({ liked: !existing, count });
}
