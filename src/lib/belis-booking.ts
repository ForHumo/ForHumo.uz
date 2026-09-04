// Belis ijara booking yordamchi funksiyalar.
//
// - Sana hisoblash: eventDate → pickupDate (-1 kun), returnDate (+3 kun)
// - Availability check: shu sanada komplekt/quti mavjudmi?
// - Booking kod generatsiya: BEL-2026-00001
// - Narx hisoblash: kunlik * kunlar + zaklat
// - Jarima: kechikish + zarar
//
// TAXMIN qiymatlar Sevinch opamdan javob kelgach o'zgartiriladi (BELIS-V1-REJASI.md 9-bo'lim).

import { prisma } from "@/lib/prisma";

/** Marosim kunidan avval nechta kun oldin olib ketiladi (default 1). */
export const BELIS_PICKUP_DAYS_BEFORE = 1;
/** Marosim kunidan keyin nechta kun ichida qaytariladi (default 3). */
export const BELIS_RETURN_DAYS_AFTER = 3;
/** Kechikish jarima — ijara kunlik narxining foizi (30%). TAXMIN */
export const BELIS_LATE_FINE_PCT = 0.30;

export interface BookingSchedule {
    eventDate: Date;
    pickupDate: Date;
    returnDate: Date;
    daysCount: number;
}

/** Marosim sanasidan booking jadvalini hisoblab beradi. */
export function calcBookingSchedule(eventDate: Date): BookingSchedule {
    const pickup = new Date(eventDate);
    pickup.setDate(pickup.getDate() - BELIS_PICKUP_DAYS_BEFORE);
    const ret = new Date(eventDate);
    ret.setDate(ret.getDate() + BELIS_RETURN_DAYS_AFTER);
    // Kunlar soni: pickup dan return gacha (inclusive)
    const msDiff = ret.getTime() - pickup.getTime();
    const daysCount = Math.max(1, Math.ceil(msDiff / (24 * 3600 * 1000)) + 1);
    return { eventDate, pickupDate: pickup, returnDate: ret, daysCount };
}

/** Ikki sana oralig'i kesishishini tekshiradi (booking konflikti uchun). */
export function periodsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
    return a.start <= b.end && b.start <= a.end;
}

/** Komplekt shu sanada mavjudmi (band bo'lmagan nusxalari bormi). */
export async function isKomplektAvailable(
    komplektId: string,
    schedule: BookingSchedule,
): Promise<{ available: boolean; totalCopies: number; bookedCount: number }> {
    const komplekt = await prisma.belisKomplekt.findUnique({
        where: { id: komplektId },
        select: { copyCount: true, isActive: true, hidden: true },
    });
    if (!komplekt || !komplekt.isActive || komplekt.hidden) {
        return { available: false, totalCopies: 0, bookedCount: 0 };
    }
    // Konflikt bo'ladigan bookinglar
    const conflictingBookings = await prisma.belisRentalBooking.findMany({
        where: {
            komplektId,
            status: { in: ["REQUESTED", "CONFIRMED", "PICKED_UP", "LATE"] },
            pickupDate: { lte: schedule.returnDate },
            returnDate: { gte: schedule.pickupDate },
        },
        select: { id: true },
    });
    return {
        totalCopies: komplekt.copyCount,
        bookedCount: conflictingBookings.length,
        available: conflictingBookings.length < komplekt.copyCount,
    };
}

/** Booking narxini hisoblaydi (rentTotal + deposit). */
export function calcBookingTotals(rentDailyUzs: number, daysCount: number, depositUzs: number) {
    const rentTotalUzs = rentDailyUzs * daysCount;
    return {
        rentDailyUzs,
        daysCount,
        rentTotalUzs,
        depositUzs,
        grandTotalUzs: rentTotalUzs + depositUzs,
    };
}

/** Kechikish jarimai (returnDate dan keyin har kun uchun). */
export function calcLateFine(returnDate: Date, actualReturnedAt: Date, rentDailyUzs: number): number {
    const msLate = actualReturnedAt.getTime() - returnDate.getTime();
    if (msLate <= 0) return 0;
    const daysLate = Math.ceil(msLate / (24 * 3600 * 1000));
    return Math.floor(daysLate * rentDailyUzs * BELIS_LATE_FINE_PCT);
}

/** Yangi booking kodi (BEL-YYYY-NNNNN). Har yil dan boshlab counter. */
export async function generateBookingCode(): Promise<string> {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const count = await prisma.belisRentalBooking.count({
        where: { createdAt: { gte: yearStart } },
    });
    const seq = String(count + 1).padStart(5, "0");
    return `BEL-${year}-${seq}`;
}
