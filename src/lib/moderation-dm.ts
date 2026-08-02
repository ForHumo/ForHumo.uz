// AI moderation — Nexus DM uchun kontekst-aware layer.
// moderateContent'ni chaqiradi, munosabat balliga qarab qaror qabul qiladi,
// zarur bo'lsa ban issue qiladi.
//
// Fail-safe: har qadamda xatolik → jim log, xabarni to'sib qo'ymaydi.
// Bu xato kontent o'tib ketsa "false negative" — inson kontrolida bekor qilinadi.
// Xato haqiqiy xabarni bloklasa "false positive" — foydalanuvchi noroziligi.
// Fail-open false negatives'ni afzal ko'radi (kamroq zarar).

import { moderateContent } from "@/lib/ai-moderate";
import { relationshipScore, moderationAction } from "@/lib/moderation-relationship";
import { issueBan, isHardCategory } from "@/lib/moderation-ladder";
import { prisma } from "@/lib/prisma";

/** DM xabari yozilgach fon'da chaqiriladi (after() yordamida javob kutmaydi). */
export async function moderateDmMessage(opts: {
    messageId: string;
    senderId: string;
    recipientId: string;
    text: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
}): Promise<void> {
    try {
        // Faqat matn yoki rasm/video moderatsiya qilinadi (audio ovozli tanish alohida ish)
        const hasImage = opts.mediaType === "image" && !!opts.mediaUrl;
        const text = (opts.text || "").trim();
        if (!text && !hasImage) return;

        const [modResult, relScore] = await Promise.all([
            moderateContent({
                kind: "dm-message",
                text,
                imageUrl: hasImage ? opts.mediaUrl! : null,
            }),
            relationshipScore(opts.senderId, opts.recipientId),
        ]);

        if (!modResult || modResult.verdict === "OK") return;

        // Reason kategoriyasi hard bo'lishi mumkinmi
        const reason = modResult.categories[0] || "other";
        const hard = isHardCategory(reason);
        const action = moderationAction(modResult.severity, relScore, hard);

        // "log" — hech narsa qilmaymiz (kontekstga qarab tolerantroq)
        if (action === "log") return;

        // "warn" — kelajakda foydalanuvchiga toast/modal ("Bu xabar tahdid ko'rinadi...").
        // Hozircha faqat log (UI hook keyingi bosqichda).
        if (action === "warn") {
            // TODO: bildirishnoma yaratish yoki client-side warning
            return;
        }

        // "block" — xabarni yashiramiz + foydalanuvchiga ban qo'yamiz.
        // Xabar tarixda qoladi lekin peer'ga ko'rinmaydi (kelajakda hidden flag).
        // Hozircha faqat ban issue qilamiz (message-level hide keyingi bosqich).
        await issueBan({
            profileId: opts.senderId,
            reason,
            contextSnippet: text ? text.slice(0, 200) : null,
            aiVerdict: modResult.verdict,
            aiSeverity: modResult.severity,
            aiRelationScore: relScore,
        });
    } catch {
        // fail-open
    }
}

/** Foydalanuvchi ban qilinganmi tekshirish (DM POST'da darrov chaqiriladi).
 *  Bloklangan bo'lsa xato ma'lumoti qaytariladi — xabar jo'natilmaydi. */
export async function checkBanned(profileId: string): Promise<{ banned: false } | { banned: true; ban: { expiresAt: Date | null; reason: string; level: number; id: string; category: string } }> {
    const now = new Date();
    const ban = await prisma.userBan.findFirst({
        where: {
            profileId,
            lifted: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { issuedAt: "desc" },
        select: { id: true, expiresAt: true, reason: true, level: true, category: true },
    });
    if (!ban) return { banned: false };
    return { banned: true, ban };
}
