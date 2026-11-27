// So'rov egasini aniqlash — web (cookie sessiya) YOKI mobil (Bearer token).
// Barcha modullar shu orqali bitta profileId'ga keladi. Web buzilmaydi: avval
// NextAuth cookie sessiyasi tekshiriladi; bo'lmasa Authorization: Bearer mobil token.

import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-token";
import { isJtiRevoked } from "@/lib/auth-session-cache";

/** FAQAT mobil Bearer token orqali profileId (cookie QABUL QILINMAYDI).
 *  CSRF-himoyalangan mutatsiyalar uchun (masalan push token ro'yxati — faqat native ilova). */
export async function resolveMobileProfileId(): Promise<string | null> {
    try {
        const h = await headers();
        const auth = h.get("authorization") ?? "";
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (!m) return null;
        const payload = await verifyMobileToken(m[1].trim());
        if (!payload) return null;
        if (await isJtiRevoked(payload.jti)) return null;   // chiqarilgan qurilma
        return payload.profileId;
    } catch {
        return null;
    }
}

/** Joriy so'rov egasining UserProfile.id'si — web (cookie) YOKI mobil (Bearer). */
export async function resolveProfileId(): Promise<string | null> {
    // 1) Web — NextAuth cookie sessiyasi (session callback profileId beradi)
    try {
        const session = await getServerSession(authOptions);
        const pid = (session?.user as { profileId?: string | null } | undefined)?.profileId;
        if (pid) return pid;
    } catch { /* sessiya yo'q — bearer'ga o'tamiz */ }

    // 2) Mobil — Authorization: Bearer <jwt>
    return resolveMobileProfileId();
}
