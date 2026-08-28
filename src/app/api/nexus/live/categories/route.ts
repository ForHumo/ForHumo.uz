import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Batch AC — Live kategoriyalarni jonli efir sonlari bilan (discovery uchun)
export const revalidate = 60;

const CATEGORY_LABELS: Record<string, string> = {
    gaming: "Gaming", musiqa: "Musiqa", dasturlash: "Dasturlash", sport: "Sport",
    talim: "Ta'lim", suhbat: "Suhbat", kulinariya: "Oshxona", shou: "Shou", podkast: "Podkast",
};

export async function GET() {
    const groups = await prisma.nexusLiveStream.groupBy({
        by: ["category"],
        where: { status: "LIVE", privacy: "PUBLIC", hidden: false, category: { not: null } },
        _count: { id: true },
        _sum: { peakViewers: true },
    });

    const items = groups
        .filter(g => g.category)
        .map(g => ({
            id: g.category as string,
            label: CATEGORY_LABELS[g.category as string] || (g.category as string),
            liveCount: g._count.id,
            totalViewers: g._sum.peakViewers || 0,
        }))
        .sort((a, b) => b.liveCount - a.liveCount || b.totalViewers - a.totalViewers);

    return NextResponse.json({ categories: items });
}
