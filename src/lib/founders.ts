// Asoschi (founder) hisoblar — yagona manba.
// Market brend imtiyozi, Nexus "verified" belgisi va admin moderatsiya shu yerdan foydalanadi.

export const FOUNDER_USERNAMES = ["abduvoris", "aaa"];
export const FOUNDER_HUMO_IDS = ["UZ6889574", "UZ3549920"];

export function isFounderProfile(
    p: { username?: string | null; humoId?: string | null } | null | undefined,
): boolean {
    if (!p) return false;
    return (!!p.username && FOUNDER_USERNAMES.includes(p.username))
        || (!!p.humoId && FOUNDER_HUMO_IDS.includes(p.humoId));
}
