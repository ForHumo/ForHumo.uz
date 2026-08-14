// Broadcast list a'zolarini boshqarish.
//
//   POST   /api/nexus/broadcast/[id]/members   Body: { profileIds: string[] | username: string }
//   DELETE /api/nexus/broadcast/[id]/members   Body: { profileId } (bitta)
//
// Cheklovlar:
//   - Har ro'yxatda maks 100 a'zo.
//   - O'zini qo'shib bo'lmaydi.
//   - Blok holatida ham qo'shsa bo'ladi (yuborishda skip qilinadi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MEMBERS = 100;

async function ownedList(email: string | null | undefined, listId: string) {
    if (!email) return { error: "Unauthorized", status: 401 as const };
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "Profil topilmadi", status: 404 as const };
    const list = await prisma.nexusBroadcastList.findUnique({ where: { id: listId }, select: { id: true, ownerId: true } });
    if (!list) return { error: "Ro'yxat topilmadi", status: 404 as const };
    if (list.ownerId !== me.id) return { error: "Ruxsat yo'q", status: 403 as const };
    return { me, list };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const r = await ownedList(session?.user?.email, id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    const body = await req.json().catch(() => ({}));
    const requestedIds: string[] = Array.isArray(body?.profileIds)
        ? body.profileIds.filter((x: unknown) => typeof x === "string")
        : [];
    // username orqali bitta qo'shish qulayligi
    if (typeof body?.username === "string" && body.username.trim()) {
        const p = await prisma.userProfile.findUnique({ where: { username: body.username.trim() }, select: { id: true } });
        if (p) requestedIds.push(p.id);
    }
    const uniq = [...new Set(requestedIds)].filter(pid => pid !== r.me.id);
    if (uniq.length === 0) return NextResponse.json({ error: "A'zolar berilmagan" }, { status: 400 });

    const current = await prisma.nexusBroadcastListMember.count({ where: { listId: id } });
    if (current + uniq.length > MAX_MEMBERS) {
        return NextResponse.json({ error: `Ko'pi bilan ${MAX_MEMBERS} a'zo (hozir ${current})` }, { status: 400 });
    }

    // Faqat mavjud profillar
    const found = await prisma.userProfile.findMany({
        where: { id: { in: uniq } }, select: { id: true },
    });
    const validIds = found.map(f => f.id);
    if (validIds.length === 0) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    await prisma.nexusBroadcastListMember.createMany({
        data: validIds.map(pid => ({ listId: id, profileId: pid })),
        skipDuplicates: true,
    });
    await prisma.nexusBroadcastList.update({ where: { id }, data: { updatedAt: new Date() } });

    const count = await prisma.nexusBroadcastListMember.count({ where: { listId: id } });
    return NextResponse.json({ ok: true, added: validIds.length, memberCount: count });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const r = await ownedList(session?.user?.email, id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    const body = await req.json().catch(() => ({}));
    const profileId = String(body?.profileId || "").trim();
    if (!profileId) return NextResponse.json({ error: "profileId majburiy" }, { status: 400 });

    await prisma.nexusBroadcastListMember.deleteMany({ where: { listId: id, profileId } });
    await prisma.nexusBroadcastList.update({ where: { id }, data: { updatedAt: new Date() } });
    const count = await prisma.nexusBroadcastListMember.count({ where: { listId: id } });
    return NextResponse.json({ ok: true, memberCount: count });
}
