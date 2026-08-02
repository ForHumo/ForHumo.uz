import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIF_TYPES } from "@/lib/notif-types";

// GET /api/user/notif-prefs — foydalanuvchining hozirgi sozlamalari
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { notifPrefs: true },
    });
    return NextResponse.json({ prefs: (me?.notifPrefs ?? {}) as Record<string, boolean> });
}

// PATCH /api/user/notif-prefs — bitta turni yoqish/o'chirish
// body: { type: string, enabled: boolean }
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, enabled } = (await req.json()) as { type?: string; enabled?: boolean };
    if (!type || !NOTIF_TYPES.includes(type as (typeof NOTIF_TYPES)[number])) {
        return NextResponse.json({ error: "Noto'g'ri tur" }, { status: 400 });
    }
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, notifPrefs: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const prefs: Record<string, boolean> = { ...((me.notifPrefs ?? {}) as Record<string, boolean>) };
    if (enabled === false) prefs[type] = false;
    else delete prefs[type];    // yoqilgan = ro'yxatdan olib tashlash (default yoqilgan)

    await prisma.userProfile.update({
        where: { id: me.id }, data: { notifPrefs: prefs as never },
    });
    return NextResponse.json({ ok: true, prefs });
}
