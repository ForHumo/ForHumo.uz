// Nexus pleylistlar — foydalanuvchi tomonidan tuzilgan trek to'plami.
// GET  /api/nexus/playlists?scope=mine|public → ro'yxat
// POST /api/nexus/playlists → { name, description?, coverUrl?, isPublic? }

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
        select: { id: true, username: true, image: true },
    });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "public";
    const me = await auth();

    const where = scope === "mine" && me
        ? { ownerId: me.id }
        : { isPublic: true };

    const playlists = await prisma.nexusPlaylist.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 60,
        include: {
            _count: { select: { tracks: true } },
            tracks: {
                take: 4,
                orderBy: { position: "asc" },
                select: { trackId: true },
            },
        },
    });

    // Trek cover'lari (birinchi 4 tasidan)
    const allTrackIds = [...new Set(playlists.flatMap(p => p.tracks.map(t => t.trackId)))];
    const trackCovers = allTrackIds.length > 0 ? await prisma.nexusTrack.findMany({
        where: { id: { in: allTrackIds } },
        select: { id: true, coverUrl: true },
    }) : [];
    const coverMap = new Map(trackCovers.map(t => [t.id, t.coverUrl]));

    // Owner nomlari
    const ownerIds = [...new Set(playlists.map(p => p.ownerId))];
    const owners = await prisma.userProfile.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const ownerMap = new Map(owners.map(o => [o.id, o]));

    return NextResponse.json({
        playlists: playlists.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            coverUrl: p.coverUrl,
            isPublic: p.isPublic,
            playsCount: p.playsCount,
            trackCount: p._count.tracks,
            previewCovers: p.tracks.map(t => coverMap.get(t.trackId) ?? null).filter(Boolean),
            owner: ownerMap.get(p.ownerId) ?? null,
            isMine: me?.id === p.ownerId,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        })),
    });
}

export async function POST(req: Request) {
    const me = await auth();
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 100);
    const description = body?.description ? String(body.description).trim().slice(0, 500) : null;
    const coverUrl = body?.coverUrl ? String(body.coverUrl).trim() : null;
    const isPublic = body?.isPublic !== false;

    if (name.length < 1) return NextResponse.json({ error: "invalid_name" }, { status: 400 });

    // Rate limit: bir foydalanuvchi 1 daqiqada 3 pleylist
    const recentCount = await prisma.nexusPlaylist.count({
        where: { ownerId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentCount >= 3) return NextResponse.json({ error: "rate_limit" }, { status: 429 });

    const playlist = await prisma.nexusPlaylist.create({
        data: { ownerId: me.id, name, description, coverUrl, isPublic },
    });
    return NextResponse.json({ ok: true, playlist });
}
