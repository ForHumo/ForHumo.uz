// Nexus tip / donat — atomik Zij transfer (donor → ijodkor, komissiyasiz).
// Video xarididagi $transaction pattern bilan bir xil. Super Chat ham shundan foydalanadi.

import { prisma } from "@/lib/prisma";

export type TipResult = "ok" | "no_funds" | "self" | "invalid";
export type TipTarget = "PROFILE" | "POST" | "VIDEO" | "LIVE";

export const TIP_MIN = 1;
export const TIP_MAX = 1_000_000;

export async function sendTip(opts: {
    donorId: string;
    recipientId: string;
    amountZij: number;
    targetType: TipTarget;
    targetId?: string | null;
    message?: string | null;
}): Promise<{ result: TipResult; tipId?: string }> {
    const amount = Math.round(Number(opts.amountZij));
    if (!Number.isFinite(amount) || amount < TIP_MIN || amount > TIP_MAX) return { result: "invalid" };
    if (!opts.recipientId) return { result: "invalid" };
    if (opts.donorId === opts.recipientId) return { result: "self" };

    try {
        return await prisma.$transaction(async tx => {
            const wallet = await tx.zijWallet.findUnique({ where: { profileId: opts.donorId } });
            const bal = Number(wallet?.balance ?? 0);
            if (!wallet || bal < amount) return { result: "no_funds" as const };

            // Donor — TRANSFER_OUT
            const newDonorBal = Math.round((bal - amount) * 100) / 100;
            await tx.zijWallet.update({ where: { id: wallet.id }, data: { balance: newDonorBal } });
            await tx.zijTransaction.create({
                data: { walletId: wallet.id, type: "TRANSFER_OUT", amount, balanceAfter: newDonorBal, description: "Nexus qo'llab-quvvatlash (tip)", ref: opts.targetId ?? opts.recipientId },
            });

            // Ijodkor — TRANSFER_IN (hamyon bo'lmasa yaratiladi)
            let aw = await tx.zijWallet.findUnique({ where: { profileId: opts.recipientId } });
            if (!aw) aw = await tx.zijWallet.create({ data: { profileId: opts.recipientId } });
            const newRecBal = Math.round((Number(aw.balance) + amount) * 100) / 100;
            await tx.zijWallet.update({ where: { id: aw.id }, data: { balance: newRecBal } });
            await tx.zijTransaction.create({
                data: { walletId: aw.id, type: "TRANSFER_IN", amount, balanceAfter: newRecBal, description: "Nexus tip (qo'llab-quvvatlash daromadi)", ref: opts.targetId ?? opts.donorId },
            });

            const tip = await tx.nexusTip.create({
                data: {
                    donorId: opts.donorId, recipientId: opts.recipientId, amountZij: amount,
                    targetType: opts.targetType, targetId: opts.targetId ?? null,
                    message: typeof opts.message === "string" && opts.message.trim() ? opts.message.trim().slice(0, 200) : null,
                },
            });
            return { result: "ok" as const, tipId: tip.id };
        });
    } catch {
        return { result: "invalid" };
    }
}
