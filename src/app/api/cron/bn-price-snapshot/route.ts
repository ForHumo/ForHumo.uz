// Kunlik cron — barcha aktiv BN mahsulotlarining narxini snapshot qiladi.
// BnPriceHistory jadvaliga yozadi. Mahsulot detali sahifada 30/90/365 kunlik
// narx trendini grafik sifatida ko'rsatish uchun.
//
// Schedule: kunlik 13:00 (vercel.json). Faqat aktiv, ko'rinadigan mahsulotlar.
// Katta hajm uchun batch orqali (500tadan).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const startedAt = Date.now();
    let scanned = 0;
    let inserted = 0;
    let cursor: string | null = null;
    const BATCH = 500;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const batch: { id: string; price: number; marketAvgPrice: number | null }[] = await prisma.bnProduct.findMany({
            where: { isActive: true, hidden: false, stock: { gt: 0 } },
            select: { id: true, price: true, marketAvgPrice: true },
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (batch.length === 0) break;

        scanned += batch.length;
        cursor = batch[batch.length - 1].id;

        // Bulk insert
        const rows = batch.map(p => ({
            productId: p.id,
            price: p.price,
            marketAvg: p.marketAvgPrice ?? null,
        }));
        const r = await prisma.bnPriceHistory.createMany({ data: rows });
        inserted += r.count;

        if (batch.length < BATCH) break;
    }

    return NextResponse.json({
        ok: true,
        scanned,
        inserted,
        tookMs: Date.now() - startedAt,
    });
}
