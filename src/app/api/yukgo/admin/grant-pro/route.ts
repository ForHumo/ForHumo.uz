// YukGo — Pro obunani qo'lda faollashtirish (founder-gated).
// To'lov shlyuzi (Click/Payme) tayyor bo'lmaguncha: user kartadan to'laydi → siz Pro berasiz.
// POST /api/yukgo/admin/grant-pro  body: { humoId | username, days? (default 30) }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { username: true, humoId: true } });
    if (!isFounderProfile(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const ident = String(b.humoId || b.username || "").trim().replace(/^@/, "");
    const days = Math.max(1, Math.min(366, Number(b.days) || 30));
    if (!ident) return NextResponse.json({ error: "humoId yoki username kerak" }, { status: 400 });

    const target = await prisma.userProfile.findFirst({
        where: { OR: [{ humoId: ident }, { username: ident }] }, select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "foydalanuvchi topilmadi" }, { status: 404 });

    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const driver = await prisma.yukDriver.upsert({
        where: { profileId: target.id },
        update: { subActiveUntil: until },
        create: { profileId: target.id, subActiveUntil: until },
    });
    return NextResponse.json({ ok: true, profileId: target.id, subActiveUntil: driver.subActiveUntil, days });
}
