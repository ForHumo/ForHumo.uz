import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher, userChannel } from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

function pushCallEvent(peerId: string, event: "call:accepted" | "call:rejected" | "call:ended", callId: string) {
    const p = getPusher();
    if (p) p.trigger(userChannel(peerId), event, { callId }).catch(() => { });
}

// GET /api/nexus/calls/[id] — chaqiruv holati + peer
export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const c = await prisma.nexusCall.findUnique({ where: { id } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) {
        return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    const peerId = c.callerId === me.id ? c.calleeId : c.callerId;
    const peer = await prisma.userProfile.findUnique({
        where: { id: peerId },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    const role: "caller" | "callee" = c.callerId === me.id ? "caller" : "callee";
    return NextResponse.json({
        call: {
            id: c.id, kind: c.kind, status: c.status,
            createdAt: c.createdAt, acceptedAt: c.acceptedAt, endedAt: c.endedAt, duration: c.duration,
            role, peer,
        },
    });
}

// PATCH /api/nexus/calls/[id]  { action: "accept" | "reject" | "end" }
export async function PATCH(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action: "accept" | "reject" | "end" = body?.action;
    if (!["accept", "reject", "end"].includes(action)) return NextResponse.json({ error: "Yaroqsiz amal" }, { status: 400 });

    const c = await prisma.nexusCall.findUnique({ where: { id } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) {
        return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    if (action === "accept") {
        if (c.calleeId !== me.id) return NextResponse.json({ error: "Faqat qabul qiluvchi" }, { status: 403 });
        if (c.status !== "RINGING") return NextResponse.json({ error: "Chaqiruv aktual emas" }, { status: 409 });
        await prisma.nexusCall.update({ where: { id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
        pushCallEvent(c.callerId, "call:accepted", id);
        return NextResponse.json({ ok: true });
    }
    if (action === "reject") {
        if (c.calleeId !== me.id) return NextResponse.json({ error: "Faqat qabul qiluvchi" }, { status: 403 });
        if (c.status !== "RINGING") return NextResponse.json({ error: "Chaqiruv aktual emas" }, { status: 409 });
        await prisma.nexusCall.update({ where: { id }, data: { status: "REJECTED", endedAt: new Date() } });
        pushCallEvent(c.callerId, "call:rejected", id);
        return NextResponse.json({ ok: true });
    }
    // end — har ikkalasi
    if (c.status === "ENDED" || c.status === "REJECTED" || c.status === "MISSED" || c.status === "FAILED") {
        return NextResponse.json({ ok: true });
    }
    const endedAt = new Date();
    const duration = c.acceptedAt ? Math.max(0, Math.round((endedAt.getTime() - c.acceptedAt.getTime()) / 1000)) : 0;
    await prisma.nexusCall.update({ where: { id }, data: { status: "ENDED", endedAt, duration } });
    const peerId = c.callerId === me.id ? c.calleeId : c.callerId;
    pushCallEvent(peerId, "call:ended", id);
    return NextResponse.json({ ok: true });
}
