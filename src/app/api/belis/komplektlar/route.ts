// Belis komplektlar ro'yxati (Fotiha / Beshik To'y / Custom).
// GET /api/belis/komplektlar?kind=FOTIHA
//
// Public — auth kerak emas.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BelisKomplektKind } from "@prisma/client";

export const revalidate = 300; // 5 daq cache

const ALLOWED_KINDS: BelisKomplektKind[] = ["FOTIHA", "BESHIK_TOY", "CUSTOM"];

export async function GET(req: Request) {
    const url = new URL(req.url);
    const kindParam = url.searchParams.get("kind")?.toUpperCase();
    const kind = kindParam && ALLOWED_KINDS.includes(kindParam as BelisKomplektKind)
        ? (kindParam as BelisKomplektKind)
        : undefined;

    const rows = await prisma.belisKomplekt.findMany({
        where: {
            isActive: true,
            hidden: false,
            ...(kind ? { kind } : {}),
        },
        orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
        select: {
            id: true, slug: true, kind: true,
            nameUz: true, nameRu: true, nameEn: true,
            images: true,
            dailyRentUzs: true, deposit: true,
            itemsCount: true, copyCount: true,
            createdAt: true,
        },
    });

    return NextResponse.json({
        komplektlar: rows.map(k => ({
            ...k,
            createdAt: k.createdAt.toISOString(),
        })),
    });
}
