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
// Barcha mos nomzod qoralamalarини yig'adi (prioritetsiz — tanlashни ranker qiladi).
export async function buildCandidates(profileId: string, name: string): Promise<SuggestionDraft[]> {
    const [signals, kb] = await Promise.all([
        getOrRefreshSignals(profileId),
        listKnowledge(profileId),
    ]);
    const d = dayKey();
    const kbMap = new Map(kb.map(k => [`${k.category}:${k.key}`, String(k.value).toLowerCase()]));
    const out: SuggestionDraft[] = [];

    // Belis — oila/to'y/marosim signali
    if (
        kbMap.get("family:kids")?.match(/1|2|3/)?.length ||
        kbMap.get("family:marital_status") === "uylangan" ||
        kbMap.get("goals:current_goal")?.includes("to'y") ||
        kbMap.get("goals:current_goal")?.includes("marosim")
    ) {
        out.push({
            kind: "belis",
            title: `${name ? name + ", " : ""}yaqin marosim uchun`,
            body: "Belisda Fotiha va Beshik to'y sarpo qutilari ijarada. Sifatli, hamyonbop, yetkazish bilan.",
            url: "https://belis.uz",
            dedupeKey: `belis:${d}`,
        });
    }

    // Nexus — eng ko'p kuzatilgan muallifning yangi posti
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
                out.push({
                    kind: "nexus",
                    title: `@${author} yangi post joyladi`,
                    body: "Sizni qiziqtirishi mumkin — Nexus'da ko'ring.",
                    url: `/nexus/u/${author}`,
                    dedupeKey: `nexus:${author}:${d}`,
                });
            }
        }
    }

    // BN — eng ko'p qaralgan kategoriyada yangi arzon topilma
    if (signals && signals.bnCategoryClicks.length > 0) {
        const cat = signals.bnCategoryClicks[0];
        out.push({
            kind: "bn",
            title: `${cat} kategoriyasi — yangi tavsiya`,
            body: "Bozor Narxidada arzon topilmalar bor. Solishtirib ko'ring.",
            url: `https://bozornarxida.uz/qidiruv?category=${encodeURIComponent(cat)}`,
            dedupeKey: `bn:${cat}:${d}`,
        });
    }

    // Profilni to'ldirish (KB kam bo'lsa)
    if (kb.length < 5) {
        out.push({
            kind: "profile",
            title: `${name ? name + ", " : ""}sizni yaxshiroq tanish uchun`,
            body: "1 daqiqada bir necha savolga javob bering — tavsiyalar aniqroq bo'ladi.",
            url: "/id/discover",
            dedupeKey: `profile:${d}`,
        });
    }

    return out;
}

// Affinitet teng bo'lsa tie-break (yuqori = ustun).
const BASE_PRIORITY: Record<string, number> = { belis: 4, nexus: 3, bn: 2, profile: 1 };

interface KindAffinity { score: number; suppressed: boolean; }

/** Foydalanuvchi tarixidan har tur uchun affinitet (qabul-foizi) + bostirish bayrog'i. */
export async function kindAffinity(profileId: string): Promise<Record<string, KindAffinity>> {
    const rows = await prisma.ummiSuggestion.groupBy({
        by: ["kind", "status"],
        where: { profileId },
        _count: { _all: true },
    });
    const agg: Record<string, { acted: number; dismissed: number }> = {};
    for (const r of rows) {
        agg[r.kind] ??= { acted: 0, dismissed: 0 };
        if (r.status === "ACTED") agg[r.kind].acted += r._count._all;
        else if (r.status === "DISMISSED") agg[r.kind].dismissed += r._count._all;
    }
    const out: Record<string, KindAffinity> = {};
    for (const [k, a] of Object.entries(agg)) {
        // Laplace-smoothed qabul-foizi: yangi/kam tarixli → ~0.5 (neytral)
        const score = (a.acted + 0.5) / (a.acted + a.dismissed + 1);
        // 3+ marta rad etilgan, hech marta ochilmagan → bostirish (bezovta qilmaslik)
        const suppressed = a.dismissed >= 3 && a.acted === 0;
        out[k] = { score, suppressed };
    }
    return out;
}

/**
 * Eng maqbul taklif — nomzodlar orasidan foydalanuvchi affinitetiga qarab tanlanadi (o'rganish halqasi).
 * Prioritet: bostirilmagan > yuqori qabul-foizi > bazaviy prioritet. Hammasi bostirilган → null.
 */
export async function buildSuggestion(profileId: string, name: string): Promise<SuggestionDraft | null> {
    const candidates = await buildCandidates(profileId, name);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const aff = await kindAffinity(profileId);
    const ranked = [...candidates].sort((a, b) => {
        const A = aff[a.kind], B = aff[b.kind];
        const aSup = A?.suppressed ? 1 : 0, bSup = B?.suppressed ? 1 : 0;
        if (aSup !== bSup) return aSup - bSup;                               // bostirilган pastga
        const aScore = A?.score ?? 0.5, bScore = B?.score ?? 0.5;
        if (Math.abs(aScore - bScore) > 0.001) return bScore - aScore;      // yuqori qabul-foizi ustun
        return (BASE_PRIORITY[b.kind] ?? 0) - (BASE_PRIORITY[a.kind] ?? 0);  // tie-break
    });

    const best = ranked[0];
    if (aff[best.kind]?.suppressed) return null;   // hammasi bostirilган — bezovta qilmaymiz
    return best;
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

export interface KindStat { shown: number; acted: number; dismissed: number; seen: number; actRate: number; dismissRate: number; }

/** Accept-rate o'lchovi (founder) — global + har tur bo'yicha. actRate/dismissRate foizда. */
export async function getSuggestionStats(opts: { days?: number } = {}) {
    const where = opts.days
        ? { createdAt: { gt: new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000) } }
        : {};
    const rows = await prisma.ummiSuggestion.groupBy({
        by: ["kind", "status"], where, _count: { _all: true },
    });
    const mk = (): KindStat => ({ shown: 0, acted: 0, dismissed: 0, seen: 0, actRate: 0, dismissRate: 0 });
    const byKind: Record<string, KindStat> = {};
    const total = mk();
    for (const r of rows) {
        byKind[r.kind] ??= mk();
        const c = r._count._all;
        byKind[r.kind].shown += c; total.shown += c;
        if (r.status === "ACTED") { byKind[r.kind].acted += c; total.acted += c; }
        else if (r.status === "DISMISSED") { byKind[r.kind].dismissed += c; total.dismissed += c; }
        else if (r.status === "SEEN") { byKind[r.kind].seen += c; total.seen += c; }
    }
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
    for (const s of [...Object.values(byKind), total]) {
        s.actRate = pct(s.acted, s.shown);
        s.dismissRate = pct(s.dismissed, s.shown);
    }
    return { total, byKind };
}
