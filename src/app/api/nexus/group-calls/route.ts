import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLiveKitEnabled } from "@/lib/livekit";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// POST — yangi guruh xonasi yaratish (host = joriy foydalanuvchi)
export async function POST(req: Request) {
    if (!isLiveKitEnabled()) return NextResponse.json({ error: "LiveKit sozlanmagan" }, { status: 503 });
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (await nexusRateLimited(me.id, "call")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const title: string = (body?.title || "").toString().slice(0, 80).trim() || null;

    const id = Math.random().toString(36).slice(2, 12);
    const roomName = `nx-${id}`;
    const call = await prisma.nexusGroupCall.create({
        data: {
            roomName, title, hostId: me.id, status: "ACTIVE",
            participants: { create: { profileId: me.id, role: "HOST" } },
        },
        select: { id: true, roomName: true, title: true, createdAt: true },
    });
    return NextResponse.json({ call });
}

// GET — mening guruh chaqiruvlar tarixim (host yoki ishtirok etgan)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ calls: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ calls: [] });

    const calls = await prisma.nexusGroupCall.findMany({
        where: { OR: [{ hostId: me.id }, { participants: { some: { profileId: me.id } } }] },
        orderBy: { createdAt: "desc" }, take: 30,
        include: {
            _count: { select: { participants: true } },
            recordings: { orderBy: { createdAt: "asc" }, select: { id: true, audioUrl: true, durationSec: true, sizeKb: true, startedById: true } },
        },
    });
    return NextResponse.json({
        calls: calls.map(c => ({
            id: c.id, roomName: c.roomName, title: c.title,
            status: c.status, createdAt: c.createdAt, endedAt: c.endedAt,
            hostId: c.hostId, participantCount: c._count.participants,
            isHost: c.hostId === me.id,
            recordings: c.recordings,
        })),
    });
}
