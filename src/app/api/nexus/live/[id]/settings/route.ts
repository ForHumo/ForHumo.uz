import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch M — Streamer chat moderation sozlamalari
// PATCH /api/nexus/live/[id]/settings { slowSeconds?, followersOnly?, bannedWords? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.slowSeconds !== undefined) patch.slowSeconds = Math.max(0, Math.min(300, Number(body.slowSeconds) || 0));
    if (body.followersOnly !== undefined) patch.followersOnly = !!body.followersOnly;
    if (body.bannedWords !== undefined && Array.isArray(body.bannedWords)) {
        patch.bannedWords = body.bannedWords
            .map((w: unknown) => String(w).trim().toLowerCase())
            .filter((w: string) => w.length > 0 && w.length <= 50)
            .slice(0, 200);
    }
    const updated = await prisma.nexusLiveStream.update({
        where: { id }, data: patch,
        select: { slowSeconds: true, followersOnly: true, bannedWords: true },
    });
    return NextResponse.json({ settings: updated });
}

// GET /api/nexus/live/[id]/settings — o'z streamer sozlamalari
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({
        where: { id },
        select: { slowSeconds: true, followersOnly: true, bannedWords: true },
    });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    return NextResponse.json({ settings: stream });
}
