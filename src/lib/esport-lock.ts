// Roster lock — jamoa active turnirda (bracket tuzilgan, tugamagan) bo'lsa tarkibi qulflanadi.
// Ringer/manipulyatsiyani to'sadi: transfer/chiqish/chiqarish/qo'shilish/o'chirish bloklanadi.
import { prisma } from "@/lib/prisma";

// Berilgan o'yin (game) bo'yicha jamoa tarkibi qulfdami?
// Qulf: jamoa shu o'yinning bracketReady && status≠ENDED turnirida qatnashayotgan bo'lsa.
export async function isTeamLockedForGame(teamId: string, gameId: string): Promise<boolean> {
    const t = await prisma.esTournamentTeam.findFirst({
        where: { teamId, tournament: { gameId, bracketReady: true, status: { not: "ENDED" } } },
        select: { id: true },
    });
    return !!t;
}

// Jamoa umuman biror active turnirda qatnashayaptimi (o'yindan qat'i nazar)?
// TEAM_DELETE va solo-delete uchun.
export async function isTeamLockedAny(teamId: string): Promise<boolean> {
    const t = await prisma.esTournamentTeam.findFirst({
        where: { teamId, tournament: { bracketReady: true, status: { not: "ENDED" } } },
        select: { id: true },
    });
    return !!t;
}
