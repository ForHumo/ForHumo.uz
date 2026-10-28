// YukGo — founder stat paneli (1 haftalik test o'lchovi).
// Funnel: ro'yxat (telegramId profillar) → kontakt-ko'rish → haydovchi → Pro.
// Kirish (visits) Vercel Analytics'да; bu panel DB-funnelni ko'rsatadi.
// GET /api/yukgo/admin/stats  (founder-gated, profileId bo'yicha — Google ham, Telegram ham)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const UZT = 5 * 60 * 60 * 1000; // UTC+5 — kun chegaralari UZ bo'yicha
const dayKey = (d: Date) => new Date(d.getTime() + UZT).toISOString().slice(0, 10);

export async function GET() {
    const session = await getServerSession(authOptions);
    const meId = (session?.user as { profileId?: string } | undefined)?.profileId;
    if (!meId) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { id: meId }, select: { username: true, humoId: true } });
    if (!isFounderProfile(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * DAY);
    const activeWhere = { status: "ACTIVE" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };

    const [
        listingsTotal, listingsActive, cargoActive, truckActive,
        sourcesTotal, sourcesActive,
        revealsTotal, reveals7, engaged,
        regsTotal, regs7,
        driversTotal, driversRoute, driversNotify, driversPro,
        listingDates, revealDates, regDates, driverDates,
    ] = await Promise.all([
        prisma.yukListing.count(),
        prisma.yukListing.count({ where: activeWhere }),
        prisma.yukListing.count({ where: { ...activeWhere, type: "CARGO" } }),
        prisma.yukListing.count({ where: { ...activeWhere, type: "TRUCK" } }),
        prisma.yukSource.count({ where: { NOT: { tgChatId: { startsWith: "dm:" } } } }),
        prisma.yukSource.count({ where: { active: true } }),
        prisma.yukContactView.count(),
        prisma.yukContactView.count({ where: { createdAt: { gte: sevenAgo } } }),
        prisma.yukContactView.groupBy({ by: ["profileId"] }).then((r) => r.length),
        prisma.userProfile.count({ where: { telegramId: { not: null } } }),
        prisma.userProfile.count({ where: { telegramId: { not: null }, createdAt: { gte: sevenAgo } } }),
        prisma.yukDriver.count(),
        prisma.yukDriver.count({ where: { routeFromCity: { not: null } } }),
        prisma.yukDriver.count({ where: { notifyOnMatch: true } }),
        prisma.yukDriver.count({ where: { subActiveUntil: { gt: now } } }),
        prisma.yukListing.findMany({ where: { createdAt: { gte: sevenAgo } }, select: { createdAt: true }, take: 50000 }),
        prisma.yukContactView.findMany({ where: { createdAt: { gte: sevenAgo } }, select: { createdAt: true }, take: 50000 }),
        prisma.userProfile.findMany({ where: { telegramId: { not: null }, createdAt: { gte: sevenAgo } }, select: { createdAt: true }, take: 50000 }),
        prisma.yukDriver.findMany({ where: { createdAt: { gte: sevenAgo } }, select: { createdAt: true }, take: 50000 }),
    ]);

    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(dayKey(new Date(now.getTime() - i * DAY)));
    const bucket = (rows: { createdAt: Date }[]) => {
        const m: Record<string, number> = {};
        for (const r of rows) { const k = dayKey(r.createdAt); m[k] = (m[k] || 0) + 1; }
        return m;
    };
    const lB = bucket(listingDates), rB = bucket(revealDates), gB = bucket(regDates), dB = bucket(driverDates);
    const daily = days.map((day) => ({
        day, listings: lB[day] || 0, reveals: rB[day] || 0, registrations: gB[day] || 0, drivers: dB[day] || 0,
    }));

    return NextResponse.json({
        totals: {
            listings: { total: listingsTotal, active: listingsActive, cargo: cargoActive, truck: truckActive },
            sources: { total: sourcesTotal, active: sourcesActive },
            reveals: { total: revealsTotal, last7d: reveals7, engagedUsers: engaged },
            registrations: { telegram: regsTotal, last7d: regs7 },
            drivers: { total: driversTotal, withRoute: driversRoute, notify: driversNotify, pro: driversPro },
        },
        daily,
    });
}
