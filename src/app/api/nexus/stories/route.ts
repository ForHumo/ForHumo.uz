import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { isValidMediaUrl } from "@/lib/media-url";

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/nexus/stories — yangi story (24 soat)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (await nexusRateLimited(profile.id, "story")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { mediaUrl, mediaType, caption } = await req.json();
    if (!isValidMediaUrl(mediaUrl)) return NextResponse.json({ error: "Media kerak" }, { status: 400 });
    const type = mediaType === "VIDEO" ? "VIDEO" : "IMAGE";

    const story = await prisma.nexusStory.create({
        data: {
            profileId: profile.id,
            mediaUrl,
            mediaType: type,
            caption: typeof caption === "string" && caption.trim() ? caption.trim().slice(0, 300) : null,
            expiresAt: new Date(Date.now() + DAY_MS),
        },
    });
    return NextResponse.json({ story });
}

// GET /api/nexus/stories — faol storylar, muallif bo'yicha guruh
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ groups: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ groups: [] });

    const following = await prisma.nexusFollow.findMany({ where: { followerId: me.id }, select: { followingId: true } });
    // Mute/blok qilingan mualliflar — stories qatoridan ham chiqarib tashlanadi (o'zimni emas)
    const hidden = new Set((await getHiddenAuthorIds(me.id)).filter(x => x !== me.id));
    const authorIds = [me.id, ...following.map(f => f.followingId).filter(id => !hidden.has(id))];

    const stories = await prisma.nexusStory.findMany({
        where: { profileId: { in: authorIds }, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
    });
    if (!stories.length) return NextResponse.json({ groups: [] });

    const myViews = await prisma.nexusStoryView.findMany({
        where: { profileId: me.id, storyId: { in: stories.map(s => s.id) } }, select: { storyId: true },
    });
    const seenSet = new Set(myViews.map(v => v.storyId));

    const profIds = [...new Set(stories.map(s => s.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: profIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const byAuthor = new Map<string, typeof stories>();
    for (const s of stories) {
        const arr = byAuthor.get(s.profileId) ?? [];
        arr.push(s);
        byAuthor.set(s.profileId, arr);
    }

    const groups = [...byAuthor.entries()].map(([pid, list]) => {
        const p = pMap[pid];
        const items = list.map(s => ({
            id: s.id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, caption: s.caption, createdAt: s.createdAt, seen: seenSet.has(s.id),
        }));
        return {
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
            isMe: pid === me.id,
            stories: items,
            allSeen: items.every(i => i.seen),
            latest: list[list.length - 1].createdAt,
        };
    });

    // Tartib: o'zim birinchi; ko'rilmaganlar oldinda; har birida yangi birinchi
    groups.sort((a, b) => {
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
        if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
        return new Date(b.latest).getTime() - new Date(a.latest).getTime();
    });

    return NextResponse.json({ groups });
}
