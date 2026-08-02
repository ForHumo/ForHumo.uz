// Stripe shlyuzi — USD uchun (xorijiy foydalanuvchilar).
// Test rejimda: `STRIPE_SECRET_KEY` yo'q → skeleton xato qaytaradi.
// Real rejimda: Stripe account + secret key + webhook secret kerak.
//
// Stripe API doc: https://stripe.com/docs/api
// Ish tartibi:
//   1. Biz Stripe Checkout Session yaratamiz
//   2. Foydalanuvchi Stripe sahifasida to'laydi
//   3. Stripe /api/pay/webhook/stripe ga `checkout.session.completed` yuboradi
//   4. Biz signature'ni tekshirib balansga qo'shamiz

import type { PaymentProvider, DepositRequest, DepositResult, PayoutRequestInput, PayoutResult } from "./types";
import type { Currency } from "@/lib/money";

export const stripeProvider: PaymentProvider = {
    id: "stripe",
    live: true,
    supports(currency: Currency) { return currency === "USD"; },

    async createDeposit(req: DepositRequest): Promise<DepositResult> {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) return { status: "pending", providerRef: "stripe_not_configured" };

        // Stripe Checkout Session (REST API — SDK'siz)
        const params = new URLSearchParams({
            "mode": "payment",
            "success_url": req.returnUrl ?? "https://forhumo.uz/pay?deposit=success",
            "cancel_url": req.returnUrl ?? "https://forhumo.uz/pay?deposit=cancel",
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": String(Math.round(req.amount * 100)),
            "line_items[0][price_data][product_data][name]": "ForHumo hamyon to'ldirish",
            "metadata[profileId]": req.profileId,
        });

        const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) return { status: "pending", providerRef: `stripe_error_${data?.error?.code ?? "unknown"}` };

        return { status: "redirect", redirectUrl: data.url, providerRef: data.id };
    },

    async createPayout(_req: PayoutRequestInput): Promise<PayoutResult> {
        // Stripe Payouts API mavjud, lekin tashqi (bank) account kerak.
        // Hozircha manual qayd — real payout keyingi bosqichda.
        return { status: "processing", providerRef: `stripe_payout_${Date.now()}` };
    },
};
