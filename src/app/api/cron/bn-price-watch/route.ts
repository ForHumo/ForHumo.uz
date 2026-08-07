// Kunlik cron — narx tushdi kuzatuv. Har mahsulot uchun basePrice bilan solishtir,
// N% pastga tushsa Nexus notification (custom text) yuboradi va lastNotified yozadi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    const auth = req.headers.get("authorization") ?? "";
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const watches = await prisma.bnPriceWatch.findMany({ take: 2000 });
    if (watches.length === 0) return NextResponse.json({ ok: true, checked: 0 });

    const productIds = [...new Set(watches.map(w => w.productId))];
    const products = await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, slug: true, title: true, price: true, isActive: true, hidden: true },
    });
    const byId = new Map(products.map(p => [p.id, p]));

    let notified = 0;
    const now = new Date();
    const DAY = 24 * 3600_000;

    for (const w of watches) {
        const p = byId.get(w.productId);
        if (!p || !p.isActive || p.hidden) continue;
        if (w.lastNotified && now.getTime() - w.lastNotified.getTime() < 3 * DAY) continue;

        const drop = ((w.basePrice - p.price) / Math.max(1, w.basePrice)) * 100;
        if (drop < w.targetPct) continue;

        try {
            // Web push (VAPID kalitlari bo'lsa yuboradi, aks holda jim o'tadi)
            await sendPushToProfile(w.profileId, {
                title: "Bozor Narxida — narx tushdi",
                body:  `${p.title}: ${Math.round(drop)}% arzon (${p.price.toLocaleString("uz-UZ")} so'm)`,
                url:   `https://bozornarxida.uz/p/${p.slug}`,
                tag:   `bn-price-${p.id}`,
            });
            await prisma.bnPriceWatch.update({
                where: { id: w.id },
                data: { lastNotified: now, basePrice: p.price },  // keyingi safar shu narxdan hisoblanadi
            });
            notified++;
        } catch { /* ignore */ }
    }

    return NextResponse.json({ ok: true, checked: watches.length, notified });
}
