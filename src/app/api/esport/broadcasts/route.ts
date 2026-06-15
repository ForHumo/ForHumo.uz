import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/broadcasts — barcha translyatsiyalar (admin boshqaruvi)
export async function GET() {
    const list = await prisma.esBroadcast.findMany({ orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ broadcasts: list });
}

// POST /api/esport/broadcasts — yangi translyatsiya rejalashtirish (admin)
export async function POST(req: NextRequest) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const title = (b.title || "").toString().trim();
    if (!title) return NextResponse.json({ error: "Sarlavha kiriting" }, { status: 400 });

    const status = ["LIVE", "SCHEDULED", "ENDED"].includes(b.status) ? b.status : "SCHEDULED";
    const created = await prisma.esBroadcast.create({
        data: {
            title,
            status,
            streamUrl: b.streamUrl?.toString().trim() || null,
            nexusLiveId: b.nexusLiveId?.toString().trim() || null,
            posterUrl: b.posterUrl?.toString().trim() || null,
            tournamentId: b.tournamentId?.toString() || null,
            matchId: b.matchId?.toString() || null,
            scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
            createdBy: admin.humoId || admin.id,
        },
    });
    return NextResponse.json({ broadcast: created });
}
