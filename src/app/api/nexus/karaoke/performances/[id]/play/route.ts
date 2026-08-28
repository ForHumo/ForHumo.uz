// POST /api/nexus/karaoke/performances/[id]/play — plays++ (dedup yo'q, oddiy counter)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.nexusKaraokePerformance.updateMany({
        where: { id, hidden: false },
        data: { plays: { increment: 1 } },
    }).catch(() => { });
    return NextResponse.json({ ok: true });
}
