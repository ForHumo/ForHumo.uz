import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedBetween } from "@/lib/nexus-block";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { sendPushToProfile } from "@/lib/push";
import { after } from "next/server";
import { getPusher, userChannel } from "@/lib/pusher-server";

// POST /api/nexus/calls  { peerId, kind: "AUDIO"|"VIDEO" }  → chaqiruv boshlash (RINGING)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const peerId: string | undefined = body?.peerId;
    const kind: "AUDIO" | "VIDEO" = body?.kind === "VIDEO" ? "VIDEO" : "AUDIO";
    if (!peerId || peerId === me.id) return NextResponse.json({ error: "Yaroqsiz peer" }, { status: 400 });

    const peer = await prisma.userProfile.findUnique({ where: { id: peerId }, select: { id: true } });
    if (!peer) return NextResponse.json({ error: "Peer topilmadi" }, { status: 404 });

    if (await isBlockedBetween(me.id, peer.id)) return NextResponse.json({ error: "Bloklangan" }, { status: 403 });
    if (await nexusRateLimited(me.id, "call")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // Faol RINGING/ACCEPTED bo'lsa yangi chaqiruvni tashla
    const active = await prisma.nexusCall.findFirst({
        where: {
            OR: [
                { callerId: me.id, status: { in: ["RINGING", "ACCEPTED"] } },
                { calleeId: me.id, status: { in: ["RINGING", "ACCEPTED"] } },
            ],
        },
        select: { id: true },
    });
    if (active) return NextResponse.json({ error: "Sizda faol chaqiruv bor" }, { status: 409 });

    const call = await prisma.nexusCall.create({
        data: { callerId: me.id, calleeId: peer.id, kind, status: "RINGING" },
        select: { id: true, kind: true, status: true, callerId: true, calleeId: true, createdAt: true },
    });

    // Real-time Pusher event calleega (darhol overlay chiqadi, polling kutilmaydi)
    const pusher = getPusher();
    if (pusher) {
        const meProf = await prisma.userProfile.findUnique({
            where: { id: me.id },
            select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
        });
        pusher.trigger(userChannel(peer.id), "call:incoming", {
            id: call.id, kind: call.kind, caller: meProf,
        }).catch(() => { });
    }

    // Web push — callee tab yopiq bo'lsa ham bilsin (fire-and-forget)
    after(async () => {
        const meProf = await prisma.userProfile.findUnique({
            where: { id: me.id }, select: { name: true, username: true },
        });
        const who = meProf?.name || (meProf?.username ? `@${meProf.username}` : "Kimdir");
        await sendPushToProfile(peer.id, {
            title: kind === "VIDEO" ? "Video chaqiruv" : "Chaqiruv",
            body: `${who} sizni chaqiryapti`,
            url: "/nexus",
            tag: `call-${call.id}`,
        });
    });

    return NextResponse.json({ call });
}

// GET /api/nexus/calls  → mening qo'ng'iroqlar tarixim (oxirgi 50)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ calls: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ calls: [] });

    const calls = await prisma.nexusCall.findMany({
        where: { OR: [{ callerId: me.id }, { calleeId: me.id }] },
        orderBy: { createdAt: "desc" }, take: 50,
        include: { recordings: { orderBy: { createdAt: "asc" }, select: { id: true, audioUrl: true, durationSec: true, sizeKb: true, startedById: true } } },
    });
    const peerIds = [...new Set(calls.map(c => (c.callerId === me.id ? c.calleeId : c.callerId)))];
    const profs = peerIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: peerIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        calls: calls.map(c => {
            const dir: "in" | "out" = c.callerId === me.id ? "out" : "in";
            const peer = pMap[dir === "out" ? c.calleeId : c.callerId] || null;
            const missed = dir === "in" && (c.status === "MISSED" || c.status === "REJECTED");
            return {
                id: c.id, kind: c.kind.toLowerCase(), status: c.status, dir, missed,
                peer, duration: c.duration, createdAt: c.createdAt,
                recordings: c.recordings,
            };
        }),
    });
}
