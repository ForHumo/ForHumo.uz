import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStreamerLevel } from "@/lib/nexus-live-level";

// Batch CQ — Streamer level (composite from streams+peak+tips+subs)
// GET ?username=X
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ error: "username kerak" }, { status: 400 });

    const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!p) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const [streams, subs] = await Promise.all([
        prisma.nexusLiveStream.findMany({
            where: { profileId: p.id },
            select: { id: true, peakViewers: true },
        }),
        prisma.nexusLiveSub.count({
            where: { streamerId: p.id, active: true, expiresAt: { gt: new Date() } },
        }),
    ]);
    const peakMax = streams.reduce((m, s) => Math.max(m, s.peakViewers || 0), 0);
    const tipsAgg = streams.length
        ? await prisma.nexusLiveMessage.aggregate({
            where: { streamId: { in: streams.map(s => s.id) }, tipAmount: { gt: 0 } },
            _sum: { tipAmount: true },
        })
        : { _sum: { tipAmount: 0 } };
    const stats = { streams: streams.length, peakMax, tipsSum: tipsAgg._sum.tipAmount || 0, subs };
    const { level, tier, score } = computeStreamerLevel(stats);
    return NextResponse.json({ level, tier, score, stats });
}
