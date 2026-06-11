// Nexus umumiy yordamchilar

import { isFounderProfile } from "@/lib/founders";

// Tasdiqlangan (ko'k belgi) — hozircha asoschilar (founder ro'yxati lib/founders.ts da)
export function isVerifiedProfile(p: { username: string | null; humoId: string | null }) {
    return isFounderProfile(p);
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
