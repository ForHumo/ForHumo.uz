import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile, extractHashtags } from "@/lib/nexus";
import { moderateOnCreate } from "@/lib/moderation";
import { notifyMentions } from "@/lib/nexus-mention";
import { isActiveSubscriber } from "@/lib/nexus-sub";
import { isBlockedBetween } from "@/lib/nexus-block";

// GET /api/nexus/posts/[id] — bitta post (permalink sahifa uchun, maxfiylik bilan)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let myId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        myId = me?.id ?? null;
    }

    const post = await prisma.nexusPost.findUnique({
        where: { id }, include: { _count: { select: { likes: true, comments: true } } },
    });
    if (!post || post.hidden) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });

    // Bloklangan muallif posti ko'rinmaydi
    if (myId && post.profileId !== myId && await isBlockedBetween(myId, post.profileId)) {
        return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
    }

    // Maxfiylik: PRIVATE — faqat muallif; SUBSCRIBERS — faol pullik obunachi; FOLLOWERS — kuzatuvchi
    if (post.privacy !== "PUBLIC" && post.profileId !== myId) {
        if (post.privacy === "PRIVATE") return NextResponse.json({ error: "Maxfiy post" }, { status: 403 });
        if (post.privacy === "SUBSCRIBERS") {
            const sub = myId ? await isActiveSubscriber(myId, post.profileId) : false;
            if (!sub) return NextResponse.json({ error: "Faqat pullik obunachilar uchun" }, { status: 403 });
        } else {
            const follows = myId ? await prisma.nexusFollow.findUnique({ where: { followerId_followingId: { followerId: myId, followingId: post.profileId } } }) : null;
            if (!follows) return NextResponse.json({ error: "Faqat kuzatuvchilar uchun" }, { status: 403 });
        }
    }

    const author = await prisma.userProfile.findUnique({
        where: { id: post.profileId }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    let liked = false, saved = false;
    if (myId) {
        const [l, s] = await Promise.all([
            prisma.nexusLike.findUnique({ where: { postId_profileId: { postId: id, profileId: myId } } }),
            prisma.nexusSave.findUnique({ where: { postId_profileId: { postId: id, profileId: myId } } }),
        ]);
        liked = !!l; saved = !!s;
    }

    // So'rovnoma natijalari
    let pollVotes: number[] = [], myVote: number | null = null;
    if (post.pollOptions.length) {
        const grouped = await prisma.nexusPollVote.groupBy({ by: ["optionIdx"], where: { postId: id }, _count: { _all: true } });
        const counts: Record<number, number> = {};
        for (const g of grouped) counts[g.optionIdx] = g._count._all;
        pollVotes = post.pollOptions.map((_, i) => counts[i] ?? 0);
        if (myId) {
            const v = await prisma.nexusPollVote.findUnique({ where: { postId_profileId: { postId: id, profileId: myId } } });
            myVote = v ? v.optionIdx : null;
        }
    }

    return NextResponse.json({
        post: {
            id: post.id, text: post.text, media: post.media, hashtags: post.hashtags,
            shareCount: post.shareCount, createdAt: post.createdAt, editedAt: post.editedAt,
            privacy: post.privacy, location: post.location,
            pollOptions: post.pollOptions, pollEndsAt: post.pollEndsAt, pollVotes, myVote,
            author: author ? { name: author.name, username: author.username, image: author.image, verified: isVerifiedProfile(author) } : null,
            likes: post._count.likes, comments: post._count.comments,
            liked, saved, isMine: post.profileId === myId,
        },
    });
}

// DELETE /api/nexus/posts/[id] — o'z postini o'chirish
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const post = await prisma.nexusPost.findUnique({ where: { id }, select: { profileId: true } });
    if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
    if (post.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning postingiz emas" }, { status: 403 });

    // likes/comments/saves onDelete:Cascade orqali o'chadi
    await prisma.nexusPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

// PATCH /api/nexus/posts/[id] — post matnini tahrirlash (faqat muallif)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const post = await prisma.nexusPost.findUnique({ where: { id }, select: { profileId: true, media: true } });
    if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
    if (post.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning postingiz emas" }, { status: 403 });

    const { text } = await req.json();
    const clean = typeof text === "string" ? text.trim() : "";
    if (!clean && !(post.media?.length)) return NextResponse.json({ error: "Post bo'sh bo'lmasin" }, { status: 400 });

    const updated = await prisma.nexusPost.update({
        where: { id },
        data: { text: clean || null, hashtags: extractHashtags(clean), editedAt: new Date() },
    });

    after(() => moderateOnCreate({ module: "NEXUS", targetType: "POST", targetId: id, text: updated.text, kind: "post" }));
    after(() => notifyMentions({ text: updated.text, actorId: profile.id, postId: id }));

    return NextResponse.json({ ok: true, text: updated.text, hashtags: updated.hashtags, editedAt: updated.editedAt });
}
