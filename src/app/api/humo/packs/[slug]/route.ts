// Humo Media Pack — bitta pack detali va o'chirish.
//   GET    /api/humo/packs/[slug]  → pack + items[] (subscription holati bilan)
//   PATCH  /api/humo/packs/[slug]  { name?, isPublic? }  — faqat owner
//   DELETE /api/humo/packs/[slug]  — faqat owner (cascade item'lar bilan)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth } from "@/lib/humo-media";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({
        where: { slug },
        include: {
            items: {
                where: { hidden: false },
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            },
        },
    });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Egasi ma'lumoti
    const owner = await prisma.userProfile.findUnique({
        where: { id: pack.ownerId },
        select: { username: true, humoId: true, name: true, image: true },
    });

    // Subscribed'mi (agar auth bor bo'lsa)
    let subscribed = false;
    if (auth) {
        const sub = await prisma.humoMediaSubscription.findUnique({
            where: { profileId_packId: { profileId: auth.profileId, packId: pack.id } },
            select: { id: true },
        });
        subscribed = !!sub;
    }

    return NextResponse.json({
        pack: {
            ...pack,
            isOwner: auth?.profileId === pack.ownerId,
            subscribed,
            owner,
        },
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (pack.ownerId !== auth.profileId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const data: { name?: string; isPublic?: boolean } = {};
    if (typeof b?.name === "string") {
        const trimmed = b.name.trim().slice(0, 60);
        if (trimmed.length >= 2) data.name = trimmed;
    }
    if (typeof b?.isPublic === "boolean") data.isPublic = b.isPublic;

    const updated = await prisma.humoMediaPack.update({ where: { id: pack.id }, data });
    return NextResponse.json({ pack: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (pack.ownerId !== auth.profileId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    await prisma.humoMediaPack.delete({ where: { id: pack.id } });
    return NextResponse.json({ ok: true });
}
