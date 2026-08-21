// Humo Media Pack subscribe / unsubscribe — foydalanuvchi kutubxonasiga
// pack qo'shadi (Telegram "Add stickers" uslubi).
//   POST /api/humo/packs/[slug]/subscribe
//   DELETE /api/humo/packs/[slug]/subscribe

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth } from "@/lib/humo-media";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({
        where: { slug }, select: { id: true, isPublic: true },
    });
    if (!pack || !pack.isPublic) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Dublikat bo'lsa createMany skip qiladi (unique constraint)
    const existing = await prisma.humoMediaSubscription.findUnique({
        where: { profileId_packId: { profileId: auth.profileId, packId: pack.id } },
    });
    if (existing) return NextResponse.json({ ok: true, alreadySubscribed: true });

    await prisma.$transaction([
        prisma.humoMediaSubscription.create({
            data: { profileId: auth.profileId, packId: pack.id },
        }),
        prisma.humoMediaPack.update({
            where: { id: pack.id },
            data: { addedCount: { increment: 1 } },
        }),
    ]);
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({ where: { slug }, select: { id: true } });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const existing = await prisma.humoMediaSubscription.findUnique({
        where: { profileId_packId: { profileId: auth.profileId, packId: pack.id } },
    });
    if (!existing) return NextResponse.json({ ok: true });

    await prisma.$transaction([
        prisma.humoMediaSubscription.delete({
            where: { profileId_packId: { profileId: auth.profileId, packId: pack.id } },
        }),
        prisma.humoMediaPack.update({
            where: { id: pack.id },
            data: { addedCount: { decrement: 1 } },
        }),
    ]);
    return NextResponse.json({ ok: true });
}
