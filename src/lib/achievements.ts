// Cross-modul yutuqlar. Ish tartibi:
//   1. Har modul o'z hodisasida `grantAchievement(profileId, code, ...)` chaqiradi.
//   2. Prisma unique([profileId, code]) tufayli ikki marta berilmaydi (upsert emas — createMany skip).
//   3. Notification tizimiga integratsiya (kelajakda).

import { prisma } from "@/lib/prisma";

export type AchievementCategory = "esport" | "nexus" | "market" | "pay" | "id" | "bn";
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

// Katalog — barcha mavjud yutuqlar. UI ham shu ro'yxatdan foydalanadi (yutilganlarni belgilash uchun).
export interface AchievementDef {
    code: string;
    title: string;
    description: string;
    icon: string;             // Lucide icon nomi
    category: AchievementCategory;
    tier: AchievementTier;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    // Humo ID
    { code: "id.registered",       title: "Xush kelibsiz",         description: "For Humo hisobi ochildi", icon: "Sparkles", category: "id", tier: "bronze" },
    { code: "id.username_set",     title: "Yagona identity",       description: "@username tanladingiz", icon: "AtSign", category: "id", tier: "bronze" },
    { code: "id.verified_email",   title: "Ishonchli",             description: "Email tasdiqlandi", icon: "ShieldCheck", category: "id", tier: "silver" },

    // Nexus
    { code: "nexus.first_post",    title: "Birinchi post",         description: "Nexus'da birinchi post yozildi", icon: "PenLine", category: "nexus", tier: "bronze" },
    { code: "nexus.10_followers",  title: "Kuzatuvchilar",         description: "10 kishi sizni kuzatadi", icon: "Users", category: "nexus", tier: "bronze" },
    { code: "nexus.100_followers", title: "Ijodkor",               description: "100 kishi kuzatadi", icon: "UserCheck", category: "nexus", tier: "silver" },
    { code: "nexus.1k_followers",  title: "Yulduz",                description: "1000 kishi kuzatadi", icon: "Star", category: "nexus", tier: "gold" },
    { code: "nexus.first_video",   title: "Video muallif",         description: "Nexus'ga birinchi video yuklandi", icon: "Video", category: "nexus", tier: "bronze" },
    { code: "nexus.first_live",    title: "Jonli efir",            description: "Birinchi jonli efir o'tkazildi", icon: "Radio", category: "nexus", tier: "silver" },

    // Market
    { code: "market.first_order",  title: "Birinchi xarid",        description: "Humo Market'da birinchi buyurtma", icon: "ShoppingBag", category: "market", tier: "bronze" },
    { code: "market.first_brand",  title: "Sotuvchi",              description: "O'z brendingiz yaratildi", icon: "Store", category: "market", tier: "silver" },
    { code: "market.first_sale",   title: "Birinchi savdo",        description: "Sizning brendingiz mahsulot sotdi", icon: "TrendingUp", category: "market", tier: "silver" },
    { code: "market.10_sales",     title: "Ishonchli sotuvchi",    description: "10 ta savdo bo'ldi", icon: "Award", category: "market", tier: "gold" },
    { code: "market.100_sales",    title: "Yetakchi savdo",        description: "100 ta savdo — brend katta bo'ldi", icon: "Trophy", category: "market", tier: "platinum" },

    // eSport
    { code: "esport.athlete",      title: "Sportchi",              description: "eSport sportchi hisobi tuzildi", icon: "Gamepad2", category: "esport", tier: "bronze" },
    { code: "esport.first_team",   title: "Jamoa a'zosi",          description: "Birinchi marta jamoaga qo'shildingiz", icon: "Users", category: "esport", tier: "bronze" },
    { code: "esport.first_match",  title: "Debyut",                description: "Birinchi turnir uchrashuvi", icon: "Swords", category: "esport", tier: "silver" },
    { code: "esport.first_win",    title: "Birinchi g'alaba",      description: "Turnirda birinchi g'alaba", icon: "Medal", category: "esport", tier: "silver" },
    { code: "esport.champion",     title: "Chempion",              description: "Turnir chempioni", icon: "Crown", category: "esport", tier: "gold" },

    // Pay
    { code: "pay.first_deposit",   title: "Hamyon faol",           description: "Hamyoningiz birinchi marta to'ldi", icon: "Wallet", category: "pay", tier: "bronze" },
    { code: "pay.first_transfer",  title: "O'tkazma",              description: "Birinchi o'tkazma yuborildi", icon: "Send", category: "pay", tier: "bronze" },

    // Bozor Narxida (BN)
    { code: "bn.waitlist",         title: "Erta qadam",            description: "BN sotuvchi waitlist'iga yozildingiz", icon: "ClipboardList", category: "bn", tier: "bronze" },
    { code: "bn.first_order",      title: "Birinchi buyurtma",     description: "BN'da birinchi buyurtma tugallandi", icon: "ShoppingBag", category: "bn", tier: "bronze" },
    { code: "bn.first_review",     title: "Baholovchi",            description: "BN'da birinchi sharh yozildi", icon: "Star", category: "bn", tier: "bronze" },
    { code: "bn.first_sale",       title: "BN sotuvchi",           description: "Do'koningiz BN'da birinchi savdo qildi", icon: "TrendingUp", category: "bn", tier: "silver" },
    { code: "bn.first_referral",   title: "Do'st chaqirdi",        description: "Chaqirilgan do'stingiz birinchi buyurtma berdi", icon: "UserPlus", category: "bn", tier: "silver" },
    { code: "bn.referral_10",      title: "BN elchi",              description: "10 ta do'st chaqirdingiz — TOP-10 leaderboard'da", icon: "Trophy", category: "bn", tier: "gold" },
];

const CATALOG_BY_CODE = new Map(ACHIEVEMENTS.map(a => [a.code, a]));

/**
 * Yutuq berish (idempotent — ikkinchi marta yozmaydi).
 * Fail-open: xato yuzaga kelsa false qaytaradi, hodisa oqimini to'xtatmaydi.
 */
export async function grantAchievement(profileId: string, code: string, meta?: Record<string, unknown>): Promise<boolean> {
    const def = CATALOG_BY_CODE.get(code);
    if (!def) return false;
    try {
        const existing = await prisma.userAchievement.findUnique({
            where: { profileId_code: { profileId, code } },
        });
        if (existing) return false;
        await prisma.userAchievement.create({
            data: {
                profileId, code,
                title: def.title, icon: def.icon,
                category: def.category, tier: def.tier,
                meta: meta ? (meta as never) : undefined,
            },
        });
        return true;
    } catch { return false; }
}

/** Foydalanuvchining yutuqlari (kategoriya bo'yicha guruh). */
export async function getUserAchievements(profileId: string) {
    return prisma.userAchievement.findMany({
        where: { profileId }, orderBy: { earnedAt: "desc" },
    });
}
