import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch I — Yagona qirqim + view increment + delete
export async function GET(_: Request, { params }: { params: Promise<{ clipId: string }> }) {
    const { clipId } = await params;
    const clip = await prisma.nexusLiveClip.findUnique({ where: { id: clipId } });
    if (!clip || clip.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const stream = await prisma.nexusLiveStream.findUnique({
        where: { id: clip.streamId },
        select: { id: true, title: true, recordingUrl: true, recordingDurationSec: true, profileId: true, hidden: true },
    });
    if (!stream || stream.hidden || !stream.recordingUrl) return NextResponse.json({ error: "VOD mavjud emas" }, { status: 404 });
    const [author, streamer] = await Promise.all([
        prisma.userProfile.findUnique({ where: { id: clip.profileId }, select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } }),
        prisma.userProfile.findUnique({ where: { id: stream.profileId }, select: { name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } }),
    ]);
    // View increment (non-blocking)
    prisma.nexusLiveClip.update({ where: { id: clipId }, data: { plays: { increment: 1 } } }).catch(() => { });
    return NextResponse.json({
        clip: {
            id: clip.id, title: clip.title, startSec: clip.startSec, endSec: clip.endSec,
            plays: clip.plays + 1, likes: clip.likes, createdAt: clip.createdAt,
            recordingUrl: stream.recordingUrl,
            streamId: stream.id, streamTitle: stream.title,
            author: author ? { name: author.name, username: author.username, image: author.image, verified: isVerifiedProfile(author), verifiedCategory: isVerifiedProfile(author) ? (author.verifiedCategory || null) : null } : null,
            streamer: streamer ? { name: streamer.name, username: streamer.username, image: streamer.image, verified: isVerifiedProfile(streamer), verifiedCategory: isVerifiedProfile(streamer) ? (streamer.verifiedCategory || null) : null } : null,
        },
    });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ clipId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { clipId } = await params;
    const clip = await prisma.nexusLiveClip.findUnique({ where: { id: clipId }, select: { profileId: true, streamId: true } });
    if (!clip) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id: clip.streamId }, select: { profileId: true } });
    if (clip.profileId !== me.id && stream?.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLiveClip.delete({ where: { id: clipId } });
    return NextResponse.json({ ok: true });
}
