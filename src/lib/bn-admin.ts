// BN admin ruxsatlari — bitta joyda.
import { prisma } from "@/lib/prisma";

export type BnAdminRoleT = "OWNER" | "MODERATOR";

export async function getBnAdminRole(profileId: string): Promise<BnAdminRoleT | null> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role ?? null;
}

export async function isBnAdmin(profileId: string): Promise<boolean> {
    const r = await getBnAdminRole(profileId);
    return r === "OWNER" || r === "MODERATOR";
}

export async function isBnOwner(profileId: string): Promise<boolean> {
    return (await getBnAdminRole(profileId)) === "OWNER";
}
