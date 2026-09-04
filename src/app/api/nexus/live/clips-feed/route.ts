import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch AN — Nexus home uchun trend qirqimlar row
// GET /clips-feed?days=7&limit=20 — top clips (likes + plays)
export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 daq cache

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") || "7")));
    const limit = Math.min(30, Math.max(5, parseInt(searchParams.get("limit") || "20")));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const clips = await prisma.nexusLiveClip.findMany({
        where: { hidden: false, createdAt: { gte: since } },
        orderBy: [{ likes: "desc" }, { plays: "desc" }, { createdAt: "desc" }],
        take: limit,
    });
    if (!clips.length) return NextResponse.json({ clips: [] });

    const streamIds = [...new Set(clips.map(c => c.streamId))];
    const streams = await prisma.nexusLiveStream.findMany({
        where: { id: { in: streamIds } },
        select: { id: true, title: true, recordingUrl: true, profileId: true },
    });
    const sMap = Object.fromEntries(streams.map(s => [s.id, s]));

    const authorIds = [...new Set([...clips.map(c => c.profileId), ...streams.map(s => s.profileId)])];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const shape = (id: string) => {
        const p = pMap[id];
        return p ? {
            name: p.name, username: p.username, image: p.image,
            verified: isVerifiedProfile(p),
            verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
        } : null;
    };

    return NextResponse.json({
        clips: clips
            .filter(c => sMap[c.streamId]?.recordingUrl)
            .map(c => ({
                id: c.id, title: c.title, startSec: c.startSec, endSec: c.endSec,
                plays: c.plays, likes: c.likes, createdAt: c.createdAt,
                streamId: c.streamId,
                streamTitle: sMap[c.streamId]?.title || "",
                recordingUrl: sMap[c.streamId]?.recordingUrl || null,
                author: shape(c.profileId),
                streamer: shape(sMap[c.streamId]?.profileId || ""),
            })),
    });
}
