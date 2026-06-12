import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/posts/[id]/vote — so'rovnomada ovoz berish (muddati tugaguncha o'zgartirish mumkin)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const post = await prisma.nexusPost.findUnique({
        where: { id }, select: { id: true, hidden: true, pollOptions: true, pollEndsAt: true },
    });
    if (!post || post.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!post.pollOptions.length) return NextResponse.json({ error: "So'rovnoma yo'q" }, { status: 400 });
    if (post.pollEndsAt && post.pollEndsAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "So'rovnoma tugagan" }, { status: 400 });
    }

    const { option } = await req.json();
    const idx = Number(option);
    if (!Number.isInteger(idx) || idx < 0 || idx >= post.pollOptions.length) {
        return NextResponse.json({ error: "Noto'g'ri variant" }, { status: 400 });
    }

    await prisma.nexusPollVote.upsert({
        where: { postId_profileId: { postId: id, profileId: me.id } },
        create: { postId: id, profileId: me.id, optionIdx: idx },
        update: { optionIdx: idx },
    });

    // Yangilangan natijalar
    const grouped = await prisma.nexusPollVote.groupBy({
        by: ["optionIdx"], where: { postId: id }, _count: { _all: true },
    });
    const counts: Record<number, number> = {};
    for (const g of grouped) counts[g.optionIdx] = g._count._all;
    const votes = post.pollOptions.map((_, i) => counts[i] ?? 0);

    return NextResponse.json({ votes, myVote: idx });
}
