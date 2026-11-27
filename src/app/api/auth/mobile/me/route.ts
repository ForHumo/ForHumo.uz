// GET /api/auth/mobile/me — joriy mobil token egasining profili (app start tekshiruvi).
// Bearer yaroqsiz/revoked → 401.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProfileId } from "@/lib/auth-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    const profileId = await resolveProfileId();
    if (!profileId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { id: true, humoId: true, username: true, name: true, image: true, onboardingDone: true },
    });
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ profile });
}
