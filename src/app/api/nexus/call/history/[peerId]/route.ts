// GET /api/nexus/call/history/[peerId]
// Ikki foydalanuvchi orasidagi chaqiruv tarixi (so'nggi 30 ta).
// Kind + status + duration + timestamp.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { peerId } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    // Ikkalasi orasidagi chaqiruvlar (har ikki tomondan)
    const calls = await prisma.nexusCall.findMany({
        where: {
            OR: [
                { callerId: me.id, calleeId: peerId },
                { callerId: peerId, calleeId: me.id },
            ],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
            id: true, callerId: true, calleeId: true, kind: true, status: true,
            createdAt: true, acceptedAt: true, endedAt: true, duration: true,
        },
    });

    return NextResponse.json({
        items: calls.map(c => {
            const outgoing = c.callerId === me.id;
            const missed = c.status === "MISSED" || c.status === "REJECTED" || (c.status === "ENDED" && !c.acceptedAt);
            return {
                id: c.id,
                kind: c.kind,               // AUDIO | VIDEO
                status: c.status,           // RINGING | ACCEPTED | ENDED | MISSED | REJECTED
                outgoing,
                missed,
                duration: c.duration,       // sekundlar
                createdAt: c.createdAt,
                acceptedAt: c.acceptedAt,
                endedAt: c.endedAt,
            };
        }),
    });
}
