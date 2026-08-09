// BN kunlik cron — barcha do'konlar uchun tasdiqlanganlik (galochka) kriteriyalarini qayta hisoblaydi.
// Yangi tier RETAIL/WHOLESALE/NONE — computeShopVerification asosida.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeShopVerified } from "@/lib/bn-verified";
import { assertCron } from "@/lib/cron-auth";

const MAX_SHOPS_PER_RUN = 500;   // Vercel Hobby limiti

export async function GET(req: Request) {
    const authRes = assertCron(req);
    if (authRes) return authRes;

    // Faqat APPROVED do'konlar — TERMINATED yoki PENDING'ga galochka kerakmas
    const shops = await prisma.bnShop.findMany({
        where: { status: "APPROVED" },
        select: { id: true },
        take: MAX_SHOPS_PER_RUN,
    });

    after(async () => {
        let changed = 0;
        let processed = 0;
        for (const shop of shops) {
            try {
                const res = await recomputeShopVerified(shop.id);
                if (res.changed) changed++;
                processed++;
            } catch { /* fail-safe */ }
        }
        // eslint-disable-next-line no-console
        console.log(`[bn-verified-recompute] processed=${processed}/${shops.length} changed=${changed}`);
    });

    return NextResponse.json({ ok: true, scheduled: shops.length });
}
