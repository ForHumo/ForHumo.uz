// Native ilova (Expo) uchun mobil JWT — mint va verify.
// NextAuth v4 ichki JWT kriptosi (`next-auth/jwt` encode/decode) qayta ishlatiladi:
// imzo = NEXTAUTH_SECRET (web bilan bir xil kalit). Mobil tokenni ajratish uchun
// ichida `mob: true` belgisi bor; bearer HECH QACHON web cookie dekoderiga berilmaydi —
// `verifyMobileToken` uni alohida `decode` qiladi. v4'da salt yo'q.
//
// Token umri 1 yil (web sessiya maxAge bilan bir xil). jti — AuthSession revocation uchun.

import { encode, decode } from "next-auth/jwt";

const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
    const s = process.env.NEXTAUTH_SECRET;
    if (!s) throw new Error("NEXTAUTH_SECRET not set");
    return s;
}

export interface MobileTokenPayload {
    profileId: string;
    humoId: string | null;
    email: string | null;
    jti: string;
}

/** Mobil token yaratish (login endpointida). */
export async function mintMobileToken(p: MobileTokenPayload): Promise<string> {
    return encode({
        // DIQQAT: NextAuth v4 `encode` registered `jti` claim'ini o'zi (UUID) yozadi —
        // bizning revocation id'imizni `sid` custom claim'ida olib yuramiz (u saqlanadi).
        token: {
            sub: p.profileId,
            profileId: p.profileId,
            humoId: p.humoId,
            email: p.email,
            sid: p.jti,
            mob: true,
        },
        secret: secret(),
        maxAge: ONE_YEAR,
    });
}

/** Bearer tokenni tekshirish. Yaroqsiz/mob emas/decode xatosi → null. */
export async function verifyMobileToken(jwt: string): Promise<MobileTokenPayload | null> {
    try {
        const t = (await decode({ token: jwt, secret: secret() })) as Record<string, unknown> | null;
        if (!t || t.mob !== true || typeof t.profileId !== "string" || typeof t.sid !== "string") return null;
        return {
            profileId: t.profileId,
            humoId: (t.humoId as string | null) ?? null,
            email: (t.email as string | null) ?? null,
            jti: t.sid,
        };
    } catch {
        return null;
    }
}
