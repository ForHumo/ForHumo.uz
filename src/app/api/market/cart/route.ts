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
        include: {
            product: { include: { brand: { select: { name: true, slug: true, verified: true } } } },
            variant: true,
        },
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

    const { productId, quantity = 1, variantId = null } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });

    const product = await prisma.marketProduct.findUnique({
        where: { id: productId, isActive: true },
        include: { variants: true },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    // Variant talab qilinadimi?
    if (product.variants.length > 0 && !variantId)
        return NextResponse.json({ error: "Variant tanlang" }, { status: 400 });

    let stock = product.stock;
    if (variantId) {
        const v = product.variants.find(x => x.id === variantId);
        if (!v) return NextResponse.json({ error: "Variant topilmadi" }, { status: 404 });
        stock = v.stock;
    }
    if (stock < 1) return NextResponse.json({ error: "Mahsulot tugagan" }, { status: 400 });

    // Mavjud bo'lsa — miqdorni oshiramiz
    const existing = await prisma.marketCartItem.findFirst({
        where: { profileId: profile.id, productId, variantId },
    });
    let item;
    if (existing) {
        item = await prisma.marketCartItem.update({
            where: { id: existing.id },
            data: { quantity: Math.min(existing.quantity + quantity, stock) },
            include: { product: true, variant: true },
        });
    } else {
        item = await prisma.marketCartItem.create({
            data: { profileId: profile.id, productId, variantId, quantity: Math.min(quantity, stock) },
            include: { product: true, variant: true },
        });
    }
    return NextResponse.json({ item });
}

// DELETE — savatdan olib tashlash (cart item id bo'yicha)
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { id, productId } = await req.json();
    if (id) {
        await prisma.marketCartItem.deleteMany({ where: { id, profileId: profile.id } });
    } else if (productId) {
        await prisma.marketCartItem.deleteMany({ where: { profileId: profile.id, productId } });
    }
    return NextResponse.json({ ok: true });
}

// PATCH — miqdorni o'zgartirish (cart item id bo'yicha)
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { id, quantity } = await req.json();
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    const existing = await prisma.marketCartItem.findFirst({
        where: { id, profileId: profile.id },
        include: { product: { select: { stock: true } }, variant: { select: { stock: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    if (quantity < 1) {
        await prisma.marketCartItem.delete({ where: { id } });
        return NextResponse.json({ ok: true, deleted: true });
    }
    const max = existing.variant ? existing.variant.stock : existing.product.stock;
    const item = await prisma.marketCartItem.update({
        where: { id },
        data: { quantity: Math.min(quantity, max) },
    });
    return NextResponse.json({ item });
}
