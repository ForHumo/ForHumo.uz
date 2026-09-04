import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch AH — Streamer leaderboard (7 kunlik)
// Ranking = 60% peak viewers + 40% tip summasi (per streamer, week aggregate)
// GET /leaderboard — top 20 streamers this week

export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 daq cache

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") || "7")));

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const streams = await prisma.nexusLiveStream.findMany({
        where: { createdAt: { gte: since }, hidden: false, privacy: "PUBLIC", status: { in: ["LIVE", "ENDED"] } },
        select: { id: true, profileId: true, peakViewers: true },
    });

    if (!streams.length) return NextResponse.json({ leaderboard: [] });

    // Streamer bo'yicha aggregate
    const streamIds = streams.map(s => s.id);
    const tipAggs = await prisma.nexusLiveMessage.groupBy({
        by: ["streamId"],
        where: { streamId: { in: streamIds }, tipAmount: { gt: 0 } },
        _sum: { tipAmount: true },
    });
    const tipsByStream = Object.fromEntries(tipAggs.map(t => [t.streamId, t._sum.tipAmount || 0]));

    const stats: Record<string, { streams: number; peakSum: number; tipsSum: number }> = {};
    for (const s of streams) {
        if (!stats[s.profileId]) stats[s.profileId] = { streams: 0, peakSum: 0, tipsSum: 0 };
        stats[s.profileId].streams++;
        stats[s.profileId].peakSum += s.peakViewers || 0;
        stats[s.profileId].tipsSum += tipsByStream[s.id] || 0;
    }

    const items = Object.entries(stats).map(([pid, st]) => ({
        profileId: pid,
        streams: st.streams,
        peakViewers: st.peakSum,
        totalTips: st.tipsSum,
        // Normalized score (peak dominant, tips secondary)
        score: st.peakSum * 0.6 + Math.floor(st.tipsSum / 10_000) * 0.4,
    })).sort((a, b) => b.score - a.score).slice(0, 20);

    const profs = await prisma.userProfile.findMany({
        where: { id: { in: items.map(i => i.profileId) } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        days,
        leaderboard: items.map((it, i) => {
            const p = pMap[it.profileId];
            return {
                rank: i + 1,
                streams: it.streams, peakViewers: it.peakViewers, totalTips: it.totalTips,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            };
        }),
    });
}
