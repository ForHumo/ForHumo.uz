// Admin — quti tahrir / o'chirish.
// PATCH  /api/belis/admin/items/[slug]
// DELETE /api/belis/admin/items/[slug]

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import type { BelisItemKind } from "@prisma/client";

const ALLOWED_KINDS: BelisItemKind[] = [
    "PATIR_KATTA", "PATIR_KICHIK", "TOGORA", "QURUQ_MEVA", "HOL_MEVA",
    "HOLVA", "TORT", "MANIKEN", "PARFYUM", "KATTA_IDISH",
    "SANDIQ", "SOCHQI", "DOMIK", "BOSHQA",
];

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const existing = await prisma.belisItem.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body?.nameUz === "string") data.nameUz = body.nameUz.trim().slice(0, 200);
    if (typeof body?.nameRu === "string") data.nameRu = body.nameRu.trim().slice(0, 200) || null;
    if (typeof body?.nameEn === "string") data.nameEn = body.nameEn.trim().slice(0, 200) || null;
    if (Array.isArray(body?.images))      data.images = body.images.slice(0, 10).map((s: unknown) => String(s)).filter(Boolean);
    if (body?.kind && ALLOWED_KINDS.includes(String(body.kind).toUpperCase() as BelisItemKind)) {
        data.kind = String(body.kind).toUpperCase();
    }
    if (Number.isFinite(Number(body?.dailyRentUzs))) data.dailyRentUzs = Math.max(0, Math.floor(Number(body.dailyRentUzs)));
    if (Number.isFinite(Number(body?.deposit)))      data.deposit = Math.max(0, Math.floor(Number(body.deposit)));
    if (Number.isFinite(Number(body?.copyCount)))    data.copyCount = Math.max(1, Math.floor(Number(body.copyCount)));
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body?.hidden === "boolean")   data.hidden = body.hidden;
    // Komplekt bog'lash (slug bo'yicha)
    if (typeof body?.komplektSlug === "string") {
        if (body.komplektSlug.trim() === "") {
            data.komplektId = null;
        } else {
            const k = await prisma.belisKomplekt.findUnique({ where: { slug: body.komplektSlug.trim() }, select: { id: true } });
            if (k) data.komplektId = k.id;
        }
    }

    const updated = await prisma.belisItem.update({
        where: { id: existing.id }, data,
        select: { id: true, slug: true },
    });
    return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const existing = await prisma.belisItem.findUnique({
        where: { slug },
        include: { _count: { select: { bookings: true } } },
    });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (existing._count.bookings > 0) {
        return NextResponse.json({
            error: "has_bookings",
            bookingCount: existing._count.bookings,
            hint: "hidden=true qiling",
        }, { status: 409 });
    }

    await prisma.belisItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
}
