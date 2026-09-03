// Admin — alohida quti (item) yaratish.
// POST /api/belis/admin/items

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import type { BelisItemKind } from "@prisma/client";

const ALLOWED_KINDS: BelisItemKind[] = [
    "PATIR_KATTA", "PATIR_KICHIK", "TOGORA", "QURUQ_MEVA", "HOL_MEVA",
    "HOLVA", "TORT", "MANIKEN", "PARFYUM", "KATTA_IDISH",
    "SANDIQ", "SOCHQI", "DOMIK", "BOSHQA",
];

export async function POST(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
    const komplektSlug = body?.komplektSlug ? String(body.komplektSlug).trim() : null;
    const kindRaw = String(body?.kind ?? "").toUpperCase();
    const nameUz = String(body?.nameUz ?? "").trim().slice(0, 200);
    const nameRu = body?.nameRu ? String(body.nameRu).trim().slice(0, 200) : null;
    const nameEn = body?.nameEn ? String(body.nameEn).trim().slice(0, 200) : null;
    const images = Array.isArray(body?.images)
        ? body.images.slice(0, 10).map((s: unknown) => String(s)).filter(Boolean)
        : [];
    const dailyRentUzs = Math.max(0, Math.floor(Number(body?.dailyRentUzs) || 0));
    const deposit = Math.max(0, Math.floor(Number(body?.deposit) || 0));
    const copyCount = Math.max(1, Math.floor(Number(body?.copyCount) || 1));

    if (!slug) return NextResponse.json({ error: "slug_required" }, { status: 400 });
    if (!ALLOWED_KINDS.includes(kindRaw as BelisItemKind)) {
        return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    if (nameUz.length < 2) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (dailyRentUzs < 1000) return NextResponse.json({ error: "daily_rent_too_low" }, { status: 400 });

    let komplektId: string | null = null;
    if (komplektSlug) {
        const k = await prisma.belisKomplekt.findUnique({ where: { slug: komplektSlug }, select: { id: true } });
        if (!k) return NextResponse.json({ error: "komplekt_not_found" }, { status: 404 });
        komplektId = k.id;
    }

    const existing = await prisma.belisItem.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

    const item = await prisma.belisItem.create({
        data: {
            slug,
            komplektId,
            kind: kindRaw as BelisItemKind,
            nameUz, nameRu, nameEn,
            images,
            dailyRentUzs, deposit, copyCount,
        },
        select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, item });
}
