// Cross-modul universal search.
// BN mahsulot + do'kon, Nexus post/video, Humo user.
//
//   GET /api/user/search?q=olma&limit=5

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 30;

interface SearchItem {
    id: string;
    kind: "bn_product" | "bn_shop" | "nexus_user" | "nexus_video" | "nexus_track";
    title: string;
    subtitle?: string;
    image?: string;
    href: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q || q.length < 2) return NextResponse.json({ items: [] });
    const limit = Math.min(10, Math.max(3, Number(searchParams.get("limit")) || 5));

    const [products, shops, users, videos, tracks] = await Promise.all([
        prisma.bnProduct.findMany({
            where: {
                isActive: true, hidden: false, stock: { gt: 0 },
                title: { contains: q, mode: "insensitive" },
            },
            select: { id: true, slug: true, title: true, price: true, images: true, shop: { select: { name: true } } },
            orderBy: { views: "desc" }, take: limit,
        }).catch(() => []),
        prisma.bnShop.findMany({
            where: { status: "APPROVED", name: { contains: q, mode: "insensitive" } },
            select: { id: true, slug: true, name: true, city: true, logoUrl: true, rating: true },
            orderBy: { orderCount: "desc" }, take: limit,
        }).catch(() => []),
        prisma.userProfile.findMany({
            where: {
                OR: [
                    { username: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { id: true, username: true, name: true, image: true, humoId: true },
            take: limit,
        }).catch(() => []),
        prisma.nexusVideo.findMany({
            where: {
                hidden: false, isMature: false,
                title: { contains: q, mode: "insensitive" },
            },
            select: { id: true, title: true, thumbUrl: true, views: true },
            orderBy: { views: "desc" }, take: limit,
        }).catch(() => []),
        prisma.nexusTrack.findMany({
            where: {
                hidden: false,
                title: { contains: q, mode: "insensitive" },
            },
            select: { id: true, title: true, coverUrl: true, artist: true },
            orderBy: { plays: "desc" }, take: limit,
        }).catch(() => []),
    ]);

    const items: SearchItem[] = [];

    for (const p of products) {
        items.push({
            id: `bnp-${p.id}`, kind: "bn_product",
            title: p.title,
            subtitle: `${p.price.toLocaleString("uz-UZ")} so'm · ${p.shop?.name ?? ""}`,
            image: p.images[0] || undefined,
            href: `/bn/p/${p.slug}`,
        });
    }
    for (const s of shops) {
        items.push({
            id: `bns-${s.id}`, kind: "bn_shop",
            title: s.name,
            subtitle: `${s.city}${s.rating > 0 ? ` · ★ ${s.rating.toFixed(1)}` : ""}`,
            image: s.logoUrl || undefined,
            href: `/bn/d/${s.slug}`,
        });
    }
    for (const u of users) {
        items.push({
            id: `usr-${u.id}`, kind: "nexus_user",
            title: u.name || u.username || "—",
            subtitle: u.username ? `@${u.username}` : (u.humoId || ""),
            image: u.image || undefined,
            href: u.username ? `/nexus/u/${u.username}` : `/id`,
        });
    }
    for (const v of videos) {
        items.push({
            id: `vid-${v.id}`, kind: "nexus_video",
            title: v.title,
            subtitle: `${v.views} ko'rildi`,
            image: v.thumbUrl || undefined,
            href: `/nexus/v/${v.id}`,
        });
    }
    for (const t of tracks) {
        items.push({
            id: `trk-${t.id}`, kind: "nexus_track",
            title: t.title,
            subtitle: t.artist || "trek",
            image: t.coverUrl || undefined,
            href: `/nexus/t/${t.id}`,
        });
    }

    return NextResponse.json({ q, items, groupCounts: {
        products: products.length, shops: shops.length, users: users.length,
        videos: videos.length, tracks: tracks.length,
    } });
}
