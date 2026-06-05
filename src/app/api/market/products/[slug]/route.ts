import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = await prisma.marketProduct.findUnique({
        where: { slug, isActive: true },
        include: { brand: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Shu kategoriyadan o'xshash mahsulotlar
    const similar = await prisma.marketProduct.findMany({
        where: { category: product.category, isActive: true, NOT: { id: product.id } },
        include: { brand: { select: { name: true, slug: true, verified: true } } },
        take: 6, orderBy: { sold: "desc" },
    });

    return NextResponse.json({ product, similar });
}
