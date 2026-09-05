// Nexus Playlist - single.
//
//   GET    /api/nexus/playlists/[id]   - detail + trekkar
//   DELETE /api/nexus/playlists/[id]   - o'chirish (owner)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const profile = session?.user?.email ? await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    }) : null;

    const pl = await prisma.nexusPlaylist.findUnique({
        where: { id },
        include: {
            tracks: {
                orderBy: { position: "asc" },
            },
        },
    });
    if (!pl) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isMine = profile?.id === pl.ownerId;
    if (!pl.isPublic && !isMine) {
        return NextResponse.json({ error: "private" }, { status: 403 });
    }

    // Trek ma'lumot to'ldirish
    const trackIds = pl.tracks.map(t => t.trackId);
    const tracks = trackIds.length > 0 ? await prisma.nexusTrack.findMany({
        where: { id: { in: trackIds } },
    }) : [];
    const tMap = new Map(tracks.map(t => [t.id, t]));

    const owner = await prisma.userProfile.findUnique({
        where: { id: pl.ownerId },
        select: { username: true, name: true, image: true },
    });

    return NextResponse.json({
        id: pl.id, name: pl.name, description: pl.description,
        coverUrl: pl.coverUrl, isPublic: pl.isPublic, playsCount: pl.playsCount,
        updatedAt: pl.updatedAt.toISOString(),
        owner, isMine,
        tracks: pl.tracks.map(pt => {
            const t = tMap.get(pt.trackId);
            return t ? {
                id: t.id, title: t.title, artist: t.artist,
                coverUrl: t.coverUrl, audioUrl: t.audioUrl,
                durationSec: t.durationSec, kind: t.kind,
                position: pt.position, addedAt: pt.addedAt.toISOString(),
            } : null;
        }).filter(Boolean),
    });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const pl = await prisma.nexusPlaylist.findUnique({
        where: { id }, select: { ownerId: true },
    });
    if (!pl) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (pl.ownerId !== profile.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    await prisma.nexusPlaylist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
