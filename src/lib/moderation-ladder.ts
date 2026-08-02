// AI moderatsiya — progressiv jazolash zinapoyasi.
// Foydalanuvchi qoidalarni buzganda oxirgi bloklashiga qarab keyingi darajaga o'tadi.
// 0: 1 soat → 1: 3 soat → 2: 24 soat → 3: 3 kun → 4: 7 kun → 5: 14 kun → 6: 30 kun →
// 7: 1 yil → 8: 2 yil → 9: 3 yil → 10: 5 yil → 11: 10 yil → 12: 30 yil → 13: abadiy
//
// Foydalanuvchi bilan gaplashish: "Sizga [DURATION] blok qo'yildi. Sabab: [REASON].
// Adolatsiz deb bilsangiz Ariza tugmasi bilan asoschiga murojaat qiling."

import { prisma } from "@/lib/prisma";

const H = 60 * 60_000;           // 1 soat ms
const D = 24 * H;                 // 1 kun ms
const Y = 365 * D;                // 1 yil ms

// Har element — muddat (ms) yoki null (abadiy)
export const BAN_LADDER: (number | null)[] = [
    1 * H,        // 0
    3 * H,        // 1
    24 * H,       // 2
    3 * D,        // 3
    7 * D,        // 4
    14 * D,       // 5
    30 * D,       // 6
    1 * Y,        // 7
    2 * Y,        // 8
    3 * Y,        // 9
    5 * Y,        // 10
    10 * Y,       // 11
    30 * Y,       // 12
    null,         // 13 = abadiy
];

export const BAN_LABELS: string[] = [
    "1 soat", "3 soat", "24 soat", "3 kun", "7 kun", "14 kun", "30 kun",
    "1 yil", "2 yil", "3 yil", "5 yil", "10 yil", "30 yil", "Abadiy",
];

// "Hard" kategoriyalar — darhol forever ban (kontekstga qaramay)
// AIfog'i BLOCK verdict + severity>=0.95 + reasondan tekshiriladi
export const HARD_CATEGORIES = new Set([
    "csam",                // 18 yoshdan kichik bolalarga oid jinsiy kontent
    "terrorism",           // terroristik tashviqot
    "child_exploitation",  // bola ekspluatatsiyasi
    "murder_planning",     // aniq va konkret o'ldirish rejasi (hazil emas)
]);

/** Foydalanuvchining oldingi (hisobga olinadigan) bloklari sonini hisoblab, keyingi darajani beradi.
 *  Lifted (bekor qilingan) bloklar hisobga olinmaydi. */
export async function nextBanLevel(profileId: string): Promise<number> {
    const count = await prisma.userBan.count({
        where: { profileId, lifted: false },
    });
    return Math.min(count, BAN_LADDER.length - 1);
}

/** Ban muddatini boshlanish vaqtidan hisoblab, expiresAt qaytaradi (null = abadiy). */
export function computeExpiresAt(level: number, from: Date = new Date()): Date | null {
    const ms = BAN_LADDER[Math.min(level, BAN_LADDER.length - 1)];
    if (ms === null) return null;
    return new Date(from.getTime() + ms);
}

/** Reason hard-category'ga tegishlimi (avtomatik forever ban) */
export function isHardCategory(reason: string): boolean {
    return HARD_CATEGORIES.has(reason);
}

/** Foydalanuvchi hozir bloklanganmi? Aktiv (muddati o'tmagan va lifted=false) UserBan qaytaradi. */
export async function getActiveBan(profileId: string) {
    const now = new Date();
    return await prisma.userBan.findFirst({
        where: {
            profileId,
            lifted: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { issuedAt: "desc" },
    });
}

/** Bloklash yaratish. Hard bo'lsa darhol forever; aks holda ladder'dan navbatdagi. */
export async function issueBan(opts: {
    profileId: string;
    reason: string;
    contextSnippet?: string | null;
    aiVerdict?: string | null;
    aiSeverity?: number | null;
    aiRelationScore?: number | null;
}) {
    const hard = isHardCategory(opts.reason);
    const level = hard ? BAN_LADDER.length - 1 : await nextBanLevel(opts.profileId);
    const expiresAt = computeExpiresAt(level);
    const ban = await prisma.userBan.create({
        data: {
            profileId: opts.profileId,
            level,
            reason: opts.reason,
            category: hard ? "hard" : "soft",
            contextSnippet: opts.contextSnippet ?? null,
            aiVerdict: opts.aiVerdict ?? null,
            aiSeverity: opts.aiSeverity ?? null,
            aiRelationScore: opts.aiRelationScore ?? null,
            expiresAt,
        },
    });
    return ban;
}
