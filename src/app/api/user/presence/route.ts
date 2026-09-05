// Foydalanuvchi presence heartbeat.
// Har 30s client tomonidan chaqiriladi. UserProfile.lastSeenAt yangilanadi.
//
//   POST /api/user/presence
//   GET  /api/user/presence  — o'zining va founder team a'zolarining hozirgi holati

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    await prisma.userProfile.updateMany({
        where: { email: session.user.email },
        data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true, at: Date.now() });
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, lastSeenAt: true, lastLoginAt: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const onlineWindow = new Date(Date.now() - 2 * 60 * 1000);
    const isOnline = !!me.lastSeenAt && me.lastSeenAt > onlineWindow;

    return NextResponse.json({
        me: {
            lastSeenAt: me.lastSeenAt?.toISOString(),
            lastLoginAt: me.lastLoginAt?.toISOString(),
            isOnline,
        },
    });
}
