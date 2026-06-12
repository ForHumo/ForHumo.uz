// Test to'lov provideri — real pul harakatlanmaydi. Deposit darhol "tushdi",
// payout darhol "bajarildi". Real shlyuz kelguncha standart.

import type { Currency } from "@/lib/money";
import type { PaymentProvider, DepositRequest, DepositResult, PayoutRequestInput, PayoutResult } from "./types";

export const testProvider: PaymentProvider = {
    id: "test",
    live: false,
    supports(_currency: Currency) { return true; },
    async createDeposit(_req: DepositRequest): Promise<DepositResult> {
        return { status: "completed", providerRef: `test_${Date.now()}` };
    },
    async createPayout(_req: PayoutRequestInput): Promise<PayoutResult> {
        return { status: "completed", providerRef: `test_${Date.now()}` };
    },
};
