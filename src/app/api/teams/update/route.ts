import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
    try {
        const { teamId, userId, name, tag, logo } = await req.json();

        if (!teamId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });

        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        if (team.ownerId !== userId) return NextResponse.json({ error: 'Only the owner can update team settings' }, { status: 403 });

        if (tag && tag !== team.tag) {
            const existingTag = await prisma.team.findUnique({ where: { tag } });
            if (existingTag) return NextResponse.json({ error: 'Tag already taken' }, { status: 409 });
        }

        if (name && name !== team.name) {
            const existingName = await prisma.team.findFirst({
                where: { name: { equals: name, mode: 'insensitive' }, NOT: { id: teamId } }
            });
            if (existingName) return NextResponse.json({ error: 'Team name already taken' }, { status: 409 });
        }

        const latinNameRegex = /^[a-zA-Z0-9 ]+$/;
        const tagRegex = /^[A-Z0-9]{2,4}$/;

        if (name && !latinNameRegex.test(name)) return NextResponse.json({ error: 'Name must be Latin letters/numbers' }, { status: 400 });
        if (tag && !tagRegex.test(tag)) return NextResponse.json({ error: 'Tag must be 2-4 Uppercase Latin letters/numbers' }, { status: 400 });

        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: {
                name: name || undefined,
                tag: tag || undefined,
                logo: logo || undefined
            }
        });

        return NextResponse.json(updatedTeam);

    } catch (error) {
        console.error('Error updating team:', error);
        return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }
}
