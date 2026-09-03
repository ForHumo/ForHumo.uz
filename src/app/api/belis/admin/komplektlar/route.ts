// Admin — komplekt yaratish (dastlab @sevinch qo'l bilan).
// POST /api/belis/admin/komplektlar
//   body: {
//     slug, kind: FOTIHA|BESHIK_TOY|CUSTOM,
//     nameUz, nameRu?, nameEn?, descriptionUz?, ...
//     images: string[],
//     dailyRentUzs, deposit, itemsCount, copyCount
//   }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import type { BelisKomplektKind } from "@prisma/client";

const ALLOWED_KINDS: BelisKomplektKind[] = ["FOTIHA", "BESHIK_TOY", "CUSTOM"];

export async function POST(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
    const kindRaw = String(body?.kind ?? "").toUpperCase();
    const nameUz = String(body?.nameUz ?? "").trim().slice(0, 200);
    const nameRu = body?.nameRu ? String(body.nameRu).trim().slice(0, 200) : null;
    const nameEn = body?.nameEn ? String(body.nameEn).trim().slice(0, 200) : null;
    const descriptionUz = body?.descriptionUz ? String(body.descriptionUz).trim().slice(0, 5000) : null;
    const descriptionRu = body?.descriptionRu ? String(body.descriptionRu).trim().slice(0, 5000) : null;
    const descriptionEn = body?.descriptionEn ? String(body.descriptionEn).trim().slice(0, 5000) : null;
    const images = Array.isArray(body?.images)
        ? body.images.slice(0, 10).map((s: unknown) => String(s)).filter(Boolean)
        : [];
    const dailyRentUzs = Math.max(0, Math.floor(Number(body?.dailyRentUzs) || 0));
    const deposit = Math.max(0, Math.floor(Number(body?.deposit) || 0));
    const itemsCount = Math.max(1, Math.floor(Number(body?.itemsCount) || 1));
    const copyCount = Math.max(1, Math.floor(Number(body?.copyCount) || 1));

    if (!slug) return NextResponse.json({ error: "slug_required" }, { status: 400 });
    if (!ALLOWED_KINDS.includes(kindRaw as BelisKomplektKind)) {
        return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    if (nameUz.length < 2) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (dailyRentUzs < 1000) return NextResponse.json({ error: "daily_rent_too_low" }, { status: 400 });

    const existing = await prisma.belisKomplekt.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

    const k = await prisma.belisKomplekt.create({
        data: {
            slug,
            kind: kindRaw as BelisKomplektKind,
            nameUz, nameRu, nameEn,
            descriptionUz, descriptionRu, descriptionEn,
            images,
            dailyRentUzs, deposit,
            itemsCount, copyCount,
        },
        select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, komplekt: k });
}
