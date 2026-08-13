// GET /api/cron/dm-schedule-flush — jadvalga qo'yilgan DM xabarlarni faollashtiradi.
// Muddati kelgan xabarlar uchun: scheduledFor -> null (endi ko'rinadi) +
// suhbat lastMessageAt/lastMessageText yangilanadi.
// Vercel Hobby cron faqat kunlik ishlaydi — kunlik 03:00'da eng yaqin sanaga tozalab qo'yadi.
// Xato: agar foydalanuvchi soatlik aniqlik xohlasa MChJ ochilib Pro rejasi kerak.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PREVIEW_LABELS: Record<string, string> = {
    image: "Rasm", video: "Video", audio: "Ovozli xabar", file: "Fayl",
    "video-circle": "Dumaloq video", location: "Joylashuv", poll: "So'rovnoma",
};

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") != null;
    if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // Muddati kelgan barcha jadvalli xabarlar
    const due = await prisma.nexusMessage.findMany({
        where: { scheduledFor: { lte: now, not: null } },
        select: { id: true, conversationId: true, senderId: true, text: true, mediaType: true, createdAt: true },
    });
    if (due.length === 0) return NextResponse.json({ activated: 0 });

    // Har bir xabar uchun: scheduledFor -> null, createdAt -> hozir
    // Suhbat lastMessage* — eng yangi (createdAt eng katta) xabar bo'yicha
    // Bir suhbatda bir necha jadvalli xabar bo'lishi mumkin — hammasini activatelaymiz,
    // preview esa oxirgisi bo'yicha
    const byConv = new Map<string, typeof due>();
    for (const m of due) {
        if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
        byConv.get(m.conversationId)!.push(m);
    }

    let count = 0;
    for (const [convId, items] of byConv) {
        // Activate: scheduledFor -> null + createdAt -> hozir (ular chatga hozirgi vaqtda tushsin)
        for (const m of items) {
            await prisma.nexusMessage.update({
                where: { id: m.id },
                data: { scheduledFor: null, createdAt: now },
            });
            count++;
        }
        // Suhbat preview'ini oxirgisi bo'yicha yangilash
        const last = items[items.length - 1];
        const preview = last.text
            || (last.mediaType ? (PREVIEW_LABELS[last.mediaType] ?? "Media") : "")
            || "...";
        const conv = await prisma.nexusConversation.findUnique({ where: { id: convId } });
        if (!conv) continue;
        const isSender1 = conv.user1Id === last.senderId;
        await prisma.nexusConversation.update({
            where: { id: convId },
            data: {
                lastMessageAt: now,
                lastMessageText: preview.slice(0, 120),
                lastSenderId: last.senderId,
                // O'z-o'zi uchun o'qildi; boshqa tomon uchun o'qilmagan
                ...(isSender1 ? { user1ReadAt: now } : { user2ReadAt: now }),
            },
        });
    }

    return NextResponse.json({ activated: count });
}
