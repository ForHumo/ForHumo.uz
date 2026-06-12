// Hamyon yordamchilari — valyuta foydalanuvchi davlatidan kelib chiqadi.
import { prisma } from "@/lib/prisma";
import { currencyForCountry, type Currency } from "@/lib/money";

export function walletCurrency(w: { currency: string }): Currency {
    return w.currency === "USD" ? "USD" : "UZS";
}

// Hamyonni topadi yoki yaratadi (yangi hamyon valyutasi davlatdan).
export async function getOrCreateWallet(profileId: string, country?: string | null) {
    const existing = await prisma.zijWallet.findUnique({ where: { profileId } });
    if (existing) return existing;
    return prisma.zijWallet.create({ data: { profileId, currency: currencyForCountry(country) } });
}

// tx — interaktiv tranzaksiya klienti yoki global prisma bilan ishlaydigan variant.
export async function getOrCreateWalletTx(
    tx: { zijWallet: { findUnique: typeof prisma.zijWallet.findUnique; create: typeof prisma.zijWallet.create } },
    profileId: string,
    country?: string | null,
) {
    const existing = await tx.zijWallet.findUnique({ where: { profileId } });
    if (existing) return existing;
    return tx.zijWallet.create({ data: { profileId, currency: currencyForCountry(country) } });
}
