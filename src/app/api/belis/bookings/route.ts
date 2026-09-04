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
    // Ijara turi: komplekt YOKI alohida qutilar (biri majburiy)
    const komplektSlug = String(body?.komplektSlug ?? "").trim();
    const rawItems: Array<{ slug?: unknown; qty?: unknown }> = Array.isArray(body?.items) ? body.items : [];
    const itemsIn = rawItems
        .map(x => ({
            slug: String(x?.slug ?? "").trim(),
            qty: Math.max(1, Math.min(50, Number(x?.qty ?? 1) || 1)),
        }))
        .filter(x => x.slug.length > 0);
    const isKomplektMode = !!komplektSlug;
    const isItemsMode = !komplektSlug && itemsIn.length > 0;

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
    if (!isKomplektMode && !isItemsMode) {
        return NextResponse.json({ error: "komplekt_or_items_required" }, { status: 400 });
    }
    if (isKomplektMode && isItemsMode) {
        return NextResponse.json({ error: "cannot_mix_komplekt_and_items" }, { status: 400 });
    }
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

    const schedule = calcBookingSchedule(eventDate, returnDaysAfter);
    const code = await generateBookingCode();

    // KOMPLEKT rejimi
    let booking;
    if (isKomplektMode) {
        const k = await prisma.belisKomplekt.findUnique({
            where: { slug: komplektSlug },
            select: { id: true, dailyRentUzs: true, deposit: true, isActive: true, hidden: true },
        });
        if (!k || !k.isActive || k.hidden) {
            return NextResponse.json({ error: "komplekt_not_found" }, { status: 404 });
        }
        const avail = await isKomplektAvailable(k.id, schedule);
        if (!avail.available) {
            return NextResponse.json({
                error: "not_available",
                totalCopies: avail.totalCopies,
                bookedCount: avail.bookedCount,
            }, { status: 409 });
        }
        const totals = calcBookingTotals(k.dailyRentUzs, schedule.daysCount, k.deposit);
        booking = await prisma.belisRentalBooking.create({
            data: {
                code,
                buyerId: auth.profileId,
                buyerName, buyerPhone,
                passportUrl, passportSeries,
                eventDate: schedule.eventDate,
                pickupDate: schedule.pickupDate,
                returnDate: schedule.returnDate,
                komplektId: k.id,
                rentDailyUzs: totals.rentDailyUzs,
                daysCount: totals.daysCount,
                rentTotalUzs: totals.rentTotalUzs,
                depositUzs: totals.depositUzs,
                fulfillType, address, note,
                status: "REQUESTED",
            },
            select: {
                id: true, code: true, status: true,
                eventDate: true, pickupDate: true, returnDate: true,
                rentTotalUzs: true, depositUzs: true, daysCount: true,
            },
        });
    } else {
        // ITEMS rejimi — alohida qutilar
        const items = await prisma.belisItem.findMany({
            where: { slug: { in: itemsIn.map(x => x.slug) }, isActive: true, hidden: false },
            select: { id: true, slug: true, dailyRentUzs: true, deposit: true, copyCount: true },
        });
        if (items.length !== itemsIn.length) {
            return NextResponse.json({ error: "some_items_not_found" }, { status: 404 });
        }
        // Availability — har quti uchun konfliktlangan bookinglar sonini tekshiramiz
        for (const it of items) {
            const wanted = itemsIn.find(x => x.slug === it.slug)!.qty;
            const conflict = await prisma.belisItemBooking.findMany({
                where: {
                    itemId: it.id,
                    booking: {
                        status: { in: ["REQUESTED", "CONFIRMED", "PICKED_UP", "LATE"] },
                        pickupDate: { lte: schedule.returnDate },
                        returnDate: { gte: schedule.pickupDate },
                    },
                },
                select: { qty: true },
            });
            const booked = conflict.reduce((s, c) => s + c.qty, 0);
            if (booked + wanted > it.copyCount) {
                return NextResponse.json({
                    error: "item_not_available",
                    itemSlug: it.slug,
                    available: Math.max(0, it.copyCount - booked),
                }, { status: 409 });
            }
        }

        // Umumiy narx: sum(kunlik * qty) * kunlar; zaklat = sum(deposit * qty)
        const sumDaily = items.reduce((s, it) => {
            const qty = itemsIn.find(x => x.slug === it.slug)!.qty;
            return s + it.dailyRentUzs * qty;
        }, 0);
        const sumDeposit = items.reduce((s, it) => {
            const qty = itemsIn.find(x => x.slug === it.slug)!.qty;
            return s + it.deposit * qty;
        }, 0);
        const rentTotal = sumDaily * schedule.daysCount;

        booking = await prisma.belisRentalBooking.create({
            data: {
                code,
                buyerId: auth.profileId,
                buyerName, buyerPhone,
                passportUrl, passportSeries,
                eventDate: schedule.eventDate,
                pickupDate: schedule.pickupDate,
                returnDate: schedule.returnDate,
                komplektId: null,
                rentDailyUzs: sumDaily,
                daysCount: schedule.daysCount,
                rentTotalUzs: rentTotal,
                depositUzs: sumDeposit,
                fulfillType, address, note,
                status: "REQUESTED",
                itemBookings: {
                    create: items.map(it => ({
                        itemId: it.id,
                        qty: itemsIn.find(x => x.slug === it.slug)!.qty,
                    })),
                },
            },
            select: {
                id: true, code: true, status: true,
                eventDate: true, pickupDate: true, returnDate: true,
                rentTotalUzs: true, depositUzs: true, daysCount: true,
            },
        });
    }

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
