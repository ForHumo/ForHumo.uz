// Click Shop API — UZS uchun ikkinchi shlyuz.
// Test rejimda: `CLICK_MERCHANT_ID` yo'q → skeleton xato qaytaradi.
// Real rejimda: MChJ + Click merchant kabinet + servis ID + secret key kerak.
//
// Click Shop API doc: https://docs.click.uz/click-api
// Ish tartibi:
//   1. Biz Click "checkout" linki qaytaramiz (redirect)
//   2. Foydalanuvchi to'laydi
//   3. Click /api/pay/webhook/click ga Prepare va Complete chaqiruvlar yuboradi
//   4. Prepare — biz "OK" javob beramiz (order valid); Complete — balansga qo'shamiz

import type { PaymentProvider, DepositRequest, DepositResult, PayoutRequestInput, PayoutResult } from "./types";
import type { Currency } from "@/lib/money";

const CLICK_CHECKOUT_URL = "https://my.click.uz/services/pay";

export const clickProvider: PaymentProvider = {
    id: "click",
    live: true,
    supports(currency: Currency) { return currency === "UZS"; },

    async createDeposit(req: DepositRequest): Promise<DepositResult> {
        const merchantId = process.env.CLICK_MERCHANT_ID;
        const serviceId = process.env.CLICK_SERVICE_ID;
        if (!merchantId || !serviceId) return { status: "pending", providerRef: "click_not_configured" };

        // Click checkout: my.click.uz/services/pay?service_id=X&merchant_id=Y&amount=Z&transaction_param=<orderId>
        const params = new URLSearchParams({
            service_id: serviceId,
            merchant_id: merchantId,
            amount: String(req.amount),
            transaction_param: req.profileId,
            ...(req.returnUrl ? { return_url: req.returnUrl } : {}),
        });
        return {
            status: "redirect",
            redirectUrl: `${CLICK_CHECKOUT_URL}?${params.toString()}`,
            providerRef: `click_${Date.now()}`,
        };
    },

    async createPayout(_req: PayoutRequestInput): Promise<PayoutResult> {
        // Click ham avtomatik payout API bermaydi — MChJ hisobi orqali qo'lda
        return { status: "processing", providerRef: `click_payout_${Date.now()}` };
    },
};
