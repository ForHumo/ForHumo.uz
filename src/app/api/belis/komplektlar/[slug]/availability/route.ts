// Komplekt shu marosim sanasida mavjudmi.
// GET /api/belis/komplektlar/[slug]/availability?eventDate=2026-11-15
//
// Javob: { available, totalCopies, bookedCount, schedule, totals }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcBookingSchedule, isKomplektAvailable, calcBookingTotals } from "@/lib/belis-booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const url = new URL(req.url);
    const eventDateStr = url.searchParams.get("eventDate");
    if (!eventDateStr) {
        return NextResponse.json({ error: "eventDate_required" }, { status: 400 });
    }
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) {
        return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    // Kelajakdagi sana bo'lishi kerak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
        return NextResponse.json({ error: "past_date" }, { status: 400 });
    }

    const k = await prisma.belisKomplekt.findUnique({
        where: { slug },
        select: { id: true, dailyRentUzs: true, deposit: true, isActive: true, hidden: true },
    });
    if (!k || !k.isActive || k.hidden) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const schedule = calcBookingSchedule(eventDate);
    const avail = await isKomplektAvailable(k.id, schedule);
    const totals = calcBookingTotals(k.dailyRentUzs, schedule.daysCount, k.deposit);

    return NextResponse.json({
        available: avail.available,
        totalCopies: avail.totalCopies,
        bookedCount: avail.bookedCount,
        schedule: {
            eventDate: schedule.eventDate.toISOString(),
            pickupDate: schedule.pickupDate.toISOString(),
            returnDate: schedule.returnDate.toISOString(),
            daysCount: schedule.daysCount,
        },
        totals,
    });
}
