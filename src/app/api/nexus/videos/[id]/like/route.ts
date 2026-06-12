import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";

// POST /api/nexus/videos/[id]/like — like toggle
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.nexusVideoLike.findUnique({ where: { videoId_profileId: { videoId: id, profileId: me.id } } });
    if (existing) await prisma.nexusVideoLike.delete({ where: { id: existing.id } });
    else {
        await prisma.nexusVideoLike.create({ data: { videoId: id, profileId: me.id } });
        // Muallifga bildirishnoma (faqat like'da)
        after(async () => {
            const v = await prisma.nexusVideo.findUnique({ where: { id }, select: { profileId: true } });
            if (v) await nexusNotify({ recipientId: v.profileId, actorId: me.id, type: "VIDEO_LIKE", videoId: id });
        });
    }

    const count = await prisma.nexusVideoLike.count({ where: { videoId: id } });
    return NextResponse.json({ liked: !existing, count });
}
