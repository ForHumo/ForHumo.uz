import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/channels/[id]/messages/[messageId]/poll-vote
// body: { optionIndex: number }
export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Kanal a'zosi bo'lishi kerak
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Avval kanalga qo'shiling" }, { status: 403 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { id: true, channelId: true, pollOptions: true, pollExpiresAt: true, pollMulti: true, pollQuestion: true },
    });
    if (!msg || msg.channelId !== channelId) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (!msg.pollQuestion) return NextResponse.json({ error: "Bu so'rovnoma emas" }, { status: 400 });
    if (msg.pollExpiresAt && msg.pollExpiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "So'rovnoma muddati tugagan" }, { status: 400 });
    }

    const { optionIndex } = (await req.json()) as { optionIndex?: number };
    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= msg.pollOptions.length) {
        return NextResponse.json({ error: "Noto'g'ri variant" }, { status: 400 });
    }

    if (msg.pollMulti) {
        const existing = await prisma.nexusChannelPollVote.findFirst({
            where: { messageId, profileId: me.id, optionIndex }, select: { id: true },
        });
        if (existing) {
            await prisma.nexusChannelPollVote.delete({ where: { id: existing.id } });
        } else {
            await prisma.nexusChannelPollVote.create({ data: { messageId, profileId: me.id, optionIndex } });
        }
    } else {
        await prisma.$transaction([
            prisma.nexusChannelPollVote.deleteMany({ where: { messageId, profileId: me.id } }),
            prisma.nexusChannelPollVote.create({ data: { messageId, profileId: me.id, optionIndex } }),
        ]);
    }

    const allVotes = await prisma.nexusChannelPollVote.findMany({
        where: { messageId }, select: { profileId: true, optionIndex: true },
    });
    const counts = msg.pollOptions.map((_, i) => allVotes.filter(v => v.optionIndex === i).length);
    const myVotes = allVotes.filter(v => v.profileId === me.id).map(v => v.optionIndex);
    const total = new Set(allVotes.map(v => v.profileId)).size;

    return NextResponse.json({ ok: true, counts, myVotes, total });
}
