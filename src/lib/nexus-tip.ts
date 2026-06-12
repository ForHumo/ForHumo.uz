// Nexus tip / donat — atomik real-pul transfer (donor → ijodkor, komissiyasiz).
// Donor o'z valyutasida yuboradi; ijodkor o'z valyutasida (kerak bo'lsa FX konvert) oladi.
// Video xarididagi $transaction pattern bilan bir xil. Super Chat ham shundan foydalanadi.

import { prisma } from "@/lib/prisma";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";

export type TipResult = "ok" | "no_funds" | "self" | "invalid";
export type TipTarget = "PROFILE" | "POST" | "VIDEO" | "LIVE";

export const TIP_MIN = 1;

function cur(c: string): Currency { return c === "USD" ? "USD" : "UZS"; }

export async function sendTip(opts: {
    donorId: string;
    recipientId: string;
    amountZij: number;              // donor valyutasidagi miqdor
    targetType: TipTarget;
    targetId?: string | null;
    message?: string | null;
    recipientCountry?: string | null;  // ijodkor hamyoni yo'q bo'lsa valyuta uchun
}): Promise<{ result: TipResult; tipId?: string; received?: number }> {
    const amount = Math.round(Number(opts.amountZij));
    if (!Number.isFinite(amount) || amount < TIP_MIN) return { result: "invalid" };
    if (!opts.recipientId) return { result: "invalid" };
    if (opts.donorId === opts.recipientId) return { result: "self" };

    try {
        return await prisma.$transaction(async tx => {
            const wallet = await tx.zijWallet.findUnique({ where: { profileId: opts.donorId } });
            const dCur = cur(wallet?.currency ?? "UZS");
            const bal = Number(wallet?.balance ?? 0);
            if (!wallet || bal < amount) return { result: "no_funds" as const };

            // Donor — TRANSFER_OUT (donor valyutasida)
            const newDonorBal = roundMoney(bal - amount, dCur);
            await tx.zijWallet.update({ where: { id: wallet.id }, data: { balance: newDonorBal } });
            await tx.zijTransaction.create({
                data: { walletId: wallet.id, type: "TRANSFER_OUT", amount, currency: dCur, balanceAfter: newDonorBal, description: "Nexus qo'llab-quvvatlash (tip)", ref: opts.targetId ?? opts.recipientId },
            });

            // Ijodkor — TRANSFER_IN (o'z valyutasiga konvert; hamyon bo'lmasa yaratiladi)
            let aw = await tx.zijWallet.findUnique({ where: { profileId: opts.recipientId } });
            if (!aw) aw = await tx.zijWallet.create({ data: { profileId: opts.recipientId, currency: currencyForCountry(opts.recipientCountry) } });
            const rCur = cur(aw.currency);
            const received = convert(amount, dCur, rCur);
            const newRecBal = roundMoney(Number(aw.balance) + received, rCur);
            await tx.zijWallet.update({ where: { id: aw.id }, data: { balance: newRecBal } });
            await tx.zijTransaction.create({
                data: { walletId: aw.id, type: "TRANSFER_IN", amount: received, currency: rCur, balanceAfter: newRecBal, description: "Nexus tip (qo'llab-quvvatlash daromadi)", ref: opts.targetId ?? opts.donorId },
            });

            const tip = await tx.nexusTip.create({
                data: {
                    donorId: opts.donorId, recipientId: opts.recipientId, amountZij: received,  // ijodkor olgan miqdor (uning valyutasida)
                    targetType: opts.targetType, targetId: opts.targetId ?? null,
                    message: typeof opts.message === "string" && opts.message.trim() ? opts.message.trim().slice(0, 200) : null,
                },
            });
            return { result: "ok" as const, tipId: tip.id, received };
        });
    } catch {
        return { result: "invalid" };
    }
}
