// Individual invite bekor qilish. Yaratuvchi yoki owner/admin.
//
//   DELETE /api/nexus/channels/[id]/invites/[inviteId]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
    const { id, inviteId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const inv = await prisma.nexusChannelInvite.findUnique({
        where: { id: inviteId }, select: { id: true, channelId: true, createdById: true, revokedAt: true },
    });
    if (!inv || inv.channelId !== id) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (inv.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { role: true },
    });
    const isAdminish = member?.role === "OWNER" || member?.role === "ADMIN";
    if (inv.createdById !== me.id && !isAdminish) {
        return NextResponse.json({ error: "Faqat yaratuvchi yoki admin bekor qila oladi" }, { status: 403 });
    }

    await prisma.nexusChannelInvite.update({
        where: { id: inviteId }, data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
