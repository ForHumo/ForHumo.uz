// Boshqa ishtirokchilarga yozib olish boshlanishi/tugashi haqida (Pusher).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher, userChannel } from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action: "start" | "stop" = body?.action;
    if (!["start", "stop"].includes(action)) return NextResponse.json({ error: "Yaroqsiz amal" }, { status: 400 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id },
        select: { participants: { select: { profileId: true } } },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const iAmIn = call.participants.some(p => p.profileId === me.id);
    if (!iAmIn) return NextResponse.json({ error: "Ishtirokchi emassiz" }, { status: 403 });

    const pusher = getPusher();
    if (pusher) {
        const who = me.name || (me.username ? `@${me.username}` : "Kimdir");
        for (const p of call.participants) {
            if (p.profileId === me.id) continue;
            pusher.trigger(userChannel(p.profileId), action === "start" ? "group-recording:start" : "group-recording:stop", {
                callId: id, fromId: me.id, fromName: who,
            }).catch(() => { });
        }
    }
    return NextResponse.json({ ok: true });
}
