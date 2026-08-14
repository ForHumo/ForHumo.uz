// Broadcast list tafsiloti / tahrir / o'chirish.
//
//   GET    /api/nexus/broadcast/[id]   → { id, name, members: [{ profileId, name, username, image, addedAt }] }
//   PATCH  /api/nexus/broadcast/[id]   Body: { name }
//   DELETE /api/nexus/broadcast/[id]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownedList(email: string | null | undefined, listId: string) {
    if (!email) return { error: "Unauthorized", status: 401 as const };
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "Profil topilmadi", status: 404 as const };
    const list = await prisma.nexusBroadcastList.findUnique({ where: { id: listId }, select: { id: true, ownerId: true, name: true, createdAt: true, updatedAt: true } });
    if (!list) return { error: "Ro'yxat topilmadi", status: 404 as const };
    if (list.ownerId !== me.id) return { error: "Ruxsat yo'q", status: 403 as const };
    return { me, list };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const r = await ownedList(session?.user?.email, id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    const members = await prisma.nexusBroadcastListMember.findMany({
        where: { listId: id },
        orderBy: { addedAt: "desc" },
    });
    const profileIds = members.map(m => m.profileId);
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    }) : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
        id: r.list.id,
        name: r.list.name,
        createdAt: r.list.createdAt,
        updatedAt: r.list.updatedAt,
        members: members.map(m => {
            const p = pMap.get(m.profileId);
            return {
                profileId: m.profileId,
                name: p?.name ?? null,
                username: p?.username ?? null,
                image: p?.image ?? null,
                humoId: p?.humoId ?? null,
                addedAt: m.addedAt,
            };
        }),
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const r = await ownedList(session?.user?.email, id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: "Ism majburiy" }, { status: 400 });

    await prisma.nexusBroadcastList.update({ where: { id }, data: { name } });
    return NextResponse.json({ ok: true, name });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const r = await ownedList(session?.user?.email, id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    await prisma.nexusBroadcastList.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
