import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, getEsportAdmin, isEsportOwner } from "@/lib/esport";
import { formatMoney, type Currency } from "@/lib/money";

// GET /api/esport/tournaments/[id] — ommaviy tafsilot: turnir + ishtirokchilar + setka
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const t = await prisma.esTournament.findUnique({
        where: { id },
        include: {
            game: { select: { name: true, slug: true } },
            participants: { select: { teamId: true } },
            matches: { orderBy: [{ bracket: "asc" }, { round: "asc" }, { slot: "asc" }] },
        },
    });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });

    // Jamoa nomlari (ishtirokchilar + setka) + shu o'yindagi Elo (karta darajasi uchun)
    const teamIds = [...new Set([...t.participants.map(p => p.teamId), ...t.matches.flatMap(m => [m.teamAId, m.teamBId].filter(Boolean) as string[])])];
    const [teams, ratings] = await Promise.all([
        teamIds.length ? prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true, logo: true } }) : [],
        teamIds.length ? prisma.esRoster.findMany({ where: { gameId: t.gameId, teamId: { in: teamIds } }, select: { teamId: true, rating: true } }) : [],
    ]);
    const rMap = Object.fromEntries(ratings.map(r => [r.teamId, r.rating]));
    const tMap = Object.fromEntries(teams.map(x => [x.id, { ...x, rating: rMap[x.id] ?? 1000 }]));

    // Foydalanuvchining ro'yxatga olishi mumkin bo'lgan jamoalari (egasi)
    const me = await getMyProfile();
    let myTeams: { id: string; name: string; tag: string; logo: string | null; rating: number; registered: boolean }[] = [];
    if (me) {
        const owned = await prisma.esTeam.findMany({ where: { ownerId: me.id }, select: { id: true, name: true, tag: true, logo: true } });
        const ownedRatings = owned.length ? await prisma.esRoster.findMany({ where: { gameId: t.gameId, teamId: { in: owned.map(o => o.id) } }, select: { teamId: true, rating: true } }) : [];
        const orMap = Object.fromEntries(ownedRatings.map(r => [r.teamId, r.rating]));
        const regSet = new Set(t.participants.map(p => p.teamId));
        myTeams = owned.map(o => ({ ...o, rating: orMap[o.id] ?? 1000, registered: regSet.has(o.id) }));
    }

    const isAdmin = !!(await getEsportAdmin());
    const isOwner = !!me && isEsportOwner(me);
    const cur = (t.currency === "USD" ? "USD" : "UZS") as Currency;
    return NextResponse.json({
        isAdmin, isOwner,
        tournament: {
            id: t.id, name: t.name, game: t.game, status: t.status,
            prizePool: t.prizePool ? Number(t.prizePool) : null,
            prizeLabel: t.prizePool ? formatMoney(Number(t.prizePool), cur) : null,
            prizeFunded: Number(t.prizeFunded), prizeFundedLabel: formatMoney(Number(t.prizeFunded), cur),
            currency: cur, maxTeams: t.maxTeams, bracketReady: t.bracketReady, thirdPlace: t.thirdPlace,
            registrationEndsAt: t.registrationEndsAt, startsAt: t.startsAt, endsAt: t.endsAt,
        },
        participants: t.participants.map(p => tMap[p.teamId]).filter(Boolean),
        matches: t.matches.map(m => ({
            id: m.id, bracket: m.bracket, round: m.round, slot: m.slot,
            seedA: m.seedA, seedB: m.seedB, scoreA: m.scoreA, scoreB: m.scoreB,
            status: m.status, streamUrl: m.streamUrl, proofUrl: m.proofUrl, winnerId: m.winnerId,
            teamA: m.teamAId ? tMap[m.teamAId] ?? null : null,
            teamB: m.teamBId ? tMap[m.teamBId] ?? null : null,
        })),
        myTeams,
    });
}
