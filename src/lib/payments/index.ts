// To'lov shlyuzi tanlovi. Hozir hamma narsa test provider orqali (real pul yo'q).
//
// Real shlyuz ulash (MChJ + merchant hisob kelganda):
//   - UZS uchun: Click (CLICK_MERCHANT_ID/CLICK_SECRET) yoki Payme (PAYME_MERCHANT_ID/PAYME_KEY)
//   - USD uchun: Stripe (STRIPE_SECRET_KEY)
// Mos provider faylini (masalan payments/click.ts) yozib, quyidagi tanlovga qo'shing.
// Interfeys bir xil — UI va route'lar o'zgarmaydi.

import type { Currency } from "@/lib/money";
import type { PaymentProvider } from "./types";
import { testProvider } from "./test-provider";
import { paymeProvider } from "./payme";
import { clickProvider } from "./click";
import { stripeProvider } from "./stripe";

// Real shlyuz kalitlari mavjudmi? (env orqali tanlanadi)
export function isLiveMode(): boolean {
    return !!(process.env.CLICK_MERCHANT_ID || process.env.PAYME_MERCHANT_ID || process.env.STRIPE_SECRET_KEY);
}

// Ustuvorlik: env'da qaysi kalitlar bor bo'lsa — o'sha ishlatiladi.
// UZS: PAYME_MERCHANT_ID > CLICK_MERCHANT_ID > test
// USD: STRIPE_SECRET_KEY > test
export function getDepositProvider(currency: Currency): PaymentProvider {
    if (currency === "UZS") {
        if (process.env.PAYME_MERCHANT_ID) return paymeProvider;
        if (process.env.CLICK_MERCHANT_ID) return clickProvider;
    }
    if (currency === "USD" && process.env.STRIPE_SECRET_KEY) return stripeProvider;
    return testProvider;
}

export function getPayoutProvider(currency: Currency): PaymentProvider {
    // Payout hozircha barcha real shlyuzlarda "processing" — MChJ hisobi orqali qo'lda
    if (currency === "UZS") {
        if (process.env.PAYME_MERCHANT_ID) return paymeProvider;
        if (process.env.CLICK_MERCHANT_ID) return clickProvider;
    }
    if (currency === "USD" && process.env.STRIPE_SECRET_KEY) return stripeProvider;
    return testProvider;
}

export type { PaymentProvider } from "./types";
