import { NextResponse } from "next/server";
import { rebuildInterests } from "@/lib/nexus-interest";

// GET /api/cron/interest-rebuild — tavsiya qiziqish vektorlarini qayta hisoblaydi (kunlik Vercel Cron).
// Himoya: Vercel cron (x-vercel-cron) yoki to'g'ri CRON_SECRET talab qilinadi.
export const maxDuration = 60; // partiya uchun uzaytirilgan vaqt

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") != null;
    if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const count = await rebuildInterests(1000);
    return NextResponse.json({ ok: true, rebuilt: count });
}
