// Humo Media Packs qidiruvi — chat picker uchun.
//   GET /api/humo/packs/search?q=X&kind=GIF|STICKER&limit=20
//     Match: pack nomi, owner username/humoId, item keywords
//     Sort: addedCount desc (popularity)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HumoMediaKind } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 60;   // 1 daqiqa cache

function normKind(raw: unknown): HumoMediaKind | null {
    return raw === "GIF" || raw === "STICKER" ? raw : null;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const kind = normKind(url.searchParams.get("kind"));
    const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    if (!kind) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });

    // Bo'sh qidiruv — trending pack'lar (addedCount desc)
    if (!q) {
        const packs = await prisma.humoMediaPack.findMany({
            where: { kind, isPublic: true },
            orderBy: [{ addedCount: "desc" }, { usesCount: "desc" }],
            take: limit,
            include: {
                _count: { select: { items: { where: { hidden: false } } } },
                items: {
                    where: { hidden: false },
                    orderBy: [{ order: "asc" }],
                    take: 4,
                    select: { id: true, mediaUrl: true, thumbUrl: true },
                },
            },
        });
        return NextResponse.json({ packs: await enrichWithOwner(packs) });
    }

    // Qidiruv — pack nomi VA owner username VA item keywords
    // 1) Pack nomiga contains (insensitive)
    // 2) Owner username/humoId (@ ni tozalab olamiz)
    const nameQ = q.replace(/^@/, "");

    // Foydalanuvchi ID'sini topamiz (owner search uchun)
    const ownerCandidates = await prisma.userProfile.findMany({
        where: {
            OR: [
                { username: { contains: nameQ, mode: "insensitive" } },
                { humoId: { equals: nameQ.toUpperCase() } },
            ],
        },
        select: { id: true },
        take: 20,
    });
    const ownerIds = ownerCandidates.map(o => o.id);

    const packs = await prisma.humoMediaPack.findMany({
        where: {
            kind, isPublic: true,
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                ...(ownerIds.length ? [{ ownerId: { in: ownerIds } }] : []),
                { items: { some: { keywords: { has: q } } } },
            ],
        },
        orderBy: [{ addedCount: "desc" }, { usesCount: "desc" }],
        take: limit,
        include: {
            _count: { select: { items: { where: { hidden: false } } } },
            items: {
                where: { hidden: false },
                orderBy: [{ order: "asc" }],
                take: 4,
                select: { id: true, mediaUrl: true, thumbUrl: true },
            },
        },
    });

    return NextResponse.json({ packs: await enrichWithOwner(packs) });
}

async function enrichWithOwner<T extends { ownerId: string }>(rows: T[]): Promise<Array<T & { owner: { username: string | null; humoId: string | null; name: string | null; image: string | null } | null }>> {
    const ids = [...new Set(rows.map(r => r.ownerId))];
    if (ids.length === 0) return rows.map(r => ({ ...r, owner: null }));
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, humoId: true, name: true, image: true },
    });
    const byId = new Map(profs.map(p => [p.id, p]));
    return rows.map(r => ({ ...r, owner: byId.get(r.ownerId) ?? null }));
}
