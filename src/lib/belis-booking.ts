// Belis ijara booking yordamchi funksiyalar.
//
// - Sana hisoblash: eventDate → pickupDate (-1 kun), returnDate (+1 kun default, +2 max)
// - Availability check: shu sanada komplekt/quti mavjudmi?
// - Booking kod generatsiya: BEL-2026-00001
// - Narx hisoblash: kunlik * kunlar + zaklat
// - Jarima: kechikish + zarar
//
// SEVINCH OPAMDAN TASDIQLANGAN (2026-09):
//   - Ijara davomiyligi 2 kun default, max 3 kun (kechroq qaytarilsa)
//   - Zaklat majburiy, pasport nusxasi majburiy (asl ushlab qolinmaydi)
//   - Alohida quti ijaraga olsa bo'ladi (komplekt majburiy emas)
//   - Yandex chaqirishni ikkala tomon ham qila oladi

import { prisma } from "@/lib/prisma";

/** Marosim kunidan avval nechta kun oldin olib ketiladi. */
export const BELIS_PICKUP_DAYS_BEFORE = 1;
/** Marosim kunidan keyin default qaytish (marosim ertasi = 2 kun ijara). */
export const BELIS_RETURN_DAYS_AFTER = 1;
/** Maksimal qaytish (marosimdan 2 kun keyin = 3 kun ijara). */
export const BELIS_MAX_RETURN_DAYS_AFTER = 2;
/** Kechikish jarima — ijara kunlik narxining foizi (30%). */
export const BELIS_LATE_FINE_PCT = 0.30;

export interface BookingSchedule {
    eventDate: Date;
    pickupDate: Date;
    returnDate: Date;
    daysCount: number;
}

/** Marosim sanasidan booking jadvalini hisoblab beradi.
 *  daysCount = to'lanadigan kunlar (pickup dan return gacha yotgan tunlar/kunlar).
 *  Default: pickup=event-1, return=event+1 → 2 kun ijara. */
export function calcBookingSchedule(eventDate: Date, returnDaysAfter?: number): BookingSchedule {
    const after = Math.min(
        BELIS_MAX_RETURN_DAYS_AFTER,
        Math.max(0, returnDaysAfter ?? BELIS_RETURN_DAYS_AFTER),
    );
    const pickup = new Date(eventDate);
    pickup.setDate(pickup.getDate() - BELIS_PICKUP_DAYS_BEFORE);
    const ret = new Date(eventDate);
    ret.setDate(ret.getDate() + after);
    // Kunlar (nights) — pickup dan return gacha yotgan 24-soatlik bloklar.
    // Default 2 kun (event-1 → event+1). Max 3 kun (event-1 → event+2).
    const msDiff = ret.getTime() - pickup.getTime();
    const daysCount = Math.max(1, Math.ceil(msDiff / (24 * 3600 * 1000)));
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
