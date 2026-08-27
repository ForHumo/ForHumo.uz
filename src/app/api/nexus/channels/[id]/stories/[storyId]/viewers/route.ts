// GET /channels/[id]/stories/[storyId]/viewers — muallif ko'radi:
// Kim story'ni ko'rgan, qachon. Ko'rilgan tartibda (yangi birinchi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; storyId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, storyId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const story = await prisma.nexusChannelStory.findUnique({
        where: { id: storyId }, select: { authorId: true, channelId: true },
    });
    if (!story || story.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Faqat muallif yoki OWNER/ADMIN ko'radi
    if (story.authorId !== me.id) {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: id, profileId: me.id } },
            select: { role: true },
        });
        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
    }

    const views = await prisma.nexusChannelStoryView.findMany({
        where: { storyId },
        orderBy: { viewedAt: "desc" },
        take: 500,
    });
    const profiles = views.length ? await prisma.userProfile.findMany({
        where: { id: { in: views.map(v => v.profileId) } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        viewers: views.map(v => ({
            profileId: v.profileId,
            viewedAt: v.viewedAt,
            profile: pMap.get(v.profileId) ?? null,
        })),
        total: views.length,
    });
}
