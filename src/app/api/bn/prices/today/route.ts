// BN Bugungi bozor narxlari dashboard — agregat.
// Har kategoriya uchun bozorlar bo'yicha o'rtacha narx + kecha bilan farq.
// Bosh sahifadagi "Bugungi bozor narxlari" widget'i va /bozor-narxlari sahifasi.
//
// GET ?limit=8&categorySlug=meva-sabzavot → { categories: [{ slug, name, avg, changePct, cheapest, expensive }] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 900; // 15 daq

interface CatAgg {
    slug: string;
    name: string;
    icon: string | null;
    productCount: number;
    avg: number;
    min: number;
    max: number;
    changePct: number;    // 7 kun oldingi o'rtacha bilan solishtirish
    trend: "up" | "down" | "flat";
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(20, Math.floor(Number(searchParams.get("limit") || "8"))));
    const filterSlug = searchParams.get("categorySlug");

    // Faqat root kategoriyalar (top level)
    const roots = await prisma.bnCategory.findMany({
        where: { parentId: null, ...(filterSlug ? { slug: filterSlug } : {}) },
        select: { id: true, slug: true, name: true, icon: true, order: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        take: limit,
    });

    if (roots.length === 0) return NextResponse.json({ categories: [] });

    const rootIds = roots.map(r => r.id);
    // Har root uchun barcha sub-kategoriya id'lari (BnCategory tree — bir bosqich)
    const children = await prisma.bnCategory.findMany({
        where: { parentId: { in: rootIds } },
        select: { id: true, parentId: true },
    });
    const childrenByRoot = new Map<string, string[]>();
    for (const r of roots) childrenByRoot.set(r.id, [r.id]);
    for (const c of children) {
        if (!c.parentId) continue;
        const arr = childrenByRoot.get(c.parentId);
        if (arr) arr.push(c.id);
    }

    // Har root uchun mahsulot narxlari
    const results: CatAgg[] = [];
    for (const root of roots) {
        const catIds = childrenByRoot.get(root.id) ?? [root.id];
        const prods = await prisma.bnProduct.findMany({
            where: {
                categoryId: { in: catIds },
                isActive: true, hidden: false, stock: { gt: 0 },
            },
            select: { id: true, price: true },
            take: 500,
        });
        if (prods.length === 0) continue;

        const prices = prods.map(p => p.price);
        const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        // 7 kun oldingi snapshot bilan solishtirish
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const historyAvg = await prisma.bnPriceHistory.findMany({
            where: {
                productId: { in: prods.map(p => p.id) },
                capturedAt: { lte: weekAgo, gte: new Date(weekAgo.getTime() - 24 * 3600 * 1000) },
            },
            select: { price: true },
            take: 500,
        });
        let changePct = 0;
        let trend: "up" | "down" | "flat" = "flat";
        if (historyAvg.length > 5) {
            const oldAvg = historyAvg.reduce((a, b) => a + b.price, 0) / historyAvg.length;
            if (oldAvg > 0) {
                changePct = Math.round(((avg - oldAvg) / oldAvg) * 100);
                if (changePct >= 2) trend = "up";
                else if (changePct <= -2) trend = "down";
            }
        }

        results.push({
            slug: root.slug,
            name: root.name,
            icon: root.icon ?? null,
            productCount: prods.length,
            avg, min, max,
            changePct,
            trend,
        });
    }

    return NextResponse.json({ categories: results, capturedAt: new Date().toISOString() });
}
