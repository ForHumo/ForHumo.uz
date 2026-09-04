// Belis × For Pay integratsiya — hamyondan escrow bilan to'lov.
//
// Escrow modeli:
//   1. Ariza yaratilganda (WALLET tanlansa) mijoz hamyonidan ijara + zaklat
//      TRANSFER_OUT (hold) sifatida chegiriladi. balanceAfter to'liq yozib qo'yiladi.
//   2. Pickup vaqtida ijara @sevinch hamyoniga SALE sifatida o'tkaziladi.
//   3. RETURNED_OK — zaklat mijozga REFUND sifatida qaytariladi.
//   4. RETURNED_DAMAGE — jarima @sevinch ga FINE (TRANSFER_IN) va qolgan zaklat mijozga qaytadi.
//   5. Cancel (REQUESTED yoki CONFIRMED holatida) — hold qaytariladi.
//
// Sevinch opa profileId — Belis egasi (memory'da @sevinch). Barcha ijara/zarar
// pullari uning hamyoniga tushadi.
//
// MUHIM: idempotentlik ref bo'yicha (WalletTransaction.walletId + ref unique).

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getOrCreateWalletTx } from "@/lib/wallet";

const SEVINCH_USERNAME = "sevinch";

/** Belis egasining hamyoni. */
async function getSevinchWallet(
    tx: Prisma.TransactionClient,
): Promise<{ walletId: string; profileId: string; currency: string } | null> {
    const sevinch = await tx.userProfile.findUnique({
        where: { username: SEVINCH_USERNAME },
        select: { id: true, country: true },
    });
    if (!sevinch) return null;
    const w = await getOrCreateWalletTx(tx, sevinch.id, sevinch.country);
    return { walletId: w.id, profileId: sevinch.id, currency: w.currency };
}

/** Hamyon balansi + valyuta olish (foydalanuvchi wallet'i yaratiladi agar yo'q bo'lsa). */
export async function getWalletSnapshot(profileId: string) {
    const p = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { country: true },
    });
    if (!p) return null;
    const { getOrCreateWallet } = await import("@/lib/wallet");
    const w = await getOrCreateWallet(profileId, p.country);
    return {
        walletId: w.id,
        balance: Number(w.balance),
        currency: w.currency,
    };
}

interface HoldInput {
    bookingId: string;
    bookingCode: string;
    buyerProfileId: string;
    rentTotal: number;   // butun so'mda (UZS integer)
    deposit: number;     // butun so'mda
}

export interface HoldResult {
    ok: boolean;
    error?: "wallet_not_found" | "insufficient_balance" | "internal" | "sevinch_missing";
    required?: number;
    balance?: number;
    currency?: string;
}

/**
 * Ijara + zaklat summasini xaridor hamyonidan bloklab (escrow) oladi.
 * WalletTransaction TRANSFER_OUT bilan (ref = belis:hold:CODE).
 * Test rejim uchun ham ishlaydi (deposit instant → balans yetadi).
 */
export async function holdBookingFunds(input: HoldInput): Promise<HoldResult> {
    const required = input.rentTotal + input.deposit;
    if (required <= 0) return { ok: false, error: "internal" };

    try {
        return await prisma.$transaction(async tx => {
            const buyer = await tx.userProfile.findUnique({
                where: { id: input.buyerProfileId },
                select: { country: true },
            });
            if (!buyer) return { ok: false as const, error: "wallet_not_found" as const };
            const w = await getOrCreateWalletTx(tx, input.buyerProfileId, buyer.country);
            const balance = Number(w.balance);
            if (balance < required) {
                return {
                    ok: false as const, error: "insufficient_balance" as const,
                    required, balance, currency: w.currency,
                };
            }
            const newBalance = balance - required;
            await tx.wallet.update({
                where: { id: w.id },
                data: { balance: newBalance },
            });
            const ref = `belis:hold:${input.bookingCode}`;
            await tx.walletTransaction.create({
                data: {
                    walletId: w.id,
                    type: "TRANSFER_OUT",
                    amount: required,
                    currency: w.currency,
                    balanceAfter: newBalance,
                    description: `Belis ijara + zaklat (escrow) #${input.bookingCode}`,
                    ref,
                },
            });
            await tx.belisRentalBooking.update({
                where: { id: input.bookingId },
                data: {
                    paymentMethod: "WALLET",
                    walletCurrency: w.currency,
                    holdTxRef: ref,
                    paidRent: input.rentTotal,
                    paidDeposit: input.deposit,
                },
            });
            return { ok: true as const, currency: w.currency };
        });
    } catch (e) {
        console.error("holdBookingFunds failed:", e);
        return { ok: false, error: "internal" };
    }
}

