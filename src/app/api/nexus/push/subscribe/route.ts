import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/push/subscribe — brauzer push obunasini saqlash
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: "Noto'g'ri obuna" }, { status: 400 });

    await prisma.nexusPushSub.upsert({
        where: { endpoint },
        create: { profileId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { profileId: me.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    return NextResponse.json({ ok: true });
}

// DELETE /api/nexus/push/subscribe — obunani o'chirish ({ endpoint })
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { endpoint } = await req.json().catch(() => ({}));
    if (endpoint) await prisma.nexusPushSub.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
}
