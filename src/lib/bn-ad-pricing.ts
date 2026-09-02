// BN Reklama banner narx kalkulyatsiya.
// Sof foyda 10$ / kun bo'lishi uchun mijoz to'laydigan gross summasini
// soliq stavkasi asosida hisoblaymiz.
//
// IT Park rezident (BN_AD_ITPARK=true):
//   gross = net / (1 - 0.05) = 10 / 0.95 = 10.53$
//   Aylanma soligʻi 0%, dividend 5% → sizga 10$ tegadi
//
// IT Park emas (default):
//   gross = net / (1 - 0.05) / (1 - 0.04) = 10 / 0.95 / 0.96 = 10.96$
//   4% aylanma + 5% dividend
//
// Aslida so'mda hisoblaymiz. CBU kursi live olinadi.

import { getUsdUzsRate } from "./cbu-rate";

export const AD_NET_USD_PER_DAY = 10;
export const AD_DIVIDEND_PCT = 0.05;      // 5% dividend soliq
export const AD_TURNOVER_PCT = 0.04;      // 4% aylanma soliq (IT Park bo'lmaganda)

export function isItParkResident(): boolean {
    return String(process.env.BN_AD_ITPARK ?? "false").toLowerCase() === "true";
}

/** Bir kunlik reklama uchun mijoz to'laydigan gross USD. */
export function grossUsdPerDay(itPark: boolean = isItParkResident()): number {
    const net = AD_NET_USD_PER_DAY;
    if (itPark) {
        // 5% dividend
        return net / (1 - AD_DIVIDEND_PCT);
    }
    // 4% aylanma + 5% dividend
    return net / (1 - AD_DIVIDEND_PCT) / (1 - AD_TURNOVER_PCT);
}

export interface AdPrice {
    days: number;
    netUsdPerDay: number;
    grossUsdPerDay: number;
    grossUsdTotal: number;
    usdUzsRate: number;
    grossUzsPerDay: number;
    grossUzsTotal: number;
    itPark: boolean;
    /** Soliq batafsiloti (foydalanuvchiga transparent ko'rsatish uchun) */
    breakdown: {
        dividendPct: number;
        turnoverPct: number;
    };
}

/** Kunlar soni uchun to'liq narx hisobini qaytaradi (live CBU kursi bilan). */
export async function computeAdPrice(days: number, itPark?: boolean): Promise<AdPrice> {
    const d = Math.max(1, Math.min(30, Math.floor(days)));
    const isIt = itPark ?? isItParkResident();
    const rate = await getUsdUzsRate();
    const grossUsdDay = grossUsdPerDay(isIt);
    const grossUsdTotal = grossUsdDay * d;
    // So'mda butun songa yaxlitlaymiz (100 so'm aniqligida — inflatsiya kichik farqni yashirsin)
    const grossUzsDay = Math.round((grossUsdDay * rate) / 100) * 100;
    const grossUzsTotal = grossUzsDay * d;

    return {
        days: d,
        netUsdPerDay: AD_NET_USD_PER_DAY,
        grossUsdPerDay: Math.round(grossUsdDay * 100) / 100,
        grossUsdTotal: Math.round(grossUsdTotal * 100) / 100,
        usdUzsRate: rate,
        grossUzsPerDay: grossUzsDay,
        grossUzsTotal,
        itPark: isIt,
        breakdown: {
            dividendPct: AD_DIVIDEND_PCT,
            turnoverPct: isIt ? 0 : AD_TURNOVER_PCT,
        },
    };
}
