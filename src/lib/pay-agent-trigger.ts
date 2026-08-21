// @pay_agent — For Pay tranzaksiyalari haqida foydalanuvchiga DM.
// Deposit, withdraw, transfer_in — barchasi agent xabari sifatida keladi.

import { prisma } from "@/lib/prisma";
import { sendAgentDM } from "@/lib/nexus-agent-send";
import { formatMoney } from "@/lib/money";

type PayEvent =
    | { kind: "deposit"; profileId: string; amount: number; currency: "UZS" | "USD"; ref?: string }
    | { kind: "withdraw"; profileId: string; amount: number; currency: "UZS" | "USD"; ref?: string }
    | { kind: "transfer_in"; profileId: string; amount: number; currency: "UZS" | "USD"; fromUsername?: string | null; note?: string | null }
    | { kind: "sale"; profileId: string; amount: number; currency: "UZS" | "USD"; description?: string | null }
    | { kind: "refund"; profileId: string; amount: number; currency: "UZS" | "USD"; description?: string | null };

export async function triggerPayAgentDM(ev: PayEvent): Promise<void> {
    try {
        let title = "";
        let body = "";
        const amount = formatMoney(ev.amount, ev.currency);
        switch (ev.kind) {
            case "deposit":
                title = `Hisob to'ldirildi: ${amount}`;
                body = "For Pay hamyoningizga muvaffaqiyatli tushdi.";
                break;
            case "withdraw":
                title = `Yechildi: ${amount}`;
                body = "For Pay'dan mablag' yechildi.";
                break;
            case "transfer_in":
                title = `Sizga o'tkazma: ${amount}`;
                body = ev.fromUsername
                    ? `@${ev.fromUsername}${ev.note ? ` — "${ev.note}"` : ""}`
                    : "Sizga pul tushdi.";
                break;
            case "sale":
                title = `Sotuv: ${amount}`;
                body = ev.description ?? "Mahsulotingiz sotildi.";
                break;
            case "refund":
                title = `Qaytarildi: ${amount}`;
                body = ev.description ?? "Buyurtma bekor qilingani uchun qaytarildi.";
                break;
        }

        await sendAgentDM({
            agentUsername: "pay",
            toProfileId: ev.profileId,
            kind: "pay-tx",
            payload: {
                kind: "generic",
                title,
                body,
                amount: ev.amount,
                currency: ev.currency,
            },
        });
    } catch (e) {
        console.error("triggerPayAgentDM failed:", e);
    }
}

// Convenience wrapper: yaqinda yaratilgan WalletTransaction'dan avtomatik chaqirish
export async function triggerPayAgentForTransaction(txId: string): Promise<void> {
    try {
        const tx = await prisma.walletTransaction.findUnique({
            where: { id: txId },
            include: { wallet: { select: { profileId: true, currency: true } } },
        });
        if (!tx) return;
        const currency = (tx.currency ?? tx.wallet.currency ?? "UZS") as "UZS" | "USD";
        const amount = Number(tx.amount);
        const profileId = tx.wallet.profileId;
        switch (tx.type) {
            case "DEPOSIT":
                await triggerPayAgentDM({ kind: "deposit", profileId, amount, currency, ref: tx.ref ?? undefined });
                break;
            case "WITHDRAW":
                await triggerPayAgentDM({ kind: "withdraw", profileId, amount, currency, ref: tx.ref ?? undefined });
                break;
            case "TRANSFER_IN":
                await triggerPayAgentDM({ kind: "transfer_in", profileId, amount, currency, note: tx.description });
                break;
            case "SALE":
                await triggerPayAgentDM({ kind: "sale", profileId, amount, currency, description: tx.description });
                break;
            case "REFUND":
                await triggerPayAgentDM({ kind: "refund", profileId, amount, currency, description: tx.description });
                break;
        }
    } catch (e) {
        console.error("triggerPayAgentForTransaction failed:", e);
    }
}
