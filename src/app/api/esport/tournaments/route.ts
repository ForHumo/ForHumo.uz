import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Holatni sana bo'yicha avtomatik aniqlash (Rejada/Ro'yxat/Jonli/Tugadi)
function deriveStatus(t: { registrationStartsAt: Date | null; registrationEndsAt: Date | null; startsAt: Date | null; endsAt: Date | null; status: string }): string {
    const now = Date.now();
    if (t.endsAt && now > t.endsAt.getTime()) return "ENDED";
    if (t.startsAt && now >= t.startsAt.getTime()) return "LIVE";
    if (t.registrationStartsAt && t.registrationEndsAt && now >= t.registrationStartsAt.getTime() && now < t.registrationEndsAt.getTime()) return "REGISTRATION";
    if (t.registrationStartsAt || t.startsAt) return "UPCOMING";
    return t.status;
}

// GET /api/esport/tournaments?gameId=&status= — ommaviy turnirlar ro'yxati
export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const gameId = sp.get("gameId") || undefined;

    const tournaments = await prisma.esTournament.findMany({
        where: { ...(gameId ? { gameId } : {}) },
        orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }], take: 100,
        include: {
            game: { select: { name: true, slug: true } },
            _count: { select: { participants: true } },
        },
    });

    // Divizionlarni alohida olamiz (EsTournament'da division relation yo'q)
    const divIds = [...new Set(tournaments.map(t => t.divisionId).filter(Boolean) as string[])];
    const divs = divIds.length ? await prisma.esDivision.findMany({ where: { id: { in: divIds } }, select: { id: true, name: true, tier: true, capacity: true } }) : [];
    const divMap = Object.fromEntries(divs.map(d => [d.id, d]));

    let list = tournaments.map(t => {
        const status = deriveStatus(t);
        const div = t.divisionId ? divMap[t.divisionId] : null;
        const isOpen = div ? div.capacity == null : false;
        return {
            id: t.id, name: t.name, game: t.game, status,
            division: div ? { name: div.name, tier: div.tier } : null,
            isOpen,
            prizePool: t.prizePool ? Number(t.prizePool) : null, currency: t.currency,
            maxTeams: t.maxTeams, teams: t._count.participants,
            registrationStartsAt: t.registrationStartsAt, registrationEndsAt: t.registrationEndsAt,
            bracketAt: t.bracketAt, startsAt: t.startsAt, endsAt: t.endsAt,
        };
    });

    const filter = sp.get("status") || undefined;
    if (filter) list = list.filter(t => t.status === filter);

    // Tartib: Jonli → Ro'yxat → Rejada → Tugadi
    const rank = (s: string) => (s === "LIVE" ? 0 : s === "REGISTRATION" ? 1 : s === "UPCOMING" ? 2 : 3);
    list.sort((a, b) => rank(a.status) - rank(b.status) || ((a.startsAt ? new Date(a.startsAt).getTime() : 0) - (b.startsAt ? new Date(b.startsAt).getTime() : 0)));

    return NextResponse.json({ tournaments: list });
}
