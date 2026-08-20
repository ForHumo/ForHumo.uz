// BN broadcast notification click tracker.
// sw.js notificationclick paytida shu endpoint'ga POST yuboradi.
// Auth kerakmas — foydalanuvchi obunachi bo'lgan (push oldi) tekshirilmaydi,
// har bir haqiqiy klik = ma'lumot. Atomik increment.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id || id.length > 40) {
        return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    try {
        await prisma.bnBroadcast.update({
            where: { id },
            data: { clickCount: { increment: 1 } },
        });
    } catch {
        // Broadcast topilmasa (o'chirilgan/eski) — jim
        return NextResponse.json({ ok: false }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
