// A'zoning o'ziga tegishli sozlamalarini o'zgartirish (anonim rejim, mute, ...).
//
//   PATCH /api/nexus/channels/[id]/members/me
//     body: { isAnonymous?: boolean }
//   isAnonymous — faqat OWNER/ADMIN uchun (foydalanuvchi o'zi tanlaydi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true, role: true },
    });
    if (!member) return NextResponse.json({ error: "A'zo emassiz" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body.isAnonymous === "boolean") {
        // Faqat OWNER/ADMIN anonim rejimda yozishi mumkin
        if (member.role !== "OWNER" && member.role !== "ADMIN") {
            return NextResponse.json({ error: "Anonim rejim faqat admin/egasi uchun" }, { status: 403 });
        }
        data.isAnonymous = body.isAnonymous;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noChanges: true });

    await prisma.nexusChannelMember.update({ where: { id: member.id }, data });
    return NextResponse.json({ ok: true, ...data });
}
