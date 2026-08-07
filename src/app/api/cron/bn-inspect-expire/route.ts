// Kunlik cron — eskirgan INSPECT holdlarni yig'ib olish, stokni tiklash.
// Vercel Hobby: DAILY only (03:15 UTC). vercel.json ga qo'shiladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    // Vercel cron faqat GET yuboradi va Bearer header bilan (agar sozlangan bo'lsa)
    const auth = req.headers.get("authorization") ?? "";
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const stale = await prisma.bnInspectHold.findMany({
        where: {
            usedAt: null, cancelledAt: null,
            expiresAt: { lt: now },
        },
        take: 500,
    });

    let restored = 0;
    for (const h of stale) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.bnInspectHold.update({
                    where: { id: h.id },
                    data:  { cancelledAt: now },
                });
                await tx.bnProduct.update({
                    where: { id: h.productId },
                    data:  { stock: { increment: h.qty } },
                });
            });
            restored++;
        } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, expired: stale.length, restored });
}
