// BN sotuvchi haftalik hisobot cron.
// Dushanba ertalab har APPROVED sotuvchiga oxirgi haftadagi ko'rsatkichlarni
// @ai Nexus DM va Web Push orqali yuboradi.
//
// Cron kunlik ishlaydi lekin faqat DUSHANBA kunlarida haftalik hisobot yuboradi
// (Vercel Hobby cheklovi tufayli — soatlik ishlata olmaymiz).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAgentDM } from "@/lib/nexus-agent-send";
import { sendPushToProfile } from "@/lib/push";
import { fmtPrice, fmtPriceShort } from "@/lib/bn-theme";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PER_RUN = 300;
const AGENT_USERNAME = "ai";

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Faqat dushanba (UTC 1 = Monday)
    const now = new Date();
    const day = now.getUTCDay();
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (day !== 1 && !force) {
        return NextResponse.json({ ok: true, skipped: "not_monday", day });
    }

    const started = Date.now();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

    const shops = await prisma.bnShop.findMany({
        where: { status: "APPROVED" },
        select: { id: true, profileId: true, name: true },
        take: MAX_PER_RUN,
    });

    let sent = 0, skipped = 0, failed = 0;

    for (const shop of shops) {
        try {
            const [thisWeek, prevWeek] = await Promise.all([
                prisma.bnOrder.aggregate({
                    where: {
                        shopId: shop.id,
                        status: "COMPLETED",
                        completedAt: { gte: weekAgo, lte: now },
                    },
                    _count: { _all: true },
                    _sum: { total: true },
                }),
                prisma.bnOrder.aggregate({
                    where: {
                        shopId: shop.id,
                        status: "COMPLETED",
                        completedAt: { gte: twoWeeksAgo, lt: weekAgo },
                    },
                    _count: { _all: true },
                    _sum: { total: true },
                }),
            ]);

            const orders = thisWeek._count._all;
            const revenue = thisWeek._sum.total ?? 0;
            const prevRevenue = prevWeek._sum.total ?? 0;

            // Hech qanday aktivlik bo'lmagan bo'lsa — o'tkazib yubor
            if (orders === 0 && revenue === 0 && prevRevenue === 0) {
                skipped++;
                continue;
            }

            // Trend hisoblash
            const diff = revenue - prevRevenue;
            const trendPct = prevRevenue > 0 ? Math.round((diff / prevRevenue) * 100) : (revenue > 0 ? 100 : 0);
            const trendIcon = diff > 0 ? "▲" : diff < 0 ? "▼" : "•";

            // Top mahsulot
            const items = await prisma.bnOrderItem.findMany({
                where: {
                    order: {
                        shopId: shop.id, status: "COMPLETED",
                        completedAt: { gte: weekAgo, lte: now },
                    },
                },
                select: { productId: true, title: true, qty: true, price: true },
            });
            const topMap = new Map<string, { title: string; qty: number; revenue: number }>();
            for (const it of items) {
                const r = topMap.get(it.productId) || { title: it.title, qty: 0, revenue: 0 };
                r.qty += it.qty; r.revenue += it.price * it.qty;
                topMap.set(it.productId, r);
            }
            const top3 = [...topMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
            const topLine = top3.length > 0
                ? top3.map((t, i) => `${i + 1}. ${t.title.slice(0, 30)} — ${t.qty} dona, ${fmtPriceShort(t.revenue)}`).join("\n")
                : "Sotuv bo'lmadi";

            const body = `Haftalik hisobot — ${shop.name}

Tushum: ${fmtPrice(revenue)}
Buyurtma: ${orders} ta
Trend: ${trendIcon} ${Math.abs(trendPct)}% (o'tgan haftadan)

Top 3 mahsulot:
${topLine}

To'liq tahlil uchun: /sotuvchi/tahlil`;

            // Nexus DM (@ai)
            await sendAgentDM({
                agentUsername: AGENT_USERNAME,
                toProfileId: shop.profileId,
                payload: {
                    kind: "generic",
                    title: `Haftalik hisobot: ${fmtPrice(revenue)}`,
                    body,
                },
                kind: "bn-weekly-report",
            });

            // Web Push
            try {
                const hasSub = await prisma.nexusPushSub.count({ where: { profileId: shop.profileId } });
                if (hasSub > 0) {
                    await sendPushToProfile(shop.profileId, {
                        title: `${shop.name} — haftalik hisobot`,
                        body: `Tushum ${fmtPriceShort(revenue)} · ${orders} buyurtma · ${trendIcon} ${Math.abs(trendPct)}%`,
                        url: "https://bozornarxida.uz/sotuvchi/tahlil",
                        tag: `bn-weekly-${shop.id}`,
                    });
                }
            } catch { /* push xatolikni yutamiz */ }

            sent++;
        } catch (e) {
            console.error("bn-seller-weekly shop failed", shop.id, e);
            failed++;
        }
    }

    return NextResponse.json({
        ok: true, sent, skipped, failed, totalShops: shops.length,
        tookMs: Date.now() - started,
    });
}
