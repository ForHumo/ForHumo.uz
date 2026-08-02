// KYC yordamchilari — level cheklovlari + status tekshiruvi.

import type { Currency } from "@/lib/money";

// Katta summa chegarasi — undan ko'p yechish uchun L2 KYC majburiy
const KYC_L2_THRESHOLD_UZS = 10_000_000;   // 10M so'm
const KYC_L2_THRESHOLD_USD = 1_000;        // 1000 dollar

export function requiresKycL2(amount: number, currency: Currency): boolean {
    if (currency === "UZS") return amount >= KYC_L2_THRESHOLD_UZS;
    if (currency === "USD") return amount >= KYC_L2_THRESHOLD_USD;
    return false;
}

export const KYC_THRESHOLDS = { UZS: KYC_L2_THRESHOLD_UZS, USD: KYC_L2_THRESHOLD_USD };
