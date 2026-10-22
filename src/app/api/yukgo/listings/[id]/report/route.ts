// YukGo — "Band bo'ldi" shikoyat (staleness). Login SHART.
// Bitta login'li user bir e'lonni bir marta belgilaydi; 2 xil user belgilasa → yashiriladi.
// POST /api/yukgo/listings/[id]/report

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HIDE_THRESHOLD = 2;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const meId = (session?.user as { profileId?: string } | undefined)?.profileId;
    if (!meId) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = { id: meId };

    const { id } = await params;
    const listing = await prisma.yukListing.findUnique({ where: { id }, select: { reportedBy: true, status: true } });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (listing.reportedBy.includes(me.id)) {
        return NextResponse.json({ ok: true, reported: true, hidden: listing.status !== "ACTIVE" });
    }
    const next = [...listing.reportedBy, me.id];
    const hide = next.length >= HIDE_THRESHOLD;
    await prisma.yukListing.update({
        where: { id },
        data: { reportedBy: next, ...(hide ? { status: "EXPIRED" } : {}) },
    });
    return NextResponse.json({ ok: true, reported: true, hidden: hide });
}
