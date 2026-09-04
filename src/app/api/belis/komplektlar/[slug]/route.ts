// Belis komplekt detail (Fotiha/Beshik).
// GET /api/belis/komplektlar/[slug]
//
// Ichida qutilar ro'yxati bilan qaytaradi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const k = await prisma.belisKomplekt.findUnique({
        where: { slug },
        include: {
            items: {
                where: { isActive: true, hidden: false },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true, slug: true, kind: true,
                    nameUz: true, nameRu: true, nameEn: true,
                    images: true,
                    dailyRentUzs: true, deposit: true, copyCount: true,
                },
            },
        },
    });
    if (!k || !k.isActive || k.hidden) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
        id: k.id,
        slug: k.slug,
        kind: k.kind,
        nameUz: k.nameUz, nameRu: k.nameRu, nameEn: k.nameEn,
        descriptionUz: k.descriptionUz, descriptionRu: k.descriptionRu, descriptionEn: k.descriptionEn,
        images: k.images,
        dailyRentUzs: k.dailyRentUzs,
        deposit: k.deposit,
        itemsCount: k.itemsCount,
        copyCount: k.copyCount,
        items: k.items,
        createdAt: k.createdAt.toISOString(),
    });
}
