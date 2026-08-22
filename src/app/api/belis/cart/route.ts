import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cart faqat login qilingan foydalanuvchi uchun (guest Telegram Mini App
// alohida oqim orqali ishlaydi).

async function meId(email: string | null | undefined): Promise<string | null> {
    if (!email) return null;
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    return me?.id ?? null;
}

// GET /api/belis/cart
export async function GET() {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ items: [], subtotal: 0 });
    const items = await prisma.belisCartItem.findMany({
        where: { profileId: me },
        include: { product: true },
        orderBy: { createdAt: "desc" },
    });
    const list = items.map(it => ({
        id: it.id, quantity: it.quantity,
        product: {
            id: it.product.id, slug: it.product.slug,
            nameUz: it.product.nameUz, nameRu: it.product.nameRu, nameEn: it.product.nameEn,
            images: it.product.images, price: Number(it.product.price),
            currency: it.product.currency, stock: it.product.stock,
        },
    }));
    const subtotal = list.reduce((s, i) => s + i.product.price * i.quantity, 0);
    return NextResponse.json({ items: list, subtotal });
}

// POST /api/belis/cart — { productId, quantity }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const quantity = Math.max(1, Math.min(99, parseInt(body?.quantity ?? "1", 10) || 1));
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });
    const p = await prisma.belisProduct.findUnique({ where: { id: productId }, select: { id: true, isActive: true, hidden: true } });
    if (!p || !p.isActive || p.hidden) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    const item = await prisma.belisCartItem.upsert({
        where: { profileId_productId: { profileId: me, productId } },
        create: { profileId: me, productId, quantity },
        update: { quantity: { increment: quantity } },
    });
    return NextResponse.json({ item });
}

// PATCH /api/belis/cart — { id, quantity }
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    const quantity = Math.max(1, Math.min(99, parseInt(body?.quantity ?? "1", 10) || 1));
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const it = await prisma.belisCartItem.findUnique({ where: { id }, select: { profileId: true } });
    if (!it || it.profileId !== me) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const updated = await prisma.belisCartItem.update({ where: { id }, data: { quantity } });
    return NextResponse.json({ item: updated });
}

// DELETE /api/belis/cart?id=X
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const it = await prisma.belisCartItem.findUnique({ where: { id }, select: { profileId: true } });
    if (!it || it.profileId !== me) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.belisCartItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
