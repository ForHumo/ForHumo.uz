import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = await prisma.marketProduct.findUnique({
        where: { slug, isActive: true },
        include: { brand: true, variants: { orderBy: { sort: "asc" } } },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Shu kategoriyadan o'xshash mahsulotlar
    const similar = await prisma.marketProduct.findMany({
        where: { category: product.category, isActive: true, NOT: { id: product.id } },
        include: { brand: { select: { name: true, slug: true, verified: true } } },
        take: 6, orderBy: { sold: "desc" },
    });

    // Ko'ruvchi shu mahsulot egasimi?
    let isOwner = false;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        isOwner = !!profile && profile.id === product.brand.ownerId;
    }

    return NextResponse.json({ product, similar, isOwner });
}

// PATCH — mahsulotni tahrirlash (faqat brend egasi)
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const product = await prisma.marketProduct.findUnique({ where: { slug }, include: { brand: true } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    if (product.brand.ownerId !== profile.id)
        return NextResponse.json({ error: "Bu mahsulot sizniki emas" }, { status: 403 });

    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
    if (b.description !== undefined) data.description = b.description?.trim() || null;
    if (b.price !== undefined && Number(b.price) >= 1) data.price = Number(b.price);
    if (b.oldPrice !== undefined) data.oldPrice = b.oldPrice ? Number(b.oldPrice) : null;
    if (b.stock !== undefined) data.stock = Math.max(0, Number(b.stock) || 0);
    if (b.category) data.category = b.category;
    if (b.subcategory !== undefined) data.subcategory = b.subcategory || null;
    if (Array.isArray(b.images) && b.images.length) data.images = b.images;
    if (Array.isArray(b.videos)) data.videos = b.videos.filter((x: unknown) => typeof x === "string");
    if (typeof b.isActive === "boolean") data.isActive = b.isActive;
    if (b.variantLabel !== undefined) data.variantLabel = b.variantLabel?.trim() || null;

    // Variantlar (berilsa — to'liq almashtiriladi)
    const variantsInput: Array<{ name?: string; price?: number; oldPrice?: number; stock?: number; image?: string }> | null =
        Array.isArray(b.variants) ? b.variants : null;

    const updated = await prisma.$transaction(async (tx) => {
        if (variantsInput) {
            await tx.marketProductVariant.deleteMany({ where: { productId: product.id } });
            if (variantsInput.length) {
                await tx.marketProductVariant.createMany({
                    data: variantsInput.map((v, i) => ({
                        productId: product.id,
                        name: String(v.name ?? "").trim() || `Variant ${i + 1}`,
                        price: Number(v.price) || 0,
                        oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
                        stock: Math.max(0, Number(v.stock) || 0),
                        image: v.image || null,
                        sort: i,
                    })),
                });
                // Ro'yxat narxi = eng arzon variant; stock = variantlar yig'indisi
                const prices = variantsInput.map(v => Number(v.price) || 0).filter(p => p > 0);
                if (prices.length) data.price = Math.min(...prices);
                data.stock = variantsInput.reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0);
            } else {
                data.variantLabel = null;
            }
        }
        return tx.marketProduct.update({ where: { id: product.id }, data });
    });
    return NextResponse.json({ product: updated });
}

// DELETE — mahsulotni o'chirish (soft: isActive=false)
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const product = await prisma.marketProduct.findUnique({ where: { slug }, include: { brand: true } });
    if (!product) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (product.brand.ownerId !== profile.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.marketProduct.update({ where: { id: product.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
}
