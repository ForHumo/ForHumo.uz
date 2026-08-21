// Humo Media Pack item — o'chirish.
//   DELETE /api/humo/packs/[slug]/items/[id]  — faqat pack egasi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth, refreshPackCover } from "@/lib/humo-media";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug, id } = await params;

    const item = await prisma.humoMediaItem.findUnique({
        where: { id },
        include: { pack: { select: { id: true, ownerId: true, slug: true } } },
    });
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (item.pack.slug !== slug || item.pack.ownerId !== auth.profileId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await prisma.humoMediaItem.delete({ where: { id } });
    await refreshPackCover(item.pack.id);

    return NextResponse.json({ ok: true });
}
