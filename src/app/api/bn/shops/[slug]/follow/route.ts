// Do'konga obuna — xaridor do'kondan yangi mahsulot / narx tushishida push oladi.
//   GET     /api/bn/shops/[slug]/follow → { following, count }
//   POST    /api/bn/shops/[slug]/follow → yoqish
//   DELETE  /api/bn/shops/[slug]/follow → o'chirish

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth, getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const auth = await getBnAuth().catch(() => null);

    const [count, mine] = await Promise.all([
        prisma.bnShopFollow.count({ where: { shopId: shop.id } }),
        auth ? prisma.bnShopFollow.findUnique({
            where: { profileId_shopId: { profileId: auth.profileId, shopId: shop.id } },
        }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
        following: !!mine,
        count,
    });
}

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true, profileId: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (shop.profileId === auth.profileId) {
        return NextResponse.json({ error: "cannot_follow_self" }, { status: 400 });
    }

    await prisma.bnShopFollow.upsert({
        where: { profileId_shopId: { profileId: auth.profileId, shopId: shop.id } },
        create: { profileId: auth.profileId, shopId: shop.id },
        update: {},
    });
    return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.bnShopFollow.deleteMany({
        where: { profileId: auth.profileId, shopId: shop.id },
    });
    return NextResponse.json({ ok: true, following: false });
}
