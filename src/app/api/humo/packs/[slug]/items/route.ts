// Humo Media Pack items — yangi item qo'shish.
//   POST /api/humo/packs/[slug]/items
//     body: { mediaUrl, thumbUrl?, width, height, bytes, keywords[] }
//     Auth: pack egasi.
// Client'da media Vercel Blob'ga yuklanadi (client-side upload), keyin
// shu endpoint faqat metadata + moderatsiya uchun chaqiriladi.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    requireHumoAuth, moderateHumoItem, refreshPackCover,
    PACK_MAX_ITEMS, limitForKind,
} from "@/lib/humo-media";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { slug } = await params;

    const pack = await prisma.humoMediaPack.findUnique({
        where: { slug },
        include: { _count: { select: { items: true } } },
    });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (pack.ownerId !== auth.profileId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (pack._count.items >= PACK_MAX_ITEMS) {
        return NextResponse.json({ error: "pack_full", max: PACK_MAX_ITEMS }, { status: 400 });
    }

    const b = await req.json().catch(() => ({}));
    const mediaUrl = typeof b?.mediaUrl === "string" ? b.mediaUrl.trim() : "";
    const thumbUrl = typeof b?.thumbUrl === "string" ? b.thumbUrl.trim() : null;
    const width = Number(b?.width) || 0;
    const height = Number(b?.height) || 0;
    const bytes = Number(b?.bytes) || 0;
    const keywords = Array.isArray(b?.keywords)
        ? b.keywords
            .filter((k: unknown): k is string => typeof k === "string")
            .map((k: string) => k.trim().slice(0, 32).toLowerCase())
            .filter((k: string) => k.length > 0)
            .slice(0, 20)
        : [];

    if (!mediaUrl || !mediaUrl.startsWith("http")) {
        return NextResponse.json({ error: "invalid_media" }, { status: 400 });
    }
    if (width < 1 || height < 1 || bytes < 1) {
        return NextResponse.json({ error: "invalid_dimensions" }, { status: 400 });
    }
    const max = limitForKind(pack.kind);
    if (bytes > max) {
        return NextResponse.json({ error: "too_large", max }, { status: 400 });
    }
    // Sticker uchun kamida 1 keyword majburiy
    if (pack.kind === "STICKER" && keywords.length === 0) {
        return NextResponse.json({ error: "keywords_required" }, { status: 400 });
    }

    // order — mavjud maksimal + 1
    const last = await prisma.humoMediaItem.findFirst({
        where: { packId: pack.id },
        orderBy: { order: "desc" },
        select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    const item = await prisma.humoMediaItem.create({
        data: {
            packId: pack.id,
            mediaUrl, thumbUrl,
            width, height, bytes, keywords,
            order: nextOrder,
        },
    });

    // Pack cover'ni birinchi item bilan darhol yangilaymiz
    if (pack._count.items === 0) {
        await prisma.humoMediaPack.update({
            where: { id: pack.id },
            data: { coverUrl: thumbUrl ?? mediaUrl },
        });
    }

    // Fon rejimida AI moderatsiya (fail-safe)
    after(() => moderateHumoItem(item.id, thumbUrl ?? mediaUrl));

    return NextResponse.json({ item });
}
