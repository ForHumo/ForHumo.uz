// AuthSession revocation cache — jwt callback har request'da chaqiriladi,
// har safar DB'ga borish qimmat. 60s in-memory cache.

import { prisma } from "@/lib/prisma";

interface CacheEntry { revoked: boolean; checkedAt: number }
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

// LastSeenAt yangilash throttle — har sessiyada 5 daqiqada 1 marta.
const lastSeenUpdatedAt = new Map<string, number>();
const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

export async function isJtiRevoked(jti: string): Promise<boolean> {
    const now = Date.now();
    const hit = cache.get(jti);
    if (hit && (now - hit.checkedAt) < CACHE_TTL_MS) return hit.revoked;

    try {
        const s = await prisma.authSession.findUnique({
            where: { jti }, select: { revokedAt: true },
        });
        // FAIL-OPEN: yozuv topilmasa (backfill xatosi, race, DB touch) — foydalanuvchini
        // AUTO-CHIQARIB YUBORMAYMIZ. Faqat aniq revokedAt bo'lsa true qaytadi.
        // Aks holda auth.ts qayta backfill qilib qo'yadi (idempotent).
        const revoked = s ? s.revokedAt !== null : false;
        cache.set(jti, { revoked, checkedAt: now });
        // Xotira o'sishini oldini olish
        if (cache.size > 5000) {
            const oldest = [...cache.entries()].sort((a, b) => a[1].checkedAt - b[1].checkedAt).slice(0, 2500);
            for (const [k] of oldest) cache.delete(k);
        }
        return revoked;
    } catch {
        // DB xatoligida ochiq qoldiramiz (fail-open) — foydalanuvchini bloklamaslik
        return false;
    }
}

export async function bumpLastSeenAt(jti: string): Promise<void> {
    const now = Date.now();
    const prev = lastSeenUpdatedAt.get(jti) ?? 0;
    if (now - prev < LAST_SEEN_THROTTLE_MS) return;
    lastSeenUpdatedAt.set(jti, now);
    try {
        await prisma.authSession.updateMany({
            where: { jti, revokedAt: null },
            data:  { lastSeenAt: new Date() },
        });
    } catch { /* silent */ }
    if (lastSeenUpdatedAt.size > 5000) {
        const oldest = [...lastSeenUpdatedAt.entries()].sort((a, b) => a[1] - b[1]).slice(0, 2500);
        for (const [k] of oldest) lastSeenUpdatedAt.delete(k);
    }
}

// Sessiya bekor qilinganda cache'ni tozalash (darhol effekt).
export function invalidateJti(jti: string): void {
    cache.delete(jti);
}
