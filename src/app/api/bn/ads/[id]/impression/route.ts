// BN reklama banner impressions counter — banner ko'rilganda POST qilinadi.
// Rate-limit'siz (analytics — over-count OK).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.bnAdBanner.updateMany({
        where: { id, active: true, hidden: false },
        data: { impressions: { increment: 1 } },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
}
