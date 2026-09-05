// Cross-modul kalendar hodisalari.
//
//   GET /api/user/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Belis rezervlar (eventDate + pickup + return), BN order (placedAt), Support (updatedAt).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CalEvent {
    id: string;
    source: "belis" | "bn" | "support" | "belis_pickup" | "belis_return";
    title: string;
    subtitle?: string;
    date: string;               // YYYY-MM-DD
    status?: string;
    href?: string;
    color: string;
}

function parseDate(s: string | null, fallback: Date): Date {
    if (!s) return fallback;
    const d = new Date(s + "T00:00:00.000Z");
    return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    const from = parseDate(searchParams.get("from"), monthStart);
    const to = parseDate(searchParams.get("to"), monthEnd);

    const [belisBookings, bnOrders, supportTix] = await Promise.all([
        prisma.belisRentalBooking.findMany({
            where: {
                buyerId: profile.id,
                OR: [
                    { eventDate: { gte: from, lte: to } },
                    { pickupDate: { gte: from, lte: to } },
                    { returnDate: { gte: from, lte: to } },
                ],
            },
            select: {
                id: true, code: true, status: true,
                eventDate: true, pickupDate: true, returnDate: true,
                komplekt: { select: { nameUz: true } },
            },
        }).catch(() => []),
        prisma.bnOrder.findMany({
            where: {
                buyerId: profile.id,
                placedAt: { gte: from, lte: to },
            },
            select: { id: true, code: true, status: true, placedAt: true, shop: { select: { name: true } } },
        }),
        prisma.supportTicket.findMany({
            where: {
                profileId: profile.id,
                updatedAt: { gte: from, lte: to },
            },
            select: { id: true, subject: true, status: true, updatedAt: true },
        }),
    ]);

    const events: CalEvent[] = [];

    for (const b of belisBookings) {
        const title = b.komplekt?.nameUz || "Belis rezerv";
        events.push({
            id: `belis-ev-${b.id}`, source: "belis",
            title: `📅 ${title}`, subtitle: `Marosim (${b.code})`,
            date: b.eventDate.toISOString().slice(0, 10),
            status: b.status,
            href: `/belis/booking/${b.code}`,
            color: "#eab308",
        });
        events.push({
            id: `belis-pu-${b.id}`, source: "belis_pickup",
            title: `Olib ketish: ${title}`, subtitle: b.code,
            date: b.pickupDate.toISOString().slice(0, 10),
            status: b.status,
            href: `/belis/booking/${b.code}`,
            color: "#3b82f6",
        });
        events.push({
            id: `belis-rt-${b.id}`, source: "belis_return",
            title: `Qaytarish: ${title}`, subtitle: b.code,
            date: b.returnDate.toISOString().slice(0, 10),
            status: b.status,
            href: `/belis/booking/${b.code}`,
            color: "#f97316",
        });
    }
    for (const o of bnOrders) {
        events.push({
            id: `bn-${o.id}`, source: "bn",
            title: `BN: ${o.code}`,
            subtitle: o.shop?.name || "Bozor Narxida",
            date: o.placedAt.toISOString().slice(0, 10),
            status: o.status,
            href: `/bn/kabinet/buyurtma`,
            color: "#f5b301",
        });
    }
    for (const t of supportTix) {
        events.push({
            id: `sup-${t.id}`, source: "support",
            title: `Support: ${t.subject.slice(0, 30)}`,
            date: t.updatedAt.toISOString().slice(0, 10),
            status: t.status,
            href: `/support`,
            color: "#ef4444",
        });
    }

    return NextResponse.json({
        events,
        period: { from: from.toISOString(), to: to.toISOString() },
    });
}
