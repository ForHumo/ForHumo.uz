import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { getStreamProvider } from "@/lib/esport-stream";

// PATCH /api/esport/broadcasts/[id] — holat/maydonlarni yangilash (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const b = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (typeof b.title === "string" && b.title.trim()) data.title = b.title.trim();
    if (["LIVE", "SCHEDULED", "ENDED"].includes(b.status)) {
        data.status = b.status;
        if (b.status === "ENDED") data.endedAt = new Date();
    }
    if ("streamUrl" in b) data.streamUrl = b.streamUrl?.toString().trim() || null;
    if ("nexusLiveId" in b) data.nexusLiveId = b.nexusLiveId?.toString().trim() || null;
    if ("posterUrl" in b) data.posterUrl = b.posterUrl?.toString().trim() || null;
    if ("scheduledAt" in b) data.scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
    if ("endsAt" in b) data.endsAt = b.endsAt ? new Date(b.endsAt) : null;

    const updated = await prisma.esBroadcast.update({ where: { id }, data });
    return NextResponse.json({ broadcast: updated });
}

// DELETE /api/esport/broadcasts/[id] — o'chirish (admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const b = await prisma.esBroadcast.findUnique({ where: { id }, select: { liveInputId: true } });
    if (b?.liveInputId) {
        try { await getStreamProvider().deleteLiveInput(b.liveInputId); } catch { /* fail-safe: DB baribir o'chadi */ }
    }
    await prisma.esBroadcast.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
