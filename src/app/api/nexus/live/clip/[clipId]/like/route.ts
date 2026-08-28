import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch AB — Clip like toggle
export async function POST(_: Request, { params }: { params: Promise<{ clipId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { clipId } = await params;
    const existing = await prisma.nexusLiveClipLike.findUnique({
        where: { clipId_profileId: { clipId, profileId: me.id } },
        select: { id: true },
    });
    if (existing) {
        await prisma.$transaction([
            prisma.nexusLiveClipLike.delete({ where: { id: existing.id } }),
            prisma.nexusLiveClip.update({ where: { id: clipId }, data: { likes: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ liked: false });
    } else {
        try {
            await prisma.$transaction([
                prisma.nexusLiveClipLike.create({ data: { clipId, profileId: me.id } }),
                prisma.nexusLiveClip.update({ where: { id: clipId }, data: { likes: { increment: 1 } } }),
            ]);
            return NextResponse.json({ liked: true });
        } catch {
            return NextResponse.json({ error: "Xato" }, { status: 500 });
        }
    }
}
