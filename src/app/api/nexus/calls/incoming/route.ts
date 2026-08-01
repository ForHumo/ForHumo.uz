import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";

const RING_TTL_MS = 35_000; // 35s dan uzoq turgan RINGING → MISSED

// GET /api/nexus/calls/incoming — men uchun kelayotgan RINGING qo'ng'iroq (bittasi yoki null)
// Bir yo'la eski RINGING'larni MISSED holatiga o'tkazadi (yozuvsiz javob berish yo'q).
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ call: null });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ call: null });

    const cutoff = new Date(Date.now() - RING_TTL_MS);
    // Eskirgan RINGING'larni MISSED ga aylantirish (men callee bo'lganlar) + bildirishnoma
    const stale = await prisma.nexusCall.findMany({
        where: { calleeId: me.id, status: "RINGING", createdAt: { lt: cutoff } },
        select: { id: true, callerId: true },
    }).catch(() => [] as { id: string; callerId: string }[]);
    if (stale.length) {
        await prisma.nexusCall.updateMany({
            where: { id: { in: stale.map(c => c.id) } },
            data: { status: "MISSED", endedAt: new Date() },
        }).catch(() => { });
        // Har bir MISSED uchun calleega notif (o'tkazib yuborilgan)
        for (const c of stale) {
            void nexusNotify({ recipientId: me.id, actorId: c.callerId, type: "CALL_MISSED", callId: c.id });
        }
    }

    const c = await prisma.nexusCall.findFirst({
        where: { calleeId: me.id, status: "RINGING", createdAt: { gte: cutoff } },
        orderBy: { createdAt: "desc" },
    });
    if (!c) return NextResponse.json({ call: null });

    const caller = await prisma.userProfile.findUnique({
        where: { id: c.callerId },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    return NextResponse.json({
        call: { id: c.id, kind: c.kind, status: c.status, createdAt: c.createdAt, caller },
    });
}
