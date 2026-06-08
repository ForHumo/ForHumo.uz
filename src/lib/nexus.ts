// Nexus umumiy yordamchilar

import { isFounderProfile } from "@/lib/founders";

// Tasdiqlangan (ko'k belgi) — hozircha asoschilar (founder ro'yxati lib/founders.ts da)
export function isVerifiedProfile(p: { username: string | null; humoId: string | null }) {
    return isFounderProfile(p);
}

// Matndan #hashtag larni ajratish (maks 10 ta)
export function extractHashtags(text: string): string[] {
    const tags = new Set<string>();
    const re = /#([\p{L}\p{N}_]+)/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) tags.add(m[1]);
    return [...tags].slice(0, 10);
}
