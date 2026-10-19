// YukGo — e'lon kontaktini ochish (GATED). Login SHART.
// Bu monetizatsiya nuqtasi: keyin bu yerda obuna/kredit tekshiruvi qo'shiladi.
// GET /api/yukgo/listings/[id]/contact → { phones, sourceLink }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { id } = await params;
    const listing = await prisma.yukListing.findFirst({
        where: { id, status: "ACTIVE" },
        select: { phones: true, sourceLink: true },
    });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // TODO(monetizatsiya): bu yerda YukDriver.subActiveUntil / kredit tekshiruvi.
    // Hozircha: login yetarli (bepul, lekin ro'yxatdan o'tgan bo'lishi kerak).

    return NextResponse.json({ phones: listing.phones, sourceLink: listing.sourceLink });
}
