// POST /api/nexus/karaoke/performances/[id]/like — toggle like + notify
import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const perf = await prisma.nexusKaraokePerformance.findUnique({
        where: { id }, select: { id: true, profileId: true, trackId: true },
    });
    if (!perf) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const existing = await prisma.nexusKaraokePerformanceLike.findUnique({
        where: { performanceId_profileId: { performanceId: id, profileId: me.id } },
    });
    if (existing) {
        await prisma.nexusKaraokePerformanceLike.delete({ where: { id: existing.id } });
    } else {
        await prisma.nexusKaraokePerformanceLike.create({
            data: { performanceId: id, profileId: me.id },
        }).catch(() => { });
        // Notify — faqat like qo'shilganida (unlike'da yubormaymiz)
        after(() => nexusNotify({
            recipientId: perf.profileId, actorId: me.id, type: "TRACK_LIKE", trackId: perf.trackId,
        }));
    }
    const count = await prisma.nexusKaraokePerformanceLike.count({ where: { performanceId: id } });
    return NextResponse.json({ liked: !existing, count });
}
