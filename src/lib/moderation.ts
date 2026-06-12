// Moderatsiya server yordamchilari — flag yaratish/yangilash, kontentni yashirish.
// Pre-publish (yaratishda) va reaktiv (shikoyatda) ikkalasi shu yerdan foydalanadi.

import { prisma } from "@/lib/prisma";
import { moderateContent, AUTO_HIDE_SEVERITY, type ModResult } from "@/lib/ai-moderate";

export type ModModule = "MARKET" | "NEXUS";
export type ModTargetType =
    | "PRODUCT" | "REVIEW" | "REPLY" | "QUESTION" | "ANSWER" // Market
    | "POST" | "COMMENT" | "VIDEO" | "TRACK";                // Nexus

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
        case "VIDEO":
            await prisma.nexusVideo.updateMany({ where: { id: targetId }, data: { hidden } });
            break;
        case "TRACK":
            await prisma.nexusTrack.updateMany({ where: { id: targetId }, data: { hidden } });
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
export async function applyModeration(opts: {
    module: ModModule;
    targetType: ModTargetType;
    targetId: string;
    text?: string | null;
    imageUrl?: string | null;
    kind?: string;            // AI prompt uchun tavsif (masalan "mahsulot", "sharh")
    reporterReason?: string;  // bo'lsa — foydalanuvchi shikoyati
}): Promise<ApplyModResult> {
    const result = await moderateContent({
        kind: opts.kind || opts.targetType.toLowerCase(),
        text: opts.text,
        imageUrl: opts.imageUrl,
    });

    const isReport = opts.reporterReason !== undefined;
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
}): Promise<void> {
    try {
        await applyModeration(opts);
    } catch {
        /* fail-open */
    }
}
