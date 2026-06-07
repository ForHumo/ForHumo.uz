import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/market/search?q=...  — jonli takliflar (brendlar + mahsulotlar)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ brands: [], products: [] });

    const [brands, products] = await Promise.all([
        prisma.marketBrand.findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            select: { slug: true, name: true, logo: true, verified: true },
            take: 5,
        }),
        prisma.marketProduct.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { slug: true, name: true, price: true, images: true },
            orderBy: { sold: "desc" },
            take: 6,
        }),
    ]);

    return NextResponse.json({ brands, products });
}
