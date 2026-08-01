// Chaqiruv davomida emoji reaksiya (uchib chiqadigan). DB'ga yozilmaydi — faqat Pusher event.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher, userChannel } from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set(["heart", "thumbs", "laugh", "wow", "clap", "party", "fire", "cry"]);

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const emoji: string = body?.emoji;
    if (!emoji || !ALLOWED.has(emoji)) return NextResponse.json({ error: "Yaroqsiz emoji" }, { status: 400 });

    const c = await prisma.nexusCall.findUnique({ where: { id }, select: { callerId: true, calleeId: true, status: true } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (c.status !== "ACCEPTED") return NextResponse.json({ error: "Chaqiruv faol emas" }, { status: 409 });

    const pusher = getPusher();
    if (pusher) {
        const peerId = c.callerId === me.id ? c.calleeId : c.callerId;
        pusher.trigger(userChannel(peerId), "reaction:emoji", { callId: id, emoji, fromId: me.id }).catch(() => { });
    }
    return NextResponse.json({ ok: true });
}
