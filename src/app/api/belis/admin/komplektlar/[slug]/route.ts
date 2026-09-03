// Admin — komplekt tahrir / o'chirish.
// PATCH  /api/belis/admin/komplektlar/[slug]
// DELETE /api/belis/admin/komplektlar/[slug]

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import type { BelisKomplektKind } from "@prisma/client";

const ALLOWED_KINDS: BelisKomplektKind[] = ["FOTIHA", "BESHIK_TOY", "CUSTOM"];

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const existing = await prisma.belisKomplekt.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body?.nameUz === "string")       data.nameUz = body.nameUz.trim().slice(0, 200);
    if (typeof body?.nameRu === "string")       data.nameRu = body.nameRu.trim().slice(0, 200) || null;
    if (typeof body?.nameEn === "string")       data.nameEn = body.nameEn.trim().slice(0, 200) || null;
    if (typeof body?.descriptionUz === "string") data.descriptionUz = body.descriptionUz.trim().slice(0, 5000) || null;
    if (typeof body?.descriptionRu === "string") data.descriptionRu = body.descriptionRu.trim().slice(0, 5000) || null;
    if (typeof body?.descriptionEn === "string") data.descriptionEn = body.descriptionEn.trim().slice(0, 5000) || null;
    if (Array.isArray(body?.images))            data.images = body.images.slice(0, 10).map((s: unknown) => String(s)).filter(Boolean);
    if (body?.kind && ALLOWED_KINDS.includes(String(body.kind).toUpperCase() as BelisKomplektKind)) {
        data.kind = String(body.kind).toUpperCase();
    }
    if (Number.isFinite(Number(body?.dailyRentUzs))) data.dailyRentUzs = Math.max(0, Math.floor(Number(body.dailyRentUzs)));
    if (Number.isFinite(Number(body?.deposit)))      data.deposit = Math.max(0, Math.floor(Number(body.deposit)));
    if (Number.isFinite(Number(body?.itemsCount)))   data.itemsCount = Math.max(1, Math.floor(Number(body.itemsCount)));
    if (Number.isFinite(Number(body?.copyCount)))    data.copyCount = Math.max(1, Math.floor(Number(body.copyCount)));
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body?.hidden === "boolean")   data.hidden = body.hidden;

    const updated = await prisma.belisKomplekt.update({
        where: { id: existing.id }, data,
        select: { id: true, slug: true },
    });
    return NextResponse.json({ ok: true, komplekt: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const existing = await prisma.belisKomplekt.findUnique({
        where: { slug },
        include: { _count: { select: { bookings: true } } },
    });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Faqat booking'lari yo'q komplektni o'chirish mumkin
    if (existing._count.bookings > 0) {
        return NextResponse.json({
            error: "has_bookings",
            bookingCount: existing._count.bookings,
            hint: "hidden=true qiling",
        }, { status: 409 });
    }

    // Items relation SetNull bilan bo'shab qoladi (qutilar qolaveradi)
    await prisma.belisKomplekt.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
}
