// eSport bildirishnomalari — fail-safe (xato yuzaga kelsa asosiy amalni buzmaydi).
import { prisma } from "@/lib/prisma";

interface NotifInput { type: string; title: string; body?: string | null; href?: string | null }

// Bitta foydalanuvchiga (profileId — UserProfile.id)
export async function esNotify(profileId: string | null | undefined, n: NotifInput) {
    if (!profileId) return;
    try {
        await prisma.esNotification.create({ data: { profileId, type: n.type, title: n.title, body: n.body ?? null, href: n.href ?? null } });
    } catch { /* jim */ }
}

// Bir nechta foydalanuvchiga
export async function esNotifyMany(profileIds: (string | null | undefined)[], n: NotifInput) {
    const ids = [...new Set(profileIds.filter(Boolean) as string[])];
    if (!ids.length) return;
    try {
        await prisma.esNotification.createMany({ data: ids.map(profileId => ({ profileId, type: n.type, title: n.title, body: n.body ?? null, href: n.href ?? null })) });
    } catch { /* jim */ }
}

// athleteId → uning Humo profil id'si (bildirishnoma uchun)
export async function athleteProfileId(athleteId: string): Promise<string | null> {
    const a = await prisma.esAthlete.findUnique({ where: { id: athleteId }, select: { humoProfileId: true } });
    return a?.humoProfileId ?? null;
}

// teamId → ega profileId
export async function teamOwnerId(teamId: string): Promise<string | null> {
    const t = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    return t?.ownerId ?? null;
}

// teamId → barcha a'zo Humo profil id'lari
export async function teamMemberProfileIds(teamId: string): Promise<string[]> {
    const rosters = await prisma.esRoster.findMany({ where: { teamId }, select: { members: { select: { athlete: { select: { humoProfileId: true } } } } } });
    return [...new Set(rosters.flatMap(r => r.members.map(m => m.athlete.humoProfileId)))];
}
