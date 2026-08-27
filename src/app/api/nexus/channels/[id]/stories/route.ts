// Guruh stories (Telegram 2024 uslub).
//   GET  /channels/[id]/stories       — faol stories (24h ichida)
//   POST /channels/[id]/stories        { mediaUrl, mediaType, caption? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ stories: [] });

    const stories = await prisma.nexusChannelStory.findMany({
        where: { channelId: id, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    const authorIds = Array.from(new Set(stories.map(s => s.authorId)));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));

    // Mening ko'rgan storiesim
    const myViews = await prisma.nexusChannelStoryView.findMany({
        where: { storyId: { in: stories.map(s => s.id) }, profileId: me.id },
        select: { storyId: true },
    });
    const viewedSet = new Set(myViews.map(v => v.storyId));

    return NextResponse.json({
        stories: stories.map(s => ({
            id: s.id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, caption: s.caption,
            createdAt: s.createdAt, expiresAt: s.expiresAt,
            author: pMap.get(s.authorId) ?? null,
            seen: viewedSet.has(s.id),
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mediaUrl = String(body?.mediaUrl ?? "");
    const mediaType = String(body?.mediaType ?? "");
    const caption = typeof body?.caption === "string" ? body.caption.slice(0, 500) : null;
    if (!mediaUrl || !mediaUrl.startsWith("https://")) return NextResponse.json({ error: "mediaUrl kerak" }, { status: 400 });
    if (mediaType !== "image" && mediaType !== "video") return NextResponse.json({ error: "mediaType image|video" }, { status: 400 });

    const story = await prisma.nexusChannelStory.create({
        data: {
            channelId: id, authorId: me.id, mediaUrl, mediaType, caption,
            expiresAt: new Date(Date.now() + TWENTY_FOUR_HOURS),
        },
    });

    // Real-time push — a'zolarga
    after(async () => {
        const members = await prisma.nexusChannelMember.findMany({
            where: { channelId: id }, select: { profileId: true }, take: 500,
        });
        await Promise.all(members.map(m =>
            pusherTrigger(userChannel(m.profileId), "nx:ch:story-new", { channelId: id, storyId: story.id }).catch(() => {})
        ));
    });

    return NextResponse.json({ story });
}
