import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { isValidMediaUrl } from "@/lib/media-url";
import { banGuard } from "@/lib/moderation-guard";

const DAY_MS = 24 * 60 * 60 * 1000;

interface IncomingSlide {
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO" | "TEXT";
    durationMs?: number;
    caption?: string;
    overlays?: unknown;
    filter?: string;
    bgColor?: string;
}

// POST /api/nexus/stories — yangi story (24 soat). Multi-slide qo'llaydi.
// Backward compat: { mediaUrl, mediaType, caption } — bitta slide sifatida qabul qiladi.
// Yangi format: { slides: [{...}, ...], musicTrackId?, caption? }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const banned = await banGuard(profile.id); if (banned) return banned;
    if (await nexusRateLimited(profile.id, "story")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = (await req.json()) as {
        mediaUrl?: string; mediaType?: "IMAGE" | "VIDEO"; caption?: string;
        slides?: IncomingSlide[];
        musicTrackId?: string; musicTitle?: string; musicUrl?: string;
    };

    // Slides yig'ish — legacy (bitta) yoki multi-slide
    let slides: IncomingSlide[] = [];
    if (Array.isArray(body.slides) && body.slides.length > 0) {
        slides = body.slides.slice(0, 10);   // maks 10 slide
    } else if (body.mediaUrl) {
        slides = [{ mediaUrl: body.mediaUrl, mediaType: body.mediaType || "IMAGE", caption: body.caption }];
    }
    if (slides.length === 0) return NextResponse.json({ error: "Kamida bitta slide kerak" }, { status: 400 });

    // Har slide validatsiya (TEXT slide URL talab qilmaydi)
    for (const s of slides) {
        if (s.mediaType !== "TEXT" && !isValidMediaUrl(s.mediaUrl || "")) {
            return NextResponse.json({ error: "Slide media URL noto'g'ri" }, { status: 400 });
        }
    }

    const first = slides[0];
    const firstMediaType: "IMAGE" | "VIDEO" | "TEXT" =
        first.mediaType === "VIDEO" ? "VIDEO" :
        first.mediaType === "TEXT" ? "TEXT" : "IMAGE";

    // Musiqa — Nexus track'idan olinsa audioUrl'ni topamiz
    let musicUrl = body.musicUrl || null;
    let musicTitle = body.musicTitle || null;
    if (body.musicTrackId) {
        const t = await prisma.nexusTrack.findUnique({
            where: { id: body.musicTrackId }, select: { audioUrl: true, title: true, artist: true },
        });
        if (t) {
            musicUrl = t.audioUrl;
            musicTitle = musicTitle || `${t.title}${t.artist ? " — " + t.artist : ""}`.slice(0, 200);
        }
    }

    // Story + slidelarni bitta transaction'da yaratamiz
    const story = await prisma.nexusStory.create({
        data: {
            profileId: profile.id,
            mediaUrl: first.mediaUrl || "",
            mediaType: firstMediaType,
            caption: typeof body.caption === "string" && body.caption.trim() ? body.caption.trim().slice(0, 300) : null,
            musicTrackId: body.musicTrackId || null,
            musicTitle,
            musicUrl,
            expiresAt: new Date(Date.now() + DAY_MS),
            slides: {
                create: slides.map((s, i) => ({
                    order: i,
                    mediaUrl: s.mediaUrl || "",
                    mediaType: s.mediaType === "VIDEO" ? "VIDEO" : s.mediaType === "TEXT" ? "TEXT" : "IMAGE",
                    durationMs: typeof s.durationMs === "number" ? Math.max(500, Math.min(60000, Math.floor(s.durationMs))) : null,
                    caption: typeof s.caption === "string" && s.caption.trim() ? s.caption.trim().slice(0, 300) : null,
                    overlays: (s.overlays ?? null) as never,
                    filter: typeof s.filter === "string" && s.filter ? s.filter.slice(0, 30) : "none",
                    bgColor: typeof s.bgColor === "string" && s.bgColor.trim() ? s.bgColor.trim().slice(0, 20) : null,
                })),
            },
        },
        include: { slides: { orderBy: { order: "asc" } } },
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
    const hidden = new Set((await getHiddenAuthorIds(me.id)).filter(x => x !== me.id));
    const authorIds = [me.id, ...following.map(f => f.followingId).filter(id => !hidden.has(id))];

    const stories = await prisma.nexusStory.findMany({
        where: { profileId: { in: authorIds }, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
        include: { slides: { orderBy: { order: "asc" } } },
    });
    if (!stories.length) return NextResponse.json({ groups: [] });

    const myViews = await prisma.nexusStoryView.findMany({
        where: { profileId: me.id, storyId: { in: stories.map(s => s.id) } }, select: { storyId: true },
    });
    const seenSet = new Set(myViews.map(v => v.storyId));

    const profIds = [...new Set(stories.map(s => s.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: profIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
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
        const items = list.map(s => {
            // Backward compat: slides bo'sh bo'lsa (eski data) mediaUrl'dan single slide
            const slides = s.slides.length > 0
                ? s.slides.map(sl => ({
                    id: sl.id, order: sl.order, mediaUrl: sl.mediaUrl, mediaType: sl.mediaType,
                    durationMs: sl.durationMs, caption: sl.caption, overlays: sl.overlays, filter: sl.filter, bgColor: sl.bgColor,
                }))
                : [{
                    id: `${s.id}-legacy`, order: 0, mediaUrl: s.mediaUrl, mediaType: s.mediaType,
                    durationMs: null, caption: s.caption, overlays: null, filter: "none", bgColor: null,
                }];
            return {
                id: s.id, caption: s.caption, createdAt: s.createdAt, seen: seenSet.has(s.id),
                // Legacy fields (backward compat)
                mediaUrl: s.mediaUrl, mediaType: s.mediaType,
                // Yangi
                slides,
                music: s.musicUrl ? { title: s.musicTitle, url: s.musicUrl, trackId: s.musicTrackId } : null,
            };
        });
        return {
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            isMe: pid === me.id,
            stories: items,
            allSeen: items.every(i => i.seen),
            latest: list[list.length - 1].createdAt,
        };
    });

    groups.sort((a, b) => {
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
        if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
        return new Date(b.latest).getTime() - new Date(a.latest).getTime();
    });

    return NextResponse.json({ groups });
}
