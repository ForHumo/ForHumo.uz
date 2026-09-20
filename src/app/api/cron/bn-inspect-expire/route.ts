// Kunlik cron — eskirgan INSPECT holdlarni yig'ib olish, stokni tiklash.
// Vercel Hobby: DAILY only (03:15 UTC). vercel.json ga qo'shiladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    const authRes = assertCron(req);
    if (authRes) return authRes;

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
            const done = await prisma.$transaction(async (tx) => {
                // Atomik claim — faqat hali ochiq bo'lsa (bekor/confirm allaqachon
                // yopmagan bo'lsa) yopamiz va stokni tiklaymiz. Aks holda ikki marta.
                const claim = await tx.bnInspectHold.updateMany({
                    where: { id: h.id, usedAt: null, cancelledAt: null },
                    data:  { cancelledAt: now },
                });
                if (claim.count === 0) return false;
                await tx.bnProduct.update({
                    where: { id: h.productId },
                    data:  { stock: { increment: h.qty } },
                });
                return true;
            });
            if (done) restored++;
        } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, expired: stale.length, restored });
}
