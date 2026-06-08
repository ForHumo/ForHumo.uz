import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

// GET /api/market/questions?productId=...
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ questions: [] });

    const product = await prisma.marketProduct.findUnique({
        where: { id: productId }, select: { brand: { select: { ownerId: true } } },
    });
    const sellerId = product?.brand.ownerId ?? null;

    const questions = await prisma.marketProductQuestion.findMany({
        where: { productId, hidden: false },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { answers: { where: { hidden: false }, orderBy: { createdAt: "asc" } } },
    });

    let myId: string | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
        myId = p?.id ?? null;
    }

    const profileIds = [...new Set([
        ...questions.map(q => q.profileId),
        ...questions.flatMap(q => q.answers.map(a => a.profileId)),
    ])];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    const enriched = questions.map(q => ({
        id: q.id, text: q.text, createdAt: q.createdAt,
        author: pMap[q.profileId] ?? null, isMine: q.profileId === myId,
        answers: q.answers.map(a => ({
            id: a.id, text: a.text, createdAt: a.createdAt,
            author: pMap[a.profileId] ?? null, isMine: a.profileId === myId,
            isAuthor: sellerId != null && a.profileId === sellerId,
        })),
    }));

    return NextResponse.json({ questions: enriched, canAsk: !!myId });
}

// POST — savol berish (har qanday tizimga kirgan foydalanuvchi)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, text } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });
    if (!text?.trim()) return NextResponse.json({ error: "Savol bo'sh bo'lmasin" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const product = await prisma.marketProduct.findUnique({
        where: { id: productId },
        select: { slug: true, name: true, images: true, brand: { select: { ownerId: true } } },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    const question = await prisma.marketProductQuestion.create({
        data: { productId, profileId: profile.id, text: text.trim() },
    });

    // Sotuvchiga bildirishnoma
    if (product.brand.ownerId !== profile.id) {
        await notify(product.brand.ownerId, {
            type: "QUESTION",
            title: "Mahsulotingizga savol",
            body: `${profile.name ?? "Mijoz"}: ${text.trim().slice(0, 80)}`,
            link: `/market/product/${product.slug}`,
            image: product.images?.[0],
        });
    }

    return NextResponse.json({
        question: {
            id: question.id, text: question.text, createdAt: question.createdAt,
            author: { name: profile.name, username: profile.username, image: profile.image },
            isMine: true, answers: [],
        },
    });
}
