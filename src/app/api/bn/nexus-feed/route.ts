// BN Media feed — sotuvchilar Nexus postlari.
// Filter: NexusPost.profileId BnShop egalaridan biri, PUBLIC yoki obunachi bo'lgan post.
// Shoppable (bnProductId) postlar mahsulot ma'lumoti bilan boyitiladi.
//
// GET /api/bn/nexus-feed?limit=20&kind=image|reel|all

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Number(searchParams.get("limit")) || 20);
    const kind = searchParams.get("kind") ?? "all";  // image|reel|all

    // Sotuvchilar profil ID'lari
    const shops = await prisma.bnShop.findMany({
        where: { status: "APPROVED" },
        select: { profileId: true, slug: true, name: true, logoUrl: true, tier: true },
    });
    if (shops.length === 0) return NextResponse.json({ items: [] });
    const profileIds = shops.map(s => s.profileId);
    const shopByProfile = new Map(shops.map(s => [s.profileId, s]));

    // Postlar
    const posts = await prisma.nexusPost.findMany({
        where: {
            profileId: { in: profileIds },
            privacy: "PUBLIC",
            hidden: false,
            OR: [
                { media: { isEmpty: false } },
                { bnProductId: { not: null } },
            ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    // Bog'langan mahsulotlar (shoppable)
    const productIds = posts.map(p => p.bnProductId).filter((x): x is string => !!x);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, slug: true, title: true, price: true, images: true },
    }) : [];
    const prodById = new Map(products.map(p => [p.id, p]));

    // Muallif profil ma'lumoti (avatar/username)
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, username: true, image: true },
    });
    const profileById = new Map(profiles.map(p => [p.id, p]));

    // Media kind aniqlash — birinchi media video bo'lsa "reel", aks holda "image"
    function detectKind(media: string[]): "image" | "reel" {
        const first = media[0] ?? "";
        return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(first) ? "reel" : "image";
    }

    const items = posts
        .map(p => {
            const shop = shopByProfile.get(p.profileId);
            if (!shop) return null;
            const prof = profileById.get(p.profileId);
            const k = detectKind(p.media);
            if (kind !== "all" && kind !== k) return null;
            const bnProduct = p.bnProductId ? prodById.get(p.bnProductId) : null;

            return {
                id: p.id,
                kind: k,
                coverUrl: p.media[0] ?? bnProduct?.images?.[0] ?? "",
                caption: p.text ?? "",
                createdAt: p.createdAt.toISOString(),
                author: {
                    profileId: p.profileId,
                    shopSlug: shop.slug,
                    shopName: shop.name,
                    username: prof?.username ?? null,
                    avatarUrl: shop.logoUrl ?? prof?.image ?? null,
                    verified: shop.tier === "VERIFIED" || shop.tier === "PREMIUM",
                },
                bnProduct: bnProduct ? {
                    slug: bnProduct.slug,
                    title: bnProduct.title,
                    price: bnProduct.price,
                    image: bnProduct.images[0] ?? null,
                } : null,
                nexusUrl: `https://forhumo.uz/uz/nexus/p/${p.id}`,
            };
        })
        .filter(Boolean);

    return NextResponse.json({ items });
}
