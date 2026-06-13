// Sportchini jamoa tarkibiga qo'shish — invite-qabul va join-request-qabul shundan foydalanadi.
import { prisma } from "@/lib/prisma";

export type AddResult = "ok" | "already_in_team" | "no_athlete" | "roster_full" | "error";

const ROSTER_EXTRA = 5; // teamSize + 5 (asosiy + zaxiralar)

export const ADD_MSG: Record<AddResult, string> = {
    ok: "Qo'shildi",
    already_in_team: "Sportchi allaqachon boshqa jamoada — avval chiqishi kerak",
    no_athlete: "Sportchi profili topilmadi",
    roster_full: "Tarkib to'lgan",
    error: "Xatolik yuz berdi",
};

// Sportchini jamoaning o'z o'yini tarkibiga qo'shadi. Roster bo'lmasa yaratiladi.
// Birinchi a'zo CAPTAIN bo'ladi. Sportchi bir vaqtda faqat bitta tarkibda bo'la oladi.
export async function addAthleteToTeam(athleteId: string, teamId: string): Promise<AddResult> {
    try {
        const athlete = await prisma.esAthlete.findUnique({
            where: { id: athleteId },
            select: { id: true, gameId: true, game: { select: { teamSize: true } } },
        });
        if (!athlete) return "no_athlete";

        const existing = await prisma.esRosterMember.findUnique({ where: { athleteId }, select: { id: true } });
        if (existing) return "already_in_team";

        let roster = await prisma.esRoster.findUnique({ where: { teamId_gameId: { teamId, gameId: athlete.gameId } } });
        if (!roster) roster = await prisma.esRoster.create({ data: { teamId, gameId: athlete.gameId } });

        const count = await prisma.esRosterMember.count({ where: { rosterId: roster.id } });
        if (count >= athlete.game.teamSize + ROSTER_EXTRA) return "roster_full";

        await prisma.esRosterMember.create({
            data: { rosterId: roster.id, athleteId, role: count === 0 ? "CAPTAIN" : "STARTER" },
        });
        return "ok";
    } catch {
        return "error";
    }
}

// Qisqa taklif-kod (o'qilishi oson — chalkash belgilarsiz)
export function genInviteCode(len = 6): string {
    const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < len; i++) s += ch[Math.floor(Math.random() * ch.length)];
    return s;
}
