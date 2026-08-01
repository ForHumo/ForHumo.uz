import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher, userChannel } from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/nexus/calls/[id]/signal  { kind: "offer"|"answer"|"ice", payload: object }
export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const kind: string = body?.kind;
    const payload = body?.payload;
    if (!["offer", "answer", "ice"].includes(kind)) return NextResponse.json({ error: "Yaroqsiz signal turi" }, { status: 400 });
    if (payload == null) return NextResponse.json({ error: "Payload yo'q" }, { status: 400 });

    const c = await prisma.nexusCall.findUnique({ where: { id }, select: { callerId: true, calleeId: true, status: true } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) {
        return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    if (c.status === "ENDED" || c.status === "REJECTED" || c.status === "MISSED" || c.status === "FAILED") {
        return NextResponse.json({ error: "Chaqiruv yopilgan" }, { status: 409 });
    }

    await prisma.nexusCallSignal.create({
        data: { callId: id, fromId: me.id, kind, payload: JSON.stringify(payload) },
    });

    // Pusher orqali peer'ga darhol yetkazish (sozlangan bo'lsa; polling fallback baribir ishlaydi)
    const pusher = getPusher();
    if (pusher) {
        const peerId = c.callerId === me.id ? c.calleeId : c.callerId;
        const eventName = kind === "offer" ? "signal:offer" : kind === "answer" ? "signal:answer" : "signal:ice";
        pusher.trigger(userChannel(peerId), eventName, {
            callId: id, kind, payload, fromId: me.id,
        }).catch(() => { });
    }

    return NextResponse.json({ ok: true });
}

// GET /api/nexus/calls/[id]/signal?since=<iso>  → boshqa peer'dan kelgan signallar
export async function GET(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ signals: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ signals: [] });

    const c = await prisma.nexusCall.findUnique({ where: { id }, select: { callerId: true, calleeId: true } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) return NextResponse.json({ signals: [] });

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);

    const rows = await prisma.nexusCallSignal.findMany({
        where: { callId: id, fromId: { not: me.id }, createdAt: { gt: since } },
        orderBy: { createdAt: "asc" }, take: 50,
    });
    return NextResponse.json({
        signals: rows.map(r => ({ id: r.id, kind: r.kind, payload: JSON.parse(r.payload), createdAt: r.createdAt })),
    });
}
