// Admin — kalendar ko'rinishi (bir oy uchun barcha bookinglar).
// GET /api/belis/admin/calendar?year=2026&month=11
//
// Har komplekt uchun sanalar bo'yicha kim band qilgani.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const now = new Date();
    const year = Number(url.searchParams.get("year") ?? now.getFullYear());
    const month = Number(url.searchParams.get("month") ?? (now.getMonth() + 1));
    // month 1-12

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const bookings = await prisma.belisRentalBooking.findMany({
        where: {
            status: { in: ["CONFIRMED", "PICKED_UP", "LATE", "REQUESTED"] },
            // kesishuv: pickupDate <= monthEnd AND returnDate >= monthStart
            pickupDate: { lte: monthEnd },
            returnDate: { gte: monthStart },
        },
        select: {
            id: true, code: true, status: true,
            buyerName: true,
            eventDate: true, pickupDate: true, returnDate: true,
            komplektId: true,
            komplekt: { select: { slug: true, nameUz: true, kind: true } },
        },
        orderBy: { pickupDate: "asc" },
    });

    // Komplekt bo'yicha guruh
    const byKomplekt = new Map<string, typeof bookings>();
    for (const b of bookings) {
        if (!b.komplektId) continue;
        const arr = byKomplekt.get(b.komplektId) ?? [];
        arr.push(b);
        byKomplekt.set(b.komplektId, arr);
    }

    return NextResponse.json({
        year,
        month,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        bookings: bookings.map(b => ({
            id: b.id,
            code: b.code,
            status: b.status,
            buyerName: b.buyerName,
            eventDate: b.eventDate.toISOString(),
            pickupDate: b.pickupDate.toISOString(),
            returnDate: b.returnDate.toISOString(),
            komplekt: b.komplekt,
        })),
        groupedByKomplekt: Array.from(byKomplekt.entries()).map(([id, arr]) => ({
            komplektId: id,
            komplekt: arr[0].komplekt,
            count: arr.length,
        })),
    });
}
