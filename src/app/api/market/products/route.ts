import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category    = searchParams.get("cat")      ?? undefined;
    const subcategory = searchParams.get("sub")      ?? undefined;
    const featured    = searchParams.get("featured") === "1";
    const search      = searchParams.get("q")        ?? undefined;
    const limit       = Number(searchParams.get("limit") ?? 20);

    const products = await prisma.marketProduct.findMany({
        where: {
            isActive: true,
            ...(category    && { category }),
            ...(subcategory && { subcategory }),
            ...(featured    && { isFeatured: true }),
            ...(search      && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ]
            }),
        },
        include: { brand: { select: { name: true, slug: true, verified: true, logo: true } } },
        orderBy: [{ isFeatured: "desc" }, { sold: "desc" }],
        take: limit,
    });

    return NextResponse.json({ products });
}
