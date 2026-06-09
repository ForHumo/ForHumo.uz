// DM yordamchilari — juftlikni normalizatsiya, boshqa ishtirokchi, o'qilmagan holat.

export function normalizePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
}

export function otherId(c: { user1Id: string; user2Id: string }, me: string): string {
    return c.user1Id === me ? c.user2Id : c.user1Id;
}

export function myReadAt(
    c: { user1Id: string; user1ReadAt: Date | null; user2ReadAt: Date | null },
    me: string,
): Date | null {
    return c.user1Id === me ? c.user1ReadAt : c.user2ReadAt;
}

export function hasUnread(
    c: { user1Id: string; lastSenderId: string | null; lastMessageAt: Date; user1ReadAt: Date | null; user2ReadAt: Date | null },
    me: string,
): boolean {
    if (!c.lastSenderId || c.lastSenderId === me) return false;
    const r = myReadAt(c, me);
    return !r || c.lastMessageAt > r;
}
