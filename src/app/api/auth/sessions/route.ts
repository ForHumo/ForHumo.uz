// Mening aktiv sessiyalarim ro'yxati.
//   GET    /api/auth/sessions          → { sessions: [...], currentJti }
//   DELETE /api/auth/sessions          → boshqa barcha sessiyalarni tugatish (joriysi qoladi)
//
// Xavfsizlik: faqat egasi ko'radi. Revoked sessiyalar chiqmaydi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateJti } from "@/lib/auth-session-cache";

interface UserWithJti { jti?: string | null }

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const sessions = await prisma.authSession.findMany({
        where: { profileId: me.id, revokedAt: null },
        orderBy: { lastSeenAt: "desc" },
        select: { id: true, jti: true, deviceHint: true, ipHint: true, origin: true, createdAt: true, lastSeenAt: true },
    });

    return NextResponse.json({
        currentJti: (session.user as UserWithJti).jti ?? null,
        sessions,
    });
}

// Barcha boshqa sessiyalarni bekor qilish (joriysi qoladi).
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const currentJti = (session.user as UserWithJti).jti ?? "";
    const affected = await prisma.authSession.findMany({
        where: { profileId: me.id, revokedAt: null, jti: { not: currentJti } },
        select: { jti: true },
    });
    await prisma.authSession.updateMany({
        where: { profileId: me.id, revokedAt: null, jti: { not: currentJti } },
        data:  { revokedAt: new Date() },
    });
    for (const s of affected) invalidateJti(s.jti);
    return NextResponse.json({ ok: true, revoked: affected.length });
}
