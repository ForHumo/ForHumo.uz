// Guruh/kanal banlari — OWNER/ADMIN boshqaradi.
//   GET    /channels/[id]/bans                       — banlangan a'zolar ro'yxati (profil ma'lumoti bilan)
//   POST   /channels/[id]/bans     { profileId, reason? } — ban qilish + membership o'chirish
//   DELETE /channels/[id]/bans?profileId=X            — ban'ni bekor qilish

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

async function guard(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } },
        select: { id: true, role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) return null;
    return me;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const bans = await prisma.nexusChannelBan.findMany({
        where: { channelId: id }, orderBy: { createdAt: "desc" }, take: 200,
    });
    const profileIds = Array.from(new Set(bans.flatMap(b => [b.profileId, b.bannedById])));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        bans: bans.map(b => ({
            id: b.id, profileId: b.profileId, reason: b.reason, createdAt: b.createdAt,
            profile: pMap.get(b.profileId) ?? null,
            bannedBy: pMap.get(b.bannedById) ?? null,
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const profileId = String(body?.profileId ?? "");
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;
    if (!profileId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });
    if (profileId === me.id) return NextResponse.json({ error: "O'zingizni ban qila olmaysiz" }, { status: 400 });

    // OWNER'ni ban qilib bo'lmaydi
    const target = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId } },
        select: { role: true },
    });
    if (target?.role === "OWNER") return NextResponse.json({ error: "OWNER ban qilinmaydi" }, { status: 400 });

    await prisma.$transaction([
        prisma.nexusChannelBan.upsert({
            where: { channelId_profileId: { channelId: id, profileId } },
            create: { channelId: id, profileId, bannedById: me.id, reason },
            update: { bannedById: me.id, reason, createdAt: new Date() },
        }),
        prisma.nexusChannelMember.deleteMany({ where: { channelId: id, profileId } }),
    ]);
    // memberCount yangilash
    const count = await prisma.nexusChannelMember.count({ where: { channelId: id } });
    await prisma.nexusChannel.update({ where: { id }, data: { memberCount: count } });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "ban", targetId: profileId, detail: reason });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await guard(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const url = new URL(req.url);
    const profileId = url.searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });
    await prisma.nexusChannelBan.deleteMany({ where: { channelId: id, profileId } });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "unban", targetId: profileId });
    return NextResponse.json({ ok: true });
}
