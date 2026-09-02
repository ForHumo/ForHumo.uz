// Nexus referral tizimi — foydalanuvchi taklif qilish bonusi.
// BN referral bilan bir xil pattern, lekin ijtimoiy platformaga moslashgan.
//
// Kod: username yoki humoId (username afzal).
// Aktivlash sharti: chaqirilgan foydalanuvchi Nexus'da BIRINCHI aktiv harakat qilsa
//   (post, comment, like, DM, jonli efir). Har qanday shu birinchi harakat trigger.
//
// Bonus:
//   Inviter — 10 000 so'm (WalletTransaction REWARD)
//   Invitee — 5 000 so'm

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const NX_REFERRAL_INVITER_BONUS = 10_000;
export const NX_REFERRAL_INVITEE_BONUS = 5_000;

function normalizeCode(code: string): string {
    return code.trim().toLowerCase().replace(/^@/, "");
}

export async function resolveNxInviter(code: string): Promise<{ id: string; username: string | null; humoId: string | null } | null> {
    const c = normalizeCode(code);
    if (c.length < 3) return null;
    const byU = await prisma.userProfile.findUnique({
        where: { username: c }, select: { id: true, username: true, humoId: true },
    });
    if (byU) return byU;
    return prisma.userProfile.findFirst({
        where: { humoId: c.toUpperCase() }, select: { id: true, username: true, humoId: true },
    });
}

/** Nexus username tanlanganda (yoki keyinroq trigger'da) referral yozib qo'yish. */
export async function attachNxReferral(inviteeId: string, code: string | null | undefined): Promise<boolean> {
    if (!code || !inviteeId) return false;
    try {
        const inviter = await resolveNxInviter(code);
        if (!inviter || inviter.id === inviteeId) return false;
        const exists = await prisma.nexusReferral.findUnique({ where: { inviteeId }, select: { id: true } });
        if (exists) return false;
        await prisma.nexusReferral.create({
            data: { inviterId: inviter.id, inviteeId, status: "PENDING" },
        });
        return true;
    } catch { return false; }
}

/** Foydalanuvchi Nexus'da birinchi aktiv harakat qilganda ikkisiga bonus.
 *  Idempotent — takroriy chaqirsangiz zarar bermaydi (status PENDING bo'lmasa jim). */
export async function awardNxReferralOnFirstAction(actorId: string): Promise<{ awarded: boolean; reason?: string }> {
    try {
        const ref = await prisma.nexusReferral.findUnique({
            where: { inviteeId: actorId },
            select: { id: true, status: true, inviterId: true },
        });
        if (!ref) return { awarded: false, reason: "no-referral" };
        if (ref.status !== "PENDING") return { awarded: false, reason: "already-processed" };

        const currency = "UZS";
        const inviterWallet = await prisma.wallet.upsert({
            where: { profileId: ref.inviterId },
            create: { profileId: ref.inviterId, balance: new Prisma.Decimal(0), currency },
            update: {},
            select: { id: true, balance: true },
        });
        const inviteeWallet = await prisma.wallet.upsert({
            where: { profileId: actorId },
            create: { profileId: actorId, balance: new Prisma.Decimal(0), currency },
            update: {},
            select: { id: true, balance: true },
        });

        const inviterAfter = new Prisma.Decimal(inviterWallet.balance).plus(NX_REFERRAL_INVITER_BONUS);
        const inviteeAfter = new Prisma.Decimal(inviteeWallet.balance).plus(NX_REFERRAL_INVITEE_BONUS);

        await prisma.$transaction([
            prisma.wallet.update({ where: { id: inviterWallet.id }, data: { balance: inviterAfter } }),
            prisma.walletTransaction.create({
                data: {
                    walletId: inviterWallet.id, type: "REWARD",
                    amount: new Prisma.Decimal(NX_REFERRAL_INVITER_BONUS),
                    currency, balanceAfter: inviterAfter,
                    description: "Nexus do'st chaqirish bonusi",
                    ref: `nxref:${ref.id}:inviter`,
                },
            }),
            prisma.wallet.update({ where: { id: inviteeWallet.id }, data: { balance: inviteeAfter } }),
            prisma.walletTransaction.create({
                data: {
                    walletId: inviteeWallet.id, type: "REWARD",
                    amount: new Prisma.Decimal(NX_REFERRAL_INVITEE_BONUS),
                    currency, balanceAfter: inviteeAfter,
                    description: "Nexus'ga xush kelibsiz bonusi",
                    ref: `nxref:${ref.id}:invitee`,
                },
            }),
            prisma.nexusReferral.update({
                where: { id: ref.id },
                data: { status: "REWARDED", rewardedAt: new Date() },
            }),
        ]);

        return { awarded: true };
    } catch (e) {
        console.error("[nexus-referral] award failed", e);
        return { awarded: false, reason: "error" };
    }
}

/** Referral statistikasi (kabinet uchun). */
export async function getNxReferralStats(inviterId: string) {
    const [pending, rewarded, totalEarned] = await Promise.all([
        prisma.nexusReferral.count({ where: { inviterId, status: "PENDING" } }),
        prisma.nexusReferral.count({ where: { inviterId, status: "REWARDED" } }),
        prisma.walletTransaction.aggregate({
            where: { walletId: { in: [] }, ref: { startsWith: "nxref:" } },
            _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: 0 } })),
    ]);
    void totalEarned;
    return {
        pending,
        rewarded,
        earned: rewarded * NX_REFERRAL_INVITER_BONUS,
    };
}
