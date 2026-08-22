import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function meId(email: string | null | undefined): Promise<string | null> {
    if (!email) return null;
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    return me?.id ?? null;
}

// GET /api/belis/favorites — men saqlaganlar
export async function GET() {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ items: [] });
    const favs = await prisma.belisFavorite.findMany({
        where: { profileId: me }, orderBy: { createdAt: "desc" },
        include: { product: true },
    });
    return NextResponse.json({
        items: favs.filter(f => f.product.isActive && !f.product.hidden).map(f => ({
            id: f.product.id, slug: f.product.slug,
            nameUz: f.product.nameUz, nameRu: f.product.nameRu, nameEn: f.product.nameEn,
            images: f.product.images, price: Number(f.product.price),
            oldPrice: f.product.oldPrice ? Number(f.product.oldPrice) : null,
            currency: f.product.currency, stock: f.product.stock, sold: f.product.sold,
        })),
    });
}

// POST /api/belis/favorites — { productId } toggle
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const me = await meId(session?.user?.email);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });
    const existing = await prisma.belisFavorite.findUnique({
        where: { profileId_productId: { profileId: me, productId } },
    });
    if (existing) {
        await prisma.belisFavorite.delete({ where: { id: existing.id } });
        return NextResponse.json({ ok: true, favorited: false });
    }
    await prisma.belisFavorite.create({ data: { profileId: me, productId } });
    return NextResponse.json({ ok: true, favorited: true });
}
