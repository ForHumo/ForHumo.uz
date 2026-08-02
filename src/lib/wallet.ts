// Hamyon yordamchilari — valyuta foydalanuvchi davlatidan kelib chiqadi.
import { prisma } from "@/lib/prisma";
import { currencyForCountry, type Currency } from "@/lib/money";

export function walletCurrency(w: { currency: string }): Currency {
    return w.currency === "USD" ? "USD" : "UZS";
}

// Hamyonni topadi yoki yaratadi (yangi hamyon valyutasi davlatdan).
export async function getOrCreateWallet(profileId: string, country?: string | null) {
    const existing = await prisma.wallet.findUnique({ where: { profileId } });
    if (existing) return existing;
    return prisma.wallet.create({ data: { profileId, currency: currencyForCountry(country) } });
}

// tx — interaktiv tranzaksiya klienti yoki global prisma bilan ishlaydigan variant.
export async function getOrCreateWalletTx(
    tx: { wallet: { findUnique: typeof prisma.wallet.findUnique; create: typeof prisma.wallet.create } },
    profileId: string,
    country?: string | null,
) {
    const existing = await tx.wallet.findUnique({ where: { profileId } });
    if (existing) return existing;
    return tx.wallet.create({ data: { profileId, currency: currencyForCountry(country) } });
}
