// Payme (Paycom) shlyuzi — UZS uchun.
// Test rejimda: `PAYME_MERCHANT_ID` yo'q → skeleton xato qaytaradi.
// Real rejimda: MChJ + Payme business kabinet + merchant kalit kerak.
//
// Payme Merchant API: https://developer.help.paycom.uz
// Ish tartibi:
//   1. Foydalanuvchi POST /api/pay/deposit → provider.createDeposit
//   2. Biz Payme "checkout" URL yasab qaytaramiz (redirect)
//   3. Foydalanuvchi Payme sahifasida to'laydi
//   4. Payme /api/pay/webhook/payme ga JSON-RPC chaqiradi
//      (CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement)
//   5. PerformTransaction'da balansga qo'shamiz

import type { PaymentProvider, DepositRequest, DepositResult, PayoutRequestInput, PayoutResult } from "./types";
import type { Currency } from "@/lib/money";

const PAYME_CHECKOUT_URL = "https://checkout.paycom.uz";

function base64(input: string): string {
    return Buffer.from(input, "utf-8").toString("base64");
}

export const paymeProvider: PaymentProvider = {
    id: "payme",
    live: true,
    supports(currency: Currency) { return currency === "UZS"; },

    async createDeposit(req: DepositRequest): Promise<DepositResult> {
        const merchantId = process.env.PAYME_MERCHANT_ID;
        if (!merchantId) return { status: "pending", providerRef: "payme_not_configured" };

        // Payme summa tiyinlarda (1 so'm = 100 tiyin)
        const amountTiyin = Math.round(req.amount * 100);

        // Payme "one-time" checkout URL: base64(m=<merchant_id>;ac.<field>=<value>;a=<amount>;c=<returnUrl>)
        // account field'lari merchant kabinetda sozlanadi (bizda `profile_id`)
        const params = [
            `m=${merchantId}`,
            `ac.profile_id=${req.profileId}`,
            `a=${amountTiyin}`,
            req.returnUrl ? `c=${req.returnUrl}` : "",
        ].filter(Boolean).join(";");

        const url = `${PAYME_CHECKOUT_URL}/${base64(params)}`;
        return { status: "redirect", redirectUrl: url, providerRef: `payme_${Date.now()}` };
    },

    async createPayout(_req: PayoutRequestInput): Promise<PayoutResult> {
        // Payme'da avtomatik payout API yo'q — MChJ hisobiga bank orqali qo'lda yechiladi
        return { status: "processing", providerRef: `payme_payout_${Date.now()}` };
    },
};
