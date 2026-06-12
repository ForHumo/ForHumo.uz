import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/tracks/[id] — bitta trek (permalink uchun)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const t = await prisma.nexusTrack.findUnique({
        where: { id }, include: { _count: { select: { likes: true } } },
    });
    if (!t || t.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const session = await getServerSession(authOptions);
    let meId: string | null = null, isLiked = false;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
        if (meId) {
            const lk = await prisma.nexusTrackLike.findUnique({ where: { trackId_profileId: { trackId: id, profileId: meId } } });
            isLiked = !!lk;
        }
    }
    const p = await prisma.userProfile.findUnique({ where: { id: t.profileId }, select: { name: true, username: true, image: true, humoId: true, verified: true } });

    return NextResponse.json({
        track: {
            id: t.id, title: t.title, artist: t.artist, audioUrl: t.audioUrl, coverUrl: t.coverUrl,
            durationSec: t.durationSec, kind: t.kind, genre: t.genre, plays: t.plays,
            likeCount: t._count.likes, isLiked, isMine: t.profileId === meId, createdAt: t.createdAt,
            uploader: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
        },
    });
}

// DELETE /api/nexus/tracks/[id] — o'z trekini o'chirish
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    await prisma.nexusTrack.deleteMany({ where: { id, profileId: me.id } });
    return NextResponse.json({ ok: true });
}
