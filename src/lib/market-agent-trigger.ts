// Market order DELIVERED bo'lganida @market_agent tomonidan xaridorga DM yuborish.
// Har mahsulot uchun alohida "product-review" karta xabari.

import { prisma } from "@/lib/prisma";
import { sendAgentDM } from "@/lib/nexus-agent-send";
import { walletCurrency } from "@/lib/wallet";

export async function triggerMarketReviewRequest(orderId: string): Promise<void> {
    try {
        const order = await prisma.marketOrder.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, slug: true, name: true, images: true, price: true } },
                    },
                },
            },
        });
        if (!order) return;

        // Xaridorning valyutasini bilish (narxni to'g'ri ko'rsatish uchun)
        const wallet = await prisma.wallet.findUnique({
            where: { profileId: order.profileId }, select: { currency: true },
        });
        const currency = walletCurrency(wallet ?? { currency: "UZS" }) as "UZS" | "USD";

        for (const item of order.items) {
            // Bir mahsulotga faqat bir marta so'rov yuboriladi (dublikat bloki)
            const existing = await prisma.marketReview.findFirst({
                where: { productId: item.productId, profileId: order.profileId },
                select: { id: true },
            });
            if (existing) continue;

            await sendAgentDM({
                agentUsername: "market",
                toProfileId: order.profileId,
                kind: "product-review",
                payload: {
                    kind: "product-review",
                    productId: item.product.id,
                    productSlug: item.product.slug,
                    title: item.product.name,
                    image: item.product.images?.[0] ?? null,
                    price: Number(item.price ?? item.product.price),
                    currency,
                    orderId: order.id,
                    requestedRating: true,
                    body: `"${item.product.name}" — fikringizni bildiring. Yulduzni bosing va rasm/video/matn bilan sharh qoldiring.`,
                },
            });
        }
    } catch (e) {
        console.error("triggerMarketReviewRequest failed:", e);
    }
}
