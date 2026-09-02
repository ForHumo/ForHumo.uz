// Nexus pleylist tafsiloti + treklar + delete + patch (rename/reorder)
// GET /api/nexus/playlists/[id] → to'liq (treklar bilan)
// PATCH { name?, description?, coverUrl?, isPublic?, order?: string[] (trackId[] tartibi) }
// DELETE — faqat egasi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function auth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await auth();
    const pl = await prisma.nexusPlaylist.findUnique({
        where: { id },
        include: {
            tracks: {
                orderBy: { position: "asc" },
                select: { trackId: true, position: true },
            },
        },
    });
    if (!pl) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!pl.isPublic && me?.id !== pl.ownerId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const trackIds = pl.tracks.map(t => t.trackId);
    const tracks = trackIds.length > 0 ? await prisma.nexusTrack.findMany({
        where: { id: { in: trackIds }, hidden: false },
        select: { id: true, title: true, artist: true, coverUrl: true, audioUrl: true, durationSec: true, kind: true },
    }) : [];
    const tMap = new Map(tracks.map(t => [t.id, t]));
    const orderedTracks = pl.tracks
        .map(pt => tMap.get(pt.trackId))
        .filter((t): t is NonNullable<typeof t> => t !== undefined);

    const owner = await prisma.userProfile.findUnique({
        where: { id: pl.ownerId },
        select: { id: true, name: true, username: true, image: true },
    });

    return NextResponse.json({
        id: pl.id,
        name: pl.name,
        description: pl.description,
        coverUrl: pl.coverUrl ?? orderedTracks[0]?.coverUrl ?? null,
        isPublic: pl.isPublic,
        playsCount: pl.playsCount,
        tracks: orderedTracks,
        owner,
        isMine: me?.id === pl.ownerId,
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await auth();
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const pl = await prisma.nexusPlaylist.findUnique({ where: { id }, select: { ownerId: true } });
    if (!pl || pl.ownerId !== me.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string") data.name = body.name.trim().slice(0, 100);
    if (typeof body?.description === "string") data.description = body.description.trim().slice(0, 500) || null;
    if (typeof body?.coverUrl === "string") data.coverUrl = body.coverUrl.trim() || null;
    if (typeof body?.isPublic === "boolean") data.isPublic = body.isPublic;

    if (Object.keys(data).length > 0) {
        await prisma.nexusPlaylist.update({ where: { id }, data });
    }

    // Tartibni yangilash (reorder)
    if (Array.isArray(body?.order) && body.order.length > 0) {
        await prisma.$transaction(
            body.order.map((trackId: string, i: number) =>
                prisma.nexusPlaylistTrack.updateMany({
                    where: { playlistId: id, trackId },
                    data: { position: i },
                }),
            ),
        );
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await auth();
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const pl = await prisma.nexusPlaylist.findUnique({ where: { id }, select: { ownerId: true } });
    if (!pl || pl.ownerId !== me.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.nexusPlaylist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
