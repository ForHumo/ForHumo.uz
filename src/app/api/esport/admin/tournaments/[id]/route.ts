import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

const STATUSES = ["UPCOMING", "REGISTRATION", "LIVE", "ENDED"];

// PATCH /api/esport/admin/tournaments/[id] — { status?, registrationEndsAt?, startsAt?, endsAt?, prizePool? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof b.status === "string" && STATUSES.includes(b.status)) data.status = b.status;
    if ("registrationEndsAt" in b) data.registrationEndsAt = b.registrationEndsAt ? new Date(b.registrationEndsAt) : null;
    if ("startsAt" in b) data.startsAt = b.startsAt ? new Date(b.startsAt) : null;
    if ("endsAt" in b) data.endsAt = b.endsAt ? new Date(b.endsAt) : null;
    if (b.prizePool != null) data.prizePool = Math.max(0, Number(b.prizePool));
    await prisma.esTournament.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}

// DELETE /api/esport/admin/tournaments/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    await prisma.esTournament.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
}
