// Belis alohida qutilar ro'yxati.
// GET /api/belis/items?kind=TOGORA&komplekt=fotiha-standart

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BelisItemKind } from "@prisma/client";

export const revalidate = 300;

const ALLOWED_KINDS: BelisItemKind[] = [
    "PATIR_KATTA", "PATIR_KICHIK", "TOGORA", "QURUQ_MEVA", "HOL_MEVA",
    "HOLVA", "TORT", "MANIKEN", "PARFYUM", "KATTA_IDISH",
    "SANDIQ", "SOCHQI", "DOMIK", "BOSHQA",
];

export async function GET(req: Request) {
    const url = new URL(req.url);
    const kindParam = url.searchParams.get("kind")?.toUpperCase();
    const komplektSlug = url.searchParams.get("komplekt");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true, hidden: false };
    if (kindParam && ALLOWED_KINDS.includes(kindParam as BelisItemKind)) {
        where.kind = kindParam;
    }
    if (komplektSlug) {
        where.komplekt = { slug: komplektSlug };
    }

    const items = await prisma.belisItem.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
            id: true, slug: true, kind: true,
            nameUz: true, nameRu: true, nameEn: true,
            images: true,
            dailyRentUzs: true, deposit: true, copyCount: true,
            komplekt: { select: { slug: true, nameUz: true } },
        },
    });

    return NextResponse.json({ items });
}
