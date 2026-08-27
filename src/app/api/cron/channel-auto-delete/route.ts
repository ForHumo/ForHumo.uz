// Kunlik cron — guruh/kanal auto-delete xabarlarini o'chiradi.
// Har channel uchun autoDeleteAfterSeconds > 0 bo'lsa, shu vaqtdan eskiroq xabarlar o'chiriladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const channels = await prisma.nexusChannel.findMany({
        where: { autoDeleteAfterSeconds: { gt: 0 } },
        select: { id: true, autoDeleteAfterSeconds: true },
    });

    let totalDeleted = 0;
    for (const c of channels) {
        const cutoff = new Date(Date.now() - c.autoDeleteAfterSeconds * 1000);
        const res = await prisma.nexusChannelMessage.deleteMany({
            where: { channelId: c.id, createdAt: { lt: cutoff } },
        });
        totalDeleted += res.count;
    }

    return NextResponse.json({
        ok: true,
        channels: channels.length,
        deleted: totalDeleted,
        ranAt: new Date().toISOString(),
    });
}
