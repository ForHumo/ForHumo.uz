// Nexus umumiy yordamchilar

import { isFounderProfile } from "@/lib/founders";

// Tasdiqlangan (ko'k belgi) — asoschilar (lib/founders.ts) YOKI ariza orqali tasdiqlangan (DB verified flag)
export function isVerifiedProfile(p: { username: string | null; humoId: string | null; verified?: boolean }) {
    return isFounderProfile(p) || p.verified === true;
}

/** Foydalanuvchi verified kategoriyasini olish. Founder yoki eski verified — null (generic ko'k tick).
 *  Kelajakda founder kategoriyasi ham belgilanishi mumkin. */
export function getVerifiedCategory(p: { username: string | null; humoId: string | null; verified?: boolean; verifiedCategory?: string | null }): string | null {
    if (!isVerifiedProfile(p)) return null;
    return p.verifiedCategory || null;
}

// 18 yoshga to'lganmi? Tug'ilgan sana yo'q bo'lsa — tasdiqlanmagan, false (18+ kontent yashiriladi)
export function isAdultBirthday(birthday: Date | null | undefined): boolean {
    if (!birthday) return false;
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const m = now.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age--;
    return age >= 18;
}

// Matndan #hashtag larni ajratish (maks 10 ta)
export function extractHashtags(text: string): string[] {
    const tags = new Set<string>();
    const re = /#([\p{L}\p{N}_]+)/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) tags.add(m[1]);
    return [...tags].slice(0, 10);
}
