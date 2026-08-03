import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { nexusNotify } from "@/lib/nexus-notify";
import { notifyMentions } from "@/lib/nexus-mention";
import { getHiddenAuthorIds, isBlockedBetween } from "@/lib/nexus-block";
import { moderateOnCreate } from "@/lib/moderation";

// GET /api/nexus/videos/[id]/comments — izohlar
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let myId: string | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        myId = p?.id ?? null;
    }

    const hiddenIds = (await getHiddenAuthorIds(myId)).filter(x => x !== myId);
    const comments = await prisma.nexusVideoComment.findMany({
        where: { videoId: id, hidden: false, ...(hiddenIds.length ? { profileId: { notIn: hiddenIds } } : {}) },
        orderBy: { createdAt: "desc" }, take: 100,
    });
    const ids = [...new Set(comments.map(c => c.profileId))];
    const profs = await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const enriched = comments.map(c => {
        const a = pMap[c.profileId];
        return {
            id: c.id, text: c.text, createdAt: c.createdAt, isMine: c.profileId === myId,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a) } : null,
        };
    });
    return NextResponse.json({ comments: enriched, canComment: !!myId });
}

// POST /api/nexus/videos/[id]/comments — izoh qoldirish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const banned = await banGuard(profile.id); if (banned) return banned;
    if (await nexusRateLimited(profile.id, "videoComment")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { id } = await params;
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Izoh bo'sh bo'lmasin" }, { status: 400 });

    // Blok — bloklangan foydalanuvchi video egasiga izoh yoza olmaydi
    const vid = await prisma.nexusVideo.findUnique({ where: { id }, select: { profileId: true } });
    if (!vid) return NextResponse.json({ error: "Video topilmadi" }, { status: 404 });
    if (vid.profileId !== profile.id && await isBlockedBetween(profile.id, vid.profileId)) {
        return NextResponse.json({ error: "Bu videoga izoh yoza olmaysiz" }, { status: 403 });
    }

    const comment = await prisma.nexusVideoComment.create({
        data: { videoId: id, profileId: profile.id, text: String(text).trim().slice(0, 1000) },
    });
    after(() => nexusNotify({ recipientId: vid.profileId, actorId: profile.id, type: "VIDEO_COMMENT", videoId: id }));
    after(() => moderateOnCreate({ module: "NEXUS", targetType: "VIDEO_COMMENT", targetId: comment.id, text: comment.text, kind: "video izohi", authorId: profile.id }));
    after(() => notifyMentions({ text: comment.text, actorId: profile.id, videoId: id }));
    return NextResponse.json({
        comment: {
            id: comment.id, text: comment.text, createdAt: comment.createdAt, isMine: true,
            author: { name: profile.name, username: profile.username, image: profile.image, verified: isVerifiedProfile(profile) },
        },
    });
}
