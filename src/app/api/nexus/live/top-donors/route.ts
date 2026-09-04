import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch CM — Top donors lifetime (barcha efirlar bo'yicha)
// GET ?username=X — streamer bo'yicha top donors
// GET (no param) — global top donors
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const limit = Math.min(30, Math.max(5, parseInt(searchParams.get("limit") || "10")));

    let streamIds: string[] | undefined;
    if (username) {
        const streamer = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        if (!streamer) return NextResponse.json({ donors: [] });
        const streams = await prisma.nexusLiveStream.findMany({ where: { profileId: streamer.id }, select: { id: true } });
        streamIds = streams.map(s => s.id);
        if (streamIds.length === 0) return NextResponse.json({ donors: [] });
    }

    const aggs = await prisma.nexusLiveMessage.groupBy({
        by: ["profileId"],
        where: {
            tipAmount: { gt: 0 },
            ...(streamIds ? { streamId: { in: streamIds } } : {}),
        },
        _sum: { tipAmount: true },
        _count: { profileId: true },
        orderBy: { _sum: { tipAmount: "desc" } },
        take: limit,
    });

    if (!aggs.length) return NextResponse.json({ donors: [] });

    const profs = await prisma.userProfile.findMany({
        where: { id: { in: aggs.map(a => a.profileId) } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        donors: aggs.map((a, i) => {
            const p = pMap[a.profileId];
            return {
                rank: i + 1,
                totalTips: a._sum.tipAmount || 0,
                tipCount: a._count.profileId,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            };
        }),
    });
}
