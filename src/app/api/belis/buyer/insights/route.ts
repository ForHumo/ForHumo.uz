// Belis xaridor kabinet insights.
//
//   GET /api/belis/buyer/insights
//
// Rezervlar, kelasi voqealar, jami sarflagan.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [bookings, upcoming, totalAgg, monthAgg] = await Promise.all([
        prisma.belisRentalBooking.findMany({
            where: { buyerId: profile.id },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { komplekt: { select: { nameUz: true, images: true } } },
        }).catch(() => []),
        prisma.belisRentalBooking.findMany({
            where: {
                buyerId: profile.id,
                eventDate: { gte: now },
                status: { in: ["REQUESTED", "CONFIRMED"] },
            },
            orderBy: { eventDate: "asc" },
            take: 3,
            include: { komplekt: { select: { nameUz: true } } },
        }).catch(() => []),
        prisma.belisRentalBooking.aggregate({
            where: {
                buyerId: profile.id, createdAt: { gte: yearStart },
                status: { in: ["CONFIRMED", "PICKED_UP", "RETURNED_OK", "RETURNED_DAMAGE"] },
            },
            _sum: { rentTotalUzs: true },
            _count: { _all: true },
        }).catch(() => ({ _sum: { rentTotalUzs: 0 }, _count: { _all: 0 } })),
        prisma.belisRentalBooking.count({
            where: {
                buyerId: profile.id,
                status: { in: ["REQUESTED", "CONFIRMED", "PICKED_UP"] },
            },
        }).catch(() => 0),
    ]);

    return NextResponse.json({
        summary: {
            activeCount: monthAgg,
            yearTotal: totalAgg._sum.rentTotalUzs ?? 0,
            yearCount: totalAgg._count._all,
            totalBookings: bookings.length,
        },
        upcoming: upcoming.map(u => {
            const daysUntil = Math.ceil((u.eventDate.getTime() - now.getTime()) / 86400000);
            return {
                id: u.id, code: u.code, status: u.status,
                komplektName: u.komplekt?.nameUz || "—",
                eventDate: u.eventDate.toISOString(),
                pickupDate: u.pickupDate.toISOString(),
                daysUntil,
            };
        }),
        recent: bookings.slice(0, 5).map(b => ({
            id: b.id, code: b.code, status: b.status,
            komplektName: b.komplekt?.nameUz || "—",
            image: b.komplekt?.images?.[0] || null,
            eventDate: b.eventDate.toISOString(),
            rentTotalUzs: b.rentTotalUzs,
        })),
    });
}
