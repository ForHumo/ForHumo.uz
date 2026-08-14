// Broadcast list — mening ro'yxatlarim (GET) va yangi ro'yxat yaratish (POST).
//
//   GET  /api/nexus/broadcast          → { lists: [{id, name, memberCount, updatedAt}] }
//   POST /api/nexus/broadcast          Body: { name }   → { id, name, memberCount: 0 }
//
// Cheklovlar:
//   - Ismi 1-40 belgi, majburiy.
//   - Foydalanuvchida maks 20 ta broadcast list.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LISTS_PER_USER = 20;
const NAME_MAX = 40;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const lists = await prisma.nexusBroadcastList.findMany({
        where: { ownerId: me.id },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({
        lists: lists.map(l => ({
            id: l.id,
            name: l.name,
            memberCount: l._count.members,
            updatedAt: l.updatedAt,
            createdAt: l.createdAt,
        })),
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().slice(0, NAME_MAX);
    if (!name) return NextResponse.json({ error: "Ism majburiy" }, { status: 400 });

    const existing = await prisma.nexusBroadcastList.count({ where: { ownerId: me.id } });
    if (existing >= MAX_LISTS_PER_USER) return NextResponse.json({ error: `Ko'pi bilan ${MAX_LISTS_PER_USER} ta ro'yxat` }, { status: 400 });

    const list = await prisma.nexusBroadcastList.create({
        data: { ownerId: me.id, name },
    });

    return NextResponse.json({ id: list.id, name: list.name, memberCount: 0 });
}
