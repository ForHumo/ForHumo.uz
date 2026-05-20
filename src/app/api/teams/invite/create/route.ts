import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { teamId, userId } = await req.json();

        if (!teamId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });

        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        if (team.ownerId !== userId) return NextResponse.json({ error: 'Only the owner can generate invite codes' }, { status: 403 });

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

        const invite = await prisma.teamInvite.create({
            data: {
                teamId,
                createdBy: userId,
                code,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                maxUses: 100,
            }
        });

        return NextResponse.json(invite);

    } catch (error) {
        console.error('Error creating invite:', error);
        return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 });
    }
}
