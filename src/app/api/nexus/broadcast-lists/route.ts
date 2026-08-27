// GET  /api/nexus/broadcast-lists — mening ro'yxatlarim
// POST /api/nexus/broadcast-lists — yangi { name, memberIds[] }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
}

export async function GET() {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lists = await prisma.nexusBroadcastList.findMany({
        where: { ownerId: owner.id }, orderBy: { updatedAt: "desc" }, take: 50,
        include: { members: { select: { profileId: true } } },
    });

    // Ro'yxatdagi barcha member profillarini olamiz (avatarlar uchun)
    const allMemberIds = Array.from(new Set(lists.flatMap(l => l.members.map(m => m.profileId))));
    const profiles = allMemberIds.length
        ? await prisma.userProfile.findMany({
            where: { id: { in: allMemberIds } },
            select: { id: true, name: true, username: true, image: true },
        })
        : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
        items: lists.map(l => ({
            id: l.id,
            name: l.name,
            memberCount: l.members.length,
            members: l.members.slice(0, 5).map(m => pMap.get(m.profileId) ?? { id: m.profileId, name: null, username: null, image: null }),
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
        })),
    });
}

export async function POST(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 80);
    const memberIds = Array.isArray(body?.memberIds)
        ? body.memberIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 256)
        : [];

    if (!name) return NextResponse.json({ error: "Nom kiriting" }, { status: 400 });
    if (memberIds.length < 1) return NextResponse.json({ error: "Kamida 1 a'zo tanlang" }, { status: 400 });

    // Ownerni ro'yxatdan chiqarish + dedupe
    const cleanIds: string[] = Array.from(new Set(memberIds.filter((id: string) => id !== owner.id)));

    const created = await prisma.nexusBroadcastList.create({
        data: {
            ownerId: owner.id, name,
            members: {
                create: cleanIds.map((id: string) => ({ profileId: id })),
            },
        },
    });
    return NextResponse.json({ ok: true, id: created.id });
}
