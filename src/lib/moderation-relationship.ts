// AI moderatsiya — munosabat grafi (kontekstga sezgir jazolash uchun).
// Foydalanuvchi so'rovi (yozma):
// "men yaqin odamlarim bilan hazilashaman 'sani o'ldirish kere bunaqa ishinga'
// masalan shunaqa massage jo'natsam buni AI o'qiydi va meni bloklab qo'yadimi?
// ... Shuni hal qilsak yangi xavfsizlik darajasini ixtiro qilgan bo'lamiz."
//
// Yechim: har 2 foydalanuvchi orasidagi "yaqinlik ballini" (0-100) hisoblaymiz.
// Yuqori bali (yaqin do'stlar orasida) — hazil sifatida tolerantroq baholanadi.
// Notanish odam bilan bir xil xabar — jiddiy tahdid.

import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/nexus-dm";

/** Ikki foydalanuvchi orasidagi yaqinlik balli (0-100).
 * 0-30 = notanish, 31-70 = tanish, 71+ = yaqin do'st.
 *
 * Ballash mezonlari:
 *  - O'zaro follow (mutual)        +30
 *  - Oxirgi 30 kun ichida 50+ xabar +25
 *  - DM tarixi (har qanday)         +15
 *  - Reciprocal like (kamida 3 ta)  +15
 *  - Umumiy guruh (kelajakda)       +10
 *  Maks: 95
 */
export async function relationshipScore(fromId: string, toId: string): Promise<number> {
    if (fromId === toId) return 100;   // o'ziga (theorotik)

    let score = 0;

    // O'zaro follow: har ikki tomon bir-birini kuzatadimi
    const [fromFollowsTo, toFollowsFrom] = await Promise.all([
        prisma.nexusFollow.findFirst({ where: { followerId: fromId, followingId: toId }, select: { id: true } }),
        prisma.nexusFollow.findFirst({ where: { followerId: toId, followingId: fromId }, select: { id: true } }),
    ]);
    const mutual = !!fromFollowsTo && !!toFollowsFrom;
    if (mutual) score += 30;

    // DM tarixi — suhbat mavjudmi va oxirgi 30 kun ichida qancha xabar
    const [u1, u2] = normalizePair(fromId, toId);
    const conv = await prisma.nexusConversation.findUnique({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        select: { id: true },
    });
    if (conv) {
        score += 15;   // suhbat mavjud
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
        const recentCount = await prisma.nexusMessage.count({
            where: { conversationId: conv.id, createdAt: { gt: thirtyDaysAgo } },
        });
        if (recentCount >= 50) score += 25;
        else if (recentCount >= 10) score += 12;
    }

    // Reciprocal engagement — from user like'lagan to'ning kamida 3 ta postini
    // (o'zaro engagement o'rniga tez tekshirish uchun)
    const likesFromToTo = await prisma.nexusLike.count({
        where: {
            profileId: fromId,
            post: { profileId: toId },
        },
    });
    if (likesFromToTo >= 3) score += 15;
    else if (likesFromToTo >= 1) score += 5;

    // TODO: umumiy guruh a'zoligi (kelajakda guruhlar chiqqach) +10
    // TODO: "Close friends" ro'yxati (Instagram uslubi) +50

    return Math.min(100, score);
}

/** Munosabat balliga qarab AI severity chegarasini hisoblash.
 * Yaqin do'stlar orasida yuqori severity ham "hazil" sifatida tolerantroq baholanadi. */
export function severityThresholdForRelation(relationScore: number): number {
    // Notanish (0-30): 0.5 — o'rta xavf ham blok
    // Tanish (31-70): 0.75 — faqat aniq buzilish
    // Yaqin do'st (71+): 0.85 — deyarli faqat jiddiy tahdid (CSAM/hard'lar bariga tegishli emas)
    if (relationScore >= 71) return 0.85;
    if (relationScore >= 31) return 0.75;
    return 0.5;
}

/** Munosabat balliga qarab ogohlantirish qatlami:
 *  - "warn" — foydalanuvchini ogohlantirish (yaqin do'st + yuqori severity)
 *  - "block" — darhol ban qo'yish
 *  - "log"  — jim log (past severity, yaqin do'st) */
export type ModerationAction = "log" | "warn" | "block";
export function moderationAction(severity: number, relationScore: number, isHard: boolean): ModerationAction {
    if (isHard) return "block";   // CSAM/terror kontekstga qaramay darhol ban
    const threshold = severityThresholdForRelation(relationScore);
    if (severity < threshold) return "log";
    // Yaqin do'st + past-o'rta yuqori severity → warn (jo'natishga ruxsat berish oldidan)
    if (relationScore >= 71 && severity < 0.90) return "warn";
    return "block";
}
