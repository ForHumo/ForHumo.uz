import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function meAndOwn(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, hl: null };
    const hl = await prisma.nexusStoryHighlight.findUnique({ where: { id } });
    return { me, hl };
}

// GET /api/nexus/highlights/[id] — highlight tafsilotlari (storylar bilan)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const hl = await prisma.nexusStoryHighlight.findUnique({ where: { id } });
    if (!hl) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const stories = await prisma.nexusStory.findMany({
        where: { id: { in: hl.storyIds } },
        include: { slides: { orderBy: { order: "asc" } } },
    });
    // Tartibni highlight.storyIds bo'yicha saqlab qaytaramiz
    const orderMap = Object.fromEntries(hl.storyIds.map((sid, i) => [sid, i]));
    stories.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));

    return NextResponse.json({
        highlight: { id: hl.id, title: hl.title, coverUrl: hl.coverUrl, count: hl.storyIds.length },
        stories: stories.map(s => ({
            id: s.id, caption: s.caption, createdAt: s.createdAt,
            mediaUrl: s.mediaUrl, mediaType: s.mediaType,
            slides: s.slides.length > 0
                ? s.slides.map(sl => ({ id: sl.id, order: sl.order, mediaUrl: sl.mediaUrl, mediaType: sl.mediaType, durationMs: sl.durationMs, caption: sl.caption, overlays: sl.overlays, filter: sl.filter, bgColor: sl.bgColor }))
                : [{ id: `${s.id}-legacy`, order: 0, mediaUrl: s.mediaUrl, mediaType: s.mediaType, durationMs: null, caption: s.caption, overlays: null, filter: "none", bgColor: null }],
            music: s.musicUrl ? { title: s.musicTitle, url: s.musicUrl, trackId: s.musicTrackId } : null,
        })),
    });
}

// PATCH /api/nexus/highlights/[id] — sarlavha/muqova/storyIds yangilash
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, hl } = await meAndOwn(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!hl) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (hl.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = (await req.json()) as { title?: string; coverUrl?: string; storyIds?: string[]; order?: number };
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 60);
    if (typeof body.coverUrl === "string") data.coverUrl = body.coverUrl.slice(0, 500) || null;
    if (typeof body.order === "number") data.order = Math.max(0, Math.floor(body.order));
    if (Array.isArray(body.storyIds)) {
        const owned = await prisma.nexusStory.findMany({ where: { id: { in: body.storyIds }, profileId: me.id }, select: { id: true } });
        data.storyIds = owned.map(s => s.id).slice(0, 100);
    }
    const updated = await prisma.nexusStoryHighlight.update({ where: { id }, data });
    return NextResponse.json({ highlight: updated });
}

// DELETE /api/nexus/highlights/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, hl } = await meAndOwn(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!hl) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (hl.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusStoryHighlight.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
