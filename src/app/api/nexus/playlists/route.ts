// Nexus Playlist - CRUD.
//
//   GET  /api/nexus/playlists?scope=mine|public  - ro'yxat
//   POST /api/nexus/playlists  { name, description?, isPublic? }  - yaratish

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "mine";

    const where = scope === "public"
        ? { isPublic: true }
        : { ownerId: profile.id };

    const rows = await prisma.nexusPlaylist.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
            _count: { select: { tracks: true } },
        },
    });

    // Owner ma'lumot yig'ish (public bo'lsa)
    const ownerIds = [...new Set(rows.map(r => r.ownerId))];
    const owners = ownerIds.length > 0 ? await prisma.userProfile.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, username: true, name: true, image: true },
    }) : [];
    const ownerMap = new Map(owners.map(o => [o.id, o]));

    return NextResponse.json({
        items: rows.map(p => ({
            id: p.id, name: p.name, description: p.description,
            coverUrl: p.coverUrl, isPublic: p.isPublic,
            playsCount: p.playsCount,
            trackCount: p._count.tracks,
            updatedAt: p.updatedAt.toISOString(),
            owner: ownerMap.get(p.ownerId) ?? null,
            isMine: p.ownerId === profile.id,
        })),
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 100);
    if (!name || name.length < 2) {
        return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) || null : null;
    const isPublic = body?.isPublic !== false;
    const coverUrl = typeof body?.coverUrl === "string" ? body.coverUrl.slice(0, 500) || null : null;

    // Cheklov: 20 ta pleylist per user
    const count = await prisma.nexusPlaylist.count({ where: { ownerId: profile.id } });
    if (count >= 20) {
        return NextResponse.json({
            error: "limit_reached",
            message: "20 ta pleylist chegarasiga yetdingiz.",
        }, { status: 429 });
    }

    const pl = await prisma.nexusPlaylist.create({
        data: { ownerId: profile.id, name, description, isPublic, coverUrl },
    });

    return NextResponse.json({ ok: true, id: pl.id, name: pl.name });
}
