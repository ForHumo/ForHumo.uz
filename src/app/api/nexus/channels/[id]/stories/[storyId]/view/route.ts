// POST /channels/[id]/stories/[storyId]/view — story ko'rildi belgilash (idempotent).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; storyId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ ok: true });
    const { id, storyId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ ok: true });

    const story = await prisma.nexusChannelStory.findUnique({
        where: { id: storyId }, select: { channelId: true, authorId: true },
    });
    if (!story || story.channelId !== id) return NextResponse.json({ ok: true });
    if (story.authorId === me.id) return NextResponse.json({ ok: true, mine: true });

    await prisma.nexusChannelStoryView.upsert({
        where: { storyId_profileId: { storyId, profileId: me.id } },
        create: { storyId, profileId: me.id },
        update: {},
    });
    return NextResponse.json({ ok: true });
}
