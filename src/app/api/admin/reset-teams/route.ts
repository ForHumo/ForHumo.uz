import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'YES') {
        return NextResponse.json({
            error: "Safety Lock Active. Add '?confirm=YES' to proceed."
        }, { status: 400 });
    }

    try {
        await prisma.joinRequest.deleteMany({});
        await prisma.teamMember.deleteMany({});
        const deleted = await prisma.team.deleteMany({});

        return NextResponse.json({
            success: true,
            message: `Deleted ${deleted.count} teams. Database is clean.`
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
