// Foydalanuvchi faollik heartbeat — lastSeenAt'ni yangilaydi.
// Client har ~60 sekundda POST qiladi (Nexus ochiq bo'lsa).
// Presence bilan birga ishlaydi: presence = darhol onlayn, lastSeenAt = oxirgi ko'rilgan.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

    await prisma.userProfile.updateMany({
        where: { email: session.user.email },
        data: { lastSeenAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
