// Ummi takliflari (L1) — markaziy dvigatel.
// KB (UserKnowledge) + signallar (UserSignals) asosida shaxsiy taklif qoralamasi,
// uni UmmiSuggestion saqlagichiga yozish, va in-app yuza uchun faol taklifni olish.
// Ham kunlik push cron (ai-daily-recommendation), ham in-app UmmiTip shu libdan foydalanadi.

import { prisma } from "@/lib/prisma";
import { getOrRefreshSignals } from "@/lib/user-signals";
import { listKnowledge } from "@/lib/user-knowledge";

export interface SuggestionDraft {
    kind: string;       // "belis"|"nexus"|"bn"|"profile"
    title: string;
    body: string;
    url: string;
    dedupeKey: string;  // kind+resurs+kun — bir kunda takrorlanmaydi
}

const EXPIRES_DAYS = 3;

/** notifPrefs JSON'dan Ummi takliflari yoqilganmi (default: yoniq). */
export function ummiTipsEnabled(notifPrefs: unknown): boolean {
    const p = (notifPrefs ?? {}) as Record<string, unknown>;
    return p.ummiTips !== false;
}

function dayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * KB + signallardan taklif qoralamasi. Prioritet: Belis → Nexus → BN → profil-to'ldirish.
 * LLM yo'q (arzon, deterministik). Hech narsa topilmasa null.
 */
export async function buildSuggestion(profileId: string, name: string): Promise<SuggestionDraft | null> {
    const [signals, kb] = await Promise.all([
        getOrRefreshSignals(profileId),
        listKnowledge(profileId),
    ]);
    const d = dayKey();
    const kbMap = new Map(kb.map(k => [`${k.category}:${k.key}`, String(k.value).toLowerCase()]));

    // 1. Belis — oila/to'y/marosim signali
    if (
        kbMap.get("family:kids")?.match(/1|2|3/)?.length ||
        kbMap.get("family:marital_status") === "uylangan" ||
        kbMap.get("goals:current_goal")?.includes("to'y") ||
        kbMap.get("goals:current_goal")?.includes("marosim")
    ) {
        return {
            kind: "belis",
            title: `${name ? name + ", " : ""}yaqin marosim uchun`,
            body: "Belisda Fotiha va Beshik to'y sarpo qutilari ijarada. Sifatli, hamyonbop, yetkazish bilan.",
            url: "https://belis.uz",
            dedupeKey: `belis:${d}`,
        };
    }

    // 2. Nexus — eng ko'p kuzatilgan muallifning yangi posti
    if (signals && signals.topFollowedAuthors.length > 0) {
        const author = signals.topFollowedAuthors[0];
        const authorProfile = await prisma.userProfile.findFirst({
            where: { username: author }, select: { id: true },
        });
        if (authorProfile) {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentPost = await prisma.nexusPost.findFirst({
                where: { profileId: authorProfile.id, createdAt: { gt: yesterday } },
                select: { id: true },
            });
            if (recentPost) {
                return {
                    kind: "nexus",
                    title: `@${author} yangi post joyladi`,
                    body: "Sizni qiziqtirishi mumkin — Nexus'da ko'ring.",
                    url: `/nexus/u/${author}`,
                    dedupeKey: `nexus:${author}:${d}`,
                };
            }
        }
    }

    // 3. BN — eng ko'p qaralgan kategoriyada yangi arzon topilma
    if (signals && signals.bnCategoryClicks.length > 0) {
        const cat = signals.bnCategoryClicks[0];
        return {
            kind: "bn",
            title: `${cat} kategoriyasi — yangi tavsiya`,
            body: "Bozor Narxidada arzon topilmalar bor. Solishtirib ko'ring.",
            url: `https://bozornarxida.uz/qidiruv?category=${encodeURIComponent(cat)}`,
            dedupeKey: `bn:${cat}:${d}`,
        };
    }

    // 4. Default — profilni to'ldirish (KB kam bo'lsa)
    if (kb.length < 5) {
        return {
            kind: "profile",
            title: `${name ? name + ", " : ""}sizni yaxshiroq tanish uchun`,
            body: "1 daqiqada bir necha savolga javob bering — tavsiyalar aniqroq bo'ladi.",
            url: "/id/discover",
            dedupeKey: `profile:${d}`,
        };
    }

    return null;
}

/** Qoralamani saqlash (dedupeKey bo'yicha idempotent). Mavjud bo'lsa o'zgartirmaydi. */
export async function upsertSuggestion(profileId: string, draft: SuggestionDraft) {
    return prisma.ummiSuggestion.upsert({
        where: { profileId_dedupeKey: { profileId, dedupeKey: draft.dedupeKey } },
        update: {},
        create: {
            profileId,
            kind: draft.kind,
            title: draft.title,
            body: draft.body,
            url: draft.url,
            dedupeKey: draft.dedupeKey,
            expiresAt: new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000),
        },
    });
}

/**
 * In-app yuza uchun joriy faol taklif.
 * Toggle o'chiq → null. Faol (NEW/SEEN, muddati o'tmagan) bo'lsa — shu.
 * Aks holda: bugun allaqachon taklif yaratilgan bo'lsa (rad etilgan ham) → null (kuniga 1).
 * Bo'lmasa — yangi qoralama yaratib saqlaydi.
 */
export async function getActiveSuggestion(profileId: string) {
    const profile = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { name: true, username: true, notifPrefs: true },
    });
    if (!profile || !ummiTipsEnabled(profile.notifPrefs)) return null;

    const now = new Date();
    const active = await prisma.ummiSuggestion.findFirst({
        where: { profileId, status: { in: ["NEW", "SEEN"] }, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
    });
    if (active) return active;

    // Kunlik cap — bugun biror taklif yaratilgan bo'lsa (hatto rad etilgan), yangisi yo'q
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.ummiSuggestion.count({
        where: { profileId, createdAt: { gt: todayStart } },
    });
    if (todayCount > 0) return null;

    const draft = await buildSuggestion(profileId, profile.name || profile.username || "");
    if (!draft) return null;
    return upsertSuggestion(profileId, draft);
}

/** Taklif holatini o'zgartirish (faqat egasi). Topilsa true. */
export async function setSuggestionStatus(
    id: string,
    profileId: string,
    status: "SEEN" | "DISMISSED" | "ACTED",
): Promise<boolean> {
    const r = await prisma.ummiSuggestion.updateMany({
        where: { id, profileId },
        data: { status },
    });
    return r.count > 0;
}
