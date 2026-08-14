// Mening kontaktlarimda kim ForHumo'da bor?
// Sinxronizatsiyadan keyin ham qayta chaqirish mumkin (yangi qo'shilganlar chiqadi).
//
//   GET /api/nexus/contacts/matches?limit=100
//   → { total, matches: [{ profileId, username, name, image, nameHint? }] }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 100)));

    const myContacts = await prisma.nexusContactHash.findMany({
        where: { ownerId: me.id },
        orderBy: { addedAt: "desc" },
        take: limit,
    });
    if (myContacts.length === 0) return NextResponse.json({ total: 0, matches: [] });

    const hashes = myContacts.map(c => c.phoneHash);
    const users = await prisma.userProfile.findMany({
        where: {
            phoneHash: { in: hashes },
            id: { not: me.id },
            privacyDm: { not: "none" },
        },
        select: {
            id: true, username: true, name: true, image: true, phoneHash: true, humoId: true,
            verified: true, verifiedCategory: true,
        },
    });
    const hintMap = new Map(myContacts.filter(c => c.nameHint).map(c => [c.phoneHash, c.nameHint]));

    return NextResponse.json({
        total: users.length,
        matches: users.map(u => ({
            profileId: u.id,
            username:  u.username,
            name:      u.name,
            image:     u.image,
            humoId:    u.humoId,
            nameHint:  u.phoneHash ? hintMap.get(u.phoneHash) ?? null : null,
            verified:  isVerifiedProfile(u),
        })),
    });
}

// Barcha sinxronlangan kontaktlarni o'chirish (privacy)
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const del = await prisma.nexusContactHash.deleteMany({ where: { ownerId: me.id } });
    return NextResponse.json({ ok: true, deleted: del.count });
}
