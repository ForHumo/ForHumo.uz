import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { after } from "next/server";
import { moderateOnCreate } from "@/lib/moderation";
import { nexusNotify } from "@/lib/nexus-notify";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// GET /api/nexus/posts/[id]/comments — izohlar (flat; klient daraxt quradi)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let myId: string | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        myId = p?.id ?? null;
    }

    const comments = await prisma.nexusComment.findMany({
        where: { postId: id, hidden: false }, orderBy: { createdAt: "asc" }, take: 200,
    });
    const profileIds = [...new Set(comments.map(c => c.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    const enriched = comments.map(c => {
        const a = pMap[c.profileId];
        return {
            id: c.id, parentId: c.parentId, text: c.text, createdAt: c.createdAt,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a) } : null,
            isMine: c.profileId === myId,
        };
    });
    return NextResponse.json({ comments: enriched, canComment: !!myId });
}

// POST — izoh qoldirish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (await nexusRateLimited(profile.id, "comment")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { id } = await params;
    const { text, parentId } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Izoh bo'sh bo'lmasin" }, { status: 400 });

    const post = await prisma.nexusPost.findUnique({ where: { id }, select: { id: true, profileId: true } });
    if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });

    const comment = await prisma.nexusComment.create({
        data: { postId: id, profileId: profile.id, parentId: parentId ?? null, text: text.trim() },
    });

    // Pre-publish moderatsiya
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "COMMENT", targetId: comment.id,
        text: comment.text, kind: "izoh",
    }));

    // Bildirishnoma — izoh post egasiga, javob ota-izoh egasiga
    after(async () => {
        if (parentId) {
            const parent = await prisma.nexusComment.findUnique({ where: { id: parentId }, select: { profileId: true } });
            if (parent) await nexusNotify({ recipientId: parent.profileId, actorId: profile.id, type: "REPLY", postId: id, commentId: comment.id });
        } else {
            await nexusNotify({ recipientId: post.profileId, actorId: profile.id, type: "COMMENT", postId: id });
        }
    });

    return NextResponse.json({
        comment: {
            id: comment.id, parentId: comment.parentId, text: comment.text, createdAt: comment.createdAt,
            author: { name: profile.name, username: profile.username, image: profile.image, verified: isVerifiedProfile(profile) },
            isMine: true,
        },
    });
}