interface SettleInput {
    bookingId: string;
    bookingCode: string;
    buyerProfileId: string;
    rentAmount: number;   // @sevinch ga o'tadigan ijara
}

/**
 * Pickup vaqtida — ijara @sevinch hamyoniga SALE sifatida o'tadi.
 * Xaridor hamyonidan hech narsa yechilmaydi (allaqachon hold'ga chegirilgan).
 * Faqat @sevinch tomonida balans oshadi + audit log.
 */
export async function settleBookingRent(input: SettleInput): Promise<{ ok: boolean; error?: string }> {
    try {
        return await prisma.$transaction(async tx => {
            const booking = await tx.belisRentalBooking.findUnique({
                where: { id: input.bookingId },
                select: { paymentMethod: true, settleTxRef: true, walletCurrency: true },
            });
            if (!booking || booking.paymentMethod !== "WALLET") {
                return { ok: true }; // cash — payment logic yo'q
            }
            if (booking.settleTxRef) return { ok: true }; // idempotent

            const sevinch = await getSevinchWallet(tx);
            if (!sevinch) return { ok: false, error: "sevinch_missing" };

            const currency = booking.walletCurrency ?? sevinch.currency;
            // Valyuta mos kelmasa: hozircha bir xil deb hisoblaymiz (kelajakda FX)
            const sw = await tx.wallet.findUnique({ where: { id: sevinch.walletId } });
            if (!sw) return { ok: false, error: "sevinch_missing" };
            const newBal = Number(sw.balance) + input.rentAmount;
            await tx.wallet.update({
                where: { id: sw.id },
                data: { balance: newBal },
            });
            const ref = `belis:settle:${input.bookingCode}`;
            await tx.walletTransaction.create({
                data: {
                    walletId: sw.id,
                    type: "SALE",
                    amount: input.rentAmount,
                    currency,
                    balanceAfter: newBal,
                    description: `Belis ijara daromadi #${input.bookingCode}`,
                    ref,
                },
            });
            await tx.belisRentalBooking.update({
                where: { id: input.bookingId },
                data: { settleTxRef: ref },
            });
            return { ok: true };
        });
    } catch (e) {
        console.error("settleBookingRent failed:", e);
        return { ok: false, error: "internal" };
    }
}

interface ReturnInput {
    bookingId: string;
    bookingCode: string;
    buyerProfileId: string;
    depositAmount: number;   // zaklat (asl)
    fineAmount: number;      // jarima (RETURNED_DAMAGE bo'lsa)
}

/**
 * RETURNED_OK — zaklat to'liq mijozga qaytadi.
 * RETURNED_DAMAGE — zaklatdan jarima chiqarilib, qolgani qaytadi.
 * Jarima summasi @sevinch hamyoniga o'tadi.
 */
