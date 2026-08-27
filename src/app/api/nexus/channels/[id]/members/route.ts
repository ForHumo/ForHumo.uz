import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { logChannelAudit } from "@/lib/nexus-channel-audit";

// GET /api/nexus/channels/[id]/members — a'zolar ro'yxati (a'zolar ko'radi)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { isPrivate: true, ownerId: true } });
    if (!channel) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const myMember = await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true } });
    if (channel.isPrivate && !myMember) return NextResponse.json({ error: "Yopiq" }, { status: 403 });

    // Role-first sortlash: OWNER > ADMIN > MEMBER, keyin joinedAt asc
    const rawMembers = await prisma.nexusChannelMember.findMany({
        where: { channelId: id }, take: 200,
    });
    const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    const members = rawMembers.sort((a, b) => {
        const dr = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
        return dr !== 0 ? dr : a.joinedAt.getTime() - b.joinedAt.getTime();
    });
    const ids = members.map(m => m.profileId);
    const profs = await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, lastLoginAt: true } });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    // Online = lastLoginAt oxirgi 15 daq
    const onlineCutoff = Date.now() - 15 * 60 * 1000;
    return NextResponse.json({
        canManage: myMember?.role === "OWNER" || myMember?.role === "ADMIN",
        canPromote: myMember?.role === "OWNER",
        members: members.map(m => {
            const p = pMap[m.profileId];
            const isOnline = p?.lastLoginAt && p.lastLoginAt.getTime() > onlineCutoff;
            return {
                profileId: m.profileId, role: m.role,
                name: p?.name ?? null, username: p?.username ?? null,
                image: p?.image ?? null, verified: p ? isVerifiedProfile(p) : false,
                isAnonymous: m.isAnonymous,
                online: !!isOnline,
                lastSeenAt: p?.lastLoginAt ?? null,
            };
        }),
    });
}

// PATCH /api/nexus/channels/[id]/members — rolni o'zgartirish (faqat owner) { profileId, role }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { ownerId: true } });
    if (!channel || channel.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const body = await req.json();
    const { profileId, role, isAnonymous } = body as { profileId: string; role?: string; isAnonymous?: boolean };
    const target = await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId: id, profileId } } });
    if (!target || target.role === "OWNER") return NextResponse.json({ error: "Noto'g'ri a'zo" }, { status: 400 });

    // Faqat anonymous toggle
    if (role === undefined && typeof isAnonymous === "boolean") {
        // Anonymous — o'zining OR OWNER boshqa admin uchun (faqat ADMIN a'zolar uchun)
        if (target.role !== "ADMIN") return NextResponse.json({ error: "Faqat admin anonim bo'la oladi" }, { status: 400 });
        if (profileId !== me.id) return NextResponse.json({ error: "Boshqa a'zoning anonim rejimini o'zgartira olmaysiz" }, { status: 403 });
        await prisma.nexusChannelMember.update({ where: { id: target.id }, data: { isAnonymous } });
        return NextResponse.json({ ok: true, isAnonymous });
    }

    if (profileId === me.id) return NextResponse.json({ error: "O'z rolingizni o'zgartira olmaysiz" }, { status: 400 });
    const newRole = role === "ADMIN" ? "ADMIN" : "MEMBER";
    await prisma.nexusChannelMember.update({ where: { id: target.id }, data: { role: newRole } });
    await logChannelAudit({
        channelId: id, actorId: me.id,
        action: newRole === "ADMIN" ? "promote" : "demote",
        targetId: profileId,
    });
    return NextResponse.json({ ok: true, profileId, role: newRole });
}

// DELETE /api/nexus/channels/[id]/members?profileId=X — a'zoni chiqarish (kick, faqat owner)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const url = new URL(req.url);
    const profileId = url.searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });

    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { ownerId: true } });
    if (!channel || channel.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });
    if (profileId === me.id) return NextResponse.json({ error: "Egani chiqara olmaysiz" }, { status: 400 });

    const target = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId } },
    });
    if (!target || target.role === "OWNER") return NextResponse.json({ error: "Noto'g'ri a'zo" }, { status: 400 });

    await prisma.nexusChannelMember.delete({ where: { id: target.id } });
    await prisma.nexusChannel.update({
        where: { id }, data: { memberCount: { decrement: 1 } },
    });
    await logChannelAudit({ channelId: id, actorId: me.id, action: "kick", targetId: profileId });
    return NextResponse.json({ ok: true });
}
