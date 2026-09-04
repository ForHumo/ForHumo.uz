// Belis ijara bookinglar.
//
// POST /api/belis/bookings              — yangi booking (auth)
//   body: {
//     komplektSlug: string,
//     eventDate: ISO string,
//     buyerName: string,
//     buyerPhone: string,
//     passportUrl?: string,
//     passportSeries?: string,
//     fulfillType: "PICKUP" | "YANDEX_CUSTOMER",
//     address?: string,
//     note?: string,
//   }
//
// GET /api/belis/bookings                — mening bookinglarim (auth)

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAuth } from "@/lib/belis-auth";
import { belisRate, BELIS_RATE_MSG } from "@/lib/belis-rate";
import { belisPushAdmins } from "@/lib/belis-notify";
import {
    calcBookingSchedule,
    isKomplektAvailable,
    calcBookingTotals,
    generateBookingCode,
} from "@/lib/belis-booking";
import type { BelisRentalFulfill } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_FULFILL: BelisRentalFulfill[] = ["PICKUP", "YANDEX_CUSTOMER", "YANDEX_BELIS"];

export async function POST(req: Request) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;

    // Humo ID gate — humoId bo'lmasa foydalanuvchi /id ga o'tishi kerak.
    // Bu kutilmagan holatga qarshi (client gate ishlagan bo'lsa ham server tekshiruvi).
    if (!auth.humoId) {
        return NextResponse.json({
            error: "humo_id_required",
            hint: "Booking berish uchun Humo ID kerak. /id sahifasidan oling.",
        }, { status: 403 });
    }

    // Rate-limit: 5 ariza / soat / profil
    const rate = await belisRate(auth.profileId, "bookingCreate");
    if (rate.limited) {
        return NextResponse.json({
            error: "rate_limited",
            message: BELIS_RATE_MSG,
            retryAfterMinutes: rate.windowMinutes,
        }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const komplektSlug = String(body?.komplektSlug ?? "").trim();
    const eventDateStr = String(body?.eventDate ?? "").trim();
    const buyerName = String(body?.buyerName ?? "").trim().slice(0, 120);
    const buyerPhone = String(body?.buyerPhone ?? "").trim().slice(0, 20);
    const passportUrl = typeof body?.passportUrl === "string" ? body.passportUrl.slice(0, 500) : null;
    const passportSeries = typeof body?.passportSeries === "string"
        ? body.passportSeries.trim().toUpperCase().slice(0, 20)
        : null;
    const fulfillTypeRaw = String(body?.fulfillType ?? "PICKUP").toUpperCase();
    const fulfillType: BelisRentalFulfill = ALLOWED_FULFILL.includes(fulfillTypeRaw as BelisRentalFulfill)
        ? (fulfillTypeRaw as BelisRentalFulfill)
        : "PICKUP";
    const address = typeof body?.address === "string" ? body.address.trim().slice(0, 300) : null;
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;
    // Qaytish kunlari (marosim keyingi N kun): default 1, max 2
    const returnDaysAfterRaw = Number(body?.returnDaysAfter);
    const returnDaysAfter = Number.isFinite(returnDaysAfterRaw) ? returnDaysAfterRaw : undefined;

    // Validatsiya
    if (!komplektSlug) return NextResponse.json({ error: "komplekt_required" }, { status: 400 });
    if (!eventDateStr) return NextResponse.json({ error: "event_date_required" }, { status: 400 });
    if (buyerName.length < 2) return NextResponse.json({ error: "name_too_short" }, { status: 400 });
    if (buyerPhone.length < 9) return NextResponse.json({ error: "phone_invalid" }, { status: 400 });
    if (!passportUrl) {
        // Sevinch opamdan tasdiqlangan: pasport nusxasi majburiy — bo'lmasa berilmaydi.
        return NextResponse.json({ error: "passport_required" }, { status: 400 });
    }
    if ((fulfillType === "YANDEX_CUSTOMER" || fulfillType === "YANDEX_BELIS") && (!address || address.length < 5)) {
        return NextResponse.json({ error: "address_required_for_yandex" }, { status: 400 });
    }

    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) return NextResponse.json({ error: "past_date" }, { status: 400 });

    // Komplekt topish
    const k = await prisma.belisKomplekt.findUnique({
        where: { slug: komplektSlug },
        select: { id: true, dailyRentUzs: true, deposit: true, isActive: true, hidden: true },
    });
    if (!k || !k.isActive || k.hidden) {
        return NextResponse.json({ error: "komplekt_not_found" }, { status: 404 });
    }

    const schedule = calcBookingSchedule(eventDate, returnDaysAfter);
    const avail = await isKomplektAvailable(k.id, schedule);
    if (!avail.available) {
        return NextResponse.json({
            error: "not_available",
            totalCopies: avail.totalCopies,
            bookedCount: avail.bookedCount,
        }, { status: 409 });
    }

    const totals = calcBookingTotals(k.dailyRentUzs, schedule.daysCount, k.deposit);
    const code = await generateBookingCode();

    const booking = await prisma.belisRentalBooking.create({
        data: {
            code,
            buyerId: auth.profileId,
            buyerName,
            buyerPhone,
            passportUrl,
            passportSeries,
            eventDate: schedule.eventDate,
            pickupDate: schedule.pickupDate,
            returnDate: schedule.returnDate,
            komplektId: k.id,
            rentDailyUzs: totals.rentDailyUzs,
            daysCount: totals.daysCount,
            rentTotalUzs: totals.rentTotalUzs,
            depositUzs: totals.depositUzs,
            fulfillType,
            address,
            note,
            status: "REQUESTED",
        },
        select: {
            id: true, code: true, status: true,
            eventDate: true, pickupDate: true, returnDate: true,
            rentTotalUzs: true, depositUzs: true, daysCount: true,
        },
    });

    // Adminga (@sevinch) push — yangi ariza
    after(async () => {
        await belisPushAdmins({
            title: "Yangi Belis arizasi",
            body: `${buyerName} · ${schedule.eventDate.toLocaleDateString("uz-UZ")} marosim`,
            link: `/admin/bookings/${booking.code}`,
            tag: `belis:new:${booking.code}`,
        });
    });

    return NextResponse.json({
        ok: true,
        booking: {
            ...booking,
            eventDate: booking.eventDate.toISOString(),
            pickupDate: booking.pickupDate.toISOString(),
            returnDate: booking.returnDate.toISOString(),
        },
    });
}

export async function GET() {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;

    const bookings = await prisma.belisRentalBooking.findMany({
        where: { buyerId: auth.profileId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            komplekt: { select: { slug: true, nameUz: true, nameRu: true, nameEn: true, images: true } },
        },
    });

    return NextResponse.json({
        bookings: bookings.map(b => ({
            id: b.id,
            code: b.code,
            status: b.status,
            eventDate: b.eventDate.toISOString(),
            pickupDate: b.pickupDate.toISOString(),
            returnDate: b.returnDate.toISOString(),
            rentTotalUzs: b.rentTotalUzs,
            depositUzs: b.depositUzs,
            fulfillType: b.fulfillType,
            komplekt: b.komplekt,
            createdAt: b.createdAt.toISOString(),
        })),
    });
}
