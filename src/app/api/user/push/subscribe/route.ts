// WebPush obunasini saqlash / o'chirish.
//   POST /api/user/push/subscribe   { endpoint, p256dh, auth, userAgent? }
//   DELETE /api/user/push/subscribe { endpoint }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint ?? "").trim();
    const p256dh = String(body?.p256dh ?? "").trim();
    const auth = String(body?.auth ?? "").trim();

    if (!endpoint || !p256dh || !auth) {
        return NextResponse.json({ error: "endpoint, p256dh, auth kerak" }, { status: 400 });
    }
    if (!/^https?:\/\//.test(endpoint)) {
        return NextResponse.json({ error: "noto'g'ri endpoint" }, { status: 400 });
    }

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    await prisma.nexusPushSub.upsert({
        where: { endpoint },
        create: { profileId: me.id, endpoint, p256dh, auth },
        update: { profileId: me.id, p256dh, auth },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint ?? "").trim();
    if (!endpoint) return NextResponse.json({ error: "endpoint kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    await prisma.nexusPushSub.deleteMany({
        where: { endpoint, profileId: me.id },
    });
    return NextResponse.json({ ok: true });
}
