// Eksport holati — UI'ga qachon keyingi eksport mumkin ekanligini ko'rsatish.
//   GET /api/user/export/status  → { lastExportAt, nextAvailableAt, ready }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXPORT_WINDOW_MS = 7 * 24 * 3600 * 1000;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { lastExportAt: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    if (!me.lastExportAt) {
        return NextResponse.json({ lastExportAt: null, nextAvailableAt: null, ready: true });
    }
    const nextAt = new Date(me.lastExportAt.getTime() + EXPORT_WINDOW_MS);
    return NextResponse.json({
        lastExportAt:    me.lastExportAt.toISOString(),
        nextAvailableAt: nextAt.toISOString(),
        ready:           Date.now() >= nextAt.getTime(),
    });
}
