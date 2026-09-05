// Founder haftalik digest cron.
// Dushanba ertalab har founderga (FOUNDER_USERNAMES) @ai Nexus DM va Web Push:
//   - Bu hafta jami buyurtma/tushum
//   - Yangi foydalanuvchilar
//   - Kutayotgan waitlist
//   - Ochiq support tiketlar
//
// Bu boshqa cronlar bilan bir xil naqsh (dushanba tekshiruv).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FOUNDER_USERNAMES } from "@/lib/founders";
import { sendAgentDM } from "@/lib/nexus-agent-send";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AGENT_USERNAME = "ai";

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
}

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const day = now.getUTCDay();
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (day !== 1 && !force) {
        return NextResponse.json({ ok: true, skipped: "not_monday", day });
    }

    const started = Date.now();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

    // Foundelarni topamiz
    const founders = await prisma.userProfile.findMany({
        where: { username: { in: FOUNDER_USERNAMES } },
        select: { id: true, username: true, name: true },
    });
    if (founders.length === 0) {
        return NextResponse.json({ ok: true, skipped: "no_founders" });
    }

    // Haftalik statistika (barcha founderlar uchun bir marta)
    const [
        newUsers, newUsersPrev,
        newBnOrders, newBnOrdersPrev, bnRevenue,
        newPosts, newBelisBookings,
        pendingShops, urgentWaitlist, openTickets,
    ] = await Promise.all([
        prisma.userProfile.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.userProfile.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
        prisma.bnOrder.count({ where: { placedAt: { gte: weekAgo } } }),
        prisma.bnOrder.count({ where: { placedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
        prisma.bnOrder.aggregate({
            where: { placedAt: { gte: weekAgo }, status: "COMPLETED" },
            _sum: { total: true, commission: true },
        }),
        prisma.nexusPost.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
        prisma.belisRentalBooking.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
        prisma.bnShop.count({ where: { status: "PENDING" } }),
        prisma.bnSellerWaitlist.count({
            where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 3 * 86400000) } },
        }).catch(() => 0),
        prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }),
    ]);

    const userTrend = newUsersPrev > 0 ? Math.round(((newUsers - newUsersPrev) / newUsersPrev) * 100) : (newUsers > 0 ? 100 : 0);
    const orderTrend = newBnOrdersPrev > 0 ? Math.round(((newBnOrders - newBnOrdersPrev) / newBnOrdersPrev) * 100) : (newBnOrders > 0 ? 100 : 0);
    const revenue = bnRevenue._sum.total ?? 0;
    const commission = bnRevenue._sum.commission ?? 0;

    const trendIcon = (n: number) => n > 0 ? "▲" : n < 0 ? "▼" : "•";

    const attentionLines: string[] = [];
    if (pendingShops > 0) attentionLines.push(`⚠ ${pendingShops} do'kon tasdiq kutmoqda`);
    if (urgentWaitlist > 0) attentionLines.push(`⚠ ${urgentWaitlist} waitlist 3+ kun`);
    if (openTickets > 5) attentionLines.push(`⚠ ${openTickets} ochiq support ticket`);

    const body = `For Humo haftalik digest — ${now.toISOString().slice(0, 10)}

FOYDALANUVCHI: ${newUsers} yangi (${trendIcon(userTrend)} ${Math.abs(userTrend)}%)
BN buyurtma: ${newBnOrders} (${trendIcon(orderTrend)} ${Math.abs(orderTrend)}%)
BN tushum: ${fmtSom(revenue)}  |  komis. ${fmtSom(commission)}
Nexus post: ${newPosts}
Belis booking: ${newBelisBookings}

${attentionLines.length > 0 ? "DIQQAT:\n" + attentionLines.join("\n") + "\n" : ""}
To'liq: /admin/analytics`;

    let sent = 0, pushed = 0, failed = 0;
    for (const founder of founders) {
        try {
            // Nexus DM (@ai)
            await sendAgentDM({
                agentUsername: AGENT_USERNAME,
                toProfileId: founder.id,
                payload: {
                    kind: "generic",
                    title: `Haftalik digest: ${newBnOrders} buyurtma, ${fmtShort(revenue)}`,
                    body,
                },
                kind: "founder-weekly-digest",
            });
            sent++;

            // Push
            try {
                const hasSub = await prisma.nexusPushSub.count({ where: { profileId: founder.id } });
                if (hasSub > 0) {
                    await sendPushToProfile(founder.id, {
                        title: `For Humo — haftalik digest`,
                        body: `${newUsers} user, ${newBnOrders} BN, ${fmtShort(revenue)} tushum${attentionLines.length > 0 ? ` · ${attentionLines.length} diqqat` : ""}`,
                        url: "https://forhumo.uz/admin/analytics",
                        tag: `founder-weekly-${founder.id}`,
                    });
                    pushed++;
                }
            } catch { /* push xatolik yutamiz */ }
        } catch (e) {
            console.error("founder-weekly send failed", founder.username, e);
            failed++;
        }
    }

    return NextResponse.json({
        ok: true, sent, pushed, failed,
        founders: founders.length,
        stats: { newUsers, newBnOrders, revenue, pendingShops, urgentWaitlist, openTickets },
        tookMs: Date.now() - started,
    });
}
