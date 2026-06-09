import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/stories/[id]/viewers — faqat ega ko'radi (kim ko'rgan)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const story = await prisma.nexusStory.findUnique({ where: { id }, select: { profileId: true } });
    if (!story) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (story.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const views = await prisma.nexusStoryView.findMany({
        where: { storyId: id, profileId: { not: me.id } }, orderBy: { createdAt: "desc" }, take: 100,
    });
    const ids = views.map(v => v.profileId);
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const viewers = ids
        .map(vid => pMap[vid])
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map(p => ({ name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) }));

    return NextResponse.json({ count: viewers.length, viewers });
}
