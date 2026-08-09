// Owner: worker'ni o'chirish.
//   DELETE /api/market/admin/workers/[id]     ([id] = MarketWorker.id)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketStaff } from "@/lib/market-staff";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const staff = await getMarketStaff();
    if (!staff || !staff.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.marketWorker.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
}
