// GET  /api/nexus/tracks/[id]/lyrics — timing bilan lyrics (karaoke player uchun)
// POST /api/nexus/tracks/[id]/lyrics — LRC raw yoki lines[] saqlash (faqat trek egasi)
//   body: { lrc?: string, lines?: {timeMs, text}[], hasKaraoke?: boolean, instrumentalUrl?: string, videoUrl?: string }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseLrc } from "@/lib/nexus-lrc";
import { isValidMediaUrl } from "@/lib/media-url";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const track = await prisma.nexusTrack.findUnique({
        where: { id },
        select: {
            id: true, hidden: true, hasKaraoke: true, instrumentalUrl: true, videoUrl: true,
            lyricsLines: { orderBy: { order: "asc" }, select: { timeMs: true, text: true, order: true } },
        },
    });
    if (!track || track.hidden) return NextResponse.json({ lines: [], hasKaraoke: false });
    return NextResponse.json({
        hasKaraoke: track.hasKaraoke,
        instrumentalUrl: track.instrumentalUrl,
        videoUrl: track.videoUrl,
        lines: track.lyricsLines,
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const track = await prisma.nexusTrack.findUnique({
        where: { id },
        select: { id: true, profileId: true },
    });
    if (!track) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (track.profileId !== me.id) return NextResponse.json({ error: "not_owner" }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Line'lar - LRC raw yoki tayyor massiv
    let lines: { timeMs: number; text: string; order: number }[] = [];
    let lyricsSource: string | null = null;
    if (typeof body?.lrc === "string" && body.lrc.trim()) {
        lyricsSource = body.lrc.slice(0, 200_000);
        const parsed = parseLrc(lyricsSource ?? "");
        lines = parsed.lines;
    } else if (Array.isArray(body?.lines)) {
        lines = (body.lines as unknown[])
            .map((x, i) => {
                const l = x as { timeMs?: number; text?: string };
                return {
                    timeMs: Math.max(0, Math.round(Number(l?.timeMs) || 0)),
                    text: String(l?.text ?? "").slice(0, 500),
                    order: i,
                };
            })
            .filter(l => l.timeMs >= 0)
            .slice(0, 5000);
    }

    // Ixtiyoriy media URL'lar
    const instrumentalUrl = typeof body?.instrumentalUrl === "string" && isValidMediaUrl(body.instrumentalUrl)
        ? body.instrumentalUrl : null;
    const videoUrl = typeof body?.videoUrl === "string" && isValidMediaUrl(body.videoUrl)
        ? body.videoUrl : null;

    // Karaoke bor deb hisoblash: lines yoki instrumental bo'lsa
    const hasKaraoke = lines.length > 0 || !!instrumentalUrl;

    // Atomik: eski lines'ni tozalash, yangisini yozish, track flag'larni yangilash
    await prisma.$transaction([
        prisma.nexusTrackLyricLine.deleteMany({ where: { trackId: id } }),
        ...(lines.length > 0
            ? [prisma.nexusTrackLyricLine.createMany({ data: lines.map(l => ({ trackId: id, ...l })) })]
            : []),
        prisma.nexusTrack.update({
            where: { id },
            data: {
                hasKaraoke,
                ...(lyricsSource !== null ? { lyricsSource } : {}),
                ...(instrumentalUrl ? { instrumentalUrl } : {}),
                ...(videoUrl ? { videoUrl } : {}),
            },
        }),
    ]);

    return NextResponse.json({ ok: true, hasKaraoke, linesCount: lines.length });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const track = await prisma.nexusTrack.findUnique({ where: { id }, select: { profileId: true } });
    if (!track) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (track.profileId !== me.id) return NextResponse.json({ error: "not_owner" }, { status: 403 });

    await prisma.$transaction([
        prisma.nexusTrackLyricLine.deleteMany({ where: { trackId: id } }),
        prisma.nexusTrack.update({
            where: { id },
            data: { hasKaraoke: false, lyricsSource: null, instrumentalUrl: null },
        }),
    ]);
    return NextResponse.json({ ok: true });
}
