// Sotuvchining ochiq chatlari ro'yxati (Cabinet Chatlar tabi uchun).
// Har chat: xaridor ismi + oxirgi xabar + o'qilmagan soni + do'kon slug.
//
//   GET /api/bn/seller/chats → { chats: [...] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    // Sotuvchining barcha do'konlari — TERMINATED (chiqarib yuborilgan) bo'lmasa
    // hamma holatda chat ko'rinadi. PENDING/SUSPENDED holatlarda ham sotuvchi
    // xaridor bilan gaplasha oladi (savdolashuv olib borishi mumkin).
    const shops = await prisma.bnShop.findMany({
        where: {
            profileId: auth.profileId,
            status: { not: "TERMINATED" },
        },
        select: { id: true, slug: true, name: true },
    });
    if (shops.length === 0) return NextResponse.json({ chats: [] });

    const shopIds = shops.map(s => s.id);
    const shopById = new Map(shops.map(s => [s.id, s]));

    const chats = await prisma.bnShopChat.findMany({
        where: { shopId: { in: shopIds } },
        orderBy: { lastAt: "desc" },
        take: 100,
        include: {
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { text: true, kind: true, offerAmount: true, fromShop: true, createdAt: true },
            },
        },
    });

    // Xaridor profil ma'lumoti
    const buyerIds = [...new Set(chats.map(c => c.buyerId))];
    const buyers = buyerIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const buyerById = new Map(buyers.map(b => [b.id, b]));

    return NextResponse.json({
        chats: chats.map(c => {
            const last = c.messages[0];
            const shop = shopById.get(c.shopId)!;
            const buyer = buyerById.get(c.buyerId);
            return {
                id: c.id,
                shopSlug: shop.slug,
                shopName: shop.name,
                buyer: buyer ? { name: buyer.name, username: buyer.username, image: buyer.image } : null,
                buyerId: c.buyerId,
                shopUnread: c.shopUnread,
                lastAt: c.lastAt.toISOString(),
                last: last ? {
                    text: last.kind === "OFFER" || last.kind === "COUNTER"
                        ? `${last.kind === "OFFER" ? "Taklif" : "Qarshi taklif"}: ${(last.offerAmount ?? 0).toLocaleString("uz-UZ")} so'm`
                        : last.text.slice(0, 100),
                    kind: last.kind,
                    fromShop: last.fromShop,
                    createdAt: last.createdAt.toISOString(),
                } : null,
            };
        }),
    });
}
