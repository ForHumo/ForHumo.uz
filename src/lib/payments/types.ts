// To'lov shlyuzi (provider) interfeysi. Test rejimda darhol bajariladi;
// real kalitlar (Click/Payme/Stripe) kelganda real shlyuz ulanadi — UI/oqim o'zgarmaydi.

import type { Currency } from "@/lib/money";

export interface DepositRequest {
    amount: number;
    currency: Currency;
    profileId: string;
    returnUrl?: string;     // real shlyuzda to'lovdan keyin qaytish
}
export interface DepositResult {
    // completed — darhol tushdi (test); redirect — foydalanuvchi shlyuzga yo'naltiriladi (real);
    // pending — webhook kutilmoqda.
    status: "completed" | "redirect" | "pending";
    redirectUrl?: string;
    providerRef?: string;
}

export interface PayoutRequestInput {
    amount: number;
    currency: Currency;
    profileId: string;
    method: string;         // "card" | "bank"
    destination: string;    // karta/hisob (maskalangan saqlanadi)
}
export interface PayoutResult {
    status: "completed" | "processing" | "failed";
    providerRef?: string;
    error?: string;
}

export interface PaymentProvider {
    id: string;
    live: boolean;          // real shlyuzmi yoki test
    supports(currency: Currency): boolean;
    createDeposit(req: DepositRequest): Promise<DepositResult>;
    createPayout(req: PayoutRequestInput): Promise<PayoutResult>;
}
