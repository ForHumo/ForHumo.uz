// Humo eSport — umumiy server yordamchilari.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
