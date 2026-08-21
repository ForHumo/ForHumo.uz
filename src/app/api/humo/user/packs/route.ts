// Foydalanuvchining "kutubxonasi" — o'zi yaratgan + subscribed pack'lari.
//   GET /api/humo/user/packs?kind=GIF|STICKER

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth } from "@/lib/humo-media";
import type { HumoMediaKind } from "@prisma/client";

export const dynamic = "force-dynamic";

function normKind(raw: unknown): HumoMediaKind | null {
    return raw === "GIF" || raw === "STICKER" ? raw : null;
}

export async function GET(req: Request) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const kind = normKind(url.searchParams.get("kind"));
    if (!kind) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });

    const [owned, subs] = await Promise.all([
        prisma.humoMediaPack.findMany({
            where: { ownerId: auth.profileId, kind },
            orderBy: { createdAt: "desc" },
            include: {
                items: {
                    where: { hidden: false },
                    orderBy: [{ order: "asc" }],
                    take: 24,
                    select: { id: true, mediaUrl: true, thumbUrl: true, keywords: true },
                },
                _count: { select: { items: { where: { hidden: false } } } },
            },
        }),
        prisma.humoMediaSubscription.findMany({
            where: { profileId: auth.profileId },
            orderBy: { addedAt: "desc" },
            include: {
                pack: {
                    include: {
                        items: {
                            where: { hidden: false },
                            orderBy: [{ order: "asc" }],
                            take: 24,
                            select: { id: true, mediaUrl: true, thumbUrl: true, keywords: true },
                        },
                        _count: { select: { items: { where: { hidden: false } } } },
                    },
                },
            },
        }),
    ]);

    // Subscribed'dan faqat kerakli kind
    const subscribed = subs
        .filter(s => s.pack.kind === kind && s.pack.ownerId !== auth.profileId)
        .map(s => ({ ...s.pack, isSubscribed: true }));

    const own = owned.map(p => ({ ...p, isOwner: true }));

    return NextResponse.json({ owned: own, subscribed });
}
