// GET    /api/nexus/karaoke/performances/[id] — bitta performance (permalink uchun)
// DELETE /api/nexus/karaoke/performances/[id] — o'z performance'ni o'chirish
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    const r = await prisma.nexusKaraokePerformance.findFirst({
        where: { id, hidden: false },
        include: { _count: { select: { likes: true, duets: true } } },
    });
    if (!r) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const [profile, track, liked] = await Promise.all([
        prisma.userProfile.findUnique({
            where: { id: r.profileId },
            select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
        }),
        prisma.nexusTrack.findUnique({
            where: { id: r.trackId },
            select: { id: true, title: true, artist: true, coverUrl: true, audioUrl: true, instrumentalUrl: true },
        }),
        meId ? prisma.nexusKaraokePerformanceLike.findUnique({
            where: { performanceId_profileId: { performanceId: id, profileId: meId } },
            select: { id: true },
        }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
        performance: {
            id: r.id, audioUrl: r.audioUrl, durationSec: r.durationSec, score: r.score,
            caption: r.caption, plays: r.plays, createdAt: r.createdAt,
            likeCount: r._count.likes, duetCount: r._count.duets,
            isLiked: !!liked, isMine: r.profileId === meId, duetOfId: r.duetOfId,
            performer: profile ? {
                name: profile.name, username: profile.username, image: profile.image,
                verified: isVerifiedProfile(profile),
                verifiedCategory: isVerifiedProfile(profile) ? (profile.verifiedCategory || null) : null,
            } : null,
            track: track ? {
                id: track.id, title: track.title, artist: track.artist,
                coverUrl: track.coverUrl, audioUrl: track.audioUrl, instrumentalUrl: track.instrumentalUrl,
            } : null,
        },
    });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const perf = await prisma.nexusKaraokePerformance.findUnique({ where: { id }, select: { profileId: true } });
    if (!perf) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (perf.profileId !== me.id) return NextResponse.json({ error: "not_owner" }, { status: 403 });

    await prisma.nexusKaraokePerformance.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
