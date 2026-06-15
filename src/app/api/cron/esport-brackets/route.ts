import { NextResponse } from "next/server";
import { processDueBrackets } from "@/lib/esport-bracket";

// GET /api/cron/esport-brackets — vaqti kelgan turnir setkalarini avtomatik tuzadi.
// Kunlik 05:00 UTC = 10:00 Toshkent (+5). Himoya: Vercel cron yoki CRON_SECRET.
export const maxDuration = 60;

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") != null;
    if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const r = await processDueBrackets();
    return NextResponse.json({ ok: true, ...r });
}
