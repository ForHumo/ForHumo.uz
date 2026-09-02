// Kunlik cron — 30 daqiqa timeout uchun backup. Lazy check /live route'da
// bo'lgach, agar hech kim buyurtmani ochib turmasa, bu cron avto-cancel qiladi.
//
// Schedule: kunlik 02:00 (vercel.json)

import { NextResponse } from "next/server";
import { checkAllPendingTimeouts } from "@/lib/bn-order-timeout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    // Vercel cron authorization check (agar Vercel'dan kelmasa 401)
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const result = await checkAllPendingTimeouts();
    return NextResponse.json({ ok: true, ...result });
}
