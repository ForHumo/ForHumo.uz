import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bn/products/[slug] — mahsulot tafsilotlari
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const p = await prisma.bnProduct.findUnique({
        where: { slug },
        include: {
            seller: { select: { id: true, shopName: true, shopSlug: true, city: true, phone: true, logoUrl: true, address: true, description: true } },
            category: { select: { id: true, slug: true, name: true } },
        },
    });
    if (!p) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!p.isActive || p.hidden) return NextResponse.json({ error: "Mavjud emas" }, { status: 404 });

    // Views atomik oshirish (fire-and-forget)
    prisma.bnProduct.update({ where: { id: p.id }, data: { views: { increment: 1 } } }).catch(() => { });

    // Shu sotuvchining boshqa mahsulotlari (tavsiya)
    const related = await prisma.bnProduct.findMany({
        where: { sellerId: p.sellerId, id: { not: p.id }, isActive: true, hidden: false },
        orderBy: { createdAt: "desc" }, take: 6,
        select: { id: true, slug: true, title: true, price: true, images: true },
    });

    return NextResponse.json({ product: p, related });
}
