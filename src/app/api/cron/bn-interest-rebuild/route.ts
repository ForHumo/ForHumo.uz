// BN kunlik cron — foydalanuvchi event'laridan qiziqish vektorini qayta hisoblaydi.
// Har foydalanuvchi uchun: kategoriya/do'kon/bozor/narx/atribut ballari.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron-auth";

const EVENT_WINDOW_DAYS = 60;   // Oxirgi 60 kun eventlari hisobga olinadi
const MAX_USERS_PER_RUN = 500;  // Har cron 500 foydalanuvchi (bepul reja limiti)

export async function GET(req: Request) {
    const authRes = assertCron(req);
    if (authRes) return authRes;

    // Oxirgi N kun ichida biror event qilgan noyob foydalanuvchilar
    const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 86400_000);
    const activeUsers = await prisma.bnUserEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { profileId: true },
        distinct: ["profileId"],
        take: MAX_USERS_PER_RUN,
    });

    const profileIds = activeUsers.map(u => u.profileId);

    // Fon rejimida hisoblaymiz (cron 60s limit)
    after(async () => {
        let processed = 0;
        for (const profileId of profileIds) {
            try {
                await rebuildOne(profileId, since);
                processed++;
            } catch { /* fail-safe */ }
        }
        // eslint-disable-next-line no-console
        console.log(`[bn-interest-rebuild] processed=${processed}/${profileIds.length}`);
    });

    return NextResponse.json({ ok: true, scheduled: profileIds.length });
}

async function rebuildOne(profileId: string, since: Date) {
    // Barcha eventlar (mahsulot ma'lumotini alohida join)
    const events = await prisma.bnUserEvent.findMany({
        where: { profileId, createdAt: { gte: since } },
    });
    if (events.length === 0) return;

    const productIds = Array.from(new Set(events.map(e => e.productId)));
    const products = await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        select: {
            id: true, price: true, categoryId: true, shopId: true, attributes: true,
            shop: { select: { marketId: true } },
        },
    });
    const productById = new Map(products.map(p => [p.id, p]));

    // Kategoriya slug'larini olamiz
    const categoryIds = Array.from(new Set(products.map(p => p.categoryId).filter(Boolean) as string[]));
    const cats = await prisma.bnCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, slug: true, parentId: true, parent: { select: { slug: true } } },
    });
    const catById = new Map(cats.map(c => [c.id, c]));

    // Score yig'ish
    const categoryScores: Record<string, number> = {};
    const shopScores: Record<string, number> = {};
    const marketScores: Record<string, number> = {};
    const attrScores: Record<string, number> = {};
    const prices: number[] = [];

    for (const ev of events) {
        const p = productById.get(ev.productId);
        if (!p) continue;
        const w = ev.weight;

        // Kategoriya (subcategory + parent ikkalasiga)
        if (p.categoryId) {
            const c = catById.get(p.categoryId);
            if (c) {
                categoryScores[c.slug] = (categoryScores[c.slug] ?? 0) + w;
                if (c.parent?.slug) {
                    categoryScores[c.parent.slug] = (categoryScores[c.parent.slug] ?? 0) + w * 0.5;
                }
            }
        }
        // Do'kon
        if (p.shopId) shopScores[p.shopId] = (shopScores[p.shopId] ?? 0) + w;
        // Bozor
        if (p.shop?.marketId) marketScores[p.shop.marketId] = (marketScores[p.shop.marketId] ?? 0) + w;
        // Narx (faqat CART/FAV/PURCHASE — VIEW price ehtimoli xato)
        if (ev.type !== "VIEW" && p.price > 0) prices.push(p.price);
        // Atributlar (brand, model)
        if (p.attributes && typeof p.attributes === "object") {
            const attrs = p.attributes as Record<string, unknown>;
            for (const [k, v] of Object.entries(attrs)) {
                if (typeof v === "string" && v.trim().length > 0 && v.length < 40) {
                    const key = `${k}:${v}`;
                    attrScores[key] = (attrScores[key] ?? 0) + w;
                }
            }
        }
    }

    const avgPrice = prices.length > 0 ? Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    await prisma.bnInterest.upsert({
        where: { profileId },
        update: { categoryScores, shopScores, marketScores, attrScores, avgPrice, minPrice, maxPrice },
        create: { profileId, categoryScores, shopScores, marketScores, attrScores, avgPrice, minPrice, maxPrice },
    });
}
