import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ ok: true, deleted: res.count });
}
