// Foydalanuvchi maxfiy ma'lumotlari uchun shaffof shifrlash qatlami.
// Route'lar to'g'ridan-to'g'ri raw plaintext bilan ishlaydi;
// lekin DB'da faqat shifrlangan holda saqlanadi.
//
// Backward compat: eski plaintext bo'lgan yozuvlar ham o'qiladi;
// yozishda esa har doim yangi format ishlatiladi va eski null qilinadi.

import { prisma } from "@/lib/prisma";
import { encryptPhone, decryptPhone, encryptTotp, decryptTotp } from "@/lib/crypto";

// ── TOTP secret ──────────────────────────────────────────────────────────

/** Foydalanuvchi TOTP secret'ini plaintext ko'rinishda qaytaradi (yoki null). */
export async function getTotpSecret(profileId: string): Promise<string | null> {
    const p = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { totpSecret: true, totpSecretEnc: true, totpSecretIv: true },
    });
    if (!p) return null;
    if (p.totpSecretEnc && p.totpSecretIv) {
        const dec = decryptTotp(p.totpSecretEnc, p.totpSecretIv);
        return dec || null;
    }
    // Fallback (backfill'ga qadar) — plaintext
    return p.totpSecret ?? null;
}

/** TOTP secret'ni shifrlangan holda yozadi va eski plaintext'ni tozalaydi. */
export async function setTotpSecret(profileId: string, secret: string | null): Promise<void> {
    if (secret === null) {
        await prisma.userProfile.update({
            where: { id: profileId },
            data: { totpSecret: null, totpSecretEnc: null, totpSecretIv: null },
        });
        return;
    }
    const { encrypted, iv } = encryptTotp(secret);
    await prisma.userProfile.update({
        where: { id: profileId },
        data: {
            totpSecret: null,          // plaintext'ni tozalaymiz
            totpSecretEnc: encrypted,
            totpSecretIv: iv,
        },
    });
}

// ── Phone ────────────────────────────────────────────────────────────────

/** Foydalanuvchi telefon raqamini plaintext ko'rinishda qaytaradi (yoki null). */
export async function getPhone(profileId: string): Promise<string | null> {
    const p = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { phone: true, phoneEnc: true, phoneIv: true },
    });
    if (!p) return null;
    if (p.phoneEnc && p.phoneIv) {
        const dec = decryptPhone(p.phoneEnc, p.phoneIv);
        return dec || null;
    }
    return p.phone ?? null;
}

/** Telefonni shifrlangan holda yozadi. phoneHash saqlanadi (mavjud helper via auth). */
export async function setPhone(profileId: string, phone: string | null): Promise<void> {
    if (phone === null || phone === "") {
        await prisma.userProfile.update({
            where: { id: profileId },
            data: { phone: null, phoneEnc: null, phoneIv: null },
        });
        return;
    }
    const { encrypted, iv } = encryptPhone(phone);
    await prisma.userProfile.update({
        where: { id: profileId },
        data: {
            phone: null,               // plaintext'ni tozalaymiz
            phoneEnc: encrypted,
            phoneIv: iv,
        },
    });
}
