// Guruh/kanal taklif havolalari — Telegram/Discord uslubidagi invite links.
//
//   GET  /api/nexus/channels/[id]/invites          → mening yaratganlarim (admin/owner uchun barchasi)
//   POST /api/nexus/channels/[id]/invites          → yangi havola { expiresInHours?, maxUses? }

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePermissions } from "@/lib/channel-permissions";

// Base32 (Crockford — o'qish oson, kichik harfsiz) ~ 10 belgi = 50 bit entropiya
const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function generateInviteCode(len = 10): string {
    const bytes = crypto.randomBytes(len);
    let out = "";
    for (let i = 0; i < len; i++) out += BASE32[bytes[i] % 32];
    return out;
}

async function meAndMember(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, channel: null, member: null };
    const channel = await prisma.nexusChannel.findUnique({ where: { id: channelId } });
    const member = channel ? await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } },
    }) : null;
    return { me, channel, member };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!member) return NextResponse.json({ error: "A'zo emas" }, { status: 403 });

    const perms = effectivePermissions(member.role, channel.defaultPermissions, member.permissions);
    const isAdminish = member.role === "OWNER" || member.role === "ADMIN";
    // Owner/admin barcha havolalarni ko'radi; oddiy foydalanuvchi (agar addMembers ruxsatiga ega bo'lsa) faqat o'ziniki.
    const where = isAdminish
        ? { channelId: id }
        : (perms.addMembers ? { channelId: id, createdById: me.id } : null);
    if (!where) return NextResponse.json({ invites: [] });

    const invites = await prisma.nexusChannelInvite.findMany({
        where, orderBy: { createdAt: "desc" }, take: 20,
    });
    return NextResponse.json({
        invites: invites.map(inv => ({
            id: inv.id,
            code: inv.code,
            url: `/join/${inv.code}`,
            createdById: inv.createdById,
            expiresAt: inv.expiresAt,
            maxUses: inv.maxUses,
            usesCount: inv.usesCount,
            revokedAt: inv.revokedAt,
            createdAt: inv.createdAt,
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!member) return NextResponse.json({ error: "A'zo emas" }, { status: 403 });

    const perms = effectivePermissions(member.role, channel.defaultPermissions, member.permissions);
    if (!perms.addMembers && member.role !== "OWNER" && member.role !== "ADMIN") {
        return NextResponse.json({ error: "A'zo qo'shish taqiqlangan" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // expiresInHours: 1..720 (30 kun). 0 yoki NULL — doimiy.
    let expiresAt: Date | null = null;
    if (typeof body.expiresInHours === "number" && body.expiresInHours > 0) {
        const h = Math.min(720, Math.floor(body.expiresInHours));
        expiresAt = new Date(Date.now() + h * 3600 * 1000);
    }
    let maxUses: number | null = null;
    if (typeof body.maxUses === "number" && body.maxUses > 0) {
        maxUses = Math.min(10000, Math.floor(body.maxUses));
    }

    // Unik kod — collision (juda past ehtimol, lekin safety uchun retry)
    let code = "";
    for (let i = 0; i < 5; i++) {
        code = generateInviteCode(10);
        const exists = await prisma.nexusChannelInvite.findUnique({ where: { code }, select: { id: true } });
        if (!exists) break;
    }
    if (!code) return NextResponse.json({ error: "Kod yaratib bo'lmadi" }, { status: 500 });

    const inv = await prisma.nexusChannelInvite.create({
        data: { channelId: id, code, createdById: me.id, expiresAt, maxUses },
    });

    return NextResponse.json({
        ok: true,
        invite: {
            id: inv.id,
            code: inv.code,
            url: `/join/${inv.code}`,
            expiresAt: inv.expiresAt,
            maxUses: inv.maxUses,
            usesCount: 0,
            createdAt: inv.createdAt,
        },
    });
}
