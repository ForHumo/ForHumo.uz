import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Story Highlights — foydalanuvchi profilida ochilib qoladigan story kolleksiyalari.
// 24 soatdan keyin ham ko'rinadi (highlight ostidagi storyIds saqlanadi).

// GET /api/nexus/highlights?username=... — foydalanuvchining highlightlari
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const session = await getServerSession(authOptions);
    let profileId: string | null = null;
    if (username) {
        const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        profileId = p?.id ?? null;
    } else if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        profileId = me?.id ?? null;
    }
    if (!profileId) return NextResponse.json({ highlights: [] });

    const hs = await prisma.nexusStoryHighlight.findMany({
        where: { profileId }, orderBy: { order: "asc" },
    });
    return NextResponse.json({
        highlights: hs.map(h => ({
            id: h.id, title: h.title, coverUrl: h.coverUrl,
            storyIds: h.storyIds, count: h.storyIds.length, updatedAt: h.updatedAt,
        })),
    });
}

// POST /api/nexus/highlights — yangi highlight yaratish
// body: { title: string, coverUrl?: string, storyIds: string[] }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { title, coverUrl, storyIds } = (await req.json()) as {
        title?: string; coverUrl?: string; storyIds?: string[];
    };
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    if (!Array.isArray(storyIds) || storyIds.length === 0) return NextResponse.json({ error: "Kamida bitta story tanlang" }, { status: 400 });

    // Faqat o'z storylarim
    const ownIds = await prisma.nexusStory.findMany({
        where: { id: { in: storyIds }, profileId: me.id }, select: { id: true },
    });
    const validIds = ownIds.map(s => s.id);
    if (validIds.length === 0) return NextResponse.json({ error: "Story topilmadi" }, { status: 400 });

    const last = await prisma.nexusStoryHighlight.findFirst({
        where: { profileId: me.id }, orderBy: { order: "desc" }, select: { order: true },
    });
    const nextOrder = (last?.order ?? -1) + 1;

    const h = await prisma.nexusStoryHighlight.create({
        data: {
            profileId: me.id,
            title: title.trim().slice(0, 60),
            coverUrl: typeof coverUrl === "string" ? coverUrl.slice(0, 500) : null,
            storyIds: validIds.slice(0, 100),
            order: nextOrder,
        },
    });
    return NextResponse.json({ highlight: h });
}
