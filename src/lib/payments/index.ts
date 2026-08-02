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

// Ustuvorlik: env'da BARCHA kerakli kalitlar bo'lsa — real ishlatiladi.
// Qisman sozlash → xavfli (foydalanuvchi to'lasa ham webhook ishlamaydi)
// shu sabab MERCHANT_ID + MERCHANT_KEY ikkalasini talab qilamiz.
const paymeReady  = () => !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_MERCHANT_KEY);
const clickReady  = () => !!(process.env.CLICK_MERCHANT_ID && process.env.CLICK_SERVICE_ID && process.env.CLICK_SECRET);
const stripeReady = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

// Real shlyuz kalitlari to'liq mavjudmi? (webhook bilan birga)
export function isLiveMode(): boolean {
    return paymeReady() || clickReady() || stripeReady();
}

export function getDepositProvider(currency: Currency): PaymentProvider {
    if (currency === "UZS") {
        if (paymeReady()) return paymeProvider;
        if (clickReady()) return clickProvider;
    }
    if (currency === "USD" && stripeReady()) return stripeProvider;
    return testProvider;
}

export function getPayoutProvider(currency: Currency): PaymentProvider {
    // Payout hozircha barcha real shlyuzlarda "processing" — MChJ hisobi orqali qo'lda
    if (currency === "UZS") {
        if (paymeReady()) return paymeProvider;
        if (clickReady()) return clickProvider;
    }
    if (currency === "USD" && stripeReady()) return stripeProvider;
    return testProvider;
}

export type { PaymentProvider } from "./types";
