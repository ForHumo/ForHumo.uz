// Kalitni bekor qilish (revoke) — foydalanuvchi qurilmani yo'qotgan holda.
//   DELETE /api/user/e2e/keys/[id]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const k = await prisma.userE2eKey.findUnique({ where: { id }, select: { profileId: true, revokedAt: true } });
    if (!k) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (k.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (k.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

    await prisma.userE2eKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return NextResponse.json({ ok: true });
}
