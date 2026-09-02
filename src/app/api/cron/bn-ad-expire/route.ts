// BN reklama banner eskirgan bo'lsa avto-deaktivatsiya.
// Schedule: kunlik 15:00 (vercel.json).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const now = new Date();
    const r = await prisma.bnAdBanner.updateMany({
        where: { active: true, expiresAt: { lte: now } },
        data: { active: false },
    });
    return NextResponse.json({ ok: true, deactivated: r.count });
}
