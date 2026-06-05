import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getProfile(email: string) {
    return prisma.userProfile.findUnique({ where: { email } });
}

// GET — savatni olish
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [] });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ items: [] });

    const items = await prisma.marketCartItem.findMany({
        where: { profileId: profile.id },
        include: { product: { include: { brand: { select: { name: true, slug: true, verified: true } } } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
}

// POST — savatga qo'shish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { productId, quantity = 1 } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });

    const product = await prisma.marketProduct.findUnique({ where: { id: productId, isActive: true } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    if (product.stock < 1) return NextResponse.json({ error: "Mahsulot tugagan" }, { status: 400 });

    const item = await prisma.marketCartItem.upsert({
        where: { profileId_productId: { profileId: profile.id, productId } },
        update: { quantity: { increment: quantity } },
        create: { profileId: profile.id, productId, quantity },
        include: { product: { include: { brand: { select: { name: true, verified: true } } } } },
    });
    return NextResponse.json({ item });
}

// DELETE — savatdan olib tashlash
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { productId } = await req.json();
    await prisma.marketCartItem.deleteMany({ where: { profileId: profile.id, productId } });
    return NextResponse.json({ ok: true });
}

// PATCH — miqdorni o'zgartirish
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { productId, quantity } = await req.json();
    if (quantity < 1) {
        await prisma.marketCartItem.deleteMany({ where: { profileId: profile.id, productId } });
        return NextResponse.json({ ok: true, deleted: true });
    }
    const item = await prisma.marketCartItem.update({
        where: { profileId_productId: { profileId: profile.id, productId } },
        data: { quantity },
    });
    return NextResponse.json({ item });
}
