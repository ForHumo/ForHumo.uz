import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis";

// GET /api/belis/products/[slug] — mahsulot tafsiloti (ochiq)
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const p = await prisma.belisProduct.findUnique({
        where: { slug },
        include: {
            category: { select: { slug: true, nameUz: true, nameRu: true, nameEn: true } },
        },
    });
    if (!p || !p.isActive || p.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    // Sharhlar (birinchi 20)
    const reviews = await prisma.belisReview.findMany({
        where: { productId: p.id, hidden: false },
        orderBy: { createdAt: "desc" }, take: 20,
    });
    return NextResponse.json({
        product: {
            id: p.id, slug: p.slug,
            nameUz: p.nameUz, nameRu: p.nameRu, nameEn: p.nameEn,
            descriptionUz: p.descriptionUz, descriptionRu: p.descriptionRu, descriptionEn: p.descriptionEn,
            images: p.images,
            price: Number(p.price), oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
            currency: p.currency, stock: p.stock, sold: p.sold,
            featured: p.featured, tags: p.tags,
            category: p.category,
        },
        reviews: reviews.map(r => ({
            id: r.id, buyerName: r.buyerName, rating: r.rating,
            text: r.text, images: r.images, createdAt: r.createdAt,
        })),
    });
}

// PATCH /api/belis/products/[slug] (admin)
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    for (const k of ["nameUz","nameRu","nameEn","descriptionUz","descriptionRu","descriptionEn","categoryId"] as const) {
        if (typeof body[k] === "string") data[k] = body[k];
    }
    if (Array.isArray(body.images)) data.images = body.images.filter((x: unknown): x is string => typeof x === "string" && x.startsWith("http")).slice(0, 12);
    if (typeof body.price === "number" && body.price > 0) data.price = body.price;
    if ("oldPrice" in body) data.oldPrice = body.oldPrice ? Number(body.oldPrice) : null;
    if (typeof body.stock === "number") data.stock = Math.max(-1, Math.floor(body.stock));
    if (typeof body.featured === "boolean") data.featured = body.featured;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (Array.isArray(body.tags)) data.tags = body.tags.filter((x: unknown): x is string => typeof x === "string").slice(0, 12);
    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noChanges: true });
    const p = await prisma.belisProduct.update({ where: { slug }, data });
    return NextResponse.json({ product: p });
}

// DELETE /api/belis/products/[slug] (admin) — soft delete (hidden=true)
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { slug } = await params;
    await prisma.belisProduct.update({ where: { slug }, data: { hidden: true, isActive: false } });
    return NextResponse.json({ ok: true });
}
