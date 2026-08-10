// @market_agent DM'iga foydalanuvchi javob bergach (rasm/video/matn),
// avtomatik oxirgi ochiq "product-review" kartasidagi MarketReview'ga
// qo'shib qo'yamiz. Agar sharh mavjud emas — jimgina o'tkazib yuboradi
// (yulduz avval bosilishi kerak).

import { prisma } from "@/lib/prisma";

export async function appendUserReplyToOpenReview(input: {
    conversationId: string;
    senderId: string;      // xabar yuborgan foydalanuvchi
    text: string;
    mediaUrl: string | null;
    mediaType: string | null;
}): Promise<void> {
    try {
        // Suhbatdagi eng so'nggi agent-review xabarni topamiz (agentActionRef bor bo'lsa)
        const lastAgent = await prisma.nexusMessage.findFirst({
            where: {
                conversationId: input.conversationId,
                mediaType: "agent",
                agentKind: "product-review",
                agentActionRef: { not: null },
                senderId: { not: input.senderId },        // Agent tomonidan
            },
            orderBy: { createdAt: "desc" },
            select: { agentActionRef: true, createdAt: true },
        });
        if (!lastAgent?.agentActionRef) return;

        // Agent kartasidan keyin foydalanuvchi ushbu xabari kelgan bo'lishi kerak
        // (agent oldindan yozgan bo'lsa keyingi kelgan har qanday DM javob deb hisoblanadi)
        const review = await prisma.marketReview.findUnique({
            where: { id: lastAgent.agentActionRef },
            select: { id: true, text: true, media: true, profileId: true, productId: true },
        });
        if (!review || review.profileId !== input.senderId) return;

        // Yangi kontent yig'amiz
        const cleanText = (input.text ?? "").trim();
        const appendMedia: string[] = input.mediaUrl && (input.mediaType === "image" || input.mediaType === "video")
            ? [input.mediaUrl] : [];

        if (!cleanText && appendMedia.length === 0) return;

        const mergedMedia = [...new Set([...(review.media ?? []), ...appendMedia])].slice(0, 10);
        const mergedText = [review.text, cleanText].filter(Boolean).join("\n").slice(0, 3000);

        await prisma.marketReview.update({
            where: { id: review.id },
            data: { text: mergedText || null, media: mergedMedia },
        });
    } catch (e) {
        // Fail-safe: DM oqimini hech qachon buzmasin
        console.error("appendUserReplyToOpenReview failed:", e);
    }
}
