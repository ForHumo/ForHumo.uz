// SLA metrics — bot javob vaqti, AI vs escalated nisbati, A/B natijalari.
//   GET /api/telegram/humo-bot/sla?days=14

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
    const days = Math.min(60, Math.max(1, parseInt(url.searchParams.get("days") ?? "14")));
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Xabar SLA: p50, p95, o'rtacha, muvaffaqiyat foizi
    const latencyRows = await prisma.$queryRaw<Array<{ latency: number | null; auto: boolean }>>`
        SELECT "latencyMs" as latency, "wasAutoReplied" as auto
        FROM "HumoBotMessage"
        WHERE "profileId" = ${profile.id}
          AND "createdAt" >= ${start}
          AND "latencyMs" IS NOT NULL
    `.catch(() => []);

    const latencies = latencyRows.map(r => Number(r.latency ?? 0)).filter(n => n > 0).sort((a, b) => a - b);
    const p = (q: number): number => {
        if (latencies.length === 0) return 0;
        const i = Math.floor(latencies.length * q);
        return latencies[Math.min(i, latencies.length - 1)];
    };
    const p50 = p(0.5);
    const p95 = p(0.95);
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    // Xabar sonlari
    const [totalMsgs, autoReplied, totalLeads, wonLeads] = await Promise.all([
        prisma.humoBotMessage.count({
            where: { profileId: profile.id, createdAt: { gte: start } },
        }),
        prisma.humoBotMessage.count({
            where: { profileId: profile.id, createdAt: { gte: start }, wasAutoReplied: true },
        }),
        prisma.humoBotLead.count({
            where: { profileId: profile.id, createdAt: { gte: start } },
        }),
        prisma.humoBotLead.count({
            where: { profileId: profile.id, createdAt: { gte: start }, status: "WON" },
        }),
    ]);

    // A/B testing statistika
    const abGroups = await prisma.humoBotLead.groupBy({
        by: ["variant", "status"],
        where: {
            profileId: profile.id,
            createdAt: { gte: start },
            variant: { not: null },
        },
        _count: { _all: true },
    }).catch(() => []);

    interface VariantAgg { total: number; won: number; lost: number; open: number; contacted: number }
    const emptyAgg = (): VariantAgg => ({ total: 0, won: 0, lost: 0, open: 0, contacted: 0 });
    const ab: { A: VariantAgg; B: VariantAgg } = { A: emptyAgg(), B: emptyAgg() };
    for (const row of abGroups) {
        const v = row.variant as "A" | "B" | null;
        if (!v || (v !== "A" && v !== "B")) continue;
        const n = row._count._all;
        ab[v].total += n;
        if (row.status === "WON") ab[v].won = n;
        else if (row.status === "LOST") ab[v].lost = n;
        else if (row.status === "OPEN") ab[v].open = n;
        else if (row.status === "CONTACTED") ab[v].contacted = n;
    }
    const abConversion = {
        A: ab.A.total > 0 ? Math.round((ab.A.won / ab.A.total) * 1000) / 10 : 0,
        B: ab.B.total > 0 ? Math.round((ab.B.won / ab.B.total) * 1000) / 10 : 0,
    };

    return NextResponse.json({
        days,
        latency: { p50, p95, avg, count: latencies.length },
        messages: {
            total: totalMsgs,
            autoReplied,
            autoReplyRate: totalMsgs > 0 ? Math.round((autoReplied / totalMsgs) * 1000) / 10 : 0,
        },
        leads: {
            total: totalLeads,
            won: wonLeads,
            wonRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0,
        },
        // AI hal qildi (auto reply — lead emas) vs escalated (lead qabul qilindi)
        aiHandledRate: totalMsgs > 0
            ? Math.round(((totalMsgs - totalLeads) / totalMsgs) * 1000) / 10
            : 0,
        escalationRate: totalMsgs > 0
            ? Math.round((totalLeads / totalMsgs) * 1000) / 10
            : 0,
        ab: {
            enabled: ab.A.total + ab.B.total > 0,
            A: { ...ab.A, conversionRate: abConversion.A },
            B: { ...ab.B, conversionRate: abConversion.B },
        },
    });
}
