import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/broadcasts/[id]/ingest — OBS sozlash (RTMP URL + kalit). MAXFIY: faqat admin/ega.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const b = await prisma.esBroadcast.findUnique({ where: { id }, select: { ingestUrl: true, streamKey: true, source: true } });
    if (!b) return NextResponse.json({ error: "Efir topilmadi" }, { status: 404 });
    if (b.source !== "CLOUDFLARE" || !b.streamKey) return NextResponse.json({ error: "Bu efir saytdan stream emas" }, { status: 400 });
    return NextResponse.json({ rtmpUrl: b.ingestUrl, streamKey: b.streamKey });
}
