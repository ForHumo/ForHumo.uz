import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/esport";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/esport/athletes/[id] — ommaviy sportchi profili
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const a = await prisma.esAthlete.findUnique({
        where: { id },
        select: { id: true, ign: true, gameUserId: true, gameServer: true, role: true, createdAt: true, humoProfileId: true, gameId: true, image: true, marketValue: true, game: { select: { name: true, slug: true } } },
    });
    if (!a) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({
        where: { id: a.humoProfileId },
        select: { firstName: true, lastName: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    // Hozirgi jamoa + tarkibdagi roli + Elo (joriy/maksimal/minimal) + jamoaga qachon qo'shilgani
    const membership = await prisma.esRosterMember.findUnique({
        where: { athleteId: id },
        select: { role: true, joinedAt: true, roster: { select: { rating: true, peakRating: true, lowRating: true, team: { select: { id: true, name: true, tag: true, logo: true } } } } },
    });

    // Jamoa natijalari (g'alaba/mag'lubiyat) — divizion jadvallaridan
    let results = null as null | { wins: number; losses: number; played: number };
    if (membership) {
        const standings = await prisma.esStanding.findMany({ where: { teamId: membership.roster.team.id }, select: { wins: true, losses: true, played: true } });
        results = standings.reduce((acc, s) => ({ wins: acc.wins + s.wins, losses: acc.losses + s.losses, played: acc.played + s.played }), { wins: 0, losses: 0, played: 0 });
    }

    return NextResponse.json({
        athlete: {
            id: a.id, ign: a.ign, gameUserId: a.gameUserId, gameServer: a.gameServer, position: a.role,
            game: a.game, createdAt: a.createdAt,
            marketValue: a.marketValue ? Number(a.marketValue) : null,
            name: profile ? fullName(profile) : "", username: profile?.username ?? null,
            image: a.image ?? profile?.image ?? null, humoId: profile?.humoId ?? null,
            verified: profile ? isVerifiedProfile({ username: profile.username, humoId: profile.humoId, verified: profile.verified }) : false,
            team: membership ? {
                ...membership.roster.team, role: membership.role, joinedAt: membership.joinedAt,
                rating: membership.roster.rating, peakRating: membership.roster.peakRating, lowRating: membership.roster.lowRating,
            } : null,
            results,
        },
    });
}
