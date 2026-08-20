// BN referral tizimi — marketing viralligi.
//
// Oqim:
//   1. Foydalanuvchi kabinet'da o'z linkini oladi: bozornarxida.uz/r/<code>
//      code = username yoki humoId (username afzal).
//   2. Yangi tashrifchi shu linkdan kirsa /r/[code]/page.tsx bosh sahifaga
//      redirect qiladi (?ref=code bilan) — captureFromLocation ushlaydi.
//   3. Signup paytida (Nexus username yoki BN checkout) attachReferralOnSignup()
//      chaqiriladi — BnReferral PENDING yaratiladi.
//   4. Chaqirilgan foydalanuvchi birinchi COMPLETED buyurtma qilsa
//      awardReferralOnFirstCompleted() ikkisiga bonus (WalletTransaction REWARD).
//
// Bonus qiymatlari:
//   Chaqiruvchi — 10 000 so'm (asosiy motivatsiya)
//   Chaqirilgan —  5 000 so'm (birinchi xarid uchun rag'bat)

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { grantAchievement } from "@/lib/achievements";

export const REFERRAL_INVITER_BONUS = 10_000;
export const REFERRAL_INVITEE_BONUS = 5_000;

function normalizeCode(code: string): string {
    return code.trim().toLowerCase().replace(/^@/, "");
}

/** Kod bo'yicha chaqiruvchi profilni topish. Avval username, keyin humoId. */
export async function resolveReferralInviter(code: string): Promise<{ id: string; username: string | null; humoId: string | null } | null> {
    const c = normalizeCode(code);
    if (c.length < 3) return null;
    const byU = await prisma.userProfile.findUnique({
        where: { username: c },
        select: { id: true, username: true, humoId: true },
    });
    if (byU) return byU;
    const byH = await prisma.userProfile.findFirst({
        where: { humoId: c.toUpperCase() },
        select: { id: true, username: true, humoId: true },
    });
    return byH;
}

/** Ulashiladigan referral kod (username afzal, aks holda humoId). */
export function preferredReferralCode(u: { username: string | null; humoId: string | null }): string | null {
    return u.username || u.humoId || null;
}

/** Signup paytida BnReferral yaratish. Fail-safe. */
export async function attachReferralOnSignup(
    inviteeId: string,
    code: string | null | undefined,
): Promise<boolean> {
    if (!code || !inviteeId) return false;
    try {
        const c = normalizeCode(code);
        const inviter = await resolveReferralInviter(c);
        if (!inviter) return false;
        if (inviter.id === inviteeId) return false;                 // o'z-o'zini chaqirish
        const exists = await prisma.bnReferral.findUnique({ where: { inviteeId }, select: { id: true } });
        if (exists) return false;
        await prisma.bnReferral.create({
            data: {
                inviterId: inviter.id,
                inviteeId,
                code: c,
                status: "PENDING",
                inviterReward: REFERRAL_INVITER_BONUS,
                inviteeReward: REFERRAL_INVITEE_BONUS,
            },
        });
        return true;
    } catch { return false; }
}

/** Xaridor birinchi COMPLETED buyurtma qilganda ikkisiga bonus (REWARD). */
export async function awardReferralOnFirstCompleted(
    buyerId: string,
    orderId: string,
): Promise<{ awarded: boolean; reason?: string }> {
    try {
        const ref = await prisma.bnReferral.findUnique({
            where: { inviteeId: buyerId },
            select: { id: true, status: true, inviterId: true, inviterReward: true, inviteeReward: true },
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
            where: { profileId: buyerId },
            create: { profileId: buyerId, balance: new Prisma.Decimal(0), currency },
            update: {},
            select: { id: true, balance: true },
        });

        const inviterAfter = new Prisma.Decimal(inviterWallet.balance).plus(ref.inviterReward);
        const inviteeAfter = new Prisma.Decimal(inviteeWallet.balance).plus(ref.inviteeReward);

        await prisma.$transaction([
            prisma.wallet.update({
                where: { id: inviterWallet.id },
                data: { balance: inviterAfter },
            }),
            prisma.walletTransaction.create({
                data: {
                    walletId: inviterWallet.id,
                    type: "REWARD",
                    amount: new Prisma.Decimal(ref.inviterReward),
                    currency,
                    balanceAfter: inviterAfter,
                    description: `Do'st chaqirdingiz — birinchi buyurtma bonus`,
                    ref: `bnref:${ref.id}:inviter`,
                },
            }),
            prisma.wallet.update({
                where: { id: inviteeWallet.id },
                data: { balance: inviteeAfter },
            }),
            prisma.walletTransaction.create({
                data: {
                    walletId: inviteeWallet.id,
                    type: "REWARD",
                    amount: new Prisma.Decimal(ref.inviteeReward),
                    currency,
                    balanceAfter: inviteeAfter,
                    description: `Referral bo'yicha birinchi xarid bonusi`,
                    ref: `bnref:${ref.id}:invitee`,
                },
            }),
            prisma.bnReferral.update({
                where: { id: ref.id },
                data: { status: "REWARDED", rewardOrderId: orderId, rewardedAt: new Date() },
            }),
        ]);

        // Yutuqlar (fail-safe)
        await grantAchievement(ref.inviterId, "bn.first_referral");
        await grantAchievement(buyerId, "bn.first_order");
        // 10 REWARDED yig'ilganda — BN elchi gold
        const inviterCount = await prisma.bnReferral.count({
            where: { inviterId: ref.inviterId, status: "REWARDED" },
        });
        if (inviterCount >= 10) await grantAchievement(ref.inviterId, "bn.referral_10");

        return { awarded: true };
    } catch (e) {
        console.error("[bn-referral] award failed", e);
        return { awarded: false, reason: "error" };
    }
}

/** Kabinet ekrani uchun referral statistikasi. */
export async function getReferralStats(inviterId: string): Promise<{
    code: string | null;
    pending: number;
    rewarded: number;
    totalEarned: number;
}> {
    const [profile, groups] = await Promise.all([
        prisma.userProfile.findUnique({
            where: { id: inviterId },
            select: { username: true, humoId: true },
        }),
        prisma.bnReferral.groupBy({
            by: ["status"],
            where: { inviterId },
            _count: { _all: true },
            _sum: { inviterReward: true },
        }),
    ]);
    let pending = 0, rewarded = 0, totalEarned = 0;
    for (const g of groups) {
        if (g.status === "PENDING")  pending  = g._count._all;
        if (g.status === "REWARDED") { rewarded = g._count._all; totalEarned = g._sum.inviterReward ?? 0; }
    }
    return {
        code: profile ? preferredReferralCode(profile) : null,
        pending,
        rewarded,
        totalEarned,
    };
}

/** Share URL (bozornarxida.uz/r/<code>) — UTM bilan. */
export function buildReferralUrl(code: string, source: "telegram" | "whatsapp" | "copy" | "sms" = "copy"): string {
    const c = normalizeCode(code);
    const url = new URL(`https://bozornarxida.uz/r/${c}`);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "friend_invite");
    return url.toString();
}
