// Moderatsiya server yordamchilari — flag yaratish/yangilash, kontentni yashirish.
// Pre-publish (yaratishda) va reaktiv (shikoyatda) ikkalasi shu yerdan foydalanadi.

import { prisma } from "@/lib/prisma";
import { moderateContent, AUTO_HIDE_SEVERITY, type ModResult } from "@/lib/ai-moderate";
import { issueBan } from "@/lib/moderation-ladder";

export type ModModule = "MARKET" | "NEXUS";
export type ModTargetType =
    | "PRODUCT" | "REVIEW" | "REPLY" | "QUESTION" | "ANSWER" // Market
    | "POST" | "COMMENT" | "VIDEO_COMMENT" | "VIDEO" | "TRACK" // Nexus
    | "LIVE" | "LIVE_MESSAGE"                                // Nexus jonli efir
    | "CHANNEL_MESSAGE";                                     // Nexus kanal/guruh

// targetType → tegishli modelda yashirish/ko'rsatish.
// updateMany ishlatamiz: kontent o'chirilgan bo'lsa ham xato bermaydi.
export async function hideTarget(targetType: ModTargetType, targetId: string, hidden: boolean): Promise<void> {
    switch (targetType) {
        case "PRODUCT":
            await prisma.marketProduct.updateMany({ where: { id: targetId }, data: { isActive: !hidden } });
            break;
        case "REVIEW":
            await prisma.marketReview.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "REPLY":
            await prisma.marketReviewReply.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "QUESTION":
            await prisma.marketProductQuestion.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "ANSWER":
            await prisma.marketProductAnswer.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "POST":
            await prisma.nexusPost.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "COMMENT":
            await prisma.nexusComment.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "VIDEO_COMMENT":
            await prisma.nexusVideoComment.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "VIDEO":
            await prisma.nexusVideo.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "TRACK":
            await prisma.nexusTrack.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "LIVE":
            await prisma.nexusLiveStream.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "LIVE_MESSAGE":
            await prisma.nexusLiveMessage.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "CHANNEL_MESSAGE":
            await prisma.nexusChannelMessage.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
    }
}

export interface ApplyModResult {
    flagged: boolean;
    autoHidden: boolean;
    result: ModResult | null;
}

// AI bilan tekshiradi, ModerationFlag'ni yaratadi/yangilaydi, kerak bo'lsa avto-yashiradi.
// reporterReason berilsa — bu foydalanuvchi shikoyati (reportCount++).
// authorId berilsa — auto-hide holatida foydalanuvchi ham ban qilinadi (progressiv).
export async function applyModeration(opts: {
    module: ModModule;
    targetType: ModTargetType;
    targetId: string;
    text?: string | null;
    imageUrl?: string | null;
    kind?: string;            // AI prompt uchun tavsif (masalan "mahsulot", "sharh")
    reporterReason?: string;  // bo'lsa — foydalanuvchi shikoyati
    authorId?: string;        // yaratuvchi UserProfile.id — auto-hide bo'lsa ban issue qilamiz
}): Promise<ApplyModResult> {
    const isReport = opts.reporterReason !== undefined;

    // Xarajat himoyasi: agar target allaqachon flag'langan (AI bir marta tahlil qilgan) bo'lsa,
    // takroriy shikoyatda AI'ni QAYTA chaqirmaymiz — bir xil kontentning hukmi o'zgarmaydi.
    // Faqat reportCount oshadi. Bu cheksiz pullik AI chaqiruvini (DoS) yopadi.
    if (isReport) {
        const existing = await prisma.moderationFlag.findUnique({
            where: { module_targetType_targetId: { module: opts.module, targetType: opts.targetType, targetId: opts.targetId } },
            select: { id: true, status: true },
        });
        if (existing) {
            await prisma.moderationFlag.update({
                where: { id: existing.id },
                data: { reportCount: { increment: 1 }, lastReason: opts.reporterReason ?? null },
            });
            return { flagged: true, autoHidden: existing.status === "AUTO_HIDDEN", result: null };
        }
    }

    const result = await moderateContent({
        kind: opts.kind || opts.targetType.toLowerCase(),
        text: opts.text,
        imageUrl: opts.imageUrl,
    });

    const verdictBad = !!result && result.verdict !== "OK";
    const autoHide = !!result && result.verdict === "BLOCK" && result.severity >= AUTO_HIDE_SEVERITY;

    // Shikoyat ham emas, AI ham muammo topmadi → flag yaratmaymiz (OK kontentni iflos qilmaymiz)
    if (!isReport && !verdictBad) return { flagged: false, autoHidden: false, result };

    const aiData = {
        aiVerdict: result?.verdict ?? null,
        aiCategories: result?.categories ?? [],
        aiSeverity: result?.severity ?? null,
        aiReason: result?.reason ?? null,
    };

    await prisma.moderationFlag.upsert({
        where: {
            module_targetType_targetId: {
                module: opts.module, targetType: opts.targetType, targetId: opts.targetId,
            },
        },
        create: {
            module: opts.module,
            targetType: opts.targetType,
            targetId: opts.targetId,
            reportCount: isReport ? 1 : 0,
            lastReason: opts.reporterReason ?? null,
            ...aiData,
            status: autoHide ? "AUTO_HIDDEN" : "PENDING",
        },
        update: {
            ...(isReport ? { reportCount: { increment: 1 }, lastReason: opts.reporterReason } : {}),
            ...aiData,
            // Avto-yashirish bo'lsa holatni yangilaymiz; aks holda mavjud holatni (KEPT/HIDDEN) buzmaymiz
            ...(autoHide ? { status: "AUTO_HIDDEN" as const } : {}),
        },
    });

    if (autoHide) await hideTarget(opts.targetType, opts.targetId, true);

    // Auto-hide bo'lsa va authorId berilgan bo'lsa — progressiv ban issue qilamiz
    // Shu tarzda takroriy qoidabuzarlik uzunroq muddatga bloklaydi
    if (autoHide && opts.authorId && result) {
        try {
            await issueBan({
                profileId: opts.authorId,
                reason: result.categories[0] || "other",
                contextSnippet: opts.text ? opts.text.slice(0, 200) : null,
                aiVerdict: result.verdict,
                aiSeverity: result.severity,
            });
        } catch { /* fail-open — ban issue xato bo'lsa moderation baribir ishlaydi */ }
    }

    return { flagged: true, autoHidden: autoHide, result };
}

// Pre-publish: yangi yaratilgan kontentni tekshiradi.
// Hech qachon xato tashlamaydi — moderatsiya muammosi kontent yaratishni buzmasligi kerak.
export async function moderateOnCreate(opts: {
    module: ModModule;
    targetType: ModTargetType;
    targetId: string;
    text?: string | null;
    imageUrl?: string | null;
    kind?: string;
    authorId?: string;   // berilsa auto-hide holatida ban ham beriladi
}): Promise<void> {
    try {
        await applyModeration({ ...opts });
    } catch {
        /* fail-open */
    }
}
