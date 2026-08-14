// Ommaviy business profil ko'rish — Nexus profil sahifasidan.
//   GET /api/user/business/[username]  → { business: {...} | null }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    if (!username) return NextResponse.json({ business: null });

    const profile = await prisma.userProfile.findUnique({
        where: { username }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ business: null });

    const business = await prisma.businessProfile.findUnique({
        where: { profileId: profile.id },
    });
    return NextResponse.json({ business });
}
