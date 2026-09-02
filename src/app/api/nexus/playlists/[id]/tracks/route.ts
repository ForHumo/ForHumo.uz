// Pleylistga trek qo'shish va o'chirish.
// POST { trackId } → oxirgi position'ga qo'shadi
// DELETE ?trackId=xxx → o'chiradi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireOwner(playlistId: string): Promise<{ ok: true; ownerId: string } | NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const pl = await prisma.nexusPlaylist.findUnique({ where: { id: playlistId }, select: { ownerId: true } });
    if (!pl || pl.ownerId !== me.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return { ok: true, ownerId: me.id };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const own = await requireOwner(id);
    if ("error" in (own as Record<string, unknown>) === false && !("ok" in own)) return own as NextResponse;
    if (!("ok" in own)) return own;

    const body = await req.json().catch(() => ({}));
    const trackId = String(body?.trackId ?? "").trim();
    if (!trackId) return NextResponse.json({ error: "invalid_track" }, { status: 400 });

    const track = await prisma.nexusTrack.findUnique({ where: { id: trackId }, select: { id: true, hidden: true } });
    if (!track || track.hidden) return NextResponse.json({ error: "track_not_found" }, { status: 404 });

    const last = await prisma.nexusPlaylistTrack.findFirst({
        where: { playlistId: id },
        orderBy: { position: "desc" },
        select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    try {
        const item = await prisma.nexusPlaylistTrack.create({
            data: { playlistId: id, trackId, position },
        });
        return NextResponse.json({ ok: true, item });
    } catch {
        return NextResponse.json({ error: "already_added" }, { status: 409 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const own = await requireOwner(id);
    if (!("ok" in own)) return own;

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId") || "";
    if (!trackId) return NextResponse.json({ error: "invalid_track" }, { status: 400 });

    await prisma.nexusPlaylistTrack.deleteMany({ where: { playlistId: id, trackId } });
    return NextResponse.json({ ok: true });
}
