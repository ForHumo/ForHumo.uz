// Leads statistikasi — kunlik/haftalik trend + konversion daraja.
//   GET /api/telegram/humo-bot/leads/stats?days=14

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const url = new URL(req.url);
    const days = Math.min(60, Math.max(7, parseInt(url.searchParams.get("days") ?? "14")));

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    // Kunlik agregat (raw SQL — Prisma groupBy sana bo'yicha oson emas)
    const daily = await prisma.$queryRaw<Array<{ day: string; status: string; c: bigint; won: bigint | null }>>`
        SELECT
            to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day,
            "status",
            COUNT(*)::bigint as c,
            COALESCE(SUM("wonAmountUzs"), 0)::bigint as won
        FROM "HumoBotLead"
        WHERE "profileId" = ${profile.id}
          AND "createdAt" >= ${start}
        GROUP BY day, "status"
        ORDER BY day ASC
    `.catch(() => []);

    // days massivini quramiz
    const dayMap: Record<string, { day: string; total: number; won: number; lost: number; open: number; contacted: number; wonSum: number }> = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { day: key, total: 0, won: 0, lost: 0, open: 0, contacted: 0, wonSum: 0 };
    }
    for (const row of daily) {
        if (!dayMap[row.day]) continue;
        const n = Number(row.c);
        dayMap[row.day].total += n;
        if (row.status === "WON") { dayMap[row.day].won = n; dayMap[row.day].wonSum = Number(row.won ?? 0); }
        else if (row.status === "LOST") dayMap[row.day].lost = n;
        else if (row.status === "OPEN") dayMap[row.day].open = n;
        else if (row.status === "CONTACTED") dayMap[row.day].contacted = n;
    }

    const trend = Object.values(dayMap);
    const totals = trend.reduce((acc, d) => {
        acc.total += d.total; acc.won += d.won; acc.lost += d.lost;
        acc.open += d.open; acc.contacted += d.contacted; acc.wonSum += d.wonSum;
        return acc;
    }, { total: 0, won: 0, lost: 0, open: 0, contacted: 0, wonSum: 0 });

    const conversionRate = totals.total > 0 ? (totals.won / totals.total) * 100 : 0;
    const avgWon = totals.won > 0 ? Math.round(totals.wonSum / totals.won) : 0;

    return NextResponse.json({
        days,
        trend,
        totals,
        conversionRate: Math.round(conversionRate * 10) / 10,   // 1 raqamli aniqlik
        avgWonUzs: avgWon,
    });
}
