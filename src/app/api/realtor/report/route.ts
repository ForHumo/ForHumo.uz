// Rieltor bot — kunlik 09:00 hisobot (Vercel cron chaqiradi).
// Vercel CRON_SECRET bo'lsa Authorization: Bearer <CRON_SECRET> yuboradi.
// Hisobot oq ro'yxatdagi 2-3 kishiga bir xil yuboriladi.

import { NextResponse } from "next/server";
import { allowedIds, sendMessage, buildDailyReport } from "@/lib/realtor-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
    if (!CRON_SECRET) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }
    const report = await buildDailyReport();
    const ids = allowedIds();
    await Promise.all(ids.map((id) => sendMessage(id, report)));
    return NextResponse.json({ ok: true, sent: ids.length });
}
