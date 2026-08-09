// Cron endpoint auth — 3 usuldan biri kerak:
// 1. authorization: Bearer <CRON_SECRET> (agar env'da bo'lsa)
// 2. x-vercel-cron header (Vercel Cron o'ziga qo'shadi — ishonchli)
// 3. Development'da (localhost) skip
//
// Muhim: agar hech biri to'g'ri kelmasa 401 qaytaradi. CRON_SECRET yo'q +
// Vercel header yo'q = ochiq access DEMAS.

import { NextResponse } from "next/server";

export function assertCron(req: Request): NextResponse | null {
    // Vercel Cron o'z headerini qo'shadi
    if (req.headers.get("x-vercel-cron")) return null;
    // Secret bilan
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const authHeader = req.headers.get("authorization") ?? "";
        if (authHeader === `Bearer ${secret}`) return null;
    }
    // Development mode — localhost URL
    if (process.env.NODE_ENV !== "production") {
        const host = req.headers.get("host") ?? "";
        if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return null;
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
