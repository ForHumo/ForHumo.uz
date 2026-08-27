// GET /channels/[id]/messages/[messageId]/poll-voters
// So'rovnoma ovoz beruvchilari — variant bo'yicha guruhlangan (a'zolar ko'radi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true, pollQuestion: true, pollOptions: true },
    });
    if (!msg || msg.channelId !== id || !msg.pollQuestion) return NextResponse.json({ error: "not_poll" }, { status: 404 });

    const votes = await prisma.nexusChannelPollVote.findMany({
        where: { messageId },
        orderBy: { createdAt: "asc" },
    });
    const profileIds = Array.from(new Set(votes.map(v => v.profileId)));
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));

    // Options bo'yicha guruhlash
    const groups = msg.pollOptions.map((opt, idx) => ({
        optionIndex: idx,
        optionText: opt,
        voters: votes.filter(v => v.optionIndex === idx).map(v => pMap.get(v.profileId)).filter(Boolean),
    }));

    return NextResponse.json({
        question: msg.pollQuestion,
        totalVotes: votes.length,
        totalVoters: profileIds.length,
        groups,
    });
}
