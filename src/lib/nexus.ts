// Nexus umumiy yordamchilar

const FOUNDER_USERNAMES = ["abduvoris", "aaa"];
const FOUNDER_HUMO_IDS = ["UZ6889574", "UZ3549920"];

// Tasdiqlangan (ko'k belgi) — hozircha asoschilar
export function isVerifiedProfile(p: { username: string | null; humoId: string | null }) {
    return (!!p.username && FOUNDER_USERNAMES.includes(p.username))
        || (!!p.humoId && FOUNDER_HUMO_IDS.includes(p.humoId));
}

// Matndan #hashtag larni ajratish (maks 10 ta)
export function extractHashtags(text: string): string[] {
    const tags = new Set<string>();
    const re = /#([\p{L}\p{N}_]+)/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) tags.add(m[1]);
    return [...tags].slice(0, 10);
}
