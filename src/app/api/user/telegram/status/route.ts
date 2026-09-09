// Humo ID egasining Telegram bog'lanish holati.
//   GET  /api/user/telegram/status → { linked, identity? }
//   DELETE  → Telegram identity'ni uzish

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const identity = await prisma.identity.findFirst({
        where: { profileId: profile.id, provider: "TELEGRAM" },
        select: { id: true, providerId: true, username: true, photoUrl: true, createdAt: true },
    });

    return NextResponse.json({
        linked: !!identity,
        identity: identity ?? null,
    });
}

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    await prisma.identity.deleteMany({
        where: { profileId: profile.id, provider: "TELEGRAM" },
    });
    return NextResponse.json({ ok: true });
}
