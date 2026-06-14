// Humo eSport — umumiy server yordamchilari.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

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

// eSport EGASI = founder (CEO + UZ6889574). Egalar adminlarni boshqaradi.
export function isEsportOwner(p: { username?: string | null; humoId?: string | null } | null): boolean {
    return isFounderProfile(p ?? undefined);
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
