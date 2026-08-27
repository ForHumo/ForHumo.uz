// Kunlik cron — barcha EsTeam guruh chatlarini a'zoligiga qarab sinxronlaydi.
// Fail-safe fallback — inline hooks o'tkazib yuborgan har qanday o'zgarishni tuzatadi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEsTeamChannel, deleteEsTeamChannel } from "@/lib/esport-nexus-sync";

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Barcha faol jamoalar uchun sync
    const teams = await prisma.esTeam.findMany({ select: { id: true } });
    let synced = 0, added = 0, removed = 0, created = 0;
    for (const t of teams) {
        const r = await syncEsTeamChannel(t.id);
        if (r) {
            synced++;
            added += r.added;
            removed += r.removed;
            if (r.created) created++;
        }
    }

    // 2. Bog'langan esTeamId'lar orasidan endi mavjud bo'lmagan jamoa channellarini tozalash
    const orphanChannels = await prisma.nexusChannel.findMany({
        where: { esTeamId: { not: null } },
        select: { esTeamId: true },
    });
    let deleted = 0;
    for (const c of orphanChannels) {
        if (!c.esTeamId) continue;
        const exists = teams.find(t => t.id === c.esTeamId);
        if (!exists) {
            await deleteEsTeamChannel(c.esTeamId);
            deleted++;
        }
    }

    return NextResponse.json({
        ok: true, teams: teams.length, synced, added, removed, created, deleted,
        ranAt: new Date().toISOString(),
    });
}
