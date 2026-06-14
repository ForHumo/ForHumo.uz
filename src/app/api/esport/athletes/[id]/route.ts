import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/esport";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/esport/athletes/[id] — ommaviy sportchi profili
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const a = await prisma.esAthlete.findUnique({
        where: { id },
        select: { id: true, ign: true, gameUserId: true, gameServer: true, role: true, createdAt: true, humoProfileId: true, gameId: true, game: { select: { name: true, slug: true } } },
    });
    if (!a) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({
        where: { id: a.humoProfileId },
        select: { firstName: true, lastName: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    // Hozirgi jamoa + tarkibdagi roli + Elo
    const membership = await prisma.esRosterMember.findUnique({
        where: { athleteId: id },
        select: { role: true, roster: { select: { rating: true, team: { select: { id: true, name: true, tag: true, logo: true } } } } },
    });

    return NextResponse.json({
        athlete: {
            id: a.id, ign: a.ign, gameUserId: a.gameUserId, gameServer: a.gameServer, position: a.role,
            game: a.game, createdAt: a.createdAt,
            name: profile ? fullName(profile) : "", username: profile?.username ?? null,
            image: profile?.image ?? null, humoId: profile?.humoId ?? null,
            verified: profile ? isVerifiedProfile({ username: profile.username, humoId: profile.humoId, verified: profile.verified }) : false,
            team: membership ? { ...membership.roster.team, role: membership.role, rating: membership.roster.rating } : null,
        },
    });
}
