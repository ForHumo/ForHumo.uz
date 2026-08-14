// Kunlik cron — auto-delete o'rnatilgan chatlarda eskirgan xabarlarni o'chiradi.
// Vercel Hobby cheklovi: kunlik ("0 4 * * *" tavsiya).
//
//   GET /api/cron/dm-auto-delete  (Vercel cron token bilan)
//
// Har chat uchun autoDeleteAfterSeconds > 0 bo'lsa, shu vaqtdan eskiroq xabarlar o'chiriladi.
// Deleted for everyone tombstone'lar ham tozalanadi (yozuvchi 60daq ichida o'chirgan bo'lsa ham).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    // Vercel cron token tekshiruvi — CRON_SECRET env bo'lsa
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const convs = await prisma.nexusConversation.findMany({
        where: { autoDeleteAfterSeconds: { gt: 0 } },
        select: { id: true, autoDeleteAfterSeconds: true },
    });

    let totalDeleted = 0;
    for (const c of convs) {
        const cutoff = new Date(Date.now() - c.autoDeleteAfterSeconds * 1000);
        const res = await prisma.nexusMessage.deleteMany({
            where: { conversationId: c.id, createdAt: { lt: cutoff } },
        });
        totalDeleted += res.count;
    }

    return NextResponse.json({
        ok: true,
        convs: convs.length,
        deleted: totalDeleted,
        ranAt: new Date().toISOString(),
    });
}
