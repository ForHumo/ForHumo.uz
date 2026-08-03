// Zaxira usernamelar tekshiruvi. DB'da `ReservedUsername`da yotadi;
// bu yerda serverless instance ichida 1 daqiqalik cache bilan tez lookup.
//
// Chaqiruvchilar: /api/user/check-username, /api/user/profile (PATCH),
// nexus-username-gate (client-side texnik yordam sifatida).

import { prisma } from "./prisma";

type Cached = { category: string; assignedToId: string | null };

let cache: Map<string, Cached> | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000; // 1 daqiqa

async function loadCache(): Promise<Map<string, Cached>> {
    if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
    const rows = await prisma.reservedUsername.findMany({
        where: { claimedAt: null },
        select: { username: true, category: true, assignedToId: true },
    });
    cache = new Map(rows.map(r => [r.username.toLowerCase(), { category: r.category, assignedToId: r.assignedToId }]));
    cacheAt = Date.now();
    return cache;
}

// Bir marta o'zgartirish qilingandan keyin (admin panel) cache'ni bo'shatish
export function invalidateReservedCache(): void {
    cache = null;
    cacheAt = 0;
}

export interface ReservedCheck {
    reserved: boolean;
    category?: string;
    reason?: string; // foydalanuvchiga ko'rsatiladigan matn
}

export async function checkReservedUsername(
    username: string,
    opts?: { profileId?: string | null; isFounder?: boolean },
): Promise<ReservedCheck> {
    const lower = username.trim().toLowerCase();
    if (!lower) return { reserved: false };
    const map = await loadCache();
    const hit = map.get(lower);
    if (!hit) return { reserved: false };

    // Aynan shu profilga ajratilgan bo'lsa — o'sha odam ololadi
    if (hit.assignedToId && opts?.profileId && opts.profileId === hit.assignedToId) {
        return { reserved: false };
    }

    // Founder bypass — lekin faqat aynan boshqa odamga ajratilmagan bo'lsa
    if (opts?.isFounder && !hit.assignedToId) {
        return { reserved: false };
    }

    return { reserved: true, category: hit.category, reason: reasonFor(hit.category) };
}

function reasonFor(category: string): string {
    switch (category) {
        case "SYSTEM":     return "Bu username tizim uchun zaxiralangan";
        case "VIP":        return "Bu username maxsus (VIP)";
        case "CELEBRITY":  return "Bu username mashhur odam uchun zaxiralangan";
        case "BRAND":      return "Bu username brend uchun zaxiralangan";
        case "COUNTRY":    return "Bu username davlat nomi uchun zaxiralangan";
        case "GOVERNMENT": return "Bu username davlat tashkiloti uchun zaxiralangan";
        case "PERSONAL":   return "Bu username band";
        default:           return "Bu username band";
    }
}
