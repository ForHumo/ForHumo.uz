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

// Real shlyuz kalitlari mavjudmi? (kelajakda real providerlar shu yerda tanlanadi)
export function isLiveMode(): boolean {
    return !!(process.env.CLICK_MERCHANT_ID || process.env.PAYME_MERCHANT_ID || process.env.STRIPE_SECRET_KEY);
}

export function getDepositProvider(currency: Currency): PaymentProvider {
    // TODO: real kalitlar bo'lsa — UZS→Click/Payme, USD→Stripe qaytar.
    void currency;
    return testProvider;
}

export function getPayoutProvider(currency: Currency): PaymentProvider {
    void currency;
    return testProvider;
}

export type { PaymentProvider } from "./types";
