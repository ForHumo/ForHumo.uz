// Humo eSport — umumiy server yordamchilari.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eSport EGASI — FAQAT bitta hisob (CEO). Boshqa founderlar ham ega EMAS.
export const ESPORT_OWNER_HUMO_ID = "UZ6889574";
export const ESPORT_OWNER_USERNAME = "abduvoris";

// MLBB pozitsiyalari (sportchi roli — ixtiyoriy)
export const MLBB_ROLES = ["Gold Laner", "Mid Laner", "Roamer", "EXP Laner", "Jungler"] as const;

// Joriy foydalanuvchi Humo ID profili (sessiyadan)
export async function getMyProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, humoId: true, username: true, firstName: true, lastName: true, name: true, image: true },
    });
}

// Profil to'liq ismi (firstName + lastName), bo'lmasa name
export function fullName(p: { firstName?: string | null; lastName?: string | null; name?: string | null }): string {
    const fn = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    return fn || p.name?.trim() || "";
}

// eSport EGASI = FAQAT UZ6889574 (CEO). Ega adminlarni boshqaradi.
export function isEsportOwner(p: { username?: string | null; humoId?: string | null } | null): boolean {
    if (!p) return false;
    return p.humoId === ESPORT_OWNER_HUMO_ID || p.username === ESPORT_OWNER_USERNAME;
}

// eSport ADMIN = ega YOKI EsAdmin jadvalidagi Humo ID. null = ruxsat yo'q.
export async function getEsportAdmin() {
    const me = await getMyProfile();
    if (!me) return null;
    if (isEsportOwner(me)) return me;
    if (me.humoId) {
        const adm = await prisma.esAdmin.findUnique({ where: { humoId: me.humoId }, select: { id: true } });
        if (adm) return me;
    }
    return null;
}

// Faqat ega (admin boshqaruvi uchun).
export async function getEsportOwner() {
    const me = await getMyProfile();
    return me && isEsportOwner(me) ? me : null;
}

// Jamoani to'liq o'chirish (yagona manba): ochiq transferlarni bekor qiladi,
// standings'ni o'chiradi (EsStanding'да team FK yo'q — orphan "arvoh" qator qolmasin),
// keyin jamoani o'chiradi (roster/a'zo/so'rov/invite/ariza cascade bilan ketadi).
export async function purgeTeam(teamId: string) {
    await prisma.esTransfer.updateMany({
        where: { OR: [{ toTeamId: teamId }, { fromTeamId: teamId }], status: { in: ["PLAYER_PENDING", "AWAIT_FEE", "CLUB_PENDING"] } },
        data: { status: "CANCELLED" },
    });
    await prisma.esStanding.deleteMany({ where: { teamId } });
    await prisma.esTeam.delete({ where: { id: teamId } });
}

// Foydalanuvchi allaqachon biror jamodami (ega YOKI a'zo)? — bitta odam = bitta jamoa.
export async function userHasTeam(profileId: string): Promise<boolean> {
    const owned = await prisma.esTeam.count({ where: { ownerId: profileId } });
    if (owned > 0) return true;
    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: profileId }, select: { id: true } });
    if (!athlete) return false;
    const member = await prisma.esRosterMember.count({ where: { athleteId: athlete.id } });
    return member > 0;
}
