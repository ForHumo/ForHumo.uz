import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

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

    const members = await prisma.nexusChannelMember.findMany({
        where: { channelId: id }, orderBy: { joinedAt: "asc" }, take: 200,
    });
    const ids = members.map(m => m.profileId);
    const profs = await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    return NextResponse.json({
        canManage: myMember?.role === "OWNER",
        members: members.map(m => {
            const p = pMap[m.profileId];
            return { profileId: m.profileId, role: m.role, name: p?.name ?? null, username: p?.username ?? null, image: p?.image ?? null, verified: p ? isVerifiedProfile(p) : false };
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

    const { profileId, role } = await req.json();
    if (profileId === me.id) return NextResponse.json({ error: "O'z rolingizni o'zgartira olmaysiz" }, { status: 400 });
    const newRole = role === "ADMIN" ? "ADMIN" : "MEMBER";
    const target = await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId: id, profileId } } });
    if (!target || target.role === "OWNER") return NextResponse.json({ error: "Noto'g'ri a'zo" }, { status: 400 });

    await prisma.nexusChannelMember.update({ where: { id: target.id }, data: { role: newRole } });
    return NextResponse.json({ ok: true, profileId, role: newRole });
}
