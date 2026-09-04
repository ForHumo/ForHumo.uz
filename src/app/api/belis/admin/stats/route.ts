// Belis admin dashboard KPI.
// GET /api/belis/admin/stats
//
// Javob: {
//   today: { pickups, returns, requests },
//   thisWeek: { newBookings, completedOrders, expectedRevenue, actualRevenue },
//   allTime: { totalBookings, totalRevenue, activeKomplekts, activeItems },
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";

export const dynamic = "force-dynamic";
export const revalidate = 60; // 1 daq cache

export async function GET() {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

    const [
        pickupsToday, returnsToday, requestsToday,
        newBookingsWeek, completedWeek, expectedWeek, actualWeek,
        totalBookings, actualAllTime, activeKomplekts, activeItems,
    ] = await Promise.all([
        // Bugungi pickup
        prisma.belisRentalBooking.count({
            where: { status: "CONFIRMED", pickupDate: { gte: dayStart, lte: dayEnd } },
        }),
        // Bugungi return
        prisma.belisRentalBooking.count({
            where: { status: { in: ["PICKED_UP", "LATE"] }, returnDate: { gte: dayStart, lte: dayEnd } },
        }),
        // Bugungi ariza (REQUESTED yaratildi)
        prisma.belisRentalBooking.count({
            where: { createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        // Haftalik yangi bookinglar
        prisma.belisRentalBooking.count({
            where: { createdAt: { gte: weekStart } },
        }),
        // Haftalik yakunlangan (RETURNED_OK yoki DAMAGE)
        prisma.belisRentalBooking.count({
            where: {
                status: { in: ["RETURNED_OK", "RETURNED_DAMAGE"] },
                actualReturnedAt: { gte: weekStart },
            },
        }),
        // Haftalik kutilayotgan daromad (yangi bookinglar rentTotalUzs)
        prisma.belisRentalBooking.aggregate({
            _sum: { rentTotalUzs: true },
            where: { createdAt: { gte: weekStart }, status: { notIn: ["CANCELLED"] } },
        }),
        // Haqiqiy tushgan haftada
        prisma.belisRentalBooking.aggregate({
            _sum: { paidRent: true, fineUzs: true },
            where: { actualReturnedAt: { gte: weekStart } },
        }),
        // Butun vaqt bookinglar
        prisma.belisRentalBooking.count(),
        // Butun vaqt tushgan
        prisma.belisRentalBooking.aggregate({
            _sum: { paidRent: true, fineUzs: true },
            where: { status: { in: ["RETURNED_OK", "RETURNED_DAMAGE"] } },
        }),
        // Aktiv komplektlar
        prisma.belisKomplekt.count({ where: { isActive: true, hidden: false } }),
        // Aktiv qutilar
        prisma.belisItem.count({ where: { isActive: true, hidden: false } }),
    ]);

    // 7 kunlik trend — har kunga alohida count/summa (chart uchun)
    const days: Array<{ day: string; label: string; bookings: number; revenue: number }> = [];
    for (let i = 6; i >= 0; i--) {
        const d0 = new Date(now); d0.setDate(d0.getDate() - i); d0.setHours(0, 0, 0, 0);
        const d1 = new Date(d0); d1.setHours(23, 59, 59, 999);
        const [bCount, rSum] = await Promise.all([
            prisma.belisRentalBooking.count({
                where: { createdAt: { gte: d0, lte: d1 } },
            }),
            prisma.belisRentalBooking.aggregate({
                _sum: { paidRent: true, fineUzs: true },
                where: { actualReturnedAt: { gte: d0, lte: d1 } },
            }),
        ]);
        days.push({
            day: d0.toISOString().slice(0, 10),
            label: d0.toLocaleDateString("uz-UZ", { weekday: "short", day: "2-digit" }),
            bookings: bCount,
            revenue: (rSum._sum.paidRent ?? 0) + (rSum._sum.fineUzs ?? 0),
        });
    }

    return NextResponse.json({
        today: {
            pickups: pickupsToday,
            returns: returnsToday,
            requests: requestsToday,
        },
        thisWeek: {
            newBookings: newBookingsWeek,
            completedOrders: completedWeek,
            expectedRevenue: expectedWeek._sum.rentTotalUzs ?? 0,
            actualRevenue: (actualWeek._sum.paidRent ?? 0) + (actualWeek._sum.fineUzs ?? 0),
        },
        allTime: {
            totalBookings,
            totalRevenue: (actualAllTime._sum.paidRent ?? 0) + (actualAllTime._sum.fineUzs ?? 0),
            activeKomplekts,
            activeItems,
        },
        trend: days,
    });
}
