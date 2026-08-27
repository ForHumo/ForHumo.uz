// POST /api/nexus/chat-lock/verify — PIN'ni tekshirish (locked chatlarni ochish uchun).
// Sessionga saqlash — client tomon (localStorage TTL 30 daq).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/nexus-chat-lock";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const pin = String(body?.pin ?? "");

    const lock = await prisma.nexusChatLock.findUnique({ where: { ownerId: me.id } });
    if (!lock) return NextResponse.json({ ok: false, error: "PIN sozlanmagan" });

    const ok = lock.pinHash === hashPin(pin, me.id);
    return NextResponse.json({ ok });
}
