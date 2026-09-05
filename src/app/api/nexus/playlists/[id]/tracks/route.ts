// Playlist ichidagi tracks CRUD.
//
//   POST   /api/nexus/playlists/[id]/tracks  { trackId }  - qo'shish
//   DELETE /api/nexus/playlists/[id]/tracks?trackId=xxx  - olib tashlash

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireOwner(id: string, email: string): Promise<{ profileId: string } | null> {
    const profile = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!profile) return null;
    const pl = await prisma.nexusPlaylist.findUnique({ where: { id }, select: { ownerId: true } });
    if (!pl || pl.ownerId !== profile.id) return null;
    return { profileId: profile.id };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const owner = await requireOwner(id, session.user.email);
    if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const trackId = typeof body?.trackId === "string" ? body.trackId : null;
    if (!trackId) return NextResponse.json({ error: "trackId_required" }, { status: 400 });

    const track = await prisma.nexusTrack.findUnique({ where: { id: trackId }, select: { id: true } });
    if (!track) return NextResponse.json({ error: "track_not_found" }, { status: 404 });

    // Position - eng oxirgi
    const last = await prisma.nexusPlaylistTrack.findFirst({
        where: { playlistId: id }, orderBy: { position: "desc" }, select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    try {
        await prisma.nexusPlaylistTrack.create({
            data: { playlistId: id, trackId, position },
        });
    } catch {
        return NextResponse.json({ ok: true, alreadyAdded: true });
    }
    await prisma.nexusPlaylist.update({
        where: { id }, data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, position });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const owner = await requireOwner(id, session.user.email);
    if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    if (!trackId) return NextResponse.json({ error: "trackId_required" }, { status: 400 });

    await prisma.nexusPlaylistTrack.deleteMany({
        where: { playlistId: id, trackId },
    });
    await prisma.nexusPlaylist.update({
        where: { id }, data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
