import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const teams = await prisma.team.findMany({
            include: {
                members: { include: { user: true } },
                requests: { include: { user: true } }
            }
        });

        const mappedTeams = teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            tag: t.tag,
            logo: t.logo || undefined,
            level: t.level,
            createdAt: t.createdAt.toISOString(),
            ownerId: t.ownerId,
            captainId: t.captainId,
            status: t.status,
            disbandedAt: t.disbandedAt?.toISOString(),
            disbandReason: t.disbandReason || undefined,
            stats: {
                wins: t.wins,
                losses: t.losses,
                tournamentsPlayed: t.tournamentsPlayed
            },
            members: (t.members || []).map((m: any) => ({
                playerId: m.userId,
                role: m.role,
                joinedAt: m.joinedAt.toISOString(),
                playerDetails: m.user ? {
                    nickname: m.user.nickname,
                    avatar: m.user.avatar,
                    level: m.user.level || 1
                } : undefined
            })),
            requests: (t.requests || []).map((r: any) => ({
                playerId: r.userId,
                status: r.status,
                requestedAt: r.createdAt.toISOString(),
                playerDetails: r.user ? {
                    nickname: r.user.nickname,
                    avatar: r.user.avatar,
                    level: r.user.level || 1
                } : undefined
            })),
            invites: [],
        }));

        return NextResponse.json(mappedTeams);

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