export async function refundBookingDeposit(input: ReturnInput): Promise<{ ok: boolean; refundedToBuyer: number; sentToSevinch: number; error?: string }> {
    const refund = Math.max(0, input.depositAmount - input.fineAmount);
    const fine = Math.min(input.depositAmount, Math.max(0, input.fineAmount));

    try {
        return await prisma.$transaction(async tx => {
            const booking = await tx.belisRentalBooking.findUnique({
                where: { id: input.bookingId },
                select: { paymentMethod: true, refundTxRef: true, fineTxRef: true, walletCurrency: true },
            });
            if (!booking || booking.paymentMethod !== "WALLET") {
                return { ok: true, refundedToBuyer: 0, sentToSevinch: 0 };
            }
            const currency = booking.walletCurrency ?? "UZS";

            // 1. Xaridorga qaytarish
            if (refund > 0 && !booking.refundTxRef) {
                const buyer = await tx.userProfile.findUnique({
                    where: { id: input.buyerProfileId }, select: { country: true },
                });
                if (buyer) {
                    const bw = await getOrCreateWalletTx(tx, input.buyerProfileId, buyer.country);
                    const newBal = Number(bw.balance) + refund;
                    await tx.wallet.update({ where: { id: bw.id }, data: { balance: newBal } });
                    const ref = `belis:refund:${input.bookingCode}`;
                    await tx.walletTransaction.create({
                        data: {
                            walletId: bw.id, type: "REFUND",
                            amount: refund, currency, balanceAfter: newBal,
                            description: `Belis zaklat qaytishi #${input.bookingCode}`,
                            ref,
                        },
                    });
                    await tx.belisRentalBooking.update({
                        where: { id: input.bookingId }, data: { refundTxRef: ref, refundedUzs: refund },
                    });
                }
            }

            // 2. Sevinch ga jarima
            if (fine > 0 && !booking.fineTxRef) {
                const sevinch = await getSevinchWallet(tx);
                if (sevinch) {
                    const sw = await tx.wallet.findUnique({ where: { id: sevinch.walletId } });
                    if (sw) {
                        const newBal = Number(sw.balance) + fine;
                        await tx.wallet.update({ where: { id: sw.id }, data: { balance: newBal } });
                        const ref = `belis:fine:${input.bookingCode}`;
                        await tx.walletTransaction.create({
                            data: {
                                walletId: sw.id, type: "TRANSFER_IN",
                                amount: fine, currency, balanceAfter: newBal,
                                description: `Belis jarima #${input.bookingCode}`,
                                ref,
                            },
                        });
                        await tx.belisRentalBooking.update({
                            where: { id: input.bookingId }, data: { fineTxRef: ref, fineUzs: fine },
                        });
                    }
                }
            }

            return { ok: true, refundedToBuyer: refund, sentToSevinch: fine };
        });
    } catch (e) {
        console.error("refundBookingDeposit failed:", e);
        return { ok: false, refundedToBuyer: 0, sentToSevinch: 0, error: "internal" };
    }
}

/**
 * Bekor qilinganda — hold to'liq qaytariladi (ijara + zaklat).
 * Faqat hech qanday settle yoki refund bo'lmagan bo'lsa.
 */
export async function releaseBookingHold(input: {
    bookingId: string;
    bookingCode: string;
    buyerProfileId: string;
    rentTotal: number;
    deposit: number;
}): Promise<{ ok: boolean; released: number }> {
    const total = input.rentTotal + input.deposit;
    if (total <= 0) return { ok: true, released: 0 };

    try {
        return await prisma.$transaction(async tx => {
            const booking = await tx.belisRentalBooking.findUnique({
                where: { id: input.bookingId },
                select: { paymentMethod: true, holdTxRef: true, settleTxRef: true, refundTxRef: true, walletCurrency: true },
            });
            if (!booking || booking.paymentMethod !== "WALLET") return { ok: true, released: 0 };
            if (!booking.holdTxRef) return { ok: true, released: 0 };   // hold yo'q edi
            if (booking.settleTxRef || booking.refundTxRef) return { ok: true, released: 0 }; // allaqachon settle
            const currency = booking.walletCurrency ?? "UZS";

            const buyer = await tx.userProfile.findUnique({
                where: { id: input.buyerProfileId }, select: { country: true },
            });
            if (!buyer) return { ok: false as const, released: 0 };
            const bw = await getOrCreateWalletTx(tx, input.buyerProfileId, buyer.country);
            const newBal = Number(bw.balance) + total;
            await tx.wallet.update({ where: { id: bw.id }, data: { balance: newBal } });
            const ref = `belis:release:${input.bookingCode}`;
            await tx.walletTransaction.create({
                data: {
                    walletId: bw.id, type: "REFUND",
                    amount: total, currency, balanceAfter: newBal,
                    description: `Belis bekor qilindi — hold qaytishi #${input.bookingCode}`,
                    ref,
                },
            });
            await tx.belisRentalBooking.update({
                where: { id: input.bookingId },
                data: { refundTxRef: ref, refundedUzs: total },
            });
            return { ok: true, released: total };
        });
    } catch (e) {
        console.error("releaseBookingHold failed:", e);
        return { ok: false, released: 0 };
    }
}
