import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";

// GET /api/cron/stories-cleanup — muddati o'tgan storylarni o'chirish (Vercel Cron).
// Himoya: CRON_SECRET bo'lsa Authorization tekshiriladi; Vercel cron x-vercel-cron yuboradi.
export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") != null;
    // Vercel cron (x-vercel-cron) yoki to'g'ri CRON_SECRET talab qilinadi — ommaviy chaqiruvni to'sadi
    if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const res = await prisma.nexusStory.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    // Rate-limit jurnal jadvallarini tozalash — faqat oxirgi oyna kerak, eskisi keraksiz.
    // 30 kun rate-limit oynasidan (maks. 60 daqiqa) ancha katta — xavfsiz.
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [aiPruned, reportPruned] = await Promise.all([
        prisma.aiUsage.deleteMany({ where: { createdAt: { lt: monthAgo } } }),
        prisma.nexusReport.deleteMany({ where: { createdAt: { lt: monthAgo } } }),
    ]);

    // 24 soat ichida tugaydigan obunalar — obunachiga eslatma (bir marta)
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiring = await prisma.nexusSubscription.findMany({
        where: { expiresAt: { gt: now, lt: soon }, expiryNotifiedAt: null },
        take: 500,
    });
    let notified = 0;
    for (const s of expiring) {
        await nexusNotify({ recipientId: s.subscriberId, actorId: s.creatorId, type: "SUB_EXPIRING" });
        await prisma.nexusSubscription.update({ where: { id: s.id }, data: { expiryNotifiedAt: now } }).catch(() => { });
        notified++;
    }

    return NextResponse.json({ ok: true, deleted: res.count, expiryNotified: notified, aiPruned: aiPruned.count, reportPruned: reportPruned.count });
}
