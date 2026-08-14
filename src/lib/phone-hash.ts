// Telefon raqam normalizatsiya + SHA-256 hash.
// Raw raqam serverda saqlanmaydi (kontakt sinxronizatsiyasi uchun faqat hash).
//
// Normalizatsiya: E.164 shakl (`+998901234567`) — barcha bo'sh joy, tire, qavs, boshqa
// belgilar olib tashlanadi. `+` bo'lmasa mahalliy raqam deb hisoblanadi (default `+998`
// O'zbekiston — ForHumo asosiy foydalanuvchi bazasi UZ). Xalqaro raqam bo'lsa `+`ni
// yoki `00`ni qo'shishi shart.
//
// Pepper: `PHONE_HASH_PEPPER` yoki fallback `NEXTAUTH_SECRET`. Rainbow table oldini olish.

import crypto from "crypto";

const DEFAULT_COUNTRY = "998";   // O'zbekiston country code (raqamlarsiz)

export function normalizePhone(raw: string): string | null {
    if (!raw) return null;
    // Faqat + va raqamlar
    let s = raw.trim();
    let hasPlus = false;
    if (s.startsWith("+")) { hasPlus = true; s = s.slice(1); }
    else if (s.startsWith("00")) { hasPlus = true; s = s.slice(2); }
    s = s.replace(/\D/g, "");
    if (s.length < 7 || s.length > 15) return null;
    // Mahalliy shakldan xalqarosiga: 8 bilan boshlansa (ba'zi UZ operatorlari) 8 tashlaymiz
    if (!hasPlus && s.length === 9) s = DEFAULT_COUNTRY + s;   // 901234567 → 998901234567
    if (!hasPlus && s.length === 12 && s.startsWith(DEFAULT_COUNTRY)) { /* already */ }
    else if (!hasPlus && s.length === 10 && s.startsWith("8")) s = DEFAULT_COUNTRY + s.slice(1);
    else if (!hasPlus && s.length !== DEFAULT_COUNTRY.length + 9) {
        // Nomalum shakl — plus talab qilinadi
        if (s.length !== 11 && s.length !== 12 && s.length !== 13) return null;
    }
    return "+" + s;
}

function pepper(): string {
    return process.env.PHONE_HASH_PEPPER || process.env.NEXTAUTH_SECRET || "forhumo-dev-pepper";
}

export function hashPhone(normalizedE164: string): string {
    return crypto.createHash("sha256").update("forhumo-phone-v1:" + pepper() + ":" + normalizedE164).digest("hex");
}

// Convenience: raqamni normalizatsiya + hash qilib qaytaradi (yaroqsiz bo'lsa null)
export function normalizeAndHash(raw: string): string | null {
    const n = normalizePhone(raw);
    if (!n) return null;
    return hashPhone(n);
}
