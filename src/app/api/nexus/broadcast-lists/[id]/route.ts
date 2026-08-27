// GET    /api/nexus/broadcast-lists/[id]
// PATCH  { name?, memberIds? }
// DELETE

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guard(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const list = await prisma.nexusBroadcastList.findUnique({
        where: { id },
        include: { members: true },
    });
    if (!list || list.ownerId !== me.id) return null;
    return { me, list };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const g = await guard(session.user.email, id);
    if (!g) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const memberIds = g.list.members.map(m => m.profileId);
    const profiles = memberIds.length
        ? await prisma.userProfile.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, username: true, image: true },
        })
        : [];

    return NextResponse.json({
        id: g.list.id,
        name: g.list.name,
        members: profiles,
        createdAt: g.list.createdAt,
        updatedAt: g.list.updatedAt,
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const g = await guard(session.user.email, id);
    if (!g) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : undefined;
    const memberIds = Array.isArray(body?.memberIds)
        ? body.memberIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 256)
        : undefined;

    if (name !== undefined && name) {
        await prisma.nexusBroadcastList.update({ where: { id }, data: { name } });
    }
    if (memberIds !== undefined) {
        // Members diff — delete existing, insert new
        const clean: string[] = Array.from(new Set(memberIds.filter((x: string) => x !== g.me.id)));
        await prisma.$transaction([
            prisma.nexusBroadcastListMember.deleteMany({ where: { listId: id } }),
            prisma.nexusBroadcastListMember.createMany({
                data: clean.map((profileId: string) => ({ listId: id, profileId })),
                skipDuplicates: true,
            }),
        ]);
    }
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const g = await guard(session.user.email, id);
    if (!g) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.nexusBroadcastList.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
