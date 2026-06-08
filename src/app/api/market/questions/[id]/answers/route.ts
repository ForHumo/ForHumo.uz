import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";
import { after } from "next/server";
import { moderateOnCreate } from "@/lib/moderation";

// POST /api/market/questions/[id]/answers — savolga javob
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Javob bo'sh bo'lmasin" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const question = await prisma.marketProductQuestion.findUnique({
        where: { id },
        include: { product: { select: { slug: true, brand: { select: { ownerId: true } } } } },
    });
    if (!question) return NextResponse.json({ error: "Savol topilmadi" }, { status: 404 });

    const isAuthor = question.product.brand.ownerId === profile.id;

    const answer = await prisma.marketProductAnswer.create({
        data: { questionId: id, profileId: profile.id, text: text.trim() },
    });

    // Pre-publish moderatsiya
    after(() => moderateOnCreate({
        module: "MARKET", targetType: "ANSWER", targetId: answer.id,
        text: answer.text, kind: "javob",
    }));

    // Savol bergan kishiga bildirishnoma
    if (question.profileId !== profile.id) {
        await notify(question.profileId, {
            type: "ANSWER",
            title: isAuthor ? "Sotuvchi savolingizga javob berdi" : "Savolingizga javob",
            body: text.trim().slice(0, 80),
            link: `/market/product/${question.product.slug}`,
        });
    }

    return NextResponse.json({
        answer: {
            id: answer.id, text: answer.text, createdAt: answer.createdAt,
            author: { name: profile.name, username: profile.username, image: profile.image },
            isMine: true, isAuthor,
        },
    });
}
