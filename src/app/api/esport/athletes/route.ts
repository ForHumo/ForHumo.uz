import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/athletes?q=&gameId= — barcha kibersportchilar (transfer bozori kartalari)
export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") || "").trim();
    const gameId = sp.get("gameId") || undefined;

    const athletes = await prisma.esAthlete.findMany({
        where: {
            ...(gameId ? { gameId } : {}),
            ...(q ? { ign: { contains: q, mode: "insensitive" } } : {}),
        },
        select: { id: true, ign: true, role: true, image: true, marketValue: true, humoProfileId: true, gameId: true, game: { select: { name: true, slug: true } } },
        take: 100,
    });

    const humoIds = [...new Set(athletes.map(a => a.humoProfileId))];
    const profs = humoIds.length ? await prisma.userProfile.findMany({ where: { id: { in: humoIds } }, select: { id: true, image: true } }) : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const ids = athletes.map(a => a.id);
    const memberships = ids.length ? await prisma.esRosterMember.findMany({
        where: { athleteId: { in: ids } },
        select: { athleteId: true, roster: { select: { rating: true, team: { select: { name: true, tag: true, logo: true } } } } },
    }) : [];
    const mMap = Object.fromEntries(memberships.map(m => [m.athleteId, m.roster]));

    const cards = athletes.map(a => ({
        id: a.id, ign: a.ign, position: a.role, game: a.game?.name ?? null,
        image: a.image ?? pMap[a.humoProfileId]?.image ?? null,
        marketValue: a.marketValue ? Number(a.marketValue) : null,
        team: mMap[a.id]?.team ?? null,
        rating: mMap[a.id]?.rating ?? null,
    }));
    // Eng qimmat / eng kuchli avval
    cards.sort((x, y) => (y.marketValue ?? -1) - (x.marketValue ?? -1) || (y.rating ?? 0) - (x.rating ?? 0));

    return NextResponse.json({ athletes: cards });
}
