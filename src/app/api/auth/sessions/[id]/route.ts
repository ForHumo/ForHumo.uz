// Bitta sessiyani bekor qilish (uzoqdan chiqarish).
//   DELETE /api/auth/sessions/[id]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateJti } from "@/lib/auth-session-cache";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const s = await prisma.authSession.findUnique({ where: { id }, select: { profileId: true, jti: true, revokedAt: true } });
    if (!s) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (s.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (s.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

    await prisma.authSession.update({
        where: { id }, data: { revokedAt: new Date() },
    });
    invalidateJti(s.jti);
    return NextResponse.json({ ok: true });
}
