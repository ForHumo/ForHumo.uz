import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch I — VOD Clips (highlights)
// POST /api/nexus/live/[id]/clip { title, startSec, endSec }
// GET  /api/nexus/live/[id]/clip — stream'ning barcha qirqimlari
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({
        where: { id },
        select: { status: true, recordingUrl: true, recordingDurationSec: true, hidden: true },
    });
    if (!stream || stream.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status !== "ENDED" || !stream.recordingUrl) return NextResponse.json({ error: "Yozuv mavjud emas" }, { status: 400 });
    if (await nexusRateLimited(me.id, "post")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { title, startSec, endSec } = await req.json();
    const t = String(title || "").trim().slice(0, 100);
    if (!t) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    const s = Math.max(0, Math.floor(Number(startSec) || 0));
    const e = Math.max(s + 1, Math.floor(Number(endSec) || 0));
    const dur = e - s;
    if (dur < 3 || dur > 60) return NextResponse.json({ error: "Qirqim 3-60 sek" }, { status: 400 });
    const maxDur = stream.recordingDurationSec || 0;
    if (maxDur > 0 && e > maxDur + 1) return NextResponse.json({ error: "VOD davomiyligidan tashqarida" }, { status: 400 });

    const clip = await prisma.nexusLiveClip.create({
        data: { streamId: id, profileId: me.id, title: t, startSec: s, endSec: e },
    });
    return NextResponse.json({ clip });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const clips = await prisma.nexusLiveClip.findMany({
        where: { streamId: id, hidden: false },
        orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
        take: 40,
    });
    if (!clips.length) return NextResponse.json({ clips: [] });
    const authorIds = [...new Set(clips.map(c => c.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    return NextResponse.json({
        clips: clips.map(c => {
            const p = pMap[c.profileId];
            return {
                id: c.id, title: c.title, startSec: c.startSec, endSec: c.endSec,
                plays: c.plays, likes: c.likes, createdAt: c.createdAt,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            };
        }),
    });
}
