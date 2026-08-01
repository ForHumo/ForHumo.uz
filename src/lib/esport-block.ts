// Sportchini bloklash + jamoa boshqaruvi (bloklangan ega o'rnida Vice owner).
import { prisma } from "@/lib/prisma";

// "Abadiy" blok uchun uzoq sana (UI shuni "abadiy" deb ko'rsatadi).
export const PERMANENT_BLOCK = new Date("2099-12-31T00:00:00.000Z");

export function isBlocked(a: { blockedUntil: Date | null } | null | undefined): boolean {
    return !!(a?.blockedUntil && a.blockedUntil.getTime() > Date.now());
}

// Humo ID profili (athlete) bloklanganmi?
export async function isProfileBlocked(humoProfileId: string): Promise<boolean> {
    const a = await prisma.esAthlete.findUnique({ where: { humoProfileId }, select: { blockedUntil: true } });
    return isBlocked(a);
}

// Jamoani kim boshqara oladi: ega (bloklanmagan bo'lsa) YOKI ega bloklangan bo'lsa — Vice owner.
export async function canManageTeam(profileId: string, teamId: string): Promise<boolean> {
    const team = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (!team) return false;
    const ownerBlocked = await isProfileBlocked(team.ownerId);
    if (team.ownerId === profileId) return !ownerBlocked; // ega bloklangan bo'lsa boshqara olmaydi
    if (ownerBlocked) {
        const vice = await prisma.esTeamStaff.findFirst({ where: { teamId, profileId, role: "VICE_OWNER" }, select: { id: true } });
        return !!vice;
    }
    return false;
}
