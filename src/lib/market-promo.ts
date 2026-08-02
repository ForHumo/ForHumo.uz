import { prisma } from "@/lib/prisma";

export interface PromoResult {
    error?: string;
    discount?: number;
    promoId?: string;
    code?: string;
}

// Promokodni tekshiradi va chegirma summasini hisoblaydi (subtotal — chegirmasiz summa)
export async function validatePromo(rawCode: string, subtotal: number): Promise<PromoResult> {
    const code = (rawCode || "").trim().toUpperCase();
    if (!code) return { error: "Promokod kiriting" };

    const promo = await prisma.marketPromoCode.findUnique({ where: { code } });
    if (!promo || !promo.active) return { error: "Promokod topilmadi" };
    if (promo.expiresAt && promo.expiresAt < new Date()) return { error: "Promokod muddati tugagan" };
    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) return { error: "Promokod limiti tugagan" };
    if (subtotal < Number(promo.minOrder))
        return { error: `Minimal buyurtma summasi: ${Number(promo.minOrder).toLocaleString()} so'm` };

    let discount = promo.type === "PERCENT"
        ? (subtotal * Number(promo.value)) / 100
        : Number(promo.value);
    if (promo.maxDiscount != null) discount = Math.min(discount, Number(promo.maxDiscount));
    discount = Math.min(discount, subtotal);
    discount = Math.round(discount * 100) / 100;

    return { discount, promoId: promo.id, code };
}
