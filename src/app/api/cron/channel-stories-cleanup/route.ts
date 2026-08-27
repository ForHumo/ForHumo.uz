// Kunlik cron — muddati o'tgan guruh stories'ni o'chiradi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = await prisma.nexusChannelStory.deleteMany({
        where: { expiresAt: { lte: new Date() } },
    });
    return NextResponse.json({ ok: true, deleted: res.count, ranAt: new Date().toISOString() });
}
