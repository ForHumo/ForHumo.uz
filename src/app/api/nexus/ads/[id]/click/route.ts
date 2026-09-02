import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.nexusAdSlot.updateMany({
        where: { id, active: true, hidden: false },
        data: { clicks: { increment: 1 } },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
}
