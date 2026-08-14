// QR login tasdiqlash — telefondan (login qilingan foydalanuvchi) chaqiriladi.
//   POST /api/auth/qr/[code]/approve
//   → { ok: true, deviceHint }
//
// Xavfsizlik:
//   - Faqat PENDING holatida ruxsat
//   - Muddati o'tmagan bo'lishi shart
//   - Bekor qilish uchun: POST body { cancel: true }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirilmagan" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const cancel = body?.cancel === true;

    const r = await prisma.authQrRequest.findUnique({ where: { code } });
    if (!r) return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    if (r.status !== "PENDING") return NextResponse.json({ error: `Holat: ${r.status}` }, { status: 400 });
    if (r.expiresAt.getTime() < Date.now()) {
        await prisma.authQrRequest.update({ where: { code }, data: { status: "EXPIRED" } });
        return NextResponse.json({ error: "Muddati o'tgan" }, { status: 400 });
    }

    if (cancel) {
        await prisma.authQrRequest.update({ where: { code }, data: { status: "EXPIRED" } });
        return NextResponse.json({ ok: true, cancelled: true });
    }

    await prisma.authQrRequest.update({
        where: { code },
        data:  { status: "APPROVED", approvedProfileId: me.id, approvedAt: new Date() },
    });

    return NextResponse.json({ ok: true, deviceHint: r.deviceHint });
}
