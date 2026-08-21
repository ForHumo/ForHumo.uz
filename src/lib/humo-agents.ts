// For Humo rasmiy agentlar — 9 ta system identity + boshqaruv mantiq'i.
//
// Har agent alohida UserProfile: @forhumo (CEO), @id, @ai, @nexus, @esport,
// @market, @pay, @bn, @support. Ular username shu bilan kanal/guruh yaratish
// uchun. CEO ceo@forhumo.uz (UZ0000001) — @forhumo agentining o'zi + qolgan
// 8 agent uchun manager.
//
// Ba'zi joylarda cheklovlar (masalan agent nomiga waitlist qo'yish, agentga
// pack yaratish ruxsat berilmasin) shu ro'yxatga qaraladi.

import { prisma } from "@/lib/prisma";

/** Rasmiy agentlar ro'yxati. TARTIB modul importance bo'yicha. */
export const OFFICIAL_AGENT_USERNAMES = [
    "forhumo",
    "id",
    "ai",
    "nexus",
    "esport",
    "market",
    "pay",
    "bn",
    "support",
] as const;

export type OfficialAgentUsername = typeof OFFICIAL_AGENT_USERNAMES[number];

/** CEO Humo ID — @forhumo va boshqa barcha agent'lar nazoratchisi. */
export const CEO_HUMO_ID = "UZ0000001";
export const CEO_EMAIL = "ceo@forhumo.uz";

/** Username rasmiy agent'mi (case-insensitive). */
export function isOfficialAgentUsername(username: string | null | undefined): username is OfficialAgentUsername {
    if (!username) return false;
    return OFFICIAL_AGENT_USERNAMES.includes(username.toLowerCase() as OfficialAgentUsername);
}

/** CEO profil ma'lumotini olish. */
export async function getCeoProfile() {
    return prisma.userProfile.findFirst({
        where: { humoId: CEO_HUMO_ID },
        select: { id: true, username: true, email: true, humoId: true, name: true, image: true },
    });
}

/** Profil rasmiy agent'ni boshqara oladimi. CEO — hammasini. Kelajakda delegat rollari qo'shilishi mumkin. */
export async function canManageAgent(profileId: string, agentUsername: string): Promise<boolean> {
    if (!isOfficialAgentUsername(agentUsername)) return false;
    const agent = await prisma.userProfile.findFirst({
        where: { username: agentUsername.toLowerCase() },
        select: { id: true, managerId: true, isOfficialAgent: true },
    });
    if (!agent || !agent.isOfficialAgent) return false;
    // @forhumo o'zi — CEO'ning o'zi
    if (agent.id === profileId) return true;
    return agent.managerId === profileId;
}

/** Bu profil boshqara oladigan barcha rasmiy agent'lar. */
export async function getManagedAgents(profileId: string) {
    return prisma.userProfile.findMany({
        where: {
            isOfficialAgent: true,
            OR: [
                { managerId: profileId },
                { id: profileId },   // @forhumo bo'lsa o'zi ham
            ],
        },
        select: { id: true, username: true, humoId: true, name: true, image: true },
        orderBy: { username: "asc" },
    });
}
