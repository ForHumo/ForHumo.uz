// Belis kunlik cron (07:00 UTC ≈ 12:00 Toshkent).
// - Bugungi pickup — mijoz + admin push
// - Bugungi return — mijoz + admin push
// - Kechikkan (returnDate < kecha) — PICKED_UP → LATE marking + mijoz push
//
// Vercel Hobby: faqat kunlik cron ishlaydi (vercel.json).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belisPush, belisPushAdmins } from "@/lib/belis-notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function todayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

export async function GET() {
    const { start: dayStart, end: dayEnd } = todayRange();
    const yesterdayEnd = new Date(dayStart);
    yesterdayEnd.setMilliseconds(-1);

    let pickupCount = 0;
    let returnCount = 0;
    let lateCount = 0;

    // 1) Bugun pickup — CONFIRMED bookinglar
    const pickupsToday = await prisma.belisRentalBooking.findMany({
        where: {
            status: "CONFIRMED",
            pickupDate: { gte: dayStart, lte: dayEnd },
        },
        select: { code: true, buyerId: true, buyerName: true },
    });
    for (const b of pickupsToday) {
        await belisPush(b.buyerId, {
            title: "Bugun mahsulot pickup kuni",
            body: `#${b.code} · Belisga tashrif buyurishingiz kutilyapti`,
            link: `/buyurtma/${b.code}`,
            tag: `belis:pickup-reminder:${b.code}`,
        });
        pickupCount++;
    }
    if (pickupsToday.length > 0) {
        await belisPushAdmins({
            title: `Bugun ${pickupsToday.length} pickup`,
            body: pickupsToday.map(b => b.buyerName).slice(0, 3).join(", "),
            link: "/admin/bookings?status=CONFIRMED",
            tag: `belis:admin-pickups:${dayStart.toISOString().slice(0, 10)}`,
        });
    }

    // 2) Bugun return — PICKED_UP bookinglar
    const returnsToday = await prisma.belisRentalBooking.findMany({
        where: {
            status: "PICKED_UP",
            returnDate: { gte: dayStart, lte: dayEnd },
        },
        select: { code: true, buyerId: true, buyerName: true },
    });
    for (const b of returnsToday) {
        await belisPush(b.buyerId, {
            title: "Bugun qaytish kuni",
            body: `#${b.code} · Mahsulotni Belis do'koniga qaytaring`,
            link: `/buyurtma/${b.code}`,
            tag: `belis:return-reminder:${b.code}`,
        });
        returnCount++;
    }
    if (returnsToday.length > 0) {
        await belisPushAdmins({
            title: `Bugun ${returnsToday.length} qaytish`,
            body: returnsToday.map(b => b.buyerName).slice(0, 3).join(", "),
            link: "/admin/bookings?status=PICKED_UP",
            tag: `belis:admin-returns:${dayStart.toISOString().slice(0, 10)}`,
        });
    }

    // 3) Kechikkan — returnDate kecha va undan oldin, hali PICKED_UP
    const overdue = await prisma.belisRentalBooking.findMany({
        where: {
            status: "PICKED_UP",
            returnDate: { lt: dayStart },
        },
        select: { id: true, code: true, buyerId: true },
    });
    for (const b of overdue) {
        await prisma.belisRentalBooking.update({
            where: { id: b.id },
            data: { status: "LATE" },
        });
        await belisPush(b.buyerId, {
            title: "Qaytish sanasi o'tdi",
            body: `#${b.code} · Har kun uchun 30% shtraf hisoblanadi. Iltimos qaytaring.`,
            link: `/buyurtma/${b.code}`,
            tag: `belis:late:${b.code}`,
        });
        lateCount++;
    }
    if (overdue.length > 0) {
        await belisPushAdmins({
            title: `${overdue.length} ta kechikkan buyurtma`,
            body: "LATE statusiga o'tkazildi",
            link: "/admin/bookings?status=LATE",
            tag: `belis:admin-late:${dayStart.toISOString().slice(0, 10)}`,
        });
    }

    return NextResponse.json({
        ok: true,
        pickups: pickupCount,
        returns: returnCount,
        lateMarked: lateCount,
        date: dayStart.toISOString().slice(0, 10),
    });
}
