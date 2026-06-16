import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { getStreamProvider } from "@/lib/esport-stream";

// GET /api/esport/broadcasts — barcha translyatsiyalar (admin boshqaruvi)
export async function GET() {
    const list = await prisma.esBroadcast.findMany({ orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }] });
    // streamKey/ingestUrl — maxfiy, hech qachon ro'yxatda qaytmaydi (faqat /ingest)
    const safe = list.map(({ streamKey, ingestUrl, ...rest }) => rest);
    return NextResponse.json({ broadcasts: safe });
}

// POST /api/esport/broadcasts — yangi translyatsiya rejalashtirish (admin)
export async function POST(req: NextRequest) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const title = (b.title || "").toString().trim();
    if (!title) return NextResponse.json({ error: "Sarlavha kiriting" }, { status: 400 });

    const status = ["LIVE", "SCHEDULED", "ENDED"].includes(b.status) ? b.status : "SCHEDULED";
    const source = b.source === "CLOUDFLARE" ? "CLOUDFLARE" : "EXTERNAL";

    let liveInputId: string | null = null, playbackId: string | null = null, streamKey: string | null = null, ingestUrl: string | null = null;
    if (source === "CLOUDFLARE") {
        try {
            const input = await getStreamProvider().createLiveInput(title.slice(0, 80));
            liveInputId = input.liveInputId; playbackId = input.playbackId; streamKey = input.streamKey; ingestUrl = input.rtmpUrl;
        } catch {
            return NextResponse.json({ error: "Stream yaratib bo'lmadi — keyinroq urinib ko'ring" }, { status: 502 });
        }
    }

    const created = await prisma.esBroadcast.create({
        data: {
            title,
            status,
            source,
            streamUrl: source === "EXTERNAL" ? (b.streamUrl?.toString().trim() || null) : null,
            nexusLiveId: b.nexusLiveId?.toString().trim() || null,
            posterUrl: b.posterUrl?.toString().trim() || null,
            tournamentId: b.tournamentId?.toString() || null,
            matchId: b.matchId?.toString() || null,
            scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
            endsAt: b.endsAt ? new Date(b.endsAt) : null,
            liveInputId, playbackId, streamKey, ingestUrl,
            createdBy: admin.humoId || admin.id,
        },
    });
    const { streamKey: _sk, ingestUrl: _iu, ...safeCreated } = created;
    return NextResponse.json({ broadcast: safeCreated });
}
