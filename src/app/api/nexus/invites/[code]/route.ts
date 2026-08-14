// Havola bilan qo'shilish — public endpoint.
//
//   GET  /api/nexus/invites/[code]        → preview (nom, avatar, a'zolar)
//   POST /api/nexus/invites/[code]        → qo'shilish (autentifikatsiyalangan foydalanuvchi)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findValidInvite(code: string) {
    const inv = await prisma.nexusChannelInvite.findUnique({
        where: { code },
        include: {
            channel: {
                select: {
                    id: true, type: true, name: true, handle: true, avatarUrl: true,
                    description: true, memberCount: true, hidden: true,
                },
            },
        },
    });
    if (!inv || inv.revokedAt) return { error: "Havola bekor qilingan yoki mavjud emas", status: 404 as const, inv: null };
    if (inv.channel.hidden) return { error: "Kanal moderatsiya tomonidan yashirilgan", status: 404 as const, inv: null };
    if (inv.expiresAt && inv.expiresAt < new Date()) return { error: "Havola muddati tugagan", status: 410 as const, inv: null };
    if (inv.maxUses && inv.usesCount >= inv.maxUses) return { error: "Havola ishlatilishi tugagan", status: 410 as const, inv: null };
    return { error: null, status: 200 as const, inv };
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const { error, status, inv } = await findValidInvite(code);
    if (error || !inv) return NextResponse.json({ error }, { status });
    return NextResponse.json({
        channel: {
            id: inv.channel.id, type: inv.channel.type, name: inv.channel.name,
            handle: inv.channel.handle, avatarUrl: inv.channel.avatarUrl,
            description: inv.channel.description, memberCount: inv.channel.memberCount,
        },
        expiresAt: inv.expiresAt,
        usesCount: inv.usesCount, maxUses: inv.maxUses,
    });
}

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, humoId: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.humoId || !me.username) return NextResponse.json({ error: "Humo ID yarating" }, { status: 403 });

    const { error, status, inv } = await findValidInvite(code);
    if (error || !inv) return NextResponse.json({ error }, { status });

    // Allaqachon a'zomi?
    const existing = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: inv.channel.id, profileId: me.id } },
        select: { id: true },
    });
    if (existing) {
        return NextResponse.json({
            ok: true, alreadyMember: true,
            channel: { id: inv.channel.id, type: inv.channel.type, name: inv.channel.name },
        });
    }

    // Guruh limit — 500
    if (inv.channel.memberCount >= 500) {
        return NextResponse.json({ error: "Guruh to'lgan (500)" }, { status: 400 });
    }

    // Atomik: qo'shish + memberCount + usesCount
    await prisma.$transaction([
        prisma.nexusChannelMember.create({
            data: { channelId: inv.channel.id, profileId: me.id, role: "MEMBER" },
        }),
        prisma.nexusChannel.update({
            where: { id: inv.channel.id }, data: { memberCount: { increment: 1 } },
        }),
        prisma.nexusChannelInvite.update({
            where: { id: inv.id }, data: { usesCount: { increment: 1 } },
        }),
    ]);

    return NextResponse.json({
        ok: true, joined: true,
        channel: { id: inv.channel.id, type: inv.channel.type, name: inv.channel.name },
    });
}
